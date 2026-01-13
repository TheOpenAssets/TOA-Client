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
import { X, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md p-4">
      <div className="bg-transparent w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-geist">
              {initialAsset ? 'Add More Collateral' : 'Deposit Collateral'}
            </h2>
            <p className="text-slate-500 text-sm font-geist mt-1">
              {initialAsset
                ? `Add more ${initialAsset?.metadata.assetName} to your position`
                : 'Deposit RWA tokens to create a credit line'}
            </p>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
            >
              <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">

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
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold font-geist text-center border border-rose-100">
              {error}
            </div>
          )}

          {/* Select Asset Step */}
          {step === 'select' && !isLoading && (portfolio.length > 0 || initialAsset) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Asset Selection */}
              {!initialAsset && (
                <div className='bg-transparent'>
                  <label className="text-black font-bold mb-3 block text-xs uppercase tracking-widest">
                    Select Asset to Deposit
                  </label>
                  <select
                    value={selectedAsset?.assetId || ''}
                    onChange={(e) => {
                      const asset = portfolio.find(a => a.assetId === e.target.value);
                      if (asset) handleAssetSelect(asset);
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-geist text-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-all outline-none appearance-none hover:bg-slate-100 cursor-pointer"
                  >
                    <option value="">Choose an asset...</option>
                    {portfolio.map((asset) => (
                      asset.status !== 'CLAIMED' && asset.purchaseType !== 'LEVERAGE' && (
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
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Balance</span>
                      <span className="font-geist text-lg font-bold text-slate-900">
                        {parseFloat(tokenBalance).toFixed(2)} tokens
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Token Price</span>
                      <span className="font-geist text-sm font-semibold text-slate-900">
                        ${(parseFloat(assetDetails.listing.price) / 1e6).toFixed(6)} per token
                      </span>
                    </div>
                  </div>

                  {/* Deposit Amount */}
                  <div>
                    <label className="text-black font-bold mb-3 block text-xs uppercase tracking-widest">
                      Deposit Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-6 pr-20 font-geist text-sm text-slate-900 transition-all focus:ring-2 focus:ring-slate-900/5 focus:bg-white outline-none placeholder:text-slate-400 hover:bg-slate-100"
                        min="0"
                        max={tokenBalance}
                        step="0.01"
                      />
                      <button
                        onClick={handleMaxClick}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-200 rounded-xl hover:bg-slate-300 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    {depositError && (
                      <p className="mt-2 text-xs font-bold text-rose-600">{depositError}</p>
                    )}
                  </div>

                  {/* Collateral Preview */}
                  {depositAmount && parseFloat(depositAmount) > 0 && !depositError && (
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Credit Line Preview</h4>
                      </div>
                      <div className="space-y-2 font-geist text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Collateral Value</span>
                          <span className="text-slate-900 font-semibold">
                            ${parseFloat(collateralValueUSD).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">LTV Ratio</span>
                          <span className="text-slate-900 font-semibold">70%</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-slate-900 font-bold">Estimated Credit Line</span>
                          <span className="text-lg text-slate-900 font-bold">
                            ${parseFloat(estimatedCreditLine).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-[10px] text-slate-500 uppercase tracking-wider text-center">
                        You'll be able to borrow up to ${parseFloat(estimatedCreditLine).toFixed(2)} USDC
                      </p>
                    </div>
                  )}

                  {/* Important Notice */}
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wider">
                          Important Information
                        </p>
                        <ul className="text-xs font-geist text-amber-800 space-y-1">
                          <li>• Your tokens will be locked as collateral</li>
                          <li>• Maintain health factor above 110% to avoid liquidation</li>
                          <li>• You can withdraw after repaying your loan</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                </>
              )}
            </div>
          )}

          {/* Approval Progress */}
          {step === 'approve' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6 w-full">
                <div className="flex items-center gap-3">

<><PageLoader/></>                  <div className="font-geist text-sm text-slate-900 font-medium">
                    <p className="font-bold">Step 1 of 3: Approving Tokens</p>
                    <p className="text-xs text-slate-500 mt-1">Please confirm the approval transaction in your wallet</p>
                  </div>
                </div>
              </div>
              {txHash && (
                <a
                  href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-geist text-xs text-slate-500 hover:text-slate-700 hover:underline uppercase tracking-wider"
                >
                  View transaction →
                </a>
              )}
            </div>
          )}

          {/* Deposit Progress */}
          {step === 'deposit' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6 w-full">
                <div className="flex items-center gap-3">
                   <><PageLoader/></>    
                  <div className="font-geist text-sm text-slate-900 font-medium">
                    <p className="font-bold">Step 2 of 3: Depositing Collateral</p>
                    <p className="text-xs text-slate-500 mt-1">Please confirm the deposit transaction in your wallet</p>
                    <p className="text-xs text-slate-500 mt-1">This may take up to 5 minutes...</p>
                  </div>
                </div>
              </div>
              {txHash && (
                <a
                  href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-geist text-xs text-slate-500 hover:text-slate-700 hover:underline uppercase tracking-wider"
                >
                  View transaction →
                </a>
              )}
            </div>
          )}

          {/* Syncing Progress */}
          {step === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 w-full">
                <div className="flex items-center gap-3">
                   <><PageLoader/></>    
                  <div className="font-geist text-sm text-slate-900 font-medium">
                    <p className="font-bold">Step 3 of 3: Syncing with Platform</p>
                    <p className="text-xs text-slate-500 mt-1">Updating your credit line...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-emerald-100 shadow-lg">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 font-geist">Deposit Successful!</h3>
              <p className="text-slate-500 font-geist mb-6">Your collateral has been deposited and credit line created</p>
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 w-full">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Credit Line Created</p>
                  <p className="font-geist text-3xl font-bold text-slate-900">
                    ${parseFloat(estimatedCreditLine).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select' && selectedAsset && assetDetails && (
          <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !!depositError}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:shadow-xl active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Deposit Collateral
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
