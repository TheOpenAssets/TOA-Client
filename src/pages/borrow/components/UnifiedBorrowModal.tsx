import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import { solvencyService } from '../../../lib/api/solvency.service';
import { assetService } from '../../../lib/api/asset.service';
import { type OAIDCreditLine } from '../../../types/solvency.types';
import type { IssuerAsset } from '../../../types/issuer.types';
import { formatUSD } from '../../../utils/solvency/format-credit.util';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

interface BorrowOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  creditData: OAIDCreditLine | null;
}

export const UnifiedBorrowModal = ({ isOpen, onClose, onSuccess, creditData }: BorrowOnlyModalProps) => {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [installments, setInstallments] = useState<number>(12);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<IssuerAsset | null>(null);

  const availableCredit = creditData?.availableCredit ?? 0;
  const positions = creditData?.collateral ?? [];

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      if (positions.length > 0 && !selectedPositionId) {
        setSelectedPositionId(String(positions[0].positionId));
      }
    } else {
      setBorrowAmount('');
      setSelectedPositionId(null);
      setInstallments(12);
      setIsBorrowing(false);
      setError(null);
      setSelectedAsset(null);
    }
  }, [isOpen, positions, selectedPositionId]);

  // Fetch asset details when position changes
  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (selectedPositionId) {
        const position = positions.find(p => String(p.positionId) === selectedPositionId);
        if (position) {
          try {
            const assetDetails = await assetService.getAssetByTokenAddress(position.tokenAddress);
            setSelectedAsset(assetDetails);
          } catch (err) {
            console.error("Failed to fetch asset details:", err);
            setError("Could not load asset details for the selected position.");
            setSelectedAsset(null);
          }
        }
      } else {
        setSelectedAsset(null);
      }
    };
    fetchAssetDetails();
  }, [selectedPositionId, positions]);

  // Validate installment period against asset maturity
  const { loanDuration, installmentError } = useMemo(() => {
    if (!selectedAsset) {
      return { loanDuration: 0, installmentError: null };
    }
    try {
      const maxDuration = assetService.calculateLoanDuration(selectedAsset);
      // Assuming monthly installments for this check
      const requestedDuration = installments * 30 * 86400; 

      if (requestedDuration > maxDuration) {
        return { 
          loanDuration: maxDuration, 
          installmentError: `Too many installments. The loan must be repaid within ${Math.floor(maxDuration / 86400)} days.` 
        };
      }
      return { loanDuration: maxDuration, installmentError: null };
    } catch (err: any) {
      return { loanDuration: 0, installmentError: err.message };
    }
  }, [selectedAsset, installments]);

  // Derived state for validation
  const isAmountInvalid = useMemo(() => {
    const amount = parseFloat(borrowAmount);
    if (isNaN(amount) || amount <= 0) return true;
    return amount  > availableCredit;
  }, [borrowAmount, availableCredit]);

  const handleBorrow = async () => {
    if (!selectedPositionId || isAmountInvalid || !borrowAmount || installmentError) return;

    setIsBorrowing(true);
    setError(null);
    try {
      const amountWei = ethers.parseUnits(borrowAmount, 6);
      const borrowResult = await solvencyContractService.borrowUSDC(
        parseInt(selectedPositionId),
        amountWei,
        loanDuration,
        installments
      );

      if (!borrowResult.success) {
        throw new Error(borrowResult.error || 'Borrow transaction failed');
      }

      await solvencyService.syncPosition({
        positionId: selectedPositionId,
        txHash: borrowResult.txHash!,
        blockNumber: borrowResult.blockNumber!,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred while borrowing.');
    } finally {
      setIsBorrowing(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Borrow USDC</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isBorrowing}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Available to Borrow</p>
            <p className="text-4xl font-bold text-gray-900">{formatUSD(availableCredit)}</p>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              Borrow Against Position
            </label>
            <Select
              value={selectedPositionId ?? ''}
              onValueChange={(value) => setSelectedPositionId(value)}
              disabled={isBorrowing}
            >
              <SelectTrigger className="w-full h-12 px-4 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
              <span className="text-gray-900 font-medium">
                {selectedPositionId ? `Position #${selectedPositionId}` : 'Select a position...'}
              </span>
              <SelectValue className="sr-only" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-50">
              {positions.length > 0 ? (
                positions.map((position, index) => {
                const posId = position.positionId ? String(position.positionId) : String(index);
                const tokenAddr = position.tokenAddress ?? '';
                const tokenSymbol= position.tokenSymbol ?? 'token';
                const valueUSD= position.valueUSD ?? 0;
                const shortAddr = tokenAddr ? `${tokenAddr.slice(0, 6)}...${tokenAddr.slice(-4)}` : 'Unknown token';
                return (
                  <SelectItem
                  key={posId}
                  value={posId}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                  >
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">{shortAddr}</span>
                    <span className="font-medium text-gray-900"> $ {valueUSD}</span>
                  </div>
                  </SelectItem>
                );
                })
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No positions available to borrow against.
                </div>
              )}
              </SelectContent>
            </Select>
            {selectedPositionId && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-xs font-medium text-blue-700">
                  Selected: Position #{selectedPositionId}
                </p>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Borrow Amount
            </label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                value={borrowAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setBorrowAmount(val);
                }}
                placeholder="0.00"
                className="pr-16 text-lg"
                disabled={isBorrowing}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-lg text-gray-500">
                USDC
              </div>
            </div>
            {isAmountInvalid && parseFloat(borrowAmount) > 0 && (
              <p className="mt-2 text-sm text-red-600">
                Amount exceeds your available credit of {formatUSD(availableCredit)}.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="installments" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Installments
            </label>
            <Input
              id="installments"
              type="number"
              value={installments}
              onChange={(e) => setInstallments(parseInt(e.target.value, 10) || 1)}
              placeholder="e.g., 12"
              className="text-lg"
              disabled={isBorrowing || !selectedAsset}
              min="1"
            />
             {installmentError && (
              <p className="mt-2 text-sm text-yellow-600">{installmentError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Choose how many payments you want to make.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleBorrow}
            disabled={isBorrowing || isAmountInvalid || !selectedPositionId || !borrowAmount || !!installmentError}
            className="w-full text-lg py-6"
          >
            {isBorrowing ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Borrow Now <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
