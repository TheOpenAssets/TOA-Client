import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import { solvencyService } from '../../../lib/api/solvency.service';
import { Button } from '../../../components/ui/button';
import { useNetwork } from '../../../lib/network/NetworkContext';
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

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDangerous: false,
  });

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

  const { networkType } = useNetwork();

  useEffect(() => {
    if (networkType !== 'stellar') {
      fetchPositions();
    }
  }, [networkType]);

  if (networkType === 'stellar') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loan Management</h1>
        <h2 className="text-xl font-medium text-gray-600 mb-6">Coming Soon on Stellar</h2>
        <p className="text-gray-500 max-w-md">
          Loan functionalities are currently being developed for the Stellar network.
          Please switch to Mantle to manage loans.
        </p>
      </div>
    );
  }

  useEffect(() => {
    applyFilter(positions, activeFilter);
  }, [activeFilter, positions]);

  // Admin Operation: Mark Missed Payment
  const handleMarkMissedPayment = async (positionId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Mark Missed Payment',
      message: `Are you sure you want to mark payment as missed for position #${positionId}?`,
      isDangerous: false,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setProcessingId(positionId);
        setError(null);
        setSuccessMessage(null);

        try {
          // Step 1: Execute blockchain transaction
          const result = await solvencyService.markMissedPayment(positionId);

          // Step 2: Sync backend with blockchain to update missed payments count
          await solvencyService.adminSyncPosition(positionId);

          // Step 3: Refresh UI with updated data
          await fetchPositions();

          setSuccessMessage(`✅ Missed payment marked! TX: ${result.txHash?.slice(0, 10)}...`);
        } catch (err: any) {
          setError(err.message || 'Failed to mark missed payment');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  // Admin Operation: Mark Defaulted
  const handleMarkDefaulted = async (positionId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Mark Position as Defaulted',
      message: `Are you sure you want to mark position #${positionId} as DEFAULTED? This action is irreversible.`,
      isDangerous: true,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setProcessingId(positionId);
        setError(null);
        setSuccessMessage(null);

        try {
          // Step 1: Execute blockchain transaction
          const result = await solvencyService.markDefaulted(positionId);

          // Step 2: Sync backend with blockchain to update position status
          await solvencyService.adminSyncPosition(positionId);

          // Step 3: Refresh UI with updated data
          await fetchPositions();

          setSuccessMessage(`✅ Position marked as defaulted! TX: ${result.txHash?.slice(0, 10)}...`);
        } catch (err: any) {
          setError(err.message || 'Failed to mark as defaulted');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  // Admin Operation: Liquidate Position
  const handleLiquidate = async (positionId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Liquidate Position',
      message: `Are you sure you want to liquidate position #${positionId}? Collateral will be transferred to YieldVault.`,
      isDangerous: true,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setProcessingId(positionId);
        setError(null);
        setSuccessMessage(null);

        try {
          // Step 1: Execute blockchain transaction
          const result = await solvencyService.liquidatePosition(positionId);

          // Step 2: Sync backend with blockchain to update position status
          await solvencyService.adminSyncPosition(positionId);

          // Step 3: Refresh UI with updated data
          await fetchPositions();

          setSuccessMessage(
            `✅ Position liquidated! TX: ${result.txHash?.slice(0, 10)}... | ` +
            `Marketplace ID: ${result.marketplaceAssetId?.slice(0, 10)}...`
          );
        } catch (err: any) {
          setError(err.message || 'Failed to liquidate position');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  // Admin Operation: Settle Liquidation
  const handleSettleLiquidation = async (positionId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Settle Liquidation',
      message: `Are you sure you want to settle liquidation for position #${positionId}? This will burn tokens and distribute yield.`,
      isDangerous: false,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setProcessingId(positionId);
        setError(null);
        setSuccessMessage(null);

        try {
          // Step 1: Execute blockchain transaction
          const result = await solvencyService.settleLiquidation(positionId);

          // Step 2: Sync backend with blockchain to update position status
          await solvencyService.adminSyncPosition(positionId);

          // Step 3: Refresh UI with updated data
          await fetchPositions();

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
        } catch (err: any) {
          setError(err.message || 'Failed to settle liquidation');
        } finally {
          setProcessingId(null);
        }
      },
    });
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed Payments</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPositions.map((position) => (
                    position.borrowedAmountFormatted !== '$0.00' && position.outstandingDebtFormatted !== '$0.00' && (
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
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${position.missedPayments > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {Math.min(position.missedPayments, 3)} / 3
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
                            {(
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

                          </div>
                        </td>
                      </tr>)
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl font-light text-gray-900" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                {confirmModal.title}
              </h3>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-gray-600 font-light leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-5 py-2.5 text-sm font-light text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                style={{ textShadow: '0 1px 1px rgba(0,0,0,0.05)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 text-sm font-light text-white rounded-lg transition-all duration-200 shadow-lg ${confirmModal.isDangerous
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50'
                  : 'bg-gray-900 hover:bg-black shadow-gray-900/50'
                  }`}
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
