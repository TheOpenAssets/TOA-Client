import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { usePartnerLoans } from '../hooks/usePartnerLoans';
import { getPartnerLogo } from '../../../lib/partnerLogos';
import { PartnerRepayModal } from './PartnerRepayModal';
import type { PartnerLoan } from '../../../types/creditcoin.types';

const usdcToDisplay = (raw: string) =>
  (parseInt(raw) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const MyPartnerLoans = () => {
  const { loans, isLoading, error, refetch } = usePartnerLoans();
  const [repayingLoan, setRepayingLoan] = useState<PartnerLoan | null>(null);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
        <p className="text-sm text-red-600 font-gellix">{error}</p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 text-sm font-gellix">No partner loans yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {loans.map(loan => {
          const isRepaid = loan.status === 'REPAID';
          return (
            <div
              key={loan.internalLoanId}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getPartnerLogo(loan.partnerName) && (
                    <img src={getPartnerLogo(loan.partnerName)!} alt={loan.partnerName} className="w-7 h-7 rounded-full flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 font-gellix">{loan.partnerName}</p>
                    <p className="text-xs text-gray-400 font-gellix mt-0.5">{formatDate(loan.borrowedAt)}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full font-gellix ${
                    isRepaid
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {loan.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-gellix">Borrowed</p>
                  <p className="text-sm font-semibold text-gray-900 font-gellix">{usdcToDisplay(loan.principalAmount)} USDC</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-gellix">Remaining</p>
                  <p className={`text-sm font-semibold font-gellix ${isRepaid ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {usdcToDisplay(loan.remainingDebt)} USDC
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <a
                  href={`https://creditcoin-testnet.blockscout.com/tx/${loan.borrowTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-gellix"
                >
                  View Borrow Tx <ExternalLink className="w-3 h-3" />
                </a>

                {isRepaid ? (
                  loan.repayTxHash && (
                    <a
                      href={`https://creditcoin-testnet.blockscout.com/tx/${loan.repayTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-gellix"
                    >
                      View Repay Tx <ExternalLink className="w-3 h-3" />
                    </a>
                  )
                ) : (
                  <button
                    onClick={() => setRepayingLoan(loan)}
                    className="text-xs font-semibold text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-gellix"
                  >
                    Repay Now
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {repayingLoan && (
        <PartnerRepayModal
          isOpen={!!repayingLoan}
          onClose={() => setRepayingLoan(null)}
          onSuccess={() => {
            setRepayingLoan(null);
            refetch();
          }}
          loan={repayingLoan}
        />
      )}
    </>
  );
};
