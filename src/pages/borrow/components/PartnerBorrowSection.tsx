import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { partnerService } from '../../../lib/api/partner.service';
import { PartnerBorrowModal } from './PartnerBorrowModal';
import { MyPartnerLoans } from './MyPartnerLoans';
import type { Partner, PartnerBorrowTerms } from '../../../types/creditcoin.types';
import type { CollateralPosition } from '../../../types/solvency.types';

// maxBorrowableUsdc comes from the backend as a 6-decimal string (e.g. "8000000000" = 8000 USDC)
// Guard against undefined, null, empty string, or non-numeric values
// Auto-detects format: if value >= 1_000_000 assume micro-USDC (6 decimals), else treat as plain USDC
const usdcToDisplay = (raw: string | undefined | null): string => {
  const parsed = parseFloat(raw ?? '');
  if (!isFinite(parsed) || isNaN(parsed) || parsed === 0) return '0.00';
  // If >= 1,000,000 it is in micro-USDC (6 decimal places from the contract)
  // Otherwise the backend already returned a plain USDC amount
  const usdc = parsed >= 1_000_000 ? parsed / 1_000_000 : parsed;
  return usdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Safely convert basis-point LTV to a display percentage string
const ltvToDisplay = (bps: number | undefined | null, fallback = 70): string => {
  const n = Number(bps);
  return isFinite(n) && n > 0 ? (n / 100).toFixed(0) : fallback.toFixed(0);
};

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

  // Derive a stable value from positions so we re-fetch borrowTerms whenever
  // the user deposits new collateral (total collateral value changes).
  const positionsTotalValue = positions.reduce((sum, p) => sum + p.valueUSD, 0);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [partnersData, termsData] = await Promise.all([
          partnerService.getPartners(),
          partnerService.getPartnerBorrowTerms(walletAddress),
        ]);
        console.log('🔍 [PartnerBorrowSection] Raw borrowTerms from API:', JSON.stringify(termsData, null, 2));
        setPartners(partnersData);
        setBorrowTerms(termsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load partner data');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [walletAddress, positionsTotalValue]);

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

  // Compute max borrowable from positions + effectiveLtv (backend doesn't return this field)
  const computedMaxBorrowableUsdc = borrowTerms
    ? Math.floor(
      positions.reduce((sum, p) => sum + p.valueUSD, 0)
      * (borrowTerms.effectiveLtv / 10000)
      * 1_000_000
    ).toString()
    : '0';

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
                {usdcToDisplay(computedMaxBorrowableUsdc)} USDC
              </p>
              <p className="text-xs text-gray-400 font-gellix mt-0.5">
                {ltvToDisplay(borrowTerms.effectiveLtv)}% LTV
                {borrowTerms.hasBoost && (
                  <span className="text-gray-300"> (standard {ltvToDisplay(borrowTerms.standardLtv)}%)</span>
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
                maxBorrowableUsdc={computedMaxBorrowableUsdc}
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
          borrowTerms={{ ...borrowTerms, maxBorrowableUsdc: computedMaxBorrowableUsdc }}
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
  maxBorrowableUsdc: string;
  onBorrow: () => void;
}

const PartnerCard = ({ partner, borrowTerms, maxBorrowableUsdc, onBorrow }: PartnerCardProps) => {
  const maxDisplay = usdcToDisplay(maxBorrowableUsdc);
  const ltv = borrowTerms ? `${ltvToDisplay(borrowTerms.effectiveLtv)}%` : '—';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
          {(
            <img src="https://imgs.search.brave.com/pFPVewX6EPaA9cqyHiIwKWNoh2RifQawztq9l8PIb30/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvMTBhMzc0YTEy/ZGE4NTAxMzIyYjA5/NjVkNjdhNTZmZTQ1/MzkxZjdjNGU0NjNj/YmNjOTViYTZhNzVh/NWM2NjVhMi93d3cu/YWF2ZS5jb20v" alt={partner.partnerName} className="w-full h-full object-cover" />
          )}
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
