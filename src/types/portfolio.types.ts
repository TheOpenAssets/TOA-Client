// src/types/portfolio.types.ts

export interface OwnedAsset {
  id: string;
  assetId: string;
  name: string;
  tokensOwned: number;
  amountInvested: number;
  status: 'active' | 'matured';
  yieldEarned: number;
  riskTier: 'A' | 'B' | 'C';
  icon: string; // Emoji or SVG component name
  sparkline: number[];
}

export interface Portfolio {
  totalAssetValue: number;
  totalSpentOnAssets: number;
  loanStatus: string;
  ownedAssets: OwnedAsset[];
}
