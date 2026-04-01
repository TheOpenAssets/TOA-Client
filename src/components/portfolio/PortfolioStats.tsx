// src/components/portfolio/PortfolioStats.tsx
import { Plus } from 'lucide-react';
import { MiniAreaChart } from './MiniAreaChart';
import { generateAssetValueChart, generateYieldChart } from '../../lib/utils/portfolioChartGenerator';
import type { PortfolioAsset } from '../../types/portfolio.types';
import type { OAIDCreditLine } from '../../types/solvency.types';
import { Button } from '../ui/button';
import { formatUSD } from '../../utils/solvency/format-credit.util';

interface PortfolioStatsProps {
  totalAssetValue: number;
  portfolioAssets: PortfolioAsset[];
  creditData?: OAIDCreditLine | null;
  onIncreaseLimit?: () => void;
  showCreditLimitCard?: boolean;
}

export const PortfolioStats = ({
  totalAssetValue,
  portfolioAssets,
  creditData,
  onIncreaseLimit,
  showCreditLimitCard = true,
}: PortfolioStatsProps) => {
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate Total Yield Earned
  const totalYieldEarned = portfolioAssets.reduce((sum, asset) => {
    if (asset.yieldInfo?.settlementDistributed) {
      const yieldAmount = parseFloat(asset.yieldInfo.claimableYield || '0') / 1e6;
      return sum + yieldAmount;
    }
    return sum;
  }, 0);

  // Count assets with yield
  const assetsWithYield = portfolioAssets.filter(
    a => a.yieldInfo?.settlementDistributed
  ).length;

  // Generate chart data
  const assetChartData = generateAssetValueChart(portfolioAssets, totalAssetValue);
  const yieldChartData = generateYieldChart(portfolioAssets, totalYieldEarned);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Total Asset Value Card */}
      <div
        className="bg-transparent rounded-2xl border border-gray-300 p-6 flex-1 flex flex-col relative overflow-hidden"
        style={{
          boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
        }}
      >
        <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
          Total Value Invested
        </h3>
        <p className="font-gellix text-3xl font-semibold text-foreground">
          ${formatCurrency(totalAssetValue)}
        </p>
        {/* Blue Area Chart */}
        <MiniAreaChart
          data={assetChartData}
          gradient={{
            id: 'assetGradient',
            color: '#3B82F6',
            startOpacity: 0.5,
            endOpacity: 0.05
          }}
          strokeColor="#3B82F6"
          strokeWidth={2}
        />
      </div>

      {/* Total Yield Earned Card */}
      <div
        className="bg-transparent rounded-2xl border border-gray-300 p-6 flex-1 flex flex-col relative overflow-hidden"
        style={{
          boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
        }}
      >
        <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
          Total Yield Earned
        </h3>
        <p className="font-gellix text-3xl font-semibold text-foreground">
          ${formatCurrency(totalYieldEarned)}
        </p>
        <p className="font-gellix text-xs text-gray-500 mt-2">
          {assetsWithYield} asset{assetsWithYield !== 1 ? 's' : ''} with yield
        </p>

        {/* Green Area Chart */}
        <MiniAreaChart
          data={yieldChartData}
          gradient={{
            id: 'yieldGradient',
            color: '#10B981',
            startOpacity: 0.5,
            endOpacity: 0.05
          }}
          strokeColor="#10B981"
          strokeWidth={2}
        />
      </div>

      {showCreditLimitCard && (
        <div
          className="bg-transparent rounded-2xl border border-gray-300 p-6 flex-1 flex flex-col relative overflow-hidden"
          style={{
            boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
          }}
        >
          <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
            OAID Credit Limit
          </h3>
          <p className="font-gellix stext-3xl font-semibold text-foreground">
            {formatUSD(creditData?.creditLimit ?? 0)}
          </p>
          <p className="font-gellix text-xs text-gray-500 mt-2">
            Available: {formatUSD(creditData?.availableCredit ?? 0)}
          </p>
          <div className="mt-auto pt-4">
            <Button
              onClick={onIncreaseLimit}
              className=" mx-auto items-center flex text-center text-md py-4 px-6 rounded-[16px] bg-black text-white hover:bg-gray-900 transition-colors hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Increase Limit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
