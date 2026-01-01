// src/lib/data/marketplace-mock-data.ts

import {
  type MarketplaceAsset,
  type PlatformMetrics,
  type AssetCategory,
} from '../../types/marketplace.types';

// Platform-wide metrics
export const platformMetrics: PlatformMetrics = {
  totalAssetsIssued: 247,
  totalAssetsChange: 12,
  averageYield: 8.45,
  averageYieldChange: 0.15,
  totalValueTokenized: 142.8, // in millions
  totalValueChange: 2.3,
  activeInvestors: 3847,
  activeInvestorsChange: 156,
  settlementsCompleted: 1023,
  settlementsChange: 45,
};

// Mock marketplace assets
export const marketplaceAssets: MarketplaceAsset[] = [
  // Featured High-Yield Assets
  {
    id: '1',
    assetId: 'INV-2401',
    name: 'Manufacturing Invoice Q1',
    description: 'Electronics Manufacturing · 90-day',
    category: 'invoice',
    icon: '📄',
    tokenPrice: 50.0,
    yieldAPY: 8.5,
    maturityDays: 90,
    totalRaised: 2400000,
    targetAmount: 5000000,
    fundingProgress: 48,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-15',
  },
  {
    id: '2',
    assetId: 'RE-3312',
    name: 'Mumbai Office Space',
    description: 'Commercial Real Estate · 24-month',
    category: 'real-estate',
    icon: '🏢',
    tokenPrice: 1000.0,
    yieldAPY: 12.3,
    maturityDays: 730,
    totalRaised: 8500000,
    targetAmount: 15000000,
    fundingProgress: 57,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-10',
  },
  {
    id: '3',
    assetId: 'TF-1567',
    name: 'Import Trade Finance',
    description: 'Electronics Import · 120-day',
    category: 'trade-finance',
    icon: '🚢',
    tokenPrice: 100.0,
    yieldAPY: 9.8,
    maturityDays: 120,
    totalRaised: 3200000,
    targetAmount: 4000000,
    fundingProgress: 80,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-18',
  },
  {
    id: '4',
    assetId: 'EL-4521',
    name: 'Heavy Machinery Lease',
    description: 'Construction Equipment · 18-month',
    category: 'equipment-lease',
    icon: '🏗️',
    tokenPrice: 500.0,
    yieldAPY: 10.5,
    maturityDays: 540,
    totalRaised: 5600000,
    targetAmount: 8000000,
    fundingProgress: 70,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-12',
  },
  {
    id: '5',
    assetId: 'INV-2398',
    name: 'Textile Export Invoice',
    description: 'Textile Export · 60-day',
    category: 'invoice',
    icon: '📄',
    tokenPrice: 25.0,
    yieldAPY: 7.2,
    maturityDays: 60,
    totalRaised: 1800000,
    targetAmount: 2500000,
    fundingProgress: 72,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-14',
  },
  {
    id: '6',
    assetId: 'RE-3289',
    name: 'Delhi Retail Complex',
    description: 'Retail Real Estate · 36-month',
    category: 'real-estate',
    icon: '🏢',
    tokenPrice: 750.0,
    yieldAPY: 11.8,
    maturityDays: 1080,
    totalRaised: 12000000,
    targetAmount: 20000000,
    fundingProgress: 60,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-08',
  },
  {
    id: '7',
    assetId: 'TF-1589',
    name: 'Pharma Trade Finance',
    description: 'Pharmaceutical Export · 90-day',
    category: 'trade-finance',
    icon: '🚢',
    tokenPrice: 200.0,
    yieldAPY: 8.9,
    maturityDays: 90,
    totalRaised: 4500000,
    targetAmount: 6000000,
    fundingProgress: 75,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-16',
  },
  {
    id: '8',
    assetId: 'EL-4498',
    name: 'Tech Equipment Lease',
    description: 'IT Equipment · 12-month',
    category: 'equipment-lease',
    icon: '🏗️',
    tokenPrice: 150.0,
    yieldAPY: 9.5,
    maturityDays: 360,
    totalRaised: 2100000,
    targetAmount: 3500000,
    fundingProgress: 60,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-11',
  },
  {
    id: '9',
    assetId: 'INV-2456',
    name: 'Automotive Parts Invoice',
    description: 'Automotive Manufacturing · 75-day',
    category: 'invoice',
    icon: '📄',
    tokenPrice: 75.0,
    yieldAPY: 8.2,
    maturityDays: 75,
    totalRaised: 3800000,
    targetAmount: 4500000,
    fundingProgress: 84,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-13',
  },
  {
    id: '10',
    assetId: 'RE-3401',
    name: 'Bangalore Warehouse',
    description: 'Industrial Real Estate · 24-month',
    category: 'real-estate',
    icon: '🏢',
    tokenPrice: 600.0,
    yieldAPY: 10.8,
    maturityDays: 720,
    totalRaised: 7200000,
    targetAmount: 12000000,
    fundingProgress: 60,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-09',
  },
  // Recently Verified Assets (newly listed)
  {
    id: '11',
    assetId: 'INV-2567',
    name: 'Electronics Invoice',
    description: 'Consumer Electronics · 60-day',
    category: 'invoice',
    icon: '📄',
    tokenPrice: 25.0,
    yieldAPY: 7.8,
    maturityDays: 60,
    totalRaised: 450000,
    targetAmount: 2000000,
    fundingProgress: 22,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-21',
  },
  {
    id: '12',
    assetId: 'TF-1623',
    name: 'Agricultural Export',
    description: 'Agriculture Export · 90-day',
    category: 'trade-finance',
    icon: '🚢',
    tokenPrice: 100.0,
    yieldAPY: 9.2,
    maturityDays: 90,
    totalRaised: 680000,
    targetAmount: 3000000,
    fundingProgress: 23,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-20',
  },
  {
    id: '13',
    assetId: 'EL-4612',
    name: 'Medical Equipment Lease',
    description: 'Healthcare Equipment · 18-month',
    category: 'equipment-lease',
    icon: '🏗️',
    tokenPrice: 400.0,
    yieldAPY: 10.2,
    maturityDays: 540,
    totalRaised: 920000,
    targetAmount: 5000000,
    fundingProgress: 18,
    status: 'funding',
    verified: true,
    listedDate: '2025-12-19',
  },
  // Fully Funded Assets
  {
    id: '14',
    assetId: 'INV-2334',
    name: 'Steel Supply Invoice',
    description: 'Steel Manufacturing · 90-day',
    category: 'invoice',
    icon: '📄',
    tokenPrice: 100.0,
    yieldAPY: 8.8,
    maturityDays: 90,
    totalRaised: 6000000,
    targetAmount: 6000000,
    fundingProgress: 100,
    status: 'fully-funded',
    verified: true,
    listedDate: '2025-12-05',
  },
  {
    id: '15',
    assetId: 'RE-3156',
    name: 'Chennai Office Tower',
    description: 'Commercial Real Estate · 36-month',
    category: 'real-estate',
    icon: '🏢',
    tokenPrice: 1200.0,
    yieldAPY: 13.5,
    maturityDays: 1080,
    totalRaised: 25000000,
    targetAmount: 25000000,
    fundingProgress: 100,
    status: 'fully-funded',
    verified: true,
    listedDate: '2025-11-28',
  },
];

// Featured assets (high-quality, actively funding)
export const getFeaturedAssets = (): MarketplaceAsset[] => {
  return marketplaceAssets
    .filter((asset) => asset.verified && asset.fundingProgress > 40 && asset.fundingProgress < 90)
    .slice(0, 3);
};

// High-yield opportunities (yield > 10%)
export const getHighYieldAssets = (): MarketplaceAsset[] => {
  return marketplaceAssets
    .filter((asset) => asset.yieldAPY >= 10)
    .sort((a, b) => b.yieldAPY - a.yieldAPY)
    .slice(0, 3);
};

// Recently verified (listed in last 7 days)
export const getRecentlyVerifiedAssets = (): MarketplaceAsset[] => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return marketplaceAssets
    .filter((asset) => new Date(asset.listedDate) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime())
    .slice(0, 3);
};

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

// Helper function to get category label
export const getCategoryLabel = (category: AssetCategory): string => {
  const labels: Record<AssetCategory, string> = {
    'invoice': 'Invoice',
    'real-estate': 'Real Estate',
    'trade-finance': 'Trade Finance',
    'equipment-lease': 'Equipment Lease',
  };
  return labels[category];
};

// Helper function to get category icon
export const getCategoryIcon = (category: AssetCategory | string): string => {
  const icons: Record<string, string> = {
    'invoice': '📄',
    'real-estate': '🏢',
    'trade-finance': '🚢',
    'equipment-lease': '🏗️',
  };
  // Return matching icon or default to invoice icon for any unknown category
  return icons[category.toLowerCase()] || icons['invoice'];
};
