// src/components/portfolio/PortfolioStats.tsx
import { TrendingUp } from 'lucide-react';
import { MiniAreaChart } from './MiniAreaChart';
import { generateAssetValueChart, generateYieldChart } from '../../lib/utils/portfolioChartGenerator';
import type { PortfolioAsset } from '../../lib/api/portfolio.service';

interface PortfolioStatsProps {
  totalAssetValue: number;
  portfolioAssets: PortfolioAsset[];
}

export const PortfolioStats = ({
  totalAssetValue,
  portfolioAssets
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
        className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col relative overflow-hidden"
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
          Total Asset Value
        </h3>
        <p className="font-gellix text-3xl font-semibold text-foreground">
          ${formatCurrency(totalAssetValue)}
        </p>
        <div className="flex items-center gap-1 text-green-600 mt-2">
          <TrendingUp className="w-3 h-3" />
          <span className="font-gellix text-xs">+0.00%</span>
        </div>

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
        className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col relative overflow-hidden"
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

      {/* Loan Taken/Pending Card */}
      <div
        className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col relative overflow-hidden"
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
          Loan Taken/Pending
        </h3>
        <p className="font-gellix text-3xl font-semibold text-foreground">
          $0.00
        </p>
        <p className="font-gellix text-xs text-gray-500 mt-2">
          No active loans
        </p>
      </div>
    </div>
  );
};
