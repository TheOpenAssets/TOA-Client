/**
 * Borrow Modal Component
 * Modal for borrowing USDC through 3rd party protocols (Aave, Compound, etc.)
 * 
 * IMPORTANT: Borrowing happens through 3rd party protocol interfaces/SDKs
 * This modal shows available credit and opens the protocol's borrowing interface
 */

import { useState, useMemo } from 'react';
import type { Protocol, OAIDCreditLine } from '../../../types/solvency.types';
import { formatUSD } from '../../../utils/solvency/format-credit.util';
import { previewHealthFactorChange } from '../../../utils/solvency/health-factor.util';
import { PROTOCOL_INTEGRATIONS } from '../../../constants/protocols.constants';

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocol: Protocol;
  creditData: OAIDCreditLine;
  onSuccess: () => void;
}

export const BorrowModal = ({
  isOpen,
  onClose,
  protocol,
  creditData,
  onSuccess,
}: BorrowModalProps) => {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate new health factor based on borrow amount
  const { newHealthFactor, healthStatus, isValid } = useMemo(() => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      return {
        newHealthFactor: creditData.healthFactor,
        healthStatus: 'current',
        isValid: true,
      };
    }

    const amount = parseFloat(borrowAmount);
    
    // Check if amount exceeds available credit
    if (amount > creditData.availableCredit) {
      return {
        newHealthFactor: 0,
        healthStatus: 'insufficient',
        isValid: false,
      };
    }

    // Calculate total collateral value
    const totalCollateralValue = creditData.collateral.reduce(
      (sum, pos) => sum + pos.valueUSD,
      0
    );

    // Use previewHealthFactorChange to calculate new health factor after borrow
    const preview = previewHealthFactorChange(
      totalCollateralValue,  // currentCollateralUSD
      creditData.currentDebt, // currentDebtUSD
      0,                      // collateralChange (no change)
      amount                  // debtChange (borrowing adds to debt)
    );

    let status = 'healthy';
    if (preview.afterAction < 110) status = 'critical';
    else if (preview.afterAction < 125) status = 'warning';

    return {
      newHealthFactor: preview.afterAction,
      healthStatus: status,
      isValid: preview.isSafe,
    };
  }, [borrowAmount, creditData]);

  const handleBorrow = async () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0 || !isValid) {
      return;
    }

    setIsProcessing(true);

    try {
      // Get protocol integration
      const integration = PROTOCOL_INTEGRATIONS[protocol.id as keyof typeof PROTOCOL_INTEGRATIONS];

      if (!integration) {
        alert(`${protocol.name} integration coming soon! This will open ${protocol.name}'s borrowing interface.`);
        onClose();
        return;
      }

      // Open protocol's borrow interface
      if ('openBorrowModal' in integration) {
        await integration.openBorrowModal(
          creditData.oaidId,
          borrowAmount
        );
      } else if ('redirectToBorrow' in integration) {
        integration.redirectToBorrow(creditData.oaidId, borrowAmount);
      }

      // After successful borrow from protocol, refresh data
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Borrow error:', error);
      alert(error.message || 'Failed to open borrow interface');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxClick = () => {
    setBorrowAmount(creditData.availableCredit.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[20px] p-8 max-w-lg w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] mb-1">
              Borrow from {protocol.name}
            </h2>
            <p className="text-sm text-[#6B7280]">
              {protocol.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#111111] transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Protocol Info */}
        <div className="bg-[#F7F8FA] rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#6B7280] mb-1">Borrow APR</div>
              <div className="text-lg font-semibold text-[#111111]">{protocol.borrowRate}%</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-1">Protocol TVL</div>
              <div className="text-lg font-semibold text-[#111111]">
                ${(protocol.tvl / 1e9).toFixed(2)}B
              </div>
            </div>
          </div>
        </div>

        {/* Available Credit */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6B7280]">Available to Borrow</span>
            <span className="text-sm font-medium text-[#111111]">
              {formatUSD(creditData.availableCredit)}
            </span>
          </div>
          <div className="text-xs text-[#6B7280]">
            Current debt: {formatUSD(creditData.currentDebt)} • 
            Credit limit: {formatUSD(creditData.creditLimit)}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#111111] mb-2">
            Borrow Amount (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-transparent text-lg"
              disabled={isProcessing}
              min="0"
              max={creditData.availableCredit}
              step="0.01"
            />
            <button
              onClick={handleMaxClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-[#111111] bg-[#F7F8FA] rounded hover:bg-gray-200 transition-colors"
              disabled={isProcessing}
            >
              MAX
            </button>
          </div>
          {borrowAmount && parseFloat(borrowAmount) > creditData.availableCredit && (
            <p className="mt-2 text-sm text-red-600">
              ⚠️ Amount exceeds available credit
            </p>
          )}
        </div>

        {/* Health Factor Preview */}
        {borrowAmount && parseFloat(borrowAmount) > 0 && (
          <div className="mb-6 p-4 bg-[#F7F8FA] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6B7280]">Current Health Factor</span>
              <span className="text-sm font-medium text-[#111111]">
                {creditData.healthFactor}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B7280]">New Health Factor</span>
              <span className={`text-sm font-semibold ${
                healthStatus === 'critical' ? 'text-red-600' :
                healthStatus === 'warning' ? 'text-yellow-600' :
                healthStatus === 'insufficient' ? 'text-red-600' :
                'text-green-600'
              }`}>
                {healthStatus === 'insufficient' ? 'Insufficient Credit' : `${newHealthFactor.toFixed(2)}%`}
              </span>
            </div>
            {healthStatus === 'warning' && (
              <p className="mt-2 text-xs text-yellow-600">
                ⚠️ Health factor approaching liquidation threshold (110%)
              </p>
            )}
            {healthStatus === 'critical' && (
              <p className="mt-2 text-xs text-red-600">
                ❌ This borrow would put your position at risk of liquidation
              </p>
            )}
          </div>
        )}

        {/* Important Notice */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs font-medium text-blue-900 mb-1">
                Borrowing through {protocol.name}
              </p>
              <p className="text-xs text-blue-700">
                This will open {protocol.name}'s interface where you can borrow against your OAID credit line. 
                The protocol will notify us after a successful borrow.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-[#111111] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleBorrow}
            disabled={!borrowAmount || parseFloat(borrowAmount) <= 0 || !isValid || isProcessing}
            className="flex-1 px-6 py-3 bg-[#111111] text-white rounded-lg font-medium hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Opening...' : `Borrow on ${protocol.name}`}
          </button>
        </div>
      </div>
    </div>
  );
};
