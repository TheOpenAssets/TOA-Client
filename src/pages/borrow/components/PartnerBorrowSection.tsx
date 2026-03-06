import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { partnerService } from '../../../lib/api/partner.service';
import { PartnerBorrowModal } from './PartnerBorrowModal';
import { MyPartnerLoans } from './MyPartnerLoans';
import type { Partner, PartnerBorrowTerms } from '../../../types/creditcoin.types';
import type { CollateralPosition } from '../../../types/solvency.types';

const usdcToDisplay = (raw: string) =>
  (parseInt(raw) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  walletAddress: string;
  positions?: CollateralPosition[];
}

export const PartnerBorrowSection = ({ walletAddress, positions = [] }: Props) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [borrowTerms, setBorrowTerms] = useState<PartnerBorrowTerms | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loansKey, setLoansKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [partnersData, termsData] = await Promise.all([
          partnerService.getPartners(),
          partnerService.getPartnerBorrowTerms(walletAddress),
        ]);
        setPartners(partnersData);
        setBorrowTerms(termsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load partner data');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [walletAddress]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
        <p className="text-sm text-red-600 font-gellix">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Credit summary banner */}
      {borrowTerms && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-400 font-gellix uppercase tracking-wider mb-1">Your Credit</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-gray-900 font-gellix">{borrowTerms.compositeScore}</span>
                <span className="text-sm px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-gellix">{borrowTerms.tier}</span>
                {borrowTerms.hasBoost && (
                  <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold font-gellix">
                    Credit Boost Active
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-gellix uppercase tracking-wider mb-1">Max Borrowable</p>
              <p className="text-xl font-semibold text-gray-900 font-gellix">
                {usdcToDisplay(borrowTerms.maxBorrowableUsdc)} USDC
              </p>
              <p className="text-xs text-gray-400 font-gellix mt-0.5">
                {borrowTerms.effectiveLtv / 100}% LTV
                {borrowTerms.hasBoost && (
                  <span className="text-gray-300"> (standard {borrowTerms.standardLtv / 100}%)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partner cards */}
      {partners.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm font-gellix">No active partner protocols available.</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 font-gellix uppercase tracking-wider mb-3">Available Partners</p>
          <div className="space-y-3">
            {partners.map(partner => (
              <PartnerCard
                key={partner.partnerId}
                partner={partner}
                borrowTerms={borrowTerms}
                onBorrow={() => setSelectedPartner(partner)}
              />
            ))}
          </div>
        </div>
      )}

      {/* My Partner Loans */}
      <div>
        <p className="text-xs text-gray-400 font-gellix uppercase tracking-wider mb-3">My Partner Loans</p>
        <MyPartnerLoans key={loansKey} />
      </div>

      {/* Borrow modal */}
      {selectedPartner && borrowTerms && (
        <PartnerBorrowModal
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          onSuccess={() => {
            setSelectedPartner(null);
            setLoansKey(k => k + 1); // re-mount MyPartnerLoans to refresh
          }}
          partner={selectedPartner}
          borrowTerms={borrowTerms}
          positions={positions}
        />
      )}
    </div>
  );
};

// ─── Partner Card ─────────────────────────────────────────────────────────────

interface PartnerCardProps {
  partner: Partner;
  borrowTerms: PartnerBorrowTerms | null;
  onBorrow: () => void;
}

const PartnerCard = ({ partner, borrowTerms, onBorrow }: PartnerCardProps) => {
  const initial = partner.partnerName.charAt(0);
  const maxDisplay = borrowTerms ? usdcToDisplay(borrowTerms.maxBorrowableUsdc) : '—';
  const ltv = borrowTerms ? `${borrowTerms.effectiveLtv / 100}%` : '—';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900 font-gellix">{partner.partnerName}</p>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-gellix">{partner.tier}</span>
          </div>
          <p className="text-xs text-gray-400 font-gellix">
            Up to <span className="text-gray-700 font-medium">{maxDisplay} USDC</span> at <span className="text-gray-700 font-medium">{ltv} LTV</span>
          </p>
        </div>
      </div>
      <button
        onClick={onBorrow}
        className="flex-shrink-0 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black hover:scale-[1.02] transition-all font-gellix"
      >
        Borrow
      </button>
    </div>
  );
};
