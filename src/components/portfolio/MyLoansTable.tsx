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
import { ChevronDown, ChevronUp, Filter, Calendar, AlertCircle, Info, Clock, DollarSign, X, Activity, Layers, Timer } from 'lucide-react';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
import { solvencyContractService } from '../../lib/api/solvency-contract.service';
import { format } from 'date-fns';
import { RepayLoanModal } from './RepayLoanModal';
import { PartnerRepayModal } from '../../pages/borrow/components/PartnerRepayModal';
import { PageLoader } from '../ui/page-loader';
import { portfolioService } from '../../lib/api/portfolio.service';
import type { PortfolioAsset } from '../../types/portfolio.types';
import type { PartnerLoan } from '../../types/creditcoin.types';
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

// Calculate outstanding debt: platform USDC (6 decimals) + active partner loans (6 decimals)
const getOutstandingDebt = (position: Position): string => {
  const platformDebt = parseFloat(position.usdcBorrowed || '0');
  const partnerDebt = (position.partnerLoans || [])
    .filter(pl => pl.status === 'ACTIVE')
    .reduce((sum, pl) => sum + parseFloat(pl.remainingDebt || '0'), 0);
  return (platformDebt + partnerDebt).toString();
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

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-700';
    case 'REPAID':
      return 'bg-green-100 text-green-700';
    case 'SETTLED':
      return 'bg-gray-100 text-gray-700';
    case 'LIQUIDATED':
      return 'bg-red-100 text-red-700';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-700';
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
  const [showPartnerRepayModal, setShowPartnerRepayModal] = useState(false);
  const [selectedPartnerLoan, setSelectedPartnerLoan] = useState<PartnerLoan | null>(null);
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

    // Check if we already have the schedule in the position object
    const position = positions.find(p => p.positionId === positionId);
    const hasSchedule = (position as any)?.repaymentSchedule?.length > 0;

    // Load schedule if not already loaded and not in position
    if (!hasSchedule && !scheduleData[positionId] && !loadingSchedule[positionId]) {
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

  const handleRepaySuccess = (isLastInstallment?: boolean) => {
    setShowRepayModal(false);
    setSelectedPosition(null);
    console.log('Repay successful for position', selectedPosition);
    console.log("withdrawing after repay");

    if (isLastInstallment) {
      handleWithdrawConfirm();
    }


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

      // await handleConfirmPayment();
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

  // const handleConfirmPayment = async () => {
  //   if (!selectedPosition) {
  //     throw new Error('No position selected');
  //   }

  //   try {
  //     // derive amount to repay (use outstanding debt string and convert to BigInt)
  //     const debt = await solvencyContractService.getOutstandingDebt(selectedPosition.positionId);
  //     console.log('Outstanding debt to repay:', debt);
  //     const amountWei = BigInt(debt);

  //     // Step 1: Approve USDC
  //     console.log('📝 Approving USDC for Vault...');
  //     const approvalResult = await solvencyContractService.approveUSDCForSeniorPool(amountWei);

  //     if (!approvalResult.success) {
  //       throw new Error(approvalResult.error || 'USDC approval failed');
  //     }

  //     const repayResult = await solvencyContractService.repayLoanViaSeniorPool(
  //       selectedPosition.positionId,
  //       amountWei
  //     );

  //     if (!repayResult.success) {
  //       throw new Error(repayResult.error || 'Repayment failed');
  //     }
  //   } catch (err: any) {
  //     console.error('❌ Repayment error:', err);
  //     throw err;
  //   }
  // };

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
        <div className="sticky flex flex-row items-center justify-between top-0 z-20 bg-transparent border-b border-gray-200 px-6 py-3 backdrop-blur-sm">
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
                  Collateral Amount
                </th>
                <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                  USDC Borrowed
                </th>
                <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                  Loan Source
                </th>

                <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                  Health Status
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
                const pos = position as any;
                const schedule = scheduleData[position.positionId];
                const isLoadingSchedule = loadingSchedule[position.positionId];
                const isOverdue = isPaymentOverdue(position.nextPaymentDueDate);
                const outstandingDebt = parseFloat(getOutstandingDebt(position));
                const platformDebt = parseFloat(position.usdcBorrowed || '0');
                const activePartnerLoans = (position.partnerLoans || []).filter(
                  pl => pl.status === 'ACTIVE' && parseFloat(pl.remainingDebt) > 0
                );
                const hasPartnerDebt = activePartnerLoans.length > 0;
                const hasDebt = platformDebt > 0;
                const hasAnyDebt = outstandingDebt > 0;
                const hasCollateral = parseFloat(position.collateralAmount) > 0;
                const wasWithdrawn = withdrawnPositions.has(position.positionId);
                // Can only withdraw when there is truly zero outstanding debt (platform + partner)
                const canWithdraw = hasCollateral && !hasAnyDebt && !position.isDefaulted && !wasWithdrawn;

                // Use schedule from position if available, otherwise from fetched data
                const displaySchedule = pos.repaymentSchedule || schedule?.installments;
                const scheduleInfo = pos.repaymentSchedule ? pos : schedule;

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

                      {/* Loan Source */}
                      <td className="px-4 py-4 text-center">
                        {position.partnerLoans && position.partnerLoans.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            {position.partnerLoans.map((pl, i) => (
                              <span key={i} className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                {pl.partnerName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            Platform
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                            position.status
                          )}`}
                        >
                          {position.status}
                        </span>
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
                          {/* Platform repay — only when OAID loan was issued */}
                          {!position.isDefaulted && position.oaidCreditIssued && hasDebt && (
                            <button
                              onClick={(e) => handleRepayClick(position, e)}
                              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors border-2 bg-black text-white`}
                            >
                              {isOverdue ? 'Overdue - Repay' : 'Repay'}
                            </button>
                          )}

                          {/* Partner repay — one button per active partner loan */}
                          {!position.isDefaulted && activePartnerLoans.map(pl => (
                            <button
                              key={pl.internalLoanId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPartnerLoan(pl);
                                setShowPartnerRepayModal(true);
                              }}
                              className="px-4 py-1.5 rounded-xl text-xs font-medium border-2 bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                            >
                              Repay {pl.partnerName}
                            </button>
                          ))}

                          {/* Withdraw — only when zero total debt */}
                          {canWithdraw && (
                            <button
                              onClick={(e) => handleWithdrawClick(position, e)}
                              disabled={withdrawingPositionId === position.positionId}
                              className="text-white px-2 py-1.5 rounded-xl text-xs font-medium border-2 bg-black hover:border-green-600 hover:border disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {withdrawingPositionId === position.positionId ? 'Withdrawing...' : 'Withdraw'}
                            </button>
                          )}

                          {/* Blocked withdraw hint — has debt but has collateral */}
                          {hasCollateral && hasAnyDebt && !position.isDefaulted && (
                            <span className="text-xs text-gray-400 text-center leading-tight">
                              Repay debt to<br />withdraw
                            </span>
                          )}

                          {position.isDefaulted && (
                            <span className="text-xs text-gray-400">Defaulted</span>
                          )}

                          {!hasCollateral && !hasAnyDebt && !position.isDefaulted && !wasWithdrawn && (
                            <span className="text-xs text-gray-400">No Actions</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="px-0 py-0">
                          <div className="bg-transparent border-b border-gray-200">
                            {isLoadingSchedule && !displaySchedule ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            ) : scheduleInfo ? (
                              <div className="p-6">
                                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                                  {/* Left Column - 40% - Current Metrics */}
                                  <div className="lg:w-[40%] flex flex-col gap-4">
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                      <Activity className="w-4 h-4" /> Loan Overview
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 h-full">
                                      {/* LTV Ratio */}
                                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg flex flex-col justify-between">
                                        <div className="flex items-center gap-2 mb-1">
                                          <DollarSign className="w-4 h-4 text-gray-500" />
                                          <span className="text-xs font-medium text-gray-600">LTV Ratio</span>
                                        </div>
                                        <div className="text-lg font-bold text-foreground">
                                          {position.initialLTV ? (position.initialLTV / 100).toFixed(0) : 'N/A'}%
                                        </div>
                                      </div>

                                      {/* Total Installments */}
                                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg flex flex-col justify-between">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Layers className="w-4 h-4 text-gray-500" />
                                          <span className="text-xs font-medium text-gray-600">Installments</span>
                                        </div>
                                        <div className="text-lg font-bold text-foreground">
                                          {scheduleInfo.installmentsPaid} / {scheduleInfo.numberOfInstallments}
                                        </div>
                                      </div>

                                      {/* Missed Payments */}
                                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg flex flex-col justify-between">
                                        <div className="flex items-center gap-2 mb-1">
                                          <AlertCircle className="w-4 h-4 text-red-500" />
                                          <span className="text-xs font-medium text-gray-600">Missed</span>
                                        </div>
                                        <div className="text-lg font-bold text-red-600">
                                          {scheduleInfo.missedPayments}
                                        </div>
                                      </div>

                                      {/* Payment Interval */}
                                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg flex flex-col justify-between">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Timer className="w-4 h-4 text-gray-500" />
                                          <span className="text-xs font-medium text-gray-600">Interval</span>
                                        </div>
                                        <div className="text-lg font-bold text-foreground">
                                          {Math.floor(scheduleInfo.installmentInterval / 86400)}d
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Column - 60% - New Details */}
                                  <div className="lg:w-[60%] flex flex-col gap-4">
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                      <Info className="w-4 h-4" /> Position Details
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 h-full">
                                      <DetailItem label="Current Health" value={pos.currentHealthFactor ? `${(pos.currentHealthFactor / 100).toFixed(2)}%` : 'N/A'} />
                                      <DetailItem label="Total Repaid" value={formatUSD(pos.totalRepaid || '0')} />
                                      <DetailItem label="Loan Duration" value={pos.loanDuration ? `${Math.floor(pos.loanDuration / 86400)} Days` : 'N/A'} />
                                      <DetailItem label="Partner Debt" value={formatUSD(pos.totalPartnerDebt || '0')} />
                                      <DetailItem label="Deposit Block" value={pos.depositBlockNumber || 'N/A'} />
                                      <DetailItem label="Last Updated" value={pos.updatedAt ? format(new Date(pos.updatedAt), 'MMM d, HH:mm') : 'N/A'} />
                                    </div>
                                  </div>
                                </div>

                                {/* Partner Loans */}
                                {pos.partnerLoans && pos.partnerLoans.length > 0 && (
                                  <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                      <Layers className="w-4 h-4" /> Partner Loans
                                    </h4>
                                    <div className="space-y-2">
                                      {pos.partnerLoans.map((pl: any) => (
                                        <div key={pl.internalLoanId} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-semibold text-orange-800">{pl.partnerName}</span>
                                            <span className="text-xs text-gray-500 font-mono">{pl.partnerLoanId}</span>
                                          </div>
                                          <div className="flex items-center gap-6">
                                            <div className="text-center">
                                              <p className="text-xs text-gray-500">Principal</p>
                                              <p className="text-sm font-semibold text-foreground">{formatUSD(pl.principalAmount)}</p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-xs text-gray-500">Remaining</p>
                                              <p className="text-sm font-semibold text-foreground">{formatUSD(pl.remainingDebt)}</p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-xs text-gray-500">Repaid</p>
                                              <p className="text-sm font-semibold text-foreground">{formatUSD(pl.totalRepaid)}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${pl.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                              {pl.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Repayment Schedule */}
                                <div>
                                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 pt-4 border-t border-gray-200">
                                    <Calendar className="w-4 h-4" />
                                    Repayment Schedule
                                  </h4>

                                  <div className="space-y-2">
                                    {displaySchedule?.map((installment: any) => (
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
                                            Due: {format(new Date(installment.dueDate), 'MMM d, yyyy')}
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

                                  {scheduleInfo.missedPayments > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2 border border-red-200">
                                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                      <div className="text-sm text-red-700">
                                        <strong>Warning:</strong> You have {scheduleInfo.missedPayments} missed payment
                                        {scheduleInfo.missedPayments > 1 ? 's' : ''}. Please repay immediately to avoid liquidation.
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
                                        href={`https://sepolia.arbitrumscan.xyz/tx/${position.depositTxHash}`}
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

        {/* Platform Repay Modal */}
        {selectedPosition && createPortal(
          <RepayLoanModal
            isOpen={showRepayModal}
            onClose={() => {
              setShowRepayModal(false);
              setSelectedPosition(null);
            }}
            onSuccess={(isLastInstallment: boolean) => handleRepaySuccess(isLastInstallment)}
            position={selectedPosition}
          />,
          document.body
        )}

        {/* Partner Repay Modal */}
        {selectedPartnerLoan && createPortal(
          <PartnerRepayModal
            isOpen={showPartnerRepayModal}
            loan={selectedPartnerLoan}
            onClose={() => {
              setShowPartnerRepayModal(false);
              setSelectedPartnerLoan(null);
            }}
            onSuccess={() => {
              setShowPartnerRepayModal(false);
              setSelectedPartnerLoan(null);
              if (onRefresh) onRefresh();
            }}
          />,
          document.body
        )}

        {/* Withdraw Confirmation Modal */}
        {selectedPosition && showWithdrawModal && createPortal(
          <div className="fixed inset-0 bg-transparent backdrop-blur-sm border flex items-center justify-center z-50 p-4">
            <div className="relative rounded-2xl p-8 max-w-md w-full bg-gray-50 border-neutral-200 border shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
              {/* Close Button */}
              {!withdrawingPositionId && (
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setSelectedPosition(null);
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-neutral-200/50 shadow-lg rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="text-2xl">💸</span>
                </div>
                <h2 className="font-gellix text-xl font-semibold text-foreground mb-2">Withdraw Collateral</h2>
                <p className="font-inter text-sm text-gray-600">Confirm withdrawal from Position #{selectedPosition.positionId}</p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Collateral summary */}
                  <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-inter text-xs text-gray-500">Token</p>
                      <p className="font-gellix text-sm font-semibold text-foreground">
                        {getTokenSymbol(selectedPosition.collateralTokenAddress)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-300 pt-3">
                      <p className="font-inter text-xs text-gray-500">Collateral Deposited</p>
                      <p className="font-gellix text-sm font-semibold text-foreground">
                        {formatCollateralAmount(selectedPosition.collateralAmount, 18)} tokens
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-300 pt-3">
                      <p className="font-inter text-xs text-gray-500">Collateral Value</p>
                      <p className="font-gellix text-sm font-semibold text-foreground">
                        {formatUSD(selectedPosition.tokenValueUSD)}
                      </p>
                    </div>
                  </div>

                  {/* Debt breakdown — shown when debt exists */}
                  {(() => {
                    const selPlatformDebt = parseFloat(selectedPosition.usdcBorrowed || '0');
                    const selPartnerLoans = (selectedPosition.partnerLoans || []).filter(
                      pl => pl.status === 'ACTIVE' && parseFloat(pl.remainingDebt) > 0
                    );
                    const selTotalDebt = selPlatformDebt + selPartnerLoans.reduce(
                      (s, pl) => s + parseFloat(pl.remainingDebt), 0
                    );
                    if (selTotalDebt === 0) return null;
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
                        <p className="font-gellix text-sm font-semibold text-red-700">Outstanding Debt</p>
                        {selPlatformDebt > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-inter">Platform loan</span>
                            <span className="font-semibold text-foreground">{formatUSD(selectedPosition.usdcBorrowed)}</span>
                          </div>
                        )}
                        {selPartnerLoans.map(pl => (
                          <div key={pl.internalLoanId} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-inter">{pl.partnerName}</span>
                            <span className="font-semibold text-foreground">{formatUSD(pl.remainingDebt)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between border-t border-red-200 pt-2">
                          <span className="font-gellix text-sm font-semibold text-red-700">Total to Repay</span>
                          <span className="font-gellix text-base font-bold text-red-700">{formatUSD(selTotalDebt.toString())}</span>
                        </div>
                        <p className="font-inter text-xs text-red-600">
                          You must repay all outstanding debt before withdrawing collateral.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Warning */}
                  <div className="bg-gray-100/90 border border-neutral-200 shadow-lg rounded-xl p-4">
                    <p className="font-inter text-xs text-gray-700 text-left">
                      <span className="text-gray-500">⚠️</span> <strong>Important:</strong> Your collateral will be returned to your wallet. Please confirm the transaction in your wallet.
                    </p>
                  </div>

                  {/* Processing State */}
                  {withdrawingPositionId === selectedPosition.positionId && (
                    <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <PageLoader text='' />
                        <p className="font-inter text-sm font-semibold text-foreground text-center">Processing Withdrawal...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              {!withdrawingPositionId && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setSelectedPosition(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200/50 border border-gray-200 text-foreground rounded-xl shadow-lg font-inter font-medium transition-all hover:scale-105"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleWithdrawConfirm}
                    className="flex-1 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-inter font-medium transition-all shadow-lg hover:scale-105"
                  >
                    Withdraw Now
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

// Helper component for detail items
const DetailItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg flex flex-col justify-between h-full min-h-[80px]">
    <span className="text-xs font-medium text-gray-500 mb-1">{label}</span>
    <span className="text-sm font-bold text-gray-900 break-words">{value}</span>
  </div>
);
