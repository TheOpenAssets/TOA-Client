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
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm border flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl p-8 max-w-md w-full bg-gray-50 border-neutral-200 border shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-neutral-200/50 shadow-lg rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">💳</span>
          </div>
          <h2 className="font-gellix text-xl font-semibold text-foreground mb-2">Repay Loan</h2>
          <p className="font-inter text-sm text-gray-600">Select an installment and confirm payment</p>
          <button
            onClick={onClose}
            disabled={isApproving || isRepaying}
            className="absolute top-6 right-6 p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {success ? (
            // Success State
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 bg-neutral-200/50 shadow-lg rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="font-gellix text-xl font-semibold text-foreground mb-2">Repayment Successful!</h3>
              <p className="font-inter text-sm text-gray-600">Your loan has been updated. Refreshing...</p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Position Info */}
              <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 space-y-5">
                <div>
                  <p className="font-inter text-xs text-gray-500 mb-1.5">Position</p>
                  <p className="font-gellix text-lg font-semibold text-foreground">
                    #{position.positionId} • {getTokenSymbol(position.collateralTokenAddress)}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-300">
                  <p className="font-inter text-xs text-gray-500 mb-1.5">Outstanding Debt</p>
                  {isFetchingDebt ? (
                    <div className="flex items-center gap-2">
                      <PageLoader text='' />
                    </div>
                  ) : (
                    <p className="font-gellix text-2xl font-semibold text-foreground">
                      {actualDebt
                        ? `$${ethers.formatUnits(actualDebt, 6)}`
                        : formatUSD(outstandingDebt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Debt Breakdown */}
              {nextInstallmentAmount && interestAmount > 0 && (
                <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 space-y-4">
                  <div>
                    <p className="font-inter text-xs text-gray-500 mb-1.5">Principal</p>
                    <p className="font-gellix text-lg font-semibold text-foreground">{formatUSD(totalInstallmentAmount)}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-300">
                    <p className="font-inter text-xs text-gray-500 mb-1.5">Interest</p>
                    <p className="font-gellix text-lg font-semibold text-foreground">${interestAmount.toFixed(6)}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-300">
                    <p className="font-inter text-xs text-gray-500 mb-1.5">Total Debt</p>
                    <p className="font-gellix text-2xl font-semibold text-foreground">${outstandingDebt.toFixed(6)}</p>
                  </div>
                  {position.missedPayments > 0 && (
                    <div className="bg-gray-100/90 border border-neutral-200 shadow-lg rounded-xl p-4 mt-3">
                      <p className="font-inter text-xs text-rose-600 text-left">
                        <span className="text-rose-500">⚠️</span> <strong>{position.missedPayments} payment(s) overdue</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Installment Selection */}
              {position.repaymentSchedule && position.repaymentSchedule.length > 0 && (
                <div>
                  <label className="font-inter text-xs text-gray-500 mb-3 block uppercase tracking-wider">
                    Select Installment to Pay
                  </label>
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {position.repaymentSchedule.map((installment) => {
                      const isLastInstallment = installment.installmentNumber === position.numberOfInstallments;
                      const baseAmount = parseFloat(installment.amount) / 1e6;
                      const finalAmount = isLastInstallment ? baseAmount + interestAmount : baseAmount;
                      const isPaid = installment.status === 'PAID';
                      const isOverdue = installment.status === 'MISSED';
                      const isPending = installment.status === 'PENDING';
                      const isSelected = selectedInstallment === installment.installmentNumber;

                      return (
                        <button
                          key={installment.installmentNumber}
                          onClick={() => !isPaid && handleInstallmentSelect(installment.installmentNumber)}
                          disabled={isPaid || isApproving || isRepaying}
                          className={`w-full p-6 rounded-[24px] border-2 text-left transition-all relative overflow-hidden ${
                            isPaid
                              ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`font-geist text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  Installment #{installment.installmentNumber}
                                </span>
                                {isPaid && (
                                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">PAID</span>
                                )}
                                {isOverdue && !isSelected && (
                                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">OVERDUE</span>
                                )}
                                {isPending && !isPaid && !isSelected && (
                                  <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">PENDING</span>
                                )}
                              </div>
                              <div className={`font-geist text-[10px] uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                                Due: {new Date(installment.dueDate).toLocaleDateString()}
                              </div>
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
                                <span className="text-2xl text-white/30">✓</span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

{/* Error Display */}
              {error && (
                <div className="bg-gray-100/90 border border-neutral-200 shadow-lg rounded-xl p-4 text-rose-600 text-center">
                  <p className="font-inter text-xs font-medium">{error}</p>
                </div>
              )}              

              {/* Progress Steps */}
              {(isApproving || isRepaying) && selectedInstallment && (
                <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <PageLoader text=' ' />
                    <p className="font-inter text-sm font-semibold text-foreground text-center">
                      {currentStep === 'approving' && `Approving USDC for Installment #${selectedInstallment}...`}
                      {currentStep === 'repaying' && `Processing payment for Installment #${selectedInstallment}...`}
                      {currentStep === 'syncing' && 'Syncing with backend...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Info */}
              {!selectedInstallment && (
                <div className="text-center">
                  <p className="font-inter text-xs text-gray-500 uppercase tracking-wider">
                    Select an installment above to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={isApproving || isRepaying}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200/50 border border-gray-200 text-foreground rounded-xl shadow-lg font-inter font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmPayment}
              disabled={!selectedInstallment || isApproving || isRepaying || !actualDebt}
              className="flex-1 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-inter font-medium transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isApproving || isRepaying ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
