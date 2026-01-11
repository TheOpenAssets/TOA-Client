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
import { X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';
import type { Position } from '../../types/solvency.types';
import { solvencyService } from '../../lib/api/solvency.service';
import { solvencyContractService } from '../../lib/api/solvency-contract.service';
import { Button } from '../ui/button';

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

  const outstandingDebt = actualDebt ? parseFloat(ethers.formatUnits(actualDebt, 6)) : parseFloat(position.outstandingDebt) / 1e6;

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Repay Loan</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isApproving || isRepaying}
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {success ? (
          // Success State
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Repayment Successful!
            </h3>
            <p className="text-sm text-gray-600">
              Your loan has been updated. The page will refresh automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Position Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Position #{position.positionId}</span>
                <span className="text-sm font-medium text-gray-900">
                  {getTokenSymbol(position.collateralTokenAddress)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Outstanding Debt</span>
                {isFetchingDebt ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : (
                    <span className="text-lg font-bold text-gray-900">
                    {actualDebt 
                      ? `$${ethers.formatUnits(actualDebt, 6)}` 
                      : formatUSD(outstandingDebt)}
                    </span>
                )}
              </div>
            </div>

            {/* Next Installment Hint */}
            {nextInstallmentAmount && interestAmount > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <div><span className="font-medium">Principal:</span> {formatUSD(totalInstallmentAmount)}</div>
                  <div><span className="font-medium">Interest:</span> {interestAmount.toFixed(6)}</div>
                  <div className="mt-1 pt-1 border-t border-blue-200">
                    <span className="font-medium">Total Debt:</span> {outstandingDebt.toFixed(6)}
                  </div>
                  {position.missedPayments > 0 && (
                    <div className="text-red-600 font-medium mt-1">⚠️ {position.missedPayments} payment(s) overdue</div>
                  )}
                </div>
              </div>
            )}

            {/* Installment Buttons */}
            {position.repaymentSchedule && position.repaymentSchedule.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
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
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          isPaid
                            ? 'bg-green-50 border-green-200 opacity-60 cursor-not-allowed'
                            : isOverdue
                            ? 'bg-red-50 border-red-300 hover:border-red-400 hover:bg-red-100'
                            : isPending
                            ? 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                            : 'bg-gray-50 border-gray-200'
                        } ${selectedInstallment === installment.installmentNumber ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                Installment #{installment.installmentNumber}
                              </span>
                              {isPaid && (
                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">PAID</span>
                              )}
                              {isOverdue && (
                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">OVERDUE</span>
                              )}
                              {isPending && (
                                <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">PENDING</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Due: {new Date(installment.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {formatUSD(finalAmount)}
                            </div>
                            {isLastInstallment && interestAmount > 0 && (
                              <div className="text-xs text-gray-500">
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
              <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Progress Steps */}
            {(isApproving || isRepaying) && selectedInstallment && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="text-sm text-blue-800">
                    {currentStep === 'approving' && `Approving USDC for Installment #${selectedInstallment}...`}
                    {currentStep === 'repaying' && `Processing payment for Installment #${selectedInstallment}...`}
                    {currentStep === 'syncing' && 'Syncing with backend...'}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button - Removed since we have installment buttons */}
            {/* Info */}
            <div className="text-xs text-gray-500 text-center">
              Click on any pending installment to make a payment. Interest will be added to the last installment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
