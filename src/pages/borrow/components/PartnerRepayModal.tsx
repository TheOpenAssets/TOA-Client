import { useState } from 'react';
import { X, Loader2, ExternalLink, CheckCircle } from 'lucide-react';
import { partnerService } from '../../../lib/api/partner.service';
import type { PartnerLoan, PartnerRepayResponse } from '../../../types/creditcoin.types';

const usdcToDisplay = (raw: string) =>
  (parseInt(raw) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loan: PartnerLoan;
}

export const PartnerRepayModal = ({ isOpen, onClose, onSuccess, loan }: Props) => {
  const [isRepaying, setIsRepaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PartnerRepayResponse | null>(null);

  const remainingDisplay = usdcToDisplay(loan.remainingDebt);

  const handleRepay = async () => {
    setIsRepaying(true);
    setError(null);
    try {
      const res = await partnerService.repayPartnerLoan({
        internalLoanId: loan.internalLoanId,
        amount: loan.remainingDebt,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsRepaying(false);
    }
  };

  const handleClose = () => {
    if (isRepaying) return;
    setError(null);
    setResult(null);
    onClose();
  };

  const handleContinue = () => {
    setResult(null);
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 font-gellix">Repay Loan</h3>
            <p className="text-sm text-gray-500 mt-0.5 font-gellix">{loan.partnerName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isRepaying}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success state */}
        {result ? (
          <div className="px-6 py-8 space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-xl font-semibold text-gray-900 font-gellix">Repayment Complete</p>
              <p className="text-gray-500 text-sm font-gellix">
                {usdcToDisplay(result.repaymentAmount)} USDC repaid to {result.partnerName}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider font-gellix">On-chain transactions</p>
              <TxLink label={`Repaid in ${result.partnerName} contract`} href={result.explorerLinks.partnerRepay} />
              <TxLink label="SolvencyVault settled" href={result.explorerLinks.vaultRepay} />
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 text-sm text-emerald-700 font-gellix text-center">
              Your collateral is now available to withdraw.
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-gray-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-black transition-colors font-gellix"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-4">
            {/* Loan summary */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-gellix">Partner</span>
                <span className="text-sm font-semibold text-gray-900 font-gellix">{loan.partnerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 font-gellix">Principal</span>
                <span className="text-sm font-semibold text-gray-900 font-gellix">{usdcToDisplay(loan.principalAmount)} USDC</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-semibold font-gellix">Amount Due</span>
                <span className="text-lg font-bold text-gray-900 font-gellix">{remainingDisplay} USDC</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center font-gellix">
              Full repayment — platform executes on-chain, no wallet signing required
            </p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-sm text-red-600 font-gellix">{error}</p>
              </div>
            )}

            {/* Loading */}
            {isRepaying && (
              <div className="bg-gray-50 rounded-2xl p-4 text-center space-y-1">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500 mx-auto" />
                <p className="text-sm text-gray-600 font-gellix">Processing on Creditcoin testnet...</p>
                <p className="text-xs text-gray-400 font-gellix">This takes a few seconds — confirming on-chain</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isRepaying}
                className="flex-1 px-4 py-3.5 border border-gray-200 rounded-2xl text-gray-600 font-semibold hover:bg-gray-50 transition-colors font-gellix disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleRepay}
                disabled={isRepaying}
                className="flex-1 bg-gray-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-black transition-colors font-gellix disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRepaying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : (
                  `Repay ${remainingDisplay} USDC`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TxLink = ({ label, href }: { label: string; href: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600 font-gellix">{label}</span>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-gellix"
    >
      View on Explorer <ExternalLink className="w-3 h-3" />
    </a>
  </div>
);
