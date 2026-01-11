import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { X, ArrowDown, ChevronDown, Search, Loader2 } from 'lucide-react';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import { solvencyService } from '../../../lib/api/solvency.service';
import { assetService } from '../../../lib/api/asset.service';
import { type OAIDCreditLine, type CollateralPosition } from '../../../types/solvency.types';
import type { IssuerAsset } from '../../../types/issuer.types';
import { formatCollateralAmount } from '../../../utils/solvency/formatters';

interface BorrowOnlyModalProps {
  isOpen: boolean;
    onClose: () => void;

  onSuccess: () => void;
  creditData: OAIDCreditLine | null;
}

export const UnifiedBorrowModal = ({ isOpen, onSuccess, creditData , onClose}: BorrowOnlyModalProps) => {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<CollateralPosition | null>(null);
  const [showPositionSelector, setShowPositionSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [installments, setInstallments] = useState<number>(1);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<IssuerAsset | null>(null);
  const [assetDetailsMap, setAssetDetailsMap] = useState<Record<string, IssuerAsset>>({});
  const [positionValidation, setPositionValidation] = useState<Record<number, { valid: boolean; reason?: string }>>({});

  const availableCredit = creditData?.availableCredit ?? 0;
  const positions = creditData?.collateral ?? [];

  // Validate all positions on open
  useEffect(() => {
    const validatePositions = async () => {
      if (isOpen && positions.length > 0) {
        const validationMap: Record<number, { valid: boolean; reason?: string }> = {};
        
        await Promise.all(positions.map(async (position) => {
          try {
            // Check if position has a positionId
            if (!position.positionId) {
              validationMap[position.positionId ?? 0] = { valid: false, reason: 'Invalid position ID' };
              return;
            }

            // Get position data from contract
            const positionData = await solvencyContractService.getPosition(position.positionId);
            
            if (!positionData) {
              validationMap[position.positionId] = { valid: false, reason: 'Position not found' };
              return;
            }

            // Check if position is active
            if (!positionData.active) {
              validationMap[position.positionId] = { valid: false, reason: 'Position not active' };
              return;
            }

            // Get repayment plan
            const plan = await solvencyContractService.getRepaymentPlan(position.positionId);
            
            // Check if plan already exists and is active
            if (plan && plan.isActive) {
              validationMap[position.positionId] = { valid: false, reason: 'Active loan exists - must fully repay first' };
              return;
            }

            // Get outstanding debt
            const outstandingDebt = await solvencyContractService.getOutstandingDebt(position.positionId);
            
            // Calculate available credit
            const ltv = positionData.tokenType === 0 ? 7000 : 6000; // RWA: 70%, PRIVATE_ASSET: 60%
            const maxBorrow = (BigInt(positionData.tokenValueUSD) * BigInt(ltv)) / BigInt(10000);
            const availableCredit = maxBorrow - outstandingDebt;

            if (availableCredit <= 0) {
              validationMap[position.positionId] = { valid: false, reason: 'No available credit - LTV limit reached' };
              return;
            }

            // Position is valid
            validationMap[position.positionId] = { valid: true };
          } catch (err) {
            console.error(`Failed to validate position ${position.positionId}:`, err);
            validationMap[position.positionId ?? 0] = { valid: false, reason: 'Failed to validate position' };
          }
        }));

        setPositionValidation(validationMap);

        // Auto-select first valid position
        if (!selectedPosition) {
          const firstValid = positions.find(p => validationMap[p.positionId ?? 0]?.valid);
          if (firstValid) {
            setSelectedPosition(firstValid);
          }
        }
      }
    };

    validatePositions();
  }, [isOpen, positions, selectedPosition]);


    useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError(null);
    }, 5000); // ⏱ 5 seconds

    return () => clearTimeout(timer);
  }, [error]);
  // Fetch asset details for all positions
  useEffect(() => {
    const fetchAllAssetDetails = async () => {
      if (isOpen && positions.length > 0) {
        const detailsMap: Record<string, IssuerAsset> = {};
        await Promise.all(positions.map(async (position) => {
          try {
            const assetDetails = await assetService.getAssetByTokenAddress(position.tokenAddress);
            if (assetDetails) {
              detailsMap[position.tokenAddress] = assetDetails;
            }
          } catch (err) {
            console.error(`Failed to fetch asset details for ${position.tokenAddress}:`, err);
          }
        }));
        setAssetDetailsMap(detailsMap);
      }
    };
    fetchAllAssetDetails();
  }, [isOpen, positions]);

  // Set selected asset from map when position changes
  useEffect(() => {
    if (selectedPosition && assetDetailsMap[selectedPosition.tokenAddress]) {
      setSelectedAsset(assetDetailsMap[selectedPosition.tokenAddress]);
    } else if (selectedPosition) {
      // Fallback to fetch if not in map (should be rare)
      const fetchAssetDetails = async () => {
        try {
          const assetDetails = await assetService.getAssetByTokenAddress(selectedPosition.tokenAddress);
          setSelectedAsset(assetDetails);
        } catch (err) {
          console.error("Failed to fetch asset details:", err);
          setSelectedAsset(null);
        }
      };
      fetchAssetDetails();
    } else {
      setSelectedAsset(null);
    }
  }, [selectedPosition, assetDetailsMap]);

  // Validate installments
  const { loanDuration, installmentError } = useMemo(() => {
    if (!selectedAsset) {
      return { loanDuration: 0, installmentError: null };
    }
    try {
      const maxDuration = assetService.calculateLoanDuration(selectedAsset);
      const requestedDuration = installments * 86400; // Assuming 30 days per installment

      if (installments > 24) {
        return { loanDuration: 0, installmentError: 'Maximum 24 installments allowed.' };
      }
      if (installments < 1) {
        return { loanDuration: 0, installmentError: 'Minimum 1 installment required.' };
      }

      if (requestedDuration > maxDuration) {
        const maxInstallments = Math.floor(maxDuration / (86400));
        return {
          loanDuration: 0,
          installmentError: `This asset only allows up to ${maxInstallments} installments.`
        };
      }
      return { loanDuration: requestedDuration, installmentError: null };
    } catch (err: any) {
      return { loanDuration: 0, installmentError: err.message };
    }
  }, [selectedAsset, installments]);

  // Filter positions
  const filteredPositions = useMemo(() => {
    if (!searchQuery) return positions;
    const query = searchQuery.toLowerCase();
    return positions.filter(p => {
        const asset = assetDetailsMap[p.tokenAddress];
        const name = asset?.metadata.invoiceNumber || p.tokenName;
        return name.toLowerCase().includes(query) ||
            p.tokenSymbol.toLowerCase().includes(query) ||
            p.tokenAddress.toLowerCase().includes(query)
    });
  }, [positions, searchQuery, assetDetailsMap]);

  // Validation
  const isAmountInvalid = useMemo(() => {
    const amount = parseFloat(borrowAmount);
    if (isNaN(amount) || amount <= 0) return true;
    return amount > availableCredit;
  }, [borrowAmount, availableCredit]);

  const borrowAmountUSD = useMemo(() => {
    const amount = parseFloat(borrowAmount);
    return isNaN(amount) ? 0 : amount;
  }, [borrowAmount]);

  const handleBorrow = async () => {
    if (!selectedPosition || isAmountInvalid || !borrowAmount || installmentError) return;

    setIsBorrowing(true);
    setError(null);
    try {
      const amountWei = ethers.parseUnits(borrowAmount, 6);
      const borrowResult = await solvencyContractService.borrowUSDC(
        selectedPosition.positionId ?? 0,
        amountWei,
        loanDuration,
        installments
      );

      if (!borrowResult.success) {
        throw new Error(borrowResult.error || 'Borrow transaction failed');
      }

      await solvencyService.notifyLoanBorrow({
        txHash: borrowResult.txHash!,
        positionId: String(selectedPosition.positionId),
        borrowAmount: amountWei.toString(),
        loanDuration: loanDuration.toString(),
        numberOfInstallments: installments.toString(),
        blockNumber: borrowResult.blockNumber?.toString(),
      });

      onSuccess();
      setBorrowAmount('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while borrowing.');
    } finally {
      setIsBorrowing(false);
    }
  };

  const handlePositionSelect = (position: CollateralPosition) => {
    setSelectedPosition(position);
    setShowPositionSelector(false);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Borrow Interface - Clean Swap Style */}
      <div className="w-full max-w-[500px] mx-auto bg-white/30 rounded-3xl shadow-2xl p-6 relative z-50">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Collateral Section (Top - Like "Sell") */}
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-3">
          <div className="flex items-start justify-between mb-3">
            {/* Label */}
            <span className="text-sm text-gray-500">Collateral Position</span>

            {/* Token Selector - Right aligned */}
            <button
              onClick={() => setShowPositionSelector(true)}
              disabled={isBorrowing}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-4 py-2"
            >
              {selectedPosition ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    {(selectedAsset?.metadata.invoiceNumber || selectedPosition.tokenSymbol).charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-900">{selectedAsset?.metadata.invoiceNumber || selectedPosition.tokenSymbol}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </>
              ) : (
                <>
                  <span className="text-gray-600">Select</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </>
              )}
            </button>
          </div>

          {/* Large Amount Display */}
          <div className="mb-1">
            <div className="text-5xl font-light text-gray-900">
              {selectedPosition ? formatCollateralAmount(selectedPosition.amount, 18).toFixed(2) : '0'}
            </div>
          </div>

          {/* USD Value */}
          <div className="text-sm text-gray-500">
            ${selectedPosition ? selectedPosition.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>

        {/* Arrow Separator */}
        <div className="flex justify-center my-2">
          <div className="w-10 h-10 flex items-center justify-center">
            <ArrowDown className="w-6 h-6 text-gray-900" />
          </div>
        </div>

        {/* Borrow Section (Bottom - Like "Buy") */}
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-3">
          <div className="flex items-start justify-between mb-3">
            {/* Label */}
            <span className="text-sm text-gray-500">Borrow</span>

            {/* USDC Display - Fixed, not selectable */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                $
              </div>
              <span className="font-semibold text-gray-900">USDC</span>
            </div>
          </div>

          {/* Large Input */}
          <div className="mb-1">
            <input
              type="text"
              value={borrowAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setBorrowAmount(val);
              }}
              placeholder="0"
              disabled={isBorrowing}
              className="w-full text-5xl font-light text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none focus:outline-none"
            />
          </div>

          {/* USD Value */}
          <div className="text-sm text-gray-500">
            ${borrowAmountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {/* Error Message - Inline */}
          {isAmountInvalid && parseFloat(borrowAmount) > 0 && (
            <div className="mt-3 text-sm text-red-600">
              Amount exceeds available credit (${availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })})
            </div>
          )}
        </div>

        {/* Installments - Minimal Design */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Number of Installments</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={installments}
                onChange={(e) => {
                  let value = parseInt(e.target.value, 10);
                  if (isNaN(value)) value = 1;
                  if (value > 24) value = 24;
                  if (value < 1) value = 1;
                  setInstallments(value);
                }}
                min="1"
                max="24"
                disabled={isBorrowing || !selectedAsset}
                className="w-20 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {installmentError && (
            <div className="mt-2 text-xs text-amber-600 ">{installmentError}</div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3 max-w-full max-h-40 overflow-auto break-words whitespace-pre-wrap">
            <p className="text-sm text-red-700">
              {(() => {
          // Extract revert reason from error message
          const reasonMatch = error.match(/reason="([^"]+)"/);
          if (reasonMatch && reasonMatch[1]) {
            return reasonMatch[1];
          }
          
          // Fallback to showing the full error if no reason found
          return error;
              })()}
            </p>
          </div>
        )}

        {/* Borrow Button - Clean Pink Design */}
        <button
          onClick={handleBorrow}
          disabled={isBorrowing || isAmountInvalid || !selectedPosition || !borrowAmount || !!installmentError}
          className="w-full bg-gradient-to-r from-pink-100 to-pink-50 hover:from-pink-200 hover:to-pink-100 disabled:from-gray-100 disabled:to-gray-50 text-pink-600 disabled:text-gray-400 font-semibold text-lg py-4 rounded-3xl transition-all disabled:cursor-not-allowed"
        >
          {isBorrowing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            'Borrow now'
          )}
        </button>

        {/* Available Credit - Subtle Info */}
        <div className="text-center mt-3 text-sm text-gray-500">
          Available credit: ${availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Position Selection Modal - Clean Token Selector Style */}
      {showPositionSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Select a position</h3>
              <button
                onClick={() => {
                  setShowPositionSelector(false);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search Bar - Clean Design */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="relative bg-gray-100 rounded-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tokens"
                  className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Position List - Clean Design */}
            <div className="flex-1 overflow-y-auto">
              {filteredPositions.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-gray-400">No positions found</p>
                </div>
              ) : (
                <div>
                  {filteredPositions.map((position) => {
                    const asset = assetDetailsMap[position.tokenAddress];
                    const name = asset?.metadata.invoiceNumber || position.tokenName;
                    const symbol = asset?.metadata.invoiceNumber || position.tokenSymbol;
                    const industry = asset?.metadata.industry || position.tokenSymbol;
                    const validation = positionValidation[position.positionId ?? 0];
                    const isValid = validation?.valid !== false; // Default to true if not yet validated
                    const reason = validation?.reason;

                    return (
                    <div
                      key={position.positionId || position.tokenAddress}
                      className="relative group"
                    >
                      <button
                        onClick={() => isValid && handlePositionSelect(position)}
                        disabled={!isValid}
                        className={`w-full flex items-center gap-4 px-6 py-4 transition-colors text-left border-b border-gray-50 last:border-b-0 ${
                          isValid 
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {/* Token Icon */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ${
                          isValid 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                            : 'bg-gray-400'
                        }`}>
                          {symbol.charAt(0)}
                        </div>

                        {/* Token Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-base mb-0.5 ${
                            isValid ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {industry} • {position.tokenAddress.slice(0, 6)}...{position.tokenAddress.slice(-4)}
                          </p>
                        </div>

                        {/* Value */}
                        <div className="text-right flex-shrink-0">
                          <p className={`font-semibold ${
                            isValid ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            ${position.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </button>
                      
                      {/* Tooltip showing reason on hover */}
                      {!isValid && reason && (
                        <div className="absolute left-0 right-0 top-full mt-1 mx-6 hidden group-hover:block z-10">
                          <div className="bg-red-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                            <p className="font-medium mb-0.5">Cannot borrow from this position</p>
                            <p className="text-red-100">{reason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
