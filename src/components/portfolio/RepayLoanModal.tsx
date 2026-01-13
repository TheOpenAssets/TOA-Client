/**
 * Repay Loan Modal
 *
 * ✅ SPECIFICATION COMPLIANT
 * Reference: Solvency Vault End-to-End Flow - Section 7
 *
 * Features:
 * - Pre-fills next unpaid installment amount
 * - Approves USDC for SolvencyVault
 * - Calls POST /solvency/repay
 * - Refreshes loan schedule and OAID credit after success
 */

import { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
import { solvencyContractService } from '../../lib/api/solvency-contract.service';
import { PageLoader } from '../ui/page-loader';

interface RepayLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  position: Position;
}

const formatUSD = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) / 1e6 : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Derive token symbol from address
const getTokenSymbol = (address: string) => {
  const shortAddr = address.slice(2, 8).toUpperCase();
  return `TKN-${shortAddr}`;
};

export const RepayLoanModal = ({
  isOpen,
  onClose,
  onSuccess,
  position,
}: RepayLoanModalProps) => {
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'approving' | 'repaying' | 'syncing'>('input');
  const [actualDebt, setActualDebt] = useState<bigint | null>(null);
  const [isFetchingDebt, setIsFetchingDebt] = useState(false);

  const outstandingDebt = actualDebt ? parseFloat(ethers.formatUnits(actualDebt, 6)) : parseFloat(position.outstandingDebt || '0') / 1e6;

  // Calculate total installment amounts and interest
  const { totalInstallmentAmount, interestAmount } = useMemo(() => {
    if (!position.repaymentSchedule || position.repaymentSchedule.length === 0 || !actualDebt) {
      return { totalInstallmentAmount: 0, interestAmount: 0 };
    }

    const total = position.repaymentSchedule.reduce((sum, inst) => sum + parseFloat(inst.amount), 0) / 1e6;
    const actualDebtUSD = parseFloat(ethers.formatUnits(actualDebt, 6));
    const interest = actualDebtUSD - total;

    return { totalInstallmentAmount: total, interestAmount: Math.max(0, interest) };
  }, [position.repaymentSchedule, actualDebt]);

  // Fetch actual outstanding debt when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchDebt = async () => {
        setIsFetchingDebt(true);
        try {
          console.log('📊 Fetching actual outstanding debt from chain...');
          const debt = await solvencyContractService.getOutstandingDebt(position.positionId);
          setActualDebt(debt);
          console.log(`✅ Fetched debt: $${ethers.formatUnits(debt, 6)} USDC`);
        } catch (err) {
          console.error('Failed to fetch debt:', err);
          // Fall back to position's outstanding debt
          setActualDebt(null);
        } finally {
          setIsFetchingDebt(false);
        }
      };
      fetchDebt();
    }
  }, [isOpen, position.positionId]);

  // Calculate next installment amount
  const nextInstallmentAmount = useMemo(() => {
    if (!position.repaymentSchedule || position.repaymentSchedule.length === 0) return null;

    const nextUnpaid = position.repaymentSchedule.find(
      i => i.status === 'PENDING' || i.status === 'MISSED'
    );

    if (!nextUnpaid) return null;

    return parseFloat(nextUnpaid.amount) / 1e6;
  }, [position.repaymentSchedule]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedInstallment(null);
      setError(null);
      setSuccess(false);
      setCurrentStep('input');
      setIsApproving(false);
      setIsRepaying(false);
      setActualDebt(null);
    }
  }, [isOpen]);

  const handleInstallmentSelect = (installmentNumber: number) => {
    if (!position.repaymentSchedule || position.repaymentSchedule.length === 0) return;

    const installment = position.repaymentSchedule.find(i => i.installmentNumber === installmentNumber);
    if (!installment || installment.status === 'PAID') return;

    setSelectedInstallment(installmentNumber);
    setError(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInstallment || !actualDebt) return;

    setError(null);
    setCurrentStep('approving');
    setIsApproving(true);

    try {
      // Find the installment
      const installment = position.repaymentSchedule?.find(i => i.installmentNumber === selectedInstallment);
      if (!installment) {
        throw new Error('Installment not found');
      }

      // Calculate amount: base installment + interest (if last installment)
      const isLastInstallment = selectedInstallment === position.numberOfInstallments;
      const baseAmount = parseFloat(installment.amount) / 1e6;
      const finalAmount = isLastInstallment ? baseAmount + interestAmount + 0.5 : baseAmount;


      // Round to 6 decimals properly and convert to Wei (USDC has 6 decimals)
      // Ensure we maintain precision by rounding at the micro-unit level
      const finalAmountMicro = Math.round(finalAmount * 1e6);
      let amountWei = BigInt(finalAmountMicro);

      console.log(`💰 Paying Installment #${selectedInstallment}:`, {
        baseAmount: `$${baseAmount.toFixed(6)}`,
        interest: isLastInstallment ? `$${interestAmount.toFixed(6)}` : '$0',
        finalAmount: `$${finalAmount.toFixed(6)}`,
        finalAmountMicro: finalAmountMicro,
        amountWei: amountWei.toString(),
        amountWeiInUSDC: `$${(Number(amountWei) / 1e6).toFixed(6)}`,
      });

      // Cap to actual debt (safety check)
      if (amountWei > actualDebt) {
        console.log(`⚠️ Capping payment to actual debt`, {
          calculatedAmount: `$${(Number(amountWei) / 1e6).toFixed(6)}`,
          actualDebt: `$${ethers.formatUnits(actualDebt, 6)}`,
        });
        amountWei = actualDebt;
      }

      // Step 1: Approve USDC
      console.log('📝 Approving USDC for Vault...');
      const approvalResult = await solvencyContractService.approveUSDCForSeniorPool(amountWei);

      if (!approvalResult.success) {
        throw new Error(approvalResult.error || 'USDC approval failed');
      }

      setIsApproving(false);
      setCurrentStep('repaying');
      setIsRepaying(true);

      // Step 2: Repay loan
      console.log('💵 Repaying loan via Senior Pool:', {
        positionId: position.positionId,
        amountWei: amountWei.toString(),
        amountInUSDC: `$${(Number(amountWei) / 1e6).toFixed(6)}`,
        expectedFinalAmount: `$${finalAmount.toFixed(6)}`,
        match: (Number(amountWei) / 1e6).toFixed(6) === finalAmount.toFixed(6) ? '✅ MATCH' : '❌ MISMATCH'
      });

      const repayResult = await solvencyContractService.repayLoanViaSeniorPool(
        position.positionId,
        amountWei
      );

      if (!repayResult.success) {
        throw new Error(repayResult.error || 'Repayment failed');
      }

      setCurrentStep('syncing');

      // Step 3: Notify backend
      console.log('🔄 Notifying backend...');
      try {
        await solvencyService.notifyLoanRepayment({
          txHash: repayResult.txHash!,
          positionId: position.positionId.toString(),
          repaymentAmount: amountWei.toString(),
          blockNumber: repayResult.blockNumber?.toString(),
        });
      } catch (syncError) {
        console.warn('⚠️ Manual notification failed (events will auto-sync):', syncError);
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('❌ Repayment error:', err);
      setError(err.message || 'An error occurred during repayment');
      setCurrentStep('input');
      setSelectedInstallment(null);
    } finally {
      setIsApproving(false);
      setIsRepaying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent z-[9999] flex items-center justify-center backdrop-blur-md p-4">
      <div className="bg-white/80 w-full max-w-lg rounded-2xl border border-gray-200 overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-geist">Repay Loan</h2>
            <p className="text-slate-500 text-sm font-geist mt-1">Select an installment and confirm payment</p>
          </div>
          <button
            onClick={onClose}
            disabled={isApproving || isRepaying}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
          {success ? (
            // Success State
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-emerald-100 shadow-lg">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 font-geist">Repayment Successful!</h3>
              <p className="text-slate-500 font-geist">Your loan has been updated. Refreshing...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Position Info */}
              <div className="p-6 rounded-3xl bg-white-50 border border-gray-100 shadow-xl space-y-4 flex flex-col">
                <div className="flex flex-row justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Position</span>
                  <span className="font-geist text-sm font-semibold text-slate-900">
                    #{position.positionId} • {getTokenSymbol(position.collateralTokenAddress)}
                  </span>
                </div>
                <div className="flex min-w-full">

                  {isFetchingDebt ? (
                    <div className="flex w-full h-full items-center justify-center">
                      <div className='max-h-[10%]'><PageLoader text=''/></div>
                    </div>
                  ) : (
                    <div className="flex flex-row justify-between items-center w-full">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Outstanding Debt</span>
                      <span className="font-geist text-lg font-bold text-slate-900">
                        {actualDebt
                          ? `$${ethers.formatUnits(actualDebt!, 6)}`
                          : formatUSD(outstandingDebt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Debt Breakdown */}
              {nextInstallmentAmount && interestAmount > 0 && (
                <div className="p-6 rounded-3xl bg-white-100 border border-gray-100 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Debt Breakdown</h4>
                  </div>
                  <div className="space-y-2 font-geist text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Principal</span>
                      <span className="text-slate-900 font-semibold">{formatUSD(totalInstallmentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Interest</span>
                      <span className="text-slate-900 font-semibold">${interestAmount.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-900 font-bold">Total Debt</span>
                      <span className="text-slate-900 font-bold">${outstandingDebt.toFixed(6)}</span>
                    </div>
                    {position.missedPayments > 0 && (
                      <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <span className="text-xs font-bold text-rose-600">⚠️ {position.missedPayments} payment(s) overdue</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Installment Selection */}
              {position.repaymentSchedule && position.repaymentSchedule.length > 0 && (
                <div>
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {(() => {
                      const first = position.repaymentSchedule.find(
                        i => i.status === 'PENDING' || i.status === 'MISSED'
                      );

                      // Auto-select the first pending installment when available
                      function AutoSelect() {
                        useEffect(() => {
                          if (first && !selectedInstallment) {
                            handleInstallmentSelect(first.installmentNumber);
                          }
                          // eslint-disable-next-line react-hooks/exhaustive-deps
                        }, [first?.installmentNumber]);
                        return null;
                      }

                      if (!first) {
                        return (
                          <div className="p-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-medium font-geist text-center border border-slate-100">
                            All installments are paid!
                          </div>
                        );
                      }

                      const isLastInstallment = first.installmentNumber === position.numberOfInstallments;
                      const baseAmount = parseFloat(first.amount) / 1e6;
                      const finalAmount = isLastInstallment ? baseAmount + interestAmount : baseAmount;
                      const isSelected = selectedInstallment === first.installmentNumber;

                      return (
                        <>
                          <AutoSelect />
                          <div
                            className={`w-full p-6 rounded-[24px] border-2 text-left transition-all relative overflow-hidden ${isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                              : 'border-slate-100 bg-white'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`font-geist text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                    Installment #{first.installmentNumber}
                                  </span>
                                </div>
                                <div className={`font-geist text-[10px] uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                                  Due: {new Date(first.dueDate).toLocaleDateString()}
                                </div>
                                {first.status === 'MISSED' && (
                                  <div className="mt-2 text-rose-600 text-xs font-bold">⚠️ Missed payment</div>
                                )}
                              </div>

                              <div className="text-right">
                                <div className={`font-geist text-2xl font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  {formatUSD(finalAmount)}
                                </div>
                                {isLastInstallment && interestAmount > 0 && (
                                  <div className={`font-geist text-[10px] uppercase tracking-wider mt-1 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                                    +${interestAmount.toFixed(6)} interest
                                  </div>
                                )}
                              </div>

                              {isSelected && (
                                <div className="absolute top-4 right-4">
                                  <CheckCircle className="w-5 h-5 text-white/30" />
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold font-geist text-center border border-rose-100">
                  {error}
                </div>
              )}

              {/* Progress Steps */}
              {(isApproving || isRepaying) && selectedInstallment && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-slate-700 animate-spin" >
                      <PageLoader />
                    </div>
                    <div className="font-geist text-sm text-slate-900 font-medium">
                      {currentStep === 'approving' && `Approving USDC for Installment #${selectedInstallment}...`}
                      {currentStep === 'repaying' && `Processing payment for Installment #${selectedInstallment}...`}
                      {currentStep === 'syncing' && 'Syncing with backend...'}
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              {!selectedInstallment && (
                <div className="text-center">
                  <p className="font-geist text-xs text-slate-500 uppercase tracking-wider">
                    Select an installment above to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isApproving || isRepaying}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmPayment}
              disabled={!selectedInstallment || isApproving || isRepaying || !actualDebt}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:shadow-xl active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving || isRepaying ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
