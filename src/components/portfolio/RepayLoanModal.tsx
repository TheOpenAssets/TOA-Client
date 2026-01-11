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
import { X, RefreshCw, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
import { solvencyContractService } from '../../lib/api/solvency-contract.service';

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

  const handleInstallmentPay = async (installmentNumber: number) => {
    if (!position.repaymentSchedule || position.repaymentSchedule.length === 0 || !actualDebt) return;

    setError(null);
    setSelectedInstallment(installmentNumber);
    setCurrentStep('approving');
    setIsApproving(true);

    try {
      // Find the installment
      const installment = position.repaymentSchedule.find(i => i.installmentNumber === installmentNumber);
      if (!installment) {
        throw new Error('Installment not found');
      }

      // Calculate amount: base installment + interest (if last installment)
      const isLastInstallment = installmentNumber === position.numberOfInstallments;
      const baseAmount = parseFloat(installment.amount) / 1e6;
      const finalAmount = isLastInstallment ? baseAmount + interestAmount : baseAmount;
      
      let amountWei = ethers.parseUnits(finalAmount.toFixed(6), 6);

      console.log(`💰 Paying Installment #${installmentNumber}:`, {
        baseAmount: `$${baseAmount.toFixed(6)}`,
        interest: isLastInstallment ? `$${interestAmount.toFixed(6)}` : '$0',
        finalAmount: `$${finalAmount.toFixed(6)}`,
      });

      // Cap to actual debt (safety check)
      if (amountWei > actualDebt) {
        console.log(`⚠️ Capping payment to actual debt`);
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
      console.log('💵 Repaying loan...');
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent backdrop-blur-lg border p-4">
      <div
        className="rounded-2xl p-8 max-w-md w-full bg-transparent border-neutral-300 border max-h-[90vh] overflow-y-auto"
        style={{
          boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-gellix text-xl font-semibold text-foreground">Repay Loan</h2>
          <button
            onClick={onClose}
            disabled={isApproving || isRepaying}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          // Success State
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-gellix text-xl font-semibold text-foreground mb-2">
              Repayment Successful!
            </h3>
            <p className="font-inter text-sm text-gray-600">
              Your loan has been updated. The page will refresh automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Position Info */}
            <div className="bg-gray-100 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-inter text-sm text-gray-600">Position #{position.positionId}</span>
                <span className="font-inter text-sm font-medium text-foreground">
                  {getTokenSymbol(position.collateralTokenAddress)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-inter text-sm text-gray-600">Outstanding Debt</span>
                {isFetchingDebt ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="font-inter text-sm text-gray-500">Loading...</span>
                  </div>
                ) : (
                    <span className="font-gellix text-lg font-semibold text-foreground">
                    {actualDebt 
                      ? `$${ethers.formatUnits(actualDebt, 6)}` 
                      : formatUSD(outstandingDebt)}
                    </span>
                )}
              </div>
            </div>

            {/* Next Installment Hint */}
            {nextInstallmentAmount && interestAmount > 0 && (
              <div className="bg-gray-100 rounded-xl p-4">
                <div className="font-inter text-xs text-gray-700 space-y-1">
                  <div><span className="font-medium">Principal:</span> {formatUSD(totalInstallmentAmount)}</div>
                  <div><span className="font-medium">Interest:</span> {interestAmount.toFixed(6)}</div>
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <span className="font-medium">Total Debt:</span> {outstandingDebt.toFixed(6)}
                  </div>
                  {position.missedPayments > 0 && (
                    <div className="text-red-600 font-medium mt-2">⚠️ {position.missedPayments} payment(s) overdue</div>
                  )}
                </div>
              </div>
            )}

            {/* Installment Buttons */}
            {position.repaymentSchedule && position.repaymentSchedule.length > 0 && (
              <div>
                <label className="font-inter block text-sm font-medium text-gray-700 mb-3">
                  Select Installment to Pay
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {position.repaymentSchedule.map((installment) => {
                    const isLastInstallment = installment.installmentNumber === position.numberOfInstallments;
                    const baseAmount = parseFloat(installment.amount) / 1e6;
                    const finalAmount = isLastInstallment ? baseAmount + interestAmount : baseAmount;
                    const isPaid = installment.status === 'PAID';
                    const isOverdue = installment.status === 'MISSED';
                    const isPending = installment.status === 'PENDING';

                    return (
                      <button
                        key={installment.installmentNumber}
                        onClick={() => !isPaid && handleInstallmentPay(installment.installmentNumber)}
                        disabled={isPaid || isApproving || isRepaying || selectedInstallment !== null}
                        className={`w-full p-4 rounded-xl border transition-all ${isPaid
                            ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                            : isOverdue
                            ? 'bg-gray-100 border-gray-300 hover:border-gray-400 hover:bg-gray-200'
                            : isPending
                            ? 'bg-gray-100 border-gray-300 hover:border-gray-400 hover:bg-gray-200'
                            : 'bg-gray-100 border-gray-300'
                        } ${selectedInstallment === installment.installmentNumber ? 'ring-2 ring-gray-500' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-gellix font-semibold text-foreground">
                                Installment #{installment.installmentNumber}
                              </span>
                              {isPaid && (
                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-inter">PAID</span>
                              )}
                              {isOverdue && (
                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-inter">OVERDUE</span>
                              )}
                              {isPending && (
                                <span className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full font-inter">PENDING</span>
                              )}
                            </div>
                            <div className="font-inter text-xs text-gray-600 mt-1">
                              Due: {new Date(installment.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-gellix text-lg font-semibold text-foreground">
                              {formatUSD(finalAmount)}
                            </div>
                            {isLastInstallment && interestAmount > 0 && (
                              <div className="font-inter text-xs text-gray-500">
                                +${interestAmount.toFixed(6)} interest
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-gray-100 rounded-xl p-4">
                <p className="font-inter text-xs text-gray-700 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              </div>
            )}

            {/* Progress Steps */}
            {(isApproving || isRepaying) && selectedInstallment && (
              <div className="bg-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-gray-700 animate-spin" />
                  <div className="font-inter text-sm text-gray-700">
                    {currentStep === 'approving' && `Approving USDC for Installment #${selectedInstallment}...`}
                    {currentStep === 'repaying' && `Processing payment for Installment #${selectedInstallment}...`}
                    {currentStep === 'syncing' && 'Syncing with backend...'}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button - Removed since we have installment buttons */}
            {/* Info */}
            <div className="font-inter text-xs text-gray-500 text-center">
              Click on any pending installment to make a payment. Interest will be added to the last installment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
