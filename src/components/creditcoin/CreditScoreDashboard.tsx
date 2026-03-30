// src/components/creditcoin/CreditScoreDashboard.tsx

import { useCreditScore } from '../../pages/borrow/hooks/useCreditScore';
import { Button } from '../ui/button';
import { CrossChainEventHistory } from './CrossChainEventHistory';
import type { CreditScoreResponse } from '../../types/creditcoin.types';

interface CreditScoreDashboardProps {
  walletAddress: string;
  onVerifyClick: () => void;
}

// Tier configuration — colors and labels
type Tier = CreditScoreResponse['tier'];

const TIER_CONFIG: Record<
  Tier,
  { label: string; borderColor: string; badgeBg: string; badgeText: string; scoreColor: string }
> = {
  EXCELLENT: {
    label: 'EXCELLENT',
    borderColor: 'border-l-green-500',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    scoreColor: 'text-green-600',
  },
  GOOD: {
    label: 'GOOD',
    borderColor: 'border-l-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    scoreColor: 'text-blue-600',
  },
  FAIR: {
    label: 'FAIR',
    borderColor: 'border-l-yellow-500',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-700',
    scoreColor: 'text-yellow-600',
  },
  POOR: {
    label: 'POOR',
    borderColor: 'border-l-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    scoreColor: 'text-red-600',
  },
};

// Loading skeleton
const ScoreSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-28" />
        <div className="h-10 bg-gray-200 rounded w-24" />
        <div className="h-5 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-9 bg-gray-200 rounded-[16px] w-44" />
    </div>
    <div className="h-px bg-gray-100" />
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-24" />
      <div className="h-6 bg-gray-200 rounded w-16" />
      <div className="h-3 bg-gray-200 rounded w-56" />
    </div>
    <div className="h-px bg-gray-100" />
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-28" />
      <div className="h-6 bg-gray-200 rounded w-16" />
      <div className="h-3 bg-gray-200 rounded w-64" />
    </div>
    <div className="h-px bg-gray-100" />
    <div className="h-3 bg-gray-200 rounded w-48" />
  </div>
);

export const CreditScoreDashboard = ({
  walletAddress,
  onVerifyClick,
}: CreditScoreDashboardProps) => {
  const { creditScore, isLoading, error } = useCreditScore(walletAddress);

  const cardShadow = {
    boxShadow: `
      4px 4px 12px rgba(243, 244, 245, 0.08),
      8px 8px 24px rgba(150, 151, 151, 0.06),
      12px 12px 36px rgba(92, 92, 93, 0.04),
      16px 16px 48px rgba(45, 46, 47, 0.02)
    `,
  };

  const tier = creditScore?.tier ?? 'GOOD';
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG.GOOD;

  return (
    <div className="flex flex-col gap-4">
      {/* Score card */}
      <div
        className={`bg-transparent rounded-2xl border border-gray-300 border-l-4 ${tierConfig.borderColor} p-6`}
        style={cardShadow}
      >
        {isLoading && !creditScore && <ScoreSkeleton />}

        {error && !creditScore && (
          <p className="font-gellix text-xs text-red-500">
            Unable to load credit score. Please try again later.
          </p>
        )}

        {creditScore && (
          <div className="space-y-5">
            {/* Section 1: Composite score header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-gellix text-xs font-medium text-gray-500 mb-1">
                  Composite Score
                </h3>
                <p className={`font-gellix text-5xl font-semibold ${tierConfig.scoreColor}`}>
                  {creditScore.compositeScore}
                </p>
                <span
                  className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${tierConfig.badgeBg} ${tierConfig.badgeText}`}
                >
                  {tierConfig.label}
                </span>
              </div>
              <div className="shrink-0 mt-1">
                <Button
                  onClick={onVerifyClick}
                  className="text-sm py-4 px-5 rounded-[16px] bg-black text-white hover:bg-gray-900 transition-colors hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 cursor-pointer"
                >
                  Submit Cross-Chain Activity
                </Button>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Section 2: Layer 1 — Platform Score */}
            <div>
              <h4 className="font-gellix text-xs font-medium text-gray-500 mb-0.5">
                Platform Score
              </h4>
              <p className="font-gellix text-2xl font-semibold text-foreground">
                {creditScore.layer1Score}
              </p>
              <p className="font-gellix text-xs text-gray-400 mt-1">
                Based on your repayment history on this platform.
              </p>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Section 3: Layer 2 — Creditcoin Protocol Score */}
            <div>
              <h4 className="font-gellix text-xs font-medium text-gray-500 mb-0.5">
                Protocol Score
              </h4>
              {creditScore.layer2Score === 0 ? (
                <p className="font-gellix text-sm text-gray-400 italic mt-1">
                  No Creditcoin protocol history found
                </p>
              ) : (
                <p className="font-gellix text-2xl font-semibold text-foreground">
                  {creditScore.layer2Score}
                </p>
              )}
              <p className="font-gellix text-xs text-gray-400 mt-1">
                Based on your verified on-chain lending history across the Creditcoin network.
              </p>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Section 4: Applied LTV */}
            {(() => {
              // effectiveLTV is in basis points (e.g. 7000 = 70%, 7500 = 75%)
              // Guard against undefined, null, or string values from the API
              const rawLTV = Number(creditScore.effectiveLTV);
              const ltvBps = isFinite(rawLTV) && rawLTV > 0 ? rawLTV : 7000;
              const ltvPercent = (ltvBps / 100).toFixed(0);
              return (
                <p className="font-gellix text-xs text-gray-500">
                  Your credit tier qualifies you for{' '}
                  <span className="font-semibold text-gray-700">
                    {ltvPercent}%
                  </span>{' '}
                  LTV
                </p>
              );
            })()}
          </div>
        )}
      </div>

      {/* Cross-chain event history below the score card */}
      <CrossChainEventHistory walletAddress={walletAddress} />
    </div>
  );
};
