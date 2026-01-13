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

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Filter, Calendar, AlertCircle, Info, Clock, DollarSign, X, RefreshCw } from 'lucide-react';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
import { solvencyContractService } from '../../lib/api/solvency-contract.service';
import { format } from 'date-fns';
import { RepayLoanModal } from './RepayLoanModal';
import { PageLoader } from '../ui/page-loader';
import { portfolioService, type PortfolioAsset } from '../../lib/api/portfolio.service';
import { marketplaceService } from '../../lib/api/marketplace.service';
import { ToastContainer } from '../ui/toast';
import { useToast } from '../../hooks/useToast';


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
  const { toasts, error: showError, removeToast } = useToast();
  const [scheduleData, setScheduleData] = useState<Record<number, LoanSchedule>>({});;
  const [loadingSchedule, setLoadingSchedule] = useState<Record<number, boolean>>({});
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [withdrawingPositionId, setWithdrawingPositionId] = useState<number | null>(null);
  const [withdrawnPositions, setWithdrawnPositions] = useState<Set<number>>(new Set());
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const data = await portfolioService.getPortfolio();
      setPortfolio(data.portfolio);

    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
    } finally {
    }
  };

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
    console.log('Repay successful for position', selectedPosition);
    console.log("withdrawing after repay");
    handleWithdrawConfirm();


    if (onRefresh) onRefresh();
    // Clear schedule cache to reload fresh data
    if (selectedPosition) {
      const newScheduleData = { ...scheduleData };
      delete newScheduleData[selectedPosition.positionId];
      setScheduleData(newScheduleData);
    }
  };

  const handleWithdrawClick = (position: Position, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

        

        const asset = portfolio.find(asset => asset.tokenAddress === selectedPosition.collateralTokenAddress);
        if (asset && asset.assetId) {
          await marketplaceService.notifyPurchase({
            assetId: asset.assetId,
            txHash: result.txHash!,
            amount: `${amountBigInt.toString()}`,
            blockNumber: result.blockNumber!.toString(),
            type: 'WITHDRAWAL',
          });

          await solvencyService.notifyCollateralWithdrawal({
            positionId: selectedPosition.positionId.toString(),
            amount: `${amountBigInt.toString()}`,
          })
        } else {
          console.warn('Asset not found in portfolio, skipping marketplace notifyPurchase for position', selectedPosition.positionId);
        }

        setShowWithdrawModal(false);
        setSelectedPosition(null);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error || 'Withdrawal failed');
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      showError(`Withdrawal failed: Please try again.`);
    } finally {
      setWithdrawingPositionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <PageLoader text='' />
      </div>
    );
  }

  if (positions.length === 0) {
    return (

      <div className="bg-transparent rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] h-full w-full flex items-center justify-center text-center">
        <div className=''>
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
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="flex-1 overflow-y-auto">
        {/* Filter Bar */}
        <div className="sticky flex flex-row items-center justify-between top-0 z-20 bg-transparent border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                ALL
              </button>
              <button
                onClick={() => setActiveFilter('healthy')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeFilter === 'healthy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                HEALTHY
              </button>
              <button
                onClick={() => setActiveFilter('warning')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeFilter === 'warning'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                AT RISK
              </button>
              <button
                onClick={() => setActiveFilter('critical')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeFilter === 'critical'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                CRITICAL
              </button>
              <button
                onClick={() => setActiveFilter('defaulted')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeFilter === 'defaulted'
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
            <thead className="sticky top-0 bg-transparent z-10">
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
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50'
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
                          className={`px-2 py-1 rounded text-xs font-medium ${position.collateralTokenType === 'RWA'
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
                        <div className="flex flex-col items-center justify-center gap-2">
                          {/* Repay Button - Only show when loan was issued (oaidCreditIssued = true) */}
                          {!position.isDefaulted && position.oaidCreditIssued && !hasDebt && (
                            <button
                              onClick={(e) => handleRepayClick(position, e)}
                              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors border ${isOverdue
                                  ? 'border-2 border-red-400 hover:border-red-600 bg-black text-white'
                                  : 'border-2 border-blue-400 hover:border-blue-600 bg-black text-white'
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
                              className="text-white px-2 py-1.5 rounded-xl text-xs font-medium border-2 bg-black hover:border-green-600 hover:border disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                                  <div className="bg-transparent rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <DollarSign className="w-4 h-4 text-gray-500" />
                                      <span className="text-xs font-medium text-gray-600">LTV Ratio</span>
                                    </div>
                                    <div className="text-lg font-bold text-foreground">
                                      {position.initialLTV ? (position.initialLTV / 100).toFixed(0) : 'N/A'}%
                                    </div>
                                  </div>

                                  {/* Total Installments */}
                                  <div className="bg-transparent rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <span className="text-xs font-medium text-gray-600">Installments</span>
                                    </div>
                                    <div className="text-lg font-bold text-foreground">
                                      {schedule.installmentsPaid} / {schedule.numberOfInstallments}
                                    </div>
                                  </div>

                                  {/* Missed Payments */}
                                  <div className="bg-transparent rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertCircle className="w-4 h-4 text-red-500" />
                                      <span className="text-xs font-medium text-gray-600">Missed</span>
                                    </div>
                                    <div className="text-lg font-bold text-red-600">
                                      {schedule.missedPayments}
                                    </div>
                                  </div>

                                  {/* Payment Interval */}
                                  <div className="bg-transparent rounded-lg p-4 border border-gray-200">
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
                                        className={`flex items-center justify-between p-3 rounded-lg border ${installment.status === 'PAID'
                                            ? 'bg-green-50 border-green-200'
                                            : installment.status === 'MISSED'
                                              ? 'bg-red-50 border-red-200'
                                              : 'bg-transparent border-gray-200'
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
                                            className={`px-2 py-1 rounded text-xs font-medium ${installment.status === 'PAID'
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
          />,
          document.body
        )}

        {/* Withdraw Confirmation Modal */}
        {selectedPosition && showWithdrawModal && createPortal(
          <div className="fixed inset-0 bg-slate-200/50 z-[9999] flex items-center justify-center backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-10 pt-10 pb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-geist">Withdraw Collateral</h2>
                  <p className="text-slate-500 text-sm font-geist mt-1">Confirm withdrawal from Position #{selectedPosition.positionId}</p>
                </div>
                {!withdrawingPositionId && (
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setSelectedPosition(null);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                  >
                    <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Withdrawal Details */}
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Token</span>
                      <span className="font-geist text-sm font-semibold text-slate-900">
                        {getTokenSymbol(selectedPosition.collateralTokenAddress)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Amount</span>
                      <span className="font-geist text-lg font-bold text-slate-900">
                        {formatCollateralAmount(selectedPosition.collateralAmount, 18)} tokens
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Value</span>
                      <span className="font-geist text-lg font-bold text-slate-900">
                        {formatUSD(selectedPosition.tokenValueUSD)}
                      </span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-geist text-amber-900">
                        Your collateral will be returned to your wallet. Please confirm the transaction in your wallet.
                      </p>
                    </div>
                  </div>

                  {/* Processing State */}
                  {withdrawingPositionId === selectedPosition.positionId && (
                   <><PageLoader/></>
                  )}
                </div>
              </div>

              {/* Footer */}
              {!withdrawingPositionId && (
                <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setSelectedPosition(null);
                    }}
                    className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleWithdrawConfirm}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 hover:shadow-xl active:scale-95 transition-all shadow-lg shadow-emerald-200"
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
    </>
  );
};
