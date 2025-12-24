// src/types/marketplace.types.ts

export type AssetCategory = 'invoice' | 'real-estate' | 'trade-finance' | 'equipment-lease';
export type AssetStatus = 'TOKENIZED' | 'FUNDING' | 'ACTIVE' | 'SETTLED';

interface Token {
  address: string;
  compliance: string;
  deployedAt: string;
  supply: string;
  transactionHash: string;
}

interface Registry {
  blockNumber: number;
  registeredAt: string;
  transactionHash: string;
}

interface Cryptography {
  documentHash: string;
  merkleRoot: string;
}

interface Attestation {
  hash: string;
  attestor: string;
  timestamp: string;
}

export interface AssetMetadata {
  invoiceNumber: string;
  faceValue: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  buyerName: string;
  industry: string;
  riskTier: string;
}

export interface TokenParams {
  totalSupply: string;
  pricePerToken: string;
  minInvestment: string;
}

export interface MarketplaceListing {
  assetId: string;
  status: AssetStatus;
  metadata: AssetMetadata;
  tokenParams: TokenParams;
}

export interface AssetDetails {
  assetId: string;
  status: AssetStatus;
  metadata: AssetMetadata;
  tokenParams: TokenParams;
  token: Token;
  registry: Registry;
  cryptography: Cryptography;
  attestation: Attestation;
}

export interface ListingResponse {
  success: boolean;
  count: number;
  listings: MarketplaceListing[];
}

export interface AssetDetailsResponse {
  success: boolean;
  asset: AssetDetails;
}

// MarketplaceAsset - Extended interface for UI display (used by mock data)
export interface MarketplaceAsset {
  id: string;
  assetId: string;
  name: string;
  description: string;
  category: AssetCategory;
  icon: string;
  tokenPrice: number;
  yieldAPY: number;
  maturityDays: number;
  totalRaised: number;
  targetAmount: number;
  fundingProgress: number;
  status: string;
  verified: boolean;
  listedDate: string;
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
