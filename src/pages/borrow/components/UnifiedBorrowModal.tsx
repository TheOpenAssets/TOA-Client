import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { solvencyContractService } from '../../../lib/api/solvency-contract.service';
import { solvencyService } from '../../../lib/api/solvency.service';
import { type OAIDCreditLine } from '../../../types/solvency.types';
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
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCredit = creditData?.availableCredit ?? 0;
  const positions = creditData?.collateral ?? [];

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      // Pre-select the first position if available
      if (positions.length > 0 && !selectedPositionId) {
        setSelectedPositionId(String(positions[0].positionId));
      }
    } else {
      setBorrowAmount('');
      setSelectedPositionId(null);
      setIsBorrowing(false);
      setError(null);
    }
  }, [isOpen, positions, selectedPositionId]);

  // Derived state for validation
  const isAmountInvalid = useMemo(() => {
    const amount = parseFloat(borrowAmount);
    if (isNaN(amount) || amount <= 0) return true;
    return amount > availableCredit / 1e6; // availableCredit is in 1e6 format
  }, [borrowAmount, availableCredit]);

  const handleBorrow = async () => {
    if (!selectedPositionId || isAmountInvalid || !borrowAmount) return;

    setIsBorrowing(true);
    setError(null);
    try {
      const amountWei = ethers.parseUnits(borrowAmount, 6);
      const borrowResult = await solvencyContractService.borrowUSDC(
        parseInt(selectedPositionId),
        amountWei
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

        <div className="space-y-6">
          {/* Available Credit Display */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Available to Borrow</p>
            <p className="text-4xl font-bold text-gray-900">{formatUSD(availableCredit)}</p>
          </div>

          {/* Position Selector */}
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              Borrow Against Position
            </label>
            <Select
              value={selectedPositionId ?? ''}
              onValueChange={setSelectedPositionId}
              disabled={isBorrowing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a position..." />
              </SelectTrigger>
              <SelectContent>
                {positions.length > 0 ? (
                  positions.map(p => (
                    <SelectItem key={p.positionId} value={String(p.positionId)}>
                      Position #{p.positionId} ({p.tokenSymbol}) - {formatUSD(p.valueUSD)} Collateral
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">No positions available to borrow against.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount Input */}
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

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleBorrow}
            disabled={isBorrowing || isAmountInvalid || !selectedPositionId || !borrowAmount}
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
