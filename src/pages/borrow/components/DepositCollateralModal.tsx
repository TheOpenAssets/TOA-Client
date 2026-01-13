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
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm border flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl p-8 max-w-md w-full bg-gray-50 border-neutral-200 border shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-neutral-200/50 shadow-lg rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">💰</span>
          </div>
          <h2 className="font-gellix text-xl font-semibold text-foreground mb-2">
            {initialAsset ? 'Add More Collateral' : 'Deposit Collateral'}
          </h2>
          <p className="font-inter text-sm text-gray-600">
            {initialAsset
              ? `Add more ${initialAsset?.metadata.assetName} to your position`
              : 'Deposit RWA tokens to create a credit line'}
          </p>
          {!isProcessing && step === 'select' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
              style={{ zIndex: 10 }}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

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
            <div className="mb-6 p-4 bg-gray-100/90 border border-neutral-200 shadow-lg rounded-xl text-rose-600 text-xs font-inter font-medium text-center">
              {error}
            </div>
          )}

          {/* Select Asset Step */}
          {step === 'select' && !isLoading && (portfolio.length > 0 || initialAsset) && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Asset Selection - Table View (only show when no asset selected) */}
              {!initialAsset && !selectedAsset && (
                <div>
                  <label className="font-inter text-xs text-gray-500 mb-3 block uppercase tracking-wider">
                    Select Asset to Deposit
                  </label>
                  <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left font-inter text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Asset
                            </th>
                            <th className="px-4 py-3 text-right font-inter text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Balance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {portfolio.map((asset) => (
                            asset.status !== 'CLAIMED' && asset.purchaseType !== 'LEVERAGE' && (
                              <tr
                                key={asset.assetId}
                                onClick={() => handleAssetSelect(asset)}
                                className="cursor-pointer transition-all hover:bg-gray-200/70"
                              >
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-neutral-200/50 rounded-full flex items-center justify-center text-sm">
                                      🏛️
                                    </div>
                                    <span className="font-gellix text-sm font-medium text-foreground">
                                      {asset.metadata.assetName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="font-gellix text-sm font-semibold text-foreground">
                                    {parseFloat(ethers.formatUnits(asset.totalAmount, 18)).toFixed(2)}
                                  </span>
                                  <span className="font-inter text-xs text-gray-500 ml-1">
                                    tokens
                                  </span>
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Asset Display (show after selection) */}
              {!initialAsset && selectedAsset && (
                <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-200/50 rounded-full flex items-center justify-center">
                        🏛️
                      </div>
                      <div>
                        <p className="font-gellix text-sm font-semibold text-foreground">
                          {selectedAsset.metadata.assetName}
                        </p>
                        <p className="font-inter text-xs text-gray-500">
                          {parseFloat(ethers.formatUnits(selectedAsset.totalAmount, 18)).toFixed(2)} tokens available
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAsset(null);
                        setAssetDetails(null);
                        setDepositAmount('');
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs font-inter font-medium underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Asset Details */}
              {selectedAsset && assetDetails && (
                <>
                  {/* Token Balance */}
                  <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-inter text-xs text-gray-500">Your Balance</span>
                      <span className="font-gellix text-lg font-semibold text-foreground">
                        {parseFloat(tokenBalance).toFixed(2)} tokens
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                      <span className="font-inter text-xs text-gray-500">Token Price</span>
                      <span className="font-gellix text-sm font-semibold text-foreground">
                        ${(parseFloat(assetDetails.listing.price) / 1e6).toFixed(6)} per token
                      </span>
                    </div>
                  </div>

                  {/* Deposit Amount */}
                  <div>
                    <label className="font-inter text-xs text-gray-500 mb-3 block uppercase tracking-wider">
                      Deposit Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl px-4 py-4 pr-20 font-gellix text-sm text-foreground transition-all focus:ring-2 focus:ring-gray-300 outline-none placeholder:text-gray-400 hover:bg-gray-100"
                        min="0"
                        max={tokenBalance}
                        step="0.01"
                      />
                      <button
                        onClick={handleMaxClick}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-inter font-medium uppercase tracking-wider text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors shadow-sm"
                      >
                        MAX
                      </button>
                    </div>
                    {depositError && (
                      <p className="mt-2 text-xs font-inter font-medium text-rose-600">{depositError}</p>
                    )}
                  </div>

                  {/* Collateral Preview */}
                  {depositAmount && parseFloat(depositAmount) > 0 && !depositError && (
                    <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 space-y-4">
                      <div>
                        <p className="font-inter text-xs text-gray-500 mb-1.5">Collateral Value</p>
                        <p className="font-gellix text-lg font-semibold text-foreground">
                          ${parseFloat(collateralValueUSD).toFixed(2)}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-gray-300">
                        <p className="font-inter text-xs text-gray-500 mb-1.5">Estimated Credit Line (70% LTV)</p>
                        <p className="font-gellix text-2xl font-semibold text-foreground">
                          ${parseFloat(estimatedCreditLine).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Important Notice */}
                  <div className="bg-gray-100/90 border border-neutral-200 shadow-lg rounded-xl p-4">
                    <p className="font-inter text-xs text-gray-700 text-left">
                      <span className="text-gray-500">⚠️</span> <strong>Important:</strong> Your tokens will be locked as collateral. Maintain health factor above 110% to avoid liquidation. You can withdraw after repaying your loan.
                    </p>
                  </div>

                </>
              )}
            </div>
          )}

          {/* Approval Progress */}
          {step === 'approve' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 mb-4 w-full">
                <div className="flex flex-col items-center justify-center gap-3">
                  <PageLoader text='' />
                  <p className="font-inter text-sm font-semibold text-foreground text-center">Step 1 of 3: Approving Tokens</p>
                </div>
              </div>
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
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 mb-4 w-full">
                <div className="flex flex-col items-center justify-center gap-3">
                  <PageLoader text='' />
                  <p className="font-inter text-sm font-semibold text-foreground text-center">Step 2 of 3: Depositing Collateral</p>
                </div>
              </div>
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

          {/* Syncing Progress */}
          {step === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 w-full">
                <div className="flex flex-col items-center justify-center gap-3">
                  <PageLoader text='' />
                  <p className="font-inter text-sm font-semibold text-foreground text-center">Step 3 of 3: Syncing with Platform</p>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 bg-neutral-200/50 shadow-lg rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="font-gellix text-xl font-semibold text-foreground mb-2">Deposit Successful!</h3>
              <p className="font-inter text-sm text-gray-600 mb-6">Your collateral has been deposited and credit line created</p>
              <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 w-full">
                <div>
                  <p className="font-inter text-xs text-gray-500 mb-1.5">Credit Line Created</p>
                  <p className="font-gellix text-2xl font-semibold text-foreground">
                    ${parseFloat(estimatedCreditLine).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select' && selectedAsset && assetDetails && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200/50 border border-gray-200 text-foreground rounded-xl shadow-lg font-inter font-medium transition-all hover:scale-105"
            >
              Cancel
            </button>

            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !!depositError}
              className="flex-1 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-inter font-medium transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Deposit Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
