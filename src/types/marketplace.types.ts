// src/types/marketplace.types.ts

export type AssetCategory = 'invoice' | 'real-estate' | 'trade-finance' | 'equipment-lease';

export type AssetStatus = 'funding' | 'fully-funded' | 'active' | 'settled';

export interface MarketplaceAsset {
  id: string;
  assetId: string; // e.g., "INV-2401"
  name: string;
  description: string;
  category: AssetCategory;
  icon: string;
  tokenPrice: number; // Price per token in USDC
  yieldAPY: number; // Annual percentage yield
  maturityDays: number; // Days to maturity
  totalRaised: number; // Amount raised so far
  targetAmount: number; // Funding target
  fundingProgress: number; // 0-100%
  status: AssetStatus;
  verified: boolean;
  listedDate: string; // ISO date
  settlementDate?: string; // ISO date
}

export interface PlatformMetrics {
  totalAssetsIssued: number;
  totalAssetsChange: number;
  averageYield: number;
  averageYieldChange: number;
  totalValueTokenized: number; // in millions
  totalValueChange: number;
  activeInvestors: number;
  activeInvestorsChange: number;
  settlementsCompleted: number;
  settlementsChange: number;
}

export type FilterCategory =
  | 'all'
  | 'invoices'
  | 'real-estate'
  | 'trade-finance'
  | 'equipment-lease'
  | 'high-yield'
  | 'short-term'
  | 'verified';

export type SortOption =
  | 'most-popular'
  | 'highest-yield'
  | 'newest'
  | 'lowest-price'
  | 'ending-soon';
