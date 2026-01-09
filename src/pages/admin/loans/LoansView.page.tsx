import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import { solvencyService } from '../../../lib/api/solvency.service';
import { Button } from '../../../components/ui/button';
import type { AdminPosition } from '../../../types/admin.types';
import { ethers } from 'ethers';

// View model for formatted display
interface AdminPositionView extends AdminPosition {
  collateralValueFormatted: string;
  borrowedAmountFormatted: string;
  outstandingDebtFormatted: string;
  healthFactorFormatted: string;
}

type FilterType = 'all' | 'warnings' | 'liquidatable';

export function LoansView() {
  const [positions, setPositions] = useState<AdminPositionView[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<AdminPositionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Safe formatting helper for USDC values
  const formatUSDC = (value: string | null | undefined): string => {
    if (!value || value === '0') return '$0.00';
    try {
      const parsed = parseFloat(ethers.formatUnits(value, 6));
      return `$${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch {
      return '$0.00';
    }
  };

  // Safe formatting helper for health factor
  const formatHealthFactor = (hf: number | null | undefined): string => {
    if (hf === null || hf === undefined || !isFinite(hf) || hf === 2147483647) {
      return 'N/A'; // Max int often indicates no debt
    }
    return `${(hf / 100).toFixed(2)}%`;
  };

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await solvencyService.getAllPositions();

      console.log('📊 Fetched admin positions:', {
        count: data.positions?.length ?? 0,
        sample: data.positions?.[0],
      });

      // Format positions for display
      const formatted: AdminPositionView[] = data.positions.map(pos => ({
        ...pos,
        collateralValueFormatted: formatUSDC(pos.tokenValueUSD),
        borrowedAmountFormatted: formatUSDC(pos.usdcBorrowed),
        outstandingDebtFormatted: formatUSDC(pos.usdcBorrowed), // AdminPosition uses usdcBorrowed for debt
        healthFactorFormatted: formatHealthFactor(pos.currentHealthFactor),
      }));

      setPositions(formatted);
      applyFilter(formatted, activeFilter);
    } catch (err: any) {
      console.error('❌ Error fetching positions:', err);
      setError(err.message || 'Failed to fetch loan positions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (positionsToFilter: AdminPositionView[], filter: FilterType) => {
    let filtered = positionsToFilter;

    if (filter === 'warnings') {
      filtered = positionsToFilter.filter(p => p.healthStatus === 'WARNING');
    } else if (filter === 'liquidatable') {
      filtered = positionsToFilter.filter(p =>
        p.healthStatus === 'LIQUIDATABLE' ||
        p.healthStatus === 'CRITICAL' ||
        p.status === 'LIQUIDATED'
      );
    }

    setFilteredPositions(filtered);
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    applyFilter(positions, activeFilter);
  }, [activeFilter, positions]);

  // Admin Operation: Mark Missed Payment
  const handleMarkMissedPayment = async (positionId: number) => {
    if (!confirm(`Mark payment as missed for position #${positionId}?`)) return;

    setProcessingId(positionId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await solvencyService.markMissedPayment(positionId);
      setSuccessMessage(`✅ Missed payment marked! TX: ${result.txHash?.slice(0, 10)}...`);
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || 'Failed to mark missed payment');
    } finally {
      setProcessingId(null);
    }
  };

  // Admin Operation: Mark Defaulted
  const handleMarkDefaulted = async (positionId: number) => {
    if (!confirm(`⚠️ Mark position #${positionId} as DEFAULTED? This action is irreversible.`)) return;

    setProcessingId(positionId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await solvencyService.markDefaulted(positionId);
      setSuccessMessage(`✅ Position marked as defaulted! TX: ${result.txHash?.slice(0, 10)}...`);
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as defaulted');
    } finally {
      setProcessingId(null);
    }
  };

  // Admin Operation: Liquidate Position
  const handleLiquidate = async (positionId: number) => {
    if (!confirm(`⚠️ Liquidate position #${positionId}? Collateral will be transferred to YieldVault.`)) return;

    setProcessingId(positionId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await solvencyService.liquidatePosition(positionId);
      setSuccessMessage(
        `✅ Position liquidated! TX: ${result.txHash?.slice(0, 10)}... | ` +
        `Marketplace ID: ${result.marketplaceAssetId?.slice(0, 10)}...`
      );
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || 'Failed to liquidate position');
    } finally {
      setProcessingId(null);
    }
  };

  // Admin Operation: Settle Liquidation
  const handleSettleLiquidation = async (positionId: number) => {
    if (!confirm(`Settle liquidation for position #${positionId}? This will burn tokens and distribute yield.`)) return;

    setProcessingId(positionId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await solvencyService.settleLiquidation(positionId);

      const yieldReceived = result.yieldReceived
        ? parseFloat(ethers.formatUnits(result.yieldReceived, 6))
        : 0;
      const debtRepaid = result.debtRepaid
        ? parseFloat(ethers.formatUnits(result.debtRepaid, 6))
        : 0;
      const userRefund = result.userRefund
        ? parseFloat(ethers.formatUnits(result.userRefund, 6))
        : 0;

      setSuccessMessage(
        `✅ Liquidation settled! TX: ${result.txHash?.slice(0, 10)}... | ` +
        `Yield: $${yieldReceived.toFixed(2)} | Debt: $${debtRepaid.toFixed(2)} | Refund: $${userRefund.toFixed(2)}`
      );
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || 'Failed to settle liquidation');
    } finally {
      setProcessingId(null);
    }
  };

  // Admin Operation: Manual Sync Position
  const handleSyncPosition = async (positionId: number) => {
    setProcessingId(positionId);
    setError(null);
    setSuccessMessage(null);

    try {
      await solvencyService.adminSyncPosition(positionId);
      setSuccessMessage(`✅ Position #${positionId} synced successfully!`);
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || 'Failed to sync position');
    } finally {
      setProcessingId(null);
    }
  };

  // UI Helper: Status Badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      LIQUIDATED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Liquidated' },
      SETTLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Settled' },
      REPAID: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Repaid' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Closed' },
    };

    const style = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // UI Helper: Health Status Badge
  const getHealthStatusBadge = (healthStatus: string | undefined) => {
    if (!healthStatus) return null;

    if (healthStatus === 'HEALTHY') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Healthy</span>;
    } else if (healthStatus === 'WARNING') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Warning</span>;
    } else if (healthStatus === 'CRITICAL' || healthStatus === 'LIQUIDATABLE') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Critical</span>;
    }

    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{healthStatus}</span>;
  };

  // Calculate statistics
  const stats = {
    total: positions.length,
    active: positions.filter(p => p.status === 'ACTIVE').length,
    warnings: positions.filter(p => p.healthStatus === 'WARNING').length,
    liquidatable: positions.filter(p =>
      p.healthStatus === 'LIQUIDATABLE' ||
      p.healthStatus === 'CRITICAL'
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage all borrowing positions</p>
          </div>
          <Button
            onClick={fetchPositions}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Positions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.warnings}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Liquidatable</p>
                <p className="text-2xl font-bold text-gray-900">{stats.liquidatable}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('all')}
          >
            All Positions ({stats.total})
          </Button>
          <Button
            variant={activeFilter === 'warnings' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('warnings')}
            className={activeFilter === 'warnings' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
          >
            Warnings ({stats.warnings})
          </Button>
          <Button
            variant={activeFilter === 'liquidatable' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('liquidatable')}
            className={activeFilter === 'liquidatable' ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            Liquidatable ({stats.liquidatable})
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Success</p>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Positions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="ml-3 text-gray-600">Loading positions...</p>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-gray-500">No positions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collateral</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrowed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Factor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed Payments</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPositions.map((position) => (
                    <tr key={position.positionId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{position.positionId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono" title={position.userAddress}>
                        {position.userAddress.slice(0, 6)}...{position.userAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{position.collateralValueFormatted}</p>
                          <p className="text-xs text-gray-500">{position.collateralTokenType}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {position.borrowedAmountFormatted}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {position.outstandingDebtFormatted}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          <span className={`font-medium ${
                            !position.currentHealthFactor || position.currentHealthFactor === 2147483647
                              ? 'text-gray-600'
                              : position.currentHealthFactor < 11000
                                ? 'text-red-600'
                                : position.currentHealthFactor < 12500
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                          }`}>
                            {position.healthFactorFormatted}
                          </span>
                          {getHealthStatusBadge(position.healthStatus)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          position.missedPayments > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {position.missedPayments} / 3
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {getStatusBadge(position.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          {/* Mark Missed Payment - Available for active positions */}
                          {position.status === 'ACTIVE' && position.missedPayments < 3 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkMissedPayment(position.positionId)}
                              disabled={processingId === position.positionId}
                              className="text-xs"
                            >
                              Mark Missed
                            </Button>
                          )}

                          {/* Mark Defaulted - Available after 3 missed payments */}
                          {position.status === 'ACTIVE' && position.missedPayments >= 3 && !position.isDefaulted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkDefaulted(position.positionId)}
                              disabled={processingId === position.positionId}
                              className="text-xs bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                            >
                              Mark Defaulted
                            </Button>
                          )}

                          {/* Liquidate - Available for liquidatable positions */}
                          {position.healthStatus === 'LIQUIDATABLE' && position.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLiquidate(position.positionId)}
                              disabled={processingId === position.positionId}
                              className="text-xs bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                            >
                              Liquidate
                            </Button>
                          )}

                          {/* Settle Liquidation - Available for liquidated positions after maturity */}
                          {position.status === 'LIQUIDATED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSettleLiquidation(position.positionId)}
                              disabled={processingId === position.positionId}
                              className="text-xs bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                              Settle
                            </Button>
                          )}

                          {/* Sync - Always available */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSyncPosition(position.positionId)}
                            disabled={processingId === position.positionId}
                            className="text-xs"
                          >
                            Sync
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
