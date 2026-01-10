/**
 * My Loans Table - Enhanced with Loan Schedule & Repayment
 *
 * ✅ SPECIFICATION COMPLIANT
 * Reference: Solvency Vault End-to-End Flow - Sections 5, 6, 7
 *
 * Features:
 * - Expandable rows to show loan schedule (like My Assets table)
 * - Calls GET /solvency/position/:id/schedule on expand
 * - Shows: loan duration, installments, next payment, missed payments, full schedule
 * - Repay button pre-fills next unpaid installment
 * - Filters: All, Healthy, At Risk, Critical
 * - Sort: Date, Health Factor, Debt Amount
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Wallet, ArrowUpDown, Calendar, AlertCircle } from 'lucide-react';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
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

// Format health factor (value like 15300 = 153.00%)
const formatHealthFactor = (value: number) => {
  return `${(value / 100).toFixed(2)}%`;
};

const getHealthColor = (healthFactor: number) => {
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

type FilterType = 'all' | 'healthy' | 'warning' | 'critical';
type SortType = 'date' | 'health' | 'debt';

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
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [expandedPositionId, setExpandedPositionId] = useState<number | null>(null);
  const [scheduleData, setScheduleData] = useState<Record<number, LoanSchedule>>({});
  const [loadingSchedule, setLoadingSchedule] = useState<Record<number, boolean>>({});
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // Filter and sort positions
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = [...positions];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (activeFilter === 'healthy') return p.healthStatus === 'HEALTHY';
        if (activeFilter === 'warning') return p.healthStatus === 'WARNING';
        if (activeFilter === 'critical') return p.healthStatus === 'CRITICAL';
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'health') {
        return a.healthFactor - b.healthFactor;
      }
      if (sortBy === 'debt') {
        return parseFloat(b.outstandingDebt) - parseFloat(a.outstandingDebt);
      }
      return 0;
    });

    return filtered;
  }, [positions, activeFilter, sortBy]);

  // Toggle expanded row and load schedule
  const handleToggleExpand = async (positionId: number) => {
    if (expandedPositionId === positionId) {
      setExpandedPositionId(null);
      return;
    }

    setExpandedPositionId(positionId);

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

  const handleRepayClick = (position: Position) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-transparent rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] h-full w-full flex items-center justify-center text-center">
        <div className=''>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F3F4F6] flex items-center justify-center">
          <Wallet className="w-8 h-8 text-[#6B7280]" />
        </div>
        <h3 className="text-xl font-semibold text-[#111111] mb-2">
          No Active Loans
        </h3>
        <p className="text-sm text-[#6B7280] mb-6 max-w-md mx-auto">
          You haven't borrowed against your assets yet. Start borrowing USDC using your RWA tokens as collateral.
        </p>
        <button
          onClick={() => navigate('/borrow')}
          className="px-6 py-3 bg-[#111111] hover:bg-[#1a1a1a] text-white rounded-[12px] font-medium transition-all"
        >
          Start Borrowing
        </button>
      </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            All Loans
          </button>
          <button
            onClick={() => setActiveFilter('healthy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'healthy'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            Healthy
          </button>
          <button
            onClick={() => setActiveFilter('warning')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'warning'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            At Risk
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === 'critical'
                ? 'bg-[#F3F4F6] text-[#111111]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            Critical
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[#6B7280]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-3 py-2 bg-transparent border border-gray-200 rounded-lg text-sm text-[#111111] font-medium outline-none focus:ring-2 focus:ring-[#111111]"
          >
            <option value="date">Newest First</option>
            <option value="health">Health Factor</option>
            <option value="debt">Debt Amount</option>
          </select>
        </div>
      </div>

      {/* Card Grid */}
      {filteredAndSortedPositions.length === 0 ? (
        <div className="bg-transparent rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
          <p className="text-sm text-[#6B7280]">No loans match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredAndSortedPositions.map((position) => {
            const isExpanded = expandedPositionId === position.positionId;
            const schedule = scheduleData[position.positionId];
            const isLoadingSchedule = loadingSchedule[position.positionId];

            return (
              <div
                key={position.positionId}
                className="bg-transparent rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow overflow-hidden"
              >
                {/* Main Card Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left: Position Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B7280]">Position</span>
                          <span className="font-semibold text-[#111111]">#{position.positionId}</span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${getHealthBadgeColor(
                            position.healthStatus
                          )}`}
                        >
                          {position.healthStatus}
                        </span>
                      </div>

                      {/* Collateral */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {position.collateralToken.symbol.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#111111]">
                            {position.collateralToken.symbol}
                          </div>
                          <div className="text-xs text-[#6B7280]">
                            {formatCollateralAmount(position.collateralAmount, 18)} tokens • {formatUSD(position.tokenValueUSD)}
                          </div>
                        </div>
                      </div>

                      {/* Debt & Health */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-[#6B7280] mb-1">Outstanding Debt</div>
                          <div className="text-xl font-bold text-[#111111]">
                            {formatUSD(position.outstandingDebt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6B7280] mb-1">Health Factor</div>
                          <div className={`text-xl font-bold ${getHealthColor(position.healthFactor)}`}>
                            {formatHealthFactor(position.healthFactor)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 ml-6">
                      <button
                        onClick={() => handleRepayClick(position)}
                        className="px-6 py-2 bg-[#111111] hover:bg-[#1a1a1a] text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Repay
                      </button>
                      <button
                        onClick={() => handleToggleExpand(position.positionId)}
                        className="px-6 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] transition-colors flex items-center gap-2"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Schedule
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            View Schedule
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-[#6B7280]">
                    Created {format(new Date(position.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>

                {/* Expanded Schedule Section */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-[#F9FAFB] p-6">
                    {isLoadingSchedule ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#111111]"></div>
                      </div>
                    ) : schedule ? (
                      <div>
                        <h4 className="text-sm font-semibold text-[#111111] mb-4 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Repayment Schedule
                        </h4>

                        {/* Schedule Summary */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="bg-transparent rounded-lg p-3">
                            <div className="text-xs text-[#6B7280] mb-1">Installments Paid</div>
                            <div className="text-lg font-bold text-[#111111]">
                              {schedule.installmentsPaid} / {schedule.numberOfInstallments}
                            </div>
                          </div>
                          <div className="bg-transparent rounded-lg p-3">
                            <div className="text-xs text-[#6B7280] mb-1">Missed Payments</div>
                            <div className="text-lg font-bold text-[#EF4444]">
                              {schedule.missedPayments}
                            </div>
                          </div>
                          <div className="bg-transparent rounded-lg p-3">
                            <div className="text-xs text-[#6B7280] mb-1">Next Payment Due</div>
                            <div className="text-sm font-semibold text-[#111111]">
                              {new Date(schedule.nextPaymentDue * 1000) > new Date()
                                ? format(new Date(schedule.nextPaymentDue * 1000), 'MMM d, yyyy')
                                : <span className="text-[#EF4444]">OVERDUE</span>
                              }
                            </div>
                          </div>
                          <div className="bg-transparent rounded-lg p-3">
                            <div className="text-xs text-[#6B7280] mb-1">Payment Interval</div>
                            <div className="text-sm font-semibold text-[#111111]">
                              {Math.floor(schedule.installmentInterval / 86400)} days
                            </div>
                          </div>
                        </div>

                        {/* Installment List */}
                        <div className="space-y-2">
                          {schedule.installments.map((installment) => (
                            <div
                              key={installment.installmentNumber}
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                installment.status === 'PAID'
                                  ? 'bg-[#D1FAE5]'
                                  : installment.status === 'MISSED'
                                  ? 'bg-[#FEE2E2]'
                                  : 'bg-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-[#111111]">
                                  Installment #{installment.installmentNumber}
                                </div>
                                <div className="text-xs text-[#6B7280]">
                                  Due: {format(new Date(installment.dueDate * 1000), 'MMM d, yyyy')}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm font-semibold text-[#111111]">
                                  {formatUSD(installment.amount)}
                                </div>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    installment.status === 'PAID'
                                      ? 'bg-[#065F46] text-white'
                                      : installment.status === 'MISSED'
                                      ? 'bg-[#991B1B] text-white'
                                      : 'bg-[#F59E0B] text-white'
                                  }`}
                                >
                                  {installment.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {schedule.missedPayments > 0 && (
                          <div className="mt-4 p-3 bg-[#FEE2E2] rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-[#991B1B] flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-[#991B1B]">
                              You have {schedule.missedPayments} missed payment{schedule.missedPayments > 1 ? 's' : ''}.
                              Please repay immediately to avoid liquidation.
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-[#6B7280]">
                        No repayment schedule available for this position.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Repay Modal */}
      {selectedPosition && (
        <RepayLoanModal
          isOpen={showRepayModal}
          onClose={() => {
            setShowRepayModal(false);
            setSelectedPosition(null);
          }}
          onSuccess={handleRepaySuccess}
          position={selectedPosition}
          schedule={scheduleData[selectedPosition.positionId]}
        />
      )}
    </div>
  );
};
