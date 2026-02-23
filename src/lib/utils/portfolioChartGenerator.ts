// src/lib/utils/portfolioChartGenerator.ts
import type { PortfolioAsset } from '../../types/portfolio.types';

/**
 * Generate asset value chart data - smooth S-curve showing portfolio growth
 */
export const generateAssetValueChart = (
  assets: PortfolioAsset[],
  totalValue: number
): Array<{ timestamp: number; value: number }> => {
  if (!assets || assets.length === 0) {
    // Return empty state data
    return Array(10).fill(null).map((_, i) => ({
      timestamp: Date.now() - (9 - i) * 24 * 60 * 60 * 1000,
      value: 0
    }));
  }

  // Get purchase date range
  const dates = assets.map(a => new Date(a.firstPurchase).getTime());
  const startDate = Math.min(...dates);
  const endDate = Date.now();

  // Generate 10 smooth data points
  const points = 10;
  const data = [];

  for (let i = 0; i <= points; i++) {
    const timestamp = startDate + ((endDate - startDate) * i / points);
    const progress = i / points;

    // S-curve for natural portfolio growth
    const value = totalValue * (1 - Math.cos(progress * Math.PI)) / 2;

    data.push({
      timestamp,
      value: Math.round(value * 100) / 100
    });
  }

  return data;
};

/**
 * Generate yield chart data - stepped growth showing yield accumulation
 */
export const generateYieldChart = (
  assets: PortfolioAsset[],
  totalYield: number
): Array<{ timestamp: number; value: number }> => {
  if (!assets || assets.length === 0) {
    // Return flat line at 0
    return Array(10).fill(null).map((_, i) => ({
      timestamp: Date.now() - (9 - i) * 24 * 60 * 60 * 1000,
      value: 0
    }));
  }

  // Filter assets with yield
  const yieldAssets = assets.filter(
    a => a.yieldInfo?.settlementDistributed && a.yieldInfo?.settlementDate
  );

  if (yieldAssets.length === 0) {
    // No yield yet - show flat line at 0
    return Array(10).fill(null).map((_, i) => ({
      timestamp: Date.now() - (9 - i) * 24 * 60 * 60 * 1000,
      value: 0
    }));
  }

  // Get yield distribution dates
  const dates = yieldAssets.map(a =>
    new Date(a.yieldInfo!.settlementDate!).getTime()
  );
  const startDate = Math.min(...dates);
  const endDate = Date.now();

  // Generate stepped growth (yield comes in discrete chunks)
  const points = 10;
  const data = [];

  for (let i = 0; i <= points; i++) {
    const timestamp = startDate + ((endDate - startDate) * i / points);
    const progress = i / points;

    // Step function - yield accumulates in jumps
    const stepValue = Math.floor(progress * yieldAssets.length) / yieldAssets.length;
    const value = totalYield * stepValue;

    data.push({
      timestamp,
      value: Math.round(value * 100) / 100
    });
  }

  return data;
};
