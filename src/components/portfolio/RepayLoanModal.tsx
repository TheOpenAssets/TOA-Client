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
import { Input } from '../ui/input';

interface RepayLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  position: Position;
  schedule?: {
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
  };
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

// Calculate outstanding debt
const getOutstandingDebt = (position: Position): string => {
  const borrowed = parseFloat(position.usdcBorrowed || '0');
  const partnerDebt = parseFloat(position.totalPartnerDebt || '0');
  return (borrowed + partnerDebt).toString();
};

export const RepayLoanModal = ({
  isOpen,
  onClose,
  onSuccess,
  position,
  schedule,
}: RepayLoanModalProps) => {
  const [repayAmount, setRepayAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'approving' | 'repaying' | 'syncing'>('input');
  const [actualDebt, setActualDebt] = useState<bigint | null>(null);
  const [isFetchingDebt, setIsFetchingDebt] = useState(false);

  const outstandingDebt = actualDebt ? parseFloat(ethers.formatUnits(actualDebt, 6)) : parseFloat(position.outstandingDebt) / 1e6;

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
    if (!schedule) return null;

    const nextUnpaid = schedule.installments.find(
      i => i.status === 'PENDING' || i.status === 'MISSED'
    );

    if (!nextUnpaid) return null;

    return parseFloat(nextUnpaid.amount) / 1e6;
  }, [schedule]);

  // Pre-fill next installment amount on modal open
  useEffect(() => {
    if (isOpen && nextInstallmentAmount) {
      setRepayAmount(nextInstallmentAmount.toFixed(2));
    }
  }, [isOpen, nextInstallmentAmount]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setRepayAmount('');
      setError(null);
      setSuccess(false);
      setCurrentStep('input');
      setIsApproving(false);
      setIsRepaying(false);
      setActualDebt(null);
    }
  }, [isOpen]);

  const isAmountValid = useMemo(() => {
    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) return false;
    if (amount > outstandingDebt) return false;
    return true;
  }, [repayAmount, outstandingDebt]);

  const handleRepay = async () => {
    if (!isAmountValid || !repayAmount) return;

    setError(null);
    setCurrentStep('approving');
    setIsApproving(true);

    try {
      let amountWei = ethers.parseUnits(repayAmount, 6);

      // Step 0: Fetch actual outstanding debt and cap repayment amount
      // Per repay-solvency-loan.js: Prevent "Amount exceeds debt" error
      console.log('📊 Checking outstanding debt...');
      const actualDebtWei = await solvencyContractService.getOutstandingDebt(position.positionId);
      
      if (actualDebtWei === 0n) {
        setError('No outstanding debt for this position!');
        setCurrentStep('input');
        setIsApproving(false);
        return;
      }

      // Cap repayment to actual debt
      if (amountWei > actualDebtWei) {
        console.log(`⚠️ Repayment amount ($${repayAmount}) exceeds actual debt ($${ethers.formatUnits(actualDebtWei, 6)})`);
        console.log('   Capping repayment to exact outstanding debt...');
        amountWei = actualDebtWei;
      }

      console.log(`💰 Final Repayment Amount: $${ethers.formatUnits(amountWei, 6)} USDC`);

      // Step 1: Approve USDC for Vault
      console.log('📝 Approving USDC for Vault...');
      const approvalResult = await solvencyContractService.approveUSDCForSeniorPool(amountWei);

      if (!approvalResult.success) {
        throw new Error(approvalResult.error || 'USDC approval for Vault failed');
      }

      setIsApproving(false);
      setCurrentStep('repaying');
      setIsRepaying(true);

      // Step 2: Repay loan via Vault
      console.log('💵 Repaying loan via Vault...');
      const repayResult = await solvencyContractService.repayLoanViaSeniorPool(
        position.positionId,
        amountWei
      );

      if (!repayResult.success) {
        throw new Error(repayResult.error || 'Repayment via Vault failed');
      }

      setCurrentStep('syncing');

      // Step 3: Notify backend of loan repayment
      setCurrentStep('syncing');
      console.log('🔄 Notifying backend of loan repayment...');

      try {
        await solvencyService.notifyLoanRepayment({
          txHash: repayResult.txHash!,
          positionId: position.positionId.toString(),
          repaymentAmount: amountWei.toString(),
          blockNumber: repayResult.blockNumber?.toString(),
        });
        console.log('✅ Backend notified of loan repayment');
      } catch (syncError) {
        // Non-blocking: Events will still sync it automatically
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
                    {formatUSD(outstandingDebt)}
                  </span>
                )}
              </div>
            </div>

            {/* Next Installment Hint */}
            {nextInstallmentAmount && (
              <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Next installment:</span> {formatUSD(nextInstallmentAmount)}
                  {schedule && schedule.missedPayments > 0 && (
                    <span className="text-red-600 font-medium ml-1">(OVERDUE)</span>
                  )}
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label htmlFor="repay-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Repayment Amount
              </label>
              <div className="relative">
                <Input
                  id="repay-amount"
                  type="text"
                  value={repayAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setRepayAmount(val);
                  }}
                  placeholder="0.00"
                  className="pr-16 text-lg"
                  disabled={isApproving || isRepaying}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-lg text-gray-500">
                  USDC
                </div>
              </div>
              {!isAmountValid && parseFloat(repayAmount) > 0 && (
                <p className="mt-2 text-sm text-red-600">
                  {parseFloat(repayAmount) > outstandingDebt
                    ? `Amount exceeds outstanding debt of ${formatUSD(getOutstandingDebt(position))}`
                    : 'Please enter a valid amount'}
                </p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {nextInstallmentAmount && (
                <button
                  onClick={() => setRepayAmount(nextInstallmentAmount.toFixed(2))}
                  disabled={isApproving || isRepaying}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors disabled:opacity-50"
                >
                  Next Payment
                </button>
              )}
              <button
                onClick={() => setRepayAmount((outstandingDebt / 2).toFixed(2))}
                disabled={isApproving || isRepaying}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors disabled:opacity-50"
              >
                Half
              </button>
              <button
                onClick={() => {
                  // Use actualDebt with full precision (6 decimals) to avoid rounding errors
                  const fullAmount = actualDebt 
                    ? ethers.formatUnits(actualDebt, 6) 
                    : outstandingDebt.toFixed(6);
                  setRepayAmount(fullAmount);
                }}
                disabled={isApproving || isRepaying || isFetchingDebt}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors disabled:opacity-50"
              >
                Full Amount
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Progress Steps */}
            {(isApproving || isRepaying) && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="text-sm text-blue-800">
                    {currentStep === 'approving' && 'Approving USDC...'}
                    {currentStep === 'repaying' && 'Processing repayment...'}
                    {currentStep === 'syncing' && 'Syncing with backend...'}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleRepay}
              disabled={!isAmountValid || !repayAmount || isApproving || isRepaying}
              className="w-full text-lg py-6"
            >
              {isApproving || isRepaying ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                `Repay ${repayAmount ? formatUSD(parseFloat(repayAmount)) : '$0.00'}`
              )}
            </Button>

            {/* Info */}
            <div className="text-xs text-gray-500 text-center">
              After repayment, your loan schedule and available credit will be updated automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
