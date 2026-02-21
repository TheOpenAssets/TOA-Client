/**
 * DirectBorrowModal - Borrow USDC directly from platform vault
 * Uses existing position to borrow against collateral
 *
 * Flow:
 * 1. Show position details
 * 2. Input borrow amount with health factor validation
 * 3. Borrow USDC (transaction)
 * 4. Sync position (mandatory)
 * 5. Success confirmation
 */

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import { solvencyService } from '../../../lib/api/solvency.service';
import { assetService } from '../../../lib/api/asset.service';
import { HealthFactorBar } from './HealthFactorBar.tsx';
import type { Position } from '../../../types/solvency.types';

interface DirectBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  position: Position;
}

type BorrowStep = 'input' | 'borrowing' | 'syncing' | 'success' | 'error';

export const DirectBorrowModal = ({
  isOpen,
  onClose,
  onSuccess,
  position,
}: DirectBorrowModalProps) => {
  const { address } = useAccount();

  const [step, setStep] = useState<BorrowStep>('input');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Memoize formatted values from the raw position object
  const formatted = useMemo(() => {
    const collateralValueNum = parseFloat(ethers.formatUnits(position.tokenValueUSD, 6));
    const usdcBorrowedNum = parseFloat(ethers.formatUnits(position.usdcBorrowed, 6));
    const maxBorrowCapacityNum = parseFloat(ethers.formatUnits(position.maxBorrowCapacity || '0', 6));

    return {
      collateralAmount: parseFloat(ethers.formatUnits(position.collateralAmount, 18)).toFixed(4),
      collateralValueUSD: collateralValueNum,
      usdcBorrowed: usdcBorrowedNum,
      availableCredit: maxBorrowCapacityNum - usdcBorrowedNum,
      tokenSymbol: position.collateralToken?.symbol || 'UNKNOWN',
    };
  }, [position]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setBorrowAmount('');
      setTxHash('');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Calculate new health factor after borrow
  const newHealthFactor = useMemo(() => {
    if (!borrowAmount || parseFloat(borrowAmount) === 0) {
      return position.healthFactor || 10000; // Default to 10000 if not set
    }

    const additionalDebt = parseFloat(borrowAmount);
    const newTotalDebt = formatted.usdcBorrowed + additionalDebt;

    if (newTotalDebt === 0) return 99999; // No debt = infinite health

    // Health Factor = (Collateral Value / Total Debt) × 10000
    return Math.floor((formatted.collateralValueUSD / newTotalDebt) * 10000);
  }, [borrowAmount, position, formatted]);

  // Validation
  const isValidAmount = useMemo(() => {
    if (!borrowAmount) return false;
    const amount = parseFloat(borrowAmount);
    if (isNaN(amount) || amount <= 0) return false;
    if (amount > formatted.availableCredit) return false;
    return true;
  }, [borrowAmount, formatted.availableCredit]);

  const isHealthFactorSafe = useMemo(() => {
    return (newHealthFactor || 0) >= 11000; // Must be >= 110%
  }, [newHealthFactor]);

  const canBorrow = isValidAmount && isHealthFactorSafe;

  // Handle borrow
  const handleBorrow = async () => {
    if (!canBorrow || !address) return;

    try {
      setErrorMessage('');

      // Convert amount to wei (6 decimals for USDC)
      const amountWei = ethers.parseUnits(borrowAmount, 6);

      // Step 1: Fetch asset details to calculate loan duration
      // Per COMPLETE_LOAN.md: GET /assets/token/:tokenAddress to get maturity date
      if (!position.collateralToken?.address) {
        throw new Error('Position missing collateral token information');
      }
      const asset = await assetService.getAssetByTokenAddress(position.collateralToken.address);

      // Step 2: Calculate loan duration from asset maturity date
      const loanDuration = assetService.calculateLoanDuration(asset);

      // Step 3: Set number of installments (standard is 12 per docs)
      const numberOfInstallments = 12;

      // Step 4: Borrow USDC from vault
      setStep('borrowing');
      console.log('📝 Borrowing USDC from vault:', {
        positionId: position.positionId,
        amount: borrowAmount,
        amountWei: amountWei.toString(),
        loanDuration,
        numberOfInstallments,
      });

      const borrowResult = await solvencyContractService.borrowUSDC(
        position.positionId,
        amountWei,
        loanDuration,
        numberOfInstallments
      );

      if (!borrowResult.success) {
        throw new Error(borrowResult.error || 'Borrow transaction failed');
      }

      console.log('✅ Borrow successful:', borrowResult.txHash);
      setTxHash(borrowResult.txHash!);

      // Step 5: Notify backend of loan borrow
      setStep('syncing');
      console.log('🔄 Notifying backend of loan borrow...');

      try {
        await solvencyService.notifyLoanBorrow({
          txHash: borrowResult.txHash!,
          positionId: position.positionId.toString(),
          borrowAmount: amountWei.toString(),
          loanDuration: loanDuration.toString(),
          numberOfInstallments: numberOfInstallments.toString(),
          blockNumber: borrowResult.blockNumber?.toString(),
        });
        console.log('✅ Backend notified of loan borrow');
      } catch (syncError) {
        // Non-blocking: Events will still sync it automatically
        console.warn('⚠️ Manual notification failed (events will auto-sync):', syncError);
      }

      // Success!
      setStep('success');

      // Close and refresh after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Borrow failed:', error);
      setErrorMessage(error.message || 'Failed to borrow USDC');
      setStep('error');
    }
  };

  // Handle set max
  const handleSetMax = () => {
    setBorrowAmount(formatted.availableCredit.toFixed(2));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-[520px] w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between rounded-t-[24px]">
          <h2 className="text-xl font-semibold text-[#111111]">
            Borrow from Platform
          </h2>
          <button
            onClick={onClose}
            disabled={step === 'borrowing' || step === 'syncing'}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* INPUT STEP */}
          {step === 'input' && (
            <>
              {/* Position Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Your Position</h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Collateral</span>
                    <span className="font-medium text-[#111111]">
                      {formatted.collateralAmount} {formatted.tokenSymbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Collateral Value</span>
                    <span className="font-medium text-[#111111]">
                      ${formatted.collateralValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Debt</span>
                    <span className="font-medium text-[#111111]">
                      ${formatted.usdcBorrowed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available to Borrow</span>
                    <span className="font-semibold text-[#00A878]">
                      ${formatted.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Current Health Factor */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Current Health Factor</span>
                    <span className="text-sm font-semibold text-[#111111]">
                      {((position.healthFactor || 10000) / 100).toFixed(2)}%
                    </span>
                  </div>
                  <HealthFactorBar healthFactor={position.healthFactor || 10000} />
                </div>
              </div>

              {/* Borrow Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Borrow Amount (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent"
                    step="0.01"
                    min="0"
                    max={formatted.availableCredit}
                  />
                  <button
                    onClick={handleSetMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    MAX
                  </button>
                </div>

                {/* Validation Messages */}
                {borrowAmount && parseFloat(borrowAmount) > formatted.availableCredit && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Amount exceeds available credit
                  </p>
                )}
              </div>

              {/* New Health Factor Preview */}
              {borrowAmount && parseFloat(borrowAmount) > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">After Borrow</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">New Total Debt</span>
                      <span className="font-medium text-[#111111]">
                        ${(formatted.usdcBorrowed + parseFloat(borrowAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">New Health Factor</span>
                      <span className={`font-semibold ${
                        (newHealthFactor || 0) >= 15000 ? 'text-[#00A878]' :
                        (newHealthFactor || 0) >= 11000 ? 'text-[#F59E0B]' :
                        'text-[#EF4444]'
                      }`}>
                        {((newHealthFactor || 0) / 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <HealthFactorBar healthFactor={newHealthFactor || 10000} />
                  </div>

                  {/* Health Factor Warning */}
                  {!isHealthFactorSafe && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium mb-1">Health factor too low!</p>
                        <p className="text-red-700">
                          Your health factor must stay above 110% to maintain a safe position.
                          Reduce the borrow amount.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Important Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 space-y-1">
                    <p className="font-medium">Important:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Keep health factor above 110% to avoid liquidation</li>
                      <li>USDC will be sent to your wallet after confirmation</li>
                      <li>You can repay anytime to improve your health factor</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBorrow}
                  disabled={!canBorrow}
                  className="flex-1 px-6 py-3 bg-[#111111] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Borrow ${borrowAmount || '0.00'}
                </button>
              </div>
            </>
          )}

          {/* BORROWING STEP */}
          {step === 'borrowing' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#111111] mb-2">
                  Borrowing USDC
                </h3>
                <p className="text-gray-600 text-sm">
                  Please confirm the transaction in your wallet...
                </p>
              </div>
            </div>
          )}

          {/* SYNCING STEP */}
          {step === 'syncing' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#111111] mb-2">
                  Syncing Position
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Updating your position data...
                </p>
                {txHash && (
                  <a
                    href={`https://explorer.sepolia.arbitrum.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    View transaction
                  </a>
                )}
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#111111] mb-2">
                  Borrow Successful!
                </h3>
                <p className="text-gray-600 text-sm mb-1">
                  You borrowed ${borrowAmount} USDC
                </p>
                <p className="text-gray-500 text-xs">
                  USDC has been sent to your wallet
                </p>
                {txHash && (
                  <a
                    href={`https://explorer.sepolia.arbitrum.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    View on Explorer
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ERROR STEP */}
          {step === 'error' && (
            <div className="py-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[#111111] mb-2">
                  Borrow Failed
                </h3>
                <p className="text-gray-600 text-sm">
                  {errorMessage}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 px-6 py-3 bg-[#111111] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
