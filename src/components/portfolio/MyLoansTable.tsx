/**
 * My Loans Table - Redesigned to match MyAssetsTable
 *
 * ✅ SPECIFICATION COMPLIANT
 * Reference: Solvency Vault End-to-End Flow - Sections 5, 6, 7
 *
 * Features:
 * - Table layout matching MyAssetsTable design
 * - Expandable rows to show loan schedule details
 * - Proper health factor display (Infinite ∞ for no debt)
 * - Defaulted loan visual indicators
 * - Overdue payment warnings
 * - Filters: All, Healthy, At Risk, Critical, Defaulted
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Wallet, Filter, Calendar, AlertCircle, Info, Clock, DollarSign } from 'lucide-react';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
import { solvencyContractService } from '../../lib/api/solvency-contract.service';
import { format } from 'date-fns';
import { RepayLoanModal } from './RepayLoanModal';

interface MyLoansTableProps {
  positions: Position[];
  isLoading: boolean;
  onRefresh?: () => void;
}

// Format USD from 6 decimal string
const formatUSD = (value: string) => {
  if (!value) return '$0.00';
  const num = parseFloat(value) / 1e6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Format collateral amount (18 decimals)
const formatCollateralAmount = (value: string, decimals: number = 18) => {
  if (!value) return '0.00';
  const num = parseFloat(value) / Math.pow(10, decimals);
  return num.toFixed(2);
};

// Format health factor (value like 15300 = 153.00%, or 2147483647 for no debt)
const formatHealthFactor = (value: number) => {
  // MAX_INT means no debt - show as infinite/perfect health
  if (value >= 2000000) return 'N/A (No Debt)';
  return `${(value / 100).toFixed(2)}%`;
};

// Derive token symbol from address (simple heuristic)
const getTokenSymbol = (address: string) => {
  // You can maintain a map of known addresses or derive from first/last chars
  const shortAddr = address.slice(2, 8).toUpperCase();
  return `TKN-${shortAddr}`;
};

// Calculate outstanding debt from usdcBorrowed and totalPartnerDebt
const getOutstandingDebt = (position: Position): string => {
  const borrowed = parseFloat(position.usdcBorrowed || '0');
  const partnerDebt = parseFloat(position.totalPartnerDebt || '0');
  return (borrowed + partnerDebt).toString();
};

const getHealthColor = (healthFactor: number) => {
  // MAX_INT (2147483647) means no debt - perfectly healthy
  if (healthFactor >= 2000000) return 'text-[#10B981]';
  if (healthFactor >= 15000) return 'text-[#10B981]';
  if (healthFactor >= 12000) return 'text-[#F59E0B]';
  return 'text-[#EF4444]';
};

const getHealthBadgeColor = (healthStatus: string) => {
  switch (healthStatus) {
    case 'HEALTHY':
      return 'bg-[#D1FAE5] text-[#065F46]';
    case 'WARNING':
      return 'bg-[#FEF3C7] text-[#92400E]';
    case 'CRITICAL':
      return 'bg-[#FEE2E2] text-[#991B1B]';
    default:
      return 'bg-[#F3F4F6] text-[#6B7280]';
  }
};

// Check if payment is overdue
const isPaymentOverdue = (nextPaymentDueDate?: string): boolean => {
  if (!nextPaymentDueDate) return false;
  return new Date(nextPaymentDueDate) < new Date();
};

type FilterType = 'all' | 'healthy' | 'warning' | 'critical' | 'defaulted';

interface LoanSchedule {
  loanDuration: number;
  numberOfInstallments: number;
  installmentInterval: number;
  installmentsPaid: number;
  missedPayments: number;
  nextPaymentDue: number;
  installments: Array<{
    installmentNumber: number;
    dueDate: number;
    amount: string;
    status: 'PAID' | 'PENDING' | 'MISSED';
  }>;
}

export const MyLoansTable = ({ positions, isLoading, onRefresh }: MyLoansTableProps) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [scheduleData, setScheduleData] = useState<Record<number, LoanSchedule>>({});;
  const [loadingSchedule, setLoadingSchedule] = useState<Record<number, boolean>>({});
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [withdrawingPositionId, setWithdrawingPositionId] = useState<number | null>(null);
  const [withdrawnPositions, setWithdrawnPositions] = useState<Set<number>>(new Set());

  // Filter positions
  const filteredPositions = useMemo(() => {
    let filtered = [...positions];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (activeFilter === 'healthy') return p.healthStatus === 'HEALTHY' && !p.isDefaulted;
        if (activeFilter === 'warning') return p.healthStatus === 'WARNING';
        if (activeFilter === 'critical') return p.healthStatus === 'CRITICAL';
        if (activeFilter === 'defaulted') return p.isDefaulted;
        return true;
      });
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [positions, activeFilter]);

  // Toggle expanded row and load schedule
  const toggleRowExpansion = async (positionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
      setExpandedRows(newExpanded);
      return;
    }

    newExpanded.add(positionId);
    setExpandedRows(newExpanded);

    // Load schedule if not already loaded
    if (!scheduleData[positionId] && !loadingSchedule[positionId]) {
      setLoadingSchedule({ ...loadingSchedule, [positionId]: true });
      try {
        const response = await solvencyService.getPositionSchedule(positionId);
        setScheduleData({ ...scheduleData, [positionId]: response.schedule });
      } catch (error) {
        console.error('Failed to load schedule:', error);
      } finally {
        setLoadingSchedule({ ...loadingSchedule, [positionId]: false });
      }
    }
  };

  const handleRepayClick = (position: Position, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPosition(position);
    setShowRepayModal(true);
  };

  const handleRepaySuccess = () => {
    setShowRepayModal(false);
    setSelectedPosition(null);
    if (onRefresh) onRefresh();
    // Clear schedule cache to reload fresh data
    if (selectedPosition) {
      const newScheduleData = { ...scheduleData };
      delete newScheduleData[selectedPosition.positionId];
      setScheduleData(newScheduleData);
    }
  };

  const handleWithdrawClick = (position: Position, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPosition(position);
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!selectedPosition) return;

    setWithdrawingPositionId(selectedPosition.positionId);

    try {
      // Call smart contract directly to withdraw collateral
      const amountBigInt = BigInt(selectedPosition.collateralAmount);
      const result = await solvencyContractService.withdrawCollateral(
        selectedPosition.positionId,
        amountBigInt
      );

      if (result.success) {
        // Mark position as withdrawn
        setWithdrawnPositions(prev => new Set([...prev, selectedPosition.positionId]));
        
        setShowWithdrawModal(false);
        setSelectedPosition(null);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error || 'Withdrawal failed');
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      alert(`Withdrawal failed: ${error.message}`);
    } finally {
      setWithdrawingPositionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F3F4F6] flex items-center justify-center">
            <Wallet className="w-8 h-8 text-[#6B7280]" />
          </div>
          <p className="font-gellix text-sm text-gray-500 mb-4">No active loans yet</p>
          <button
            onClick={() => navigate('/borrow')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-normal hover:bg-blue-700 transition-colors"
          >
            Start Borrowing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Filter Bar */}
      <div className="sticky flex flex-row items-center justify-between top-0 z-20 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setActiveFilter('healthy')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'healthy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              HEALTHY
            </button>
            <button
              onClick={() => setActiveFilter('warning')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'warning'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              AT RISK
            </button>
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'critical'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              CRITICAL
            </button>
            <button
              onClick={() => setActiveFilter('defaulted')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'defaulted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              DEFAULTED
            </button>
          </div>
          {activeFilter !== 'all' && (
            <span className="text-xs text-gray-500 ml-2">
              ({filteredPositions.length} of {positions.length})
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredPositions.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-gray-500">No loans match the selected filter.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider"></th>
              <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Collateral Type
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Collateral Amount
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                USDC Borrowed
              </th>
             
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Next Payment
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions?.map((position, index) => {
              const isExpanded = expandedRows.has(position.positionId);
              const schedule = scheduleData[position.positionId];
              const isLoadingSchedule = loadingSchedule[position.positionId];
              const isOverdue = isPaymentOverdue(position.nextPaymentDueDate);
              const outstandingDebt = parseFloat(getOutstandingDebt(position));
              const hasDebt = outstandingDebt > 0;
              const hasCollateral = parseFloat(position.collateralAmount) > 0;
              const wasWithdrawn = withdrawnPositions.has(position.positionId);
              const canWithdraw = hasCollateral && !position.oaidCreditIssued && !position.isDefaulted && !wasWithdrawn;

              return (
                <>
                  <tr
                    key={position.positionId}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${position.isDefaulted ? 'opacity-50' : ''}`}
                    onClick={(e) => toggleRowExpansion(position.positionId, e)}
                  >
                    {/* Expand Icon */}
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => toggleRowExpansion(position.positionId, e)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Position ID */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-gellix text-sm font-medium text-foreground flex items-center gap-2">
                          Position #{position.positionId}
                          {position.isDefaulted && (
                            <div className="relative group">
                              <Info className="w-4 h-4 text-red-600 cursor-help" />
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black text-white text-xs rounded shadow-lg z-50">
                                Defaulted: 3+ missed payments
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getTokenSymbol(position.collateralTokenAddress)}
                        </div>
                      </div>
                    </td>

                    {/* Collateral Type */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          position.collateralTokenType === 'RWA'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {position.collateralTokenType}
                      </span>
                    </td>

                    {/* Collateral Amount */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col">
                        <span className="font-gellix text-sm font-normal text-foreground">
                          {formatCollateralAmount(position.collateralAmount, 18)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatUSD(position.tokenValueUSD)}
                        </span>
                      </div>
                    </td>

                    {/* USDC Borrowed */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-gellix text-sm font-medium text-foreground">
                        {hasDebt ? formatUSD(getOutstandingDebt(position)) : (
                          <span className="text-gray-400">No Debt</span>
                        )}
                      </div>
                    </td>



                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getHealthBadgeColor(
                          position.healthStatus
                        )}`}
                      >
                        {position.healthStatus}
                      </span>
                    </td>

                    {/* Next Payment */}
                    <td className="px-4 py-4 text-center">
                      {position.nextPaymentDueDate && hasDebt ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(position.nextPaymentDueDate), 'MMM d, yyyy')}
                          </div>
                          {isOverdue && (
                            <span className="text-xs font-medium text-red-600">OVERDUE</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Repay Button - Only show when loan was issued (oaidCreditIssued = true) */}
                        {!position.isDefaulted && position.oaidCreditIssued && hasDebt && (
                          <button
                            onClick={(e) => handleRepayClick(position, e)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isOverdue
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isOverdue ? 'Overdue - Repay' : 'Repay'}
                          </button>
                        )}

                        {/* Withdraw Button - Show when no loan issued yet and collateral exists */}
                        {canWithdraw && (
                          <button
                            onClick={(e) => handleWithdrawClick(position, e)}
                            disabled={withdrawingPositionId === position.positionId}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {withdrawingPositionId === position.positionId ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        )}

                        {/* No Action State */}
                        {!position.oaidCreditIssued && !canWithdraw && !position.isDefaulted && (
                          <span className="text-xs text-gray-400">No Actions</span>
                        )}

                        {position.isDefaulted && (
                          <span className="text-xs text-gray-400">Defaulted</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="px-0 py-0">
                        <div className="bg-gray-50 border-b border-gray-200">
                          {isLoadingSchedule ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          ) : schedule ? (
                            <div className="p-6">
                              {/* Loan Details Header */}
                              <div className="grid grid-cols-4 gap-6 mb-6">
                                {/* LTV Ratio */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">LTV Ratio</span>
                                  </div>
                                  <div className="text-lg font-bold text-foreground">
                                    {position.initialLTV ? (position.initialLTV / 100).toFixed(0) : 'N/A'}%
                                  </div>
                                </div>

                                {/* Total Installments */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">Installments</span>
                                  </div>
                                  <div className="text-lg font-bold text-foreground">
                                    {schedule.installmentsPaid} / {schedule.numberOfInstallments}
                                  </div>
                                </div>

                                {/* Missed Payments */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-xs font-medium text-gray-600">Missed</span>
                                  </div>
                                  <div className="text-lg font-bold text-red-600">
                                    {schedule.missedPayments}
                                  </div>
                                </div>

                                {/* Payment Interval */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">Interval</span>
                                  </div>
                                  <div className="text-lg font-bold text-foreground">
                                    {Math.floor(schedule.installmentInterval / 86400)}d
                                  </div>
                                </div>
                              </div>

                              {/* Repayment Schedule */}
                              <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Repayment Schedule
                                </h4>

                                <div className="space-y-2">
                                  {schedule.installments?.map((installment) => (
                                    <div
                                      key={installment.installmentNumber}
                                      className={`flex items-center justify-between p-3 rounded-lg border ${
                                        installment.status === 'PAID'
                                          ? 'bg-green-50 border-green-200'
                                          : installment.status === 'MISSED'
                                          ? 'bg-red-50 border-red-200'
                                          : 'bg-white border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-medium text-foreground">
                                          #{installment.installmentNumber}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Due: {format(new Date(installment.dueDate * 1000), 'MMM d, yyyy')}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm font-semibold text-foreground">
                                          {formatUSD(installment.amount)}
                                        </div>
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            installment.status === 'PAID'
                                              ? 'bg-green-600 text-white'
                                              : installment.status === 'MISSED'
                                              ? 'bg-red-600 text-white'
                                              : 'bg-yellow-600 text-white'
                                          }`}
                                        >
                                          {installment.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {schedule.missedPayments > 0 && (
                                  <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2 border border-red-200">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-700">
                                      <strong>Warning:</strong> You have {schedule.missedPayments} missed payment
                                      {schedule.missedPayments > 1 ? 's' : ''}. Please repay immediately to avoid liquidation.
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Transaction Info */}
                              <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-600">Deposit TX:</span>
                                    <a
                                      href={`https://sepolia.mantlescan.xyz/tx/${position.depositTxHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-blue-600 hover:underline font-mono"
                                    >
                                      {position.depositTxHash.slice(0, 10)}...
                                    </a>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Created:</span>
                                    <span className="ml-2 text-foreground">
                                      {format(new Date(position.createdAt), 'MMM d, yyyy HH:mm')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-sm text-gray-500">
                              No repayment schedule available for this position.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Repay Modal - Rendered at document body level using Portal */}
      {selectedPosition && createPortal(
        <RepayLoanModal
          isOpen={showRepayModal}
          onClose={() => {
            setShowRepayModal(false);
            setSelectedPosition(null);
          }}
          onSuccess={handleRepaySuccess}
          position={selectedPosition}
          schedule={scheduleData[selectedPosition.positionId]}
        />,
        document.body
      )}

      {/* Withdraw Confirmation Modal */}
      {selectedPosition && showWithdrawModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-[20px] p-8 max-w-md w-full mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#111111] mb-1">
                  Withdraw Collateral
                </h2>
                <p className="text-sm text-[#6B7280]">
                  Confirm withdrawal from Position #{selectedPosition.positionId}
                </p>
              </div>
              {!withdrawingPositionId && (
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setSelectedPosition(null);
                  }}
                  className="text-[#6B7280] hover:text-[#111111] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Withdrawal Details */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-[#F7F8FA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6B7280]">{getTokenSymbol(selectedPosition.collateralTokenAddress)}</span>
                  <span className="text-lg font-semibold text-[#111111]">
                    {formatCollateralAmount(selectedPosition.collateralAmount, 18)} tokens
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">
                    Collateral Value
                  </span>
                  <span className="text-sm font-medium text-[#111111]">
                    {formatUSD(selectedPosition.tokenValueUSD)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-yellow-800">
                    Your collateral will be returned to your wallet. Please confirm the transaction in your wallet.
                  </p>
                </div>
              </div>
            </div>

            {/* Processing State */}
            {withdrawingPositionId === selectedPosition.positionId && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111] mb-4"></div>
                <p className="text-sm text-[#6B7280] text-center">Processing withdrawal...</p>
                <p className="text-xs text-[#6B7280] text-center mt-2">Please confirm in your wallet</p>
              </div>
            )}

            {/* Action Buttons */}
            {!withdrawingPositionId && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setSelectedPosition(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-[#111111] hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawConfirm}
                  className="flex-1 px-6 py-3 bg-[#10B981] text-white rounded-lg font-medium hover:bg-[#059669] transition-colors"
                >
                  Confirm Withdrawal
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
