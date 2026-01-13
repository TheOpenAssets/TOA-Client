/**
 * Deposit Collateral Modal Component
 * Complete implementation for depositing RWA tokens to create credit line
 *
 * ✅ VERIFIED: Based on deposit-to-vaultsolvency.js (lines 403-573)
 * Flow: Portfolio → Select Asset → Approve → Deposit → Sync → Success
 */

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useCallback } from 'react';
import { portfolioService, type PortfolioAsset } from '../../../lib/api/portfolio.service';
import { assetService } from '../../../lib/api/asset.service';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import { solvencyService } from '../../../lib/api/solvency.service';
import type { IssuerAsset } from '../../../types/issuer.types';
import { marketplaceService } from '../../../lib/api/marketplace.service';
import { PageLoader } from '../../../components/ui/page-loader';

interface DepositCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAsset?: PortfolioAsset | null;
}

type DepositStep = 'select' | 'approve' | 'deposit' | 'syncing' | 'success';

export const DepositCollateralModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialAsset = null,
}: DepositCollateralModalProps) => {
  const { address, isConnected } = useAccount();

  // State
  const [step, setStep] = useState<DepositStep>('select');
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(initialAsset);
  const [assetDetails, setAssetDetails] = useState<IssuerAsset | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');

  /**
   * Handle asset selection
   * Fetches asset details and token balance
   */
  const handleAssetSelect = useCallback(async (asset: PortfolioAsset) => {
    setSelectedAsset(asset);
    setAssetDetails(null);
    setTokenBalance('0');
    setError(null);
    setIsLoading(true);

    try {
      // Fetch asset details (token address, price)
      const details = await assetService.getAssetById(asset.assetId);

      if (!details) {
        throw new Error('Asset not found');
      }

      if (!asset.tokenAddress) {
        throw new Error('Asset does not have a deployed token');
      }

      if (!details.listing?.price) {
        throw new Error('Asset does not have a price');
      }

      setAssetDetails(details);

      // Fetch token balance (on-chain)
      if (address) {
        const balance = await solvencyContractService.getTokenBalance(
          asset.tokenAddress,
          address
        );
        setTokenBalance(ethers.formatUnits(balance, 18));
      }
    } catch (err: any) {
      console.error('Error fetching asset details:', err);
      setError(err.message || 'Failed to fetch asset details');
      setSelectedAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch portfolio or handle initial asset on open
  useEffect(() => {
    if (isOpen && isConnected && address) {
      if (initialAsset) {
        handleAssetSelect(initialAsset);
      } else {
        fetchPortfolio();
      }
    }
  }, [isOpen, isConnected, address, initialAsset, handleAssetSelect]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedAsset(null);
      setAssetDetails(null);
      setDepositAmount('');
      setTokenBalance('0');
      setError(null);
      setTxHash('');
    }
  }, [isOpen]);

  /**
   * Fetch user's portfolio (owned RWA tokens)
   * API: GET /marketplace/portfolio
   */
  const fetchPortfolio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await portfolioService.getPortfolio();
      setPortfolio(data.portfolio);

      if (data.portfolio.length === 0) {
        setError('You don\'t own any RWA tokens yet. Purchase tokens from the marketplace first.');
      }
    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
      setError(err.message || 'Failed to fetch your portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate collateral value in USD
   * Formula: depositAmount × pricePerToken
   */
  const collateralValueUSD = useMemo(() => {
    if (!depositAmount || !assetDetails || parseFloat(depositAmount) <= 0) {
      return '0';
    }

    try {
      const amountWei = ethers.parseUnits(depositAmount, 18);
      const pricePerToken = BigInt(assetDetails.listing.price); // 6 decimals
      const valueUSD = (amountWei * pricePerToken) / ethers.parseEther('1');

      return ethers.formatUnits(valueUSD, 6); // Returns string like "76500.00"
    } catch {
      return '0';
    }
  }, [depositAmount, assetDetails]);

  /**
   * Calculate credit line (70% LTV for RWA tokens)
   * Formula: collateralValueUSD × 0.7
   */
  const estimatedCreditLine = useMemo(() => {
    const value = parseFloat(collateralValueUSD);
    if (value <= 0) return '0';

    return (value * 0.7).toFixed(2); // 70% LTV
  }, [collateralValueUSD]);

  /**
   * Validate deposit amount
   */
  const depositError = useMemo(() => {
    if (!depositAmount) return null;

    const amount = parseFloat(depositAmount);
    const balance = parseFloat(tokenBalance);

    if (amount <= 0) {
      return 'Amount must be greater than 0';
    }

    if (amount > balance) {
      return `Insufficient balance. You have ${parseFloat(tokenBalance).toFixed(2)} tokens`;
    }

    return null;
  }, [depositAmount, tokenBalance]);

  /**
   * Handle deposit button click
   * Flow: Approve → Deposit → Sync
   */
  const handleDeposit = async () => {
    if (!selectedAsset || !assetDetails || !address || depositError) {
      return;
    }

    // Store in local variables to help TypeScript understand they're not null
    const asset = selectedAsset;
    const details = assetDetails;

    setIsProcessing(true);
    setError(null);

    try {
      // Parse amounts
      const amountWei = ethers.parseUnits(depositAmount, 18);
      const pricePerToken = BigInt(details.listing.price);
      const tokenValueUSD = (amountWei * pricePerToken) / ethers.parseEther('1');

      console.log('💰 Starting deposit process:', {
        token: asset.metadata.assetName,
        amount: depositAmount,
        valueUSD: ethers.formatUnits(tokenValueUSD, 6),
      });

      // STEP 1: Approve token
      setStep('approve');
      console.log('🔓 Step 1/3: Approving tokens...');

      const approvalResult = await solvencyContractService.approveToken(
        asset.tokenAddress,
        amountWei
      );

      if (!approvalResult.success) {
        throw new Error(approvalResult.error || 'Token approval failed');
      }

      if (approvalResult.txHash) {
        setTxHash(approvalResult.txHash);
      }

      console.log('✅ Tokens approved');

      // STEP 2: Deposit collateral
      setStep('deposit');
      console.log('💰 Step 2/3: Depositing collateral...');

      const depositResult = await solvencyContractService.depositCollateral(
        asset.tokenAddress,
        amountWei,
        tokenValueUSD,
        0,    // TokenType.RWA
        true  // issueOAID = true
      );

      if (!depositResult.success) {
        throw new Error(depositResult.error || 'Deposit failed');
      }

      if (!depositResult.positionId) {
        throw new Error('Position ID not found in deposit result');
      }

      setTxHash(depositResult.txHash || '');

      console.log('✅ Deposit successful, Position ID:', depositResult.positionId);

      // STEP 3: Sync with backend (MANDATORY)
      setStep('syncing');
      console.log('🔄 Step 3/3: Syncing with platform...');

      // Sync portfolio (notify purchase)
      await marketplaceService.notifyPurchase({
        assetId: asset.assetId,
        txHash: depositResult.txHash!,
        amount: `-${depositAmount}`,
        blockNumber: depositResult.blockNumber!.toString(),
      });

      // Sync position with solvency system
      await solvencyService.syncPosition({
        positionId: depositResult.positionId!.toString(),
        txHash: depositResult.txHash!,
        blockNumber: depositResult.blockNumber!,
      });

      console.log('✅ Position synced with backend');

      // Success!
      setStep('success');

      // Wait a bit before closing to show success message
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('❌ Deposit error:', err);
      setError(err.message || 'Deposit failed. Please try again.');
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle max button click
   */
  const handleMaxClick = () => {
    setDepositAmount(parseFloat(tokenBalance).toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-lg border p-4">
      <div
        className="rounded-2xl p-8 max-w-lg w-full bg-transparent border-neutral-300 border max-h-[90vh] overflow-y-auto"
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
      <div className="flex items-start justify-between mb-6">
        <div>
        <h2 className="font-gellix text-xl font-semibold text-foreground mb-2">
          {initialAsset ? 'Add More Collateral' : 'Deposit Collateral'}
        </h2>
        <p className="font-inter text-sm text-gray-600">
          {initialAsset 
          ? `Add more ${initialAsset?.metadata.assetName} to your position.`
          : 'Deposit RWA tokens to create a credit line'}
        </p>
        </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="">
              <PageLoader text='' />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="mb-6 p-4 bg-gray-100 rounded-xl overflow-x-scroll">
            <p className="font-inter text-xs text-gray-700 flex items-start gap-2">
              <span className="text-gray-500">⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Select Asset Step */}
        {step === 'select' && !isLoading && (portfolio.length > 0 || initialAsset) && (
          <div className="space-y-6">
            {/* Asset Selection */}
            {!initialAsset && (
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">
                  Select Asset to Deposit
                </label>
                <select
                  value={selectedAsset?.assetId || ''}
                  onChange={(e) => {
                    const asset = portfolio.find(a => a.assetId === e.target.value);
                    if (asset) handleAssetSelect(asset);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-transparent"
                >
                  <option value="">Choose an asset...</option>
                  {portfolio.map((asset) => (
                    asset.status !== 'CLAIMED' && (
                      <option key={asset.assetId} value={asset.assetId}>
                        {asset.metadata.assetName} - {parseFloat(ethers.formatUnits(asset.totalAmount, 18)).toFixed(2)} tokens
                      </option>
                    )
                  ))}
                </select>
              </div>
            )}

            {/* Asset Details */}
            {selectedAsset && assetDetails && (
              <>
                {/* Token Balance */}
                <div className="p-4 bg-[#F7F8FA] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">Your Balance</span>
                    <span className="text-lg font-semibold text-[#111111]">
                      {parseFloat(tokenBalance).toFixed(2)} tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Token Price</span>
                    <span className="text-sm font-medium text-[#111111]">
                      ${(parseFloat(assetDetails.listing.price) / 1e6).toFixed(6)} per token
                    </span>
                  </div>
                </div>

                {/* Deposit Amount */}
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-2">
                    Deposit Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-transparent"
                      min="0"
                      max={tokenBalance}
                      step="0.01"
                    />
                    <button
                      onClick={handleMaxClick}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-[#111111] bg-[#F7F8FA] rounded hover:bg-gray-200 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  {depositError && (
                    <p className="mt-2 text-sm text-red-600">{depositError}</p>
                  )}
                </div>

                {/* Collateral Preview */}
                {depositAmount && parseFloat(depositAmount) > 0 && !depositError && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">
                      Credit Line Preview
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Collateral Value</span>
                        <span className="text-sm font-semibold text-blue-900">
                          ${parseFloat(collateralValueUSD).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">LTV Ratio</span>
                        <span className="text-sm font-medium text-blue-900">70%</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-900">Estimated Credit Line</span>
                          <span className="text-lg font-bold text-blue-900">
                            ${parseFloat(estimatedCreditLine).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-blue-700">
                      You'll be able to borrow up to ${parseFloat(estimatedCreditLine).toFixed(2)} USDC
                    </p>
                  </div>
                )}

                {/* Important Notice */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-yellow-900 mb-1">
                        Important Information
                      </p>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        <li>• Your tokens will be locked as collateral</li>
                        <li>• Maintain health factor above 110% to avoid liquidation</li>
                        <li>• You can withdraw after repaying your loan</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-[#111111] hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !!depositError}
                    className="flex-1 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-inter font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Deposit Collateral
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Approval Progress */}
        {step === 'approve' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="">
              <PageLoader text='' />
            </div>
            <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
              Step 1 of 3: Approving Tokens
            </h3>
            <p className="font-inter text-sm text-gray-600 text-center mb-4">
              Please confirm the approval transaction in your wallet
            </p>
            {txHash && (
              <a
                href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-inter text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                View transaction →
              </a>
            )}
          </div>
        )}

        {/* Deposit Progress */}
        {step === 'deposit' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="">
              <PageLoader text='' />
            </div>
            <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
              Step 2 of 3: Depositing Collateral
            </h3>
            <p className="font-inter text-sm text-gray-600 text-center mb-4">
              Please confirm the deposit transaction in your wallet
            </p>
            <p className="font-inter text-xs text-gray-600 text-center">
              This may take up to 5 minutes...
            </p>
            {txHash && (
              <a
                href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 font-inter text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                View transaction →
              </a>
            )}
          </div>
        )}

        {/* Syncing Progress */}
        {step === 'syncing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="">
              <PageLoader text='' />
            </div>
            <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
              Step 3 of 3: Syncing with Platform
            </h3>
            <p className="font-inter text-sm text-gray-600 text-center">
              Updating your credit line...
            </p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-gellix text-xl font-semibold text-foreground mb-2">
              Deposit Successful!
            </h3>
            <p className="font-inter text-sm text-gray-600 text-center mb-4">
              Your collateral has been deposited and credit line created
            </p>
            <div className="bg-gray-100 rounded-xl p-5 w-full">
              <div className="text-center">
                <p className="font-inter text-xs text-gray-500 mb-1.5">Credit Line Created</p>
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  ${parseFloat(estimatedCreditLine).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
