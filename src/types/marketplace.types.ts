// src/types/marketplace.types.ts


export type AssetCategory = 'invoice' | 'real-estate' | 'trade-finance' | 'equipment-lease';
export type AssetStatus = 'TOKENIZED' | 'FUNDING' | 'ACTIVE' | 'SETTLED' | 'LISTED' | 'ENDED' | 'PAYOUT_COMPLETE';

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

interface Listing {
  type: 'AUCTION' | 'DUTCH' | 'FIXED' | 'STATIC';
  reservePrice?: string; // USDC with 6 decimals (for AUCTION)
  priceRange?: {
    min: string;
    max: string;
  };
  duration?: number;
  sold?: string;
  active?: boolean;
  listedAt?: string;
  phase?: 'BIDDING' | 'ENDED' | 'SETTLED';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  transactionHash?: string;
  price?: string; // For STATIC listings
  clearingPrice?: number ; // USDC with 6 decimals
  endTransactionHash?: string;
  endedAt?: string;
}


export interface AssetPriceRange {
  minPrice: string; // USDC with 6 decimals
  maxPrice: string; // USDC with 6 decimals
}

export interface AssetMetadata {
  invoiceNumber: string;
  faceValue: string;
  currency: string;
  priceRange: AssetPriceRange;
  issueDate: string;
  dueDate: string;
  buyerName: string;
  industry: string;
  riskTier: string;
}

export interface TokenParams {
  totalSupply: string;
  minInvestment: string;
  minRaise?: string;
  pricePerToken?: string;
}

export interface MarketplaceListing {
  assetId: string;
  assetType?: 'STATIC' | 'AUCTION';
  status: AssetStatus;
  metadata?: AssetMetadata;
  tokenParams?: TokenParams;
  listing?: Listing;
  token?: Token;
  listingType?: 'AUCTION' | 'STATIC';
  // Additional fields for UI compatibility (flattened from nested structure)
  name?: string;
  industry?: string;
  riskTier?: string;
  listedAt?: string;
  endTime?: string;
  dueDate?: string;
  sold?: string;
  totalSupply?: string;
  pricePerToken?: string;
  faceValue?: string;
  reservePrice?: string;
  phase?: 'BIDDING' | 'ENDED' | 'SETTLED';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  percentageSold?: number;
  tokenAddress?: string;
  currency?: string;
  minInvestment?: string;
}

export interface AssetDetails {
  assetId: string;
  status: AssetStatus;
  metadata: AssetMetadata;
  tokenParams: TokenParams;
  token: Token;
  listing?: Listing;
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

export interface NotifyPurchasePayload {
  txHash: string;
  assetId: string;
  amount: string;
  blockNumber: string;
}

export interface NotifyBidPlacedPayload {
  txHash: string;
  assetId: string;
  tokenAmount: string;
  price: string;
  blockNumber: string;
}

export interface NotifyBidSettledPayload {
  assetId: string;
  bidIndex: number;
  txHash: string;
  blockNumber: string;
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
  maturityDays: number | string;
  totalRaised: number;
  targetAmount: number;
  fundingProgress: number;
  status: string;
  verified: boolean;
  listedDate: string;
  listingType?: 'AUCTION' | 'STATIC';
  endTime?: string;
}

export interface TrendingAsset {
  assetId: string;
  tokenAddress: string;
  name: string;
  industry: string;
  faceValue: string;
  currency: string;
  riskTier: string;
  dueDate: string;
  totalSupply: string;
  sold: string;
  percentageSold: number;
  minInvestment: string;
  listingType: 'AUCTION' | 'STATIC';
  listedAt: string;
  status: string;
  activityMetrics: {
    purchaseCount: number;
    bidCount: number;
    totalActivity: number;
  };
  pricePerToken?: string; // only for STATIC
}

export interface Purchase {
  buyer: string;
  tokenAmount: string;
  price: string;
  totalPayment: string;
  timestamp: string;
  transactionHash: string;
  type: "BID" | "BUY";
}

export interface ChartDataPoint {
  timestamp: string;
  tokensPurchased: string;
  cumulativeTokens: string;
  price: string;
}

export interface PurchaseHistoryResponse {
  assetId: string;
  assetType: "AUCTION" | "FIXED";
  purchases: Purchase[];
  chartData: ChartDataPoint[];
  totalTokensSold: string;
  totalUSDCRaised: string;
  totalTransactions: number;
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

// ============================================================================
// AUCTION TYPES (Based on AUTION.md specification)
// ============================================================================

export type AuctionStatus = 'SCHEDULED' | 'BIDDING' | 'ENDED' | 'SETTLED' | 'CANCELLED';
export type BidStatus = 'PENDING' | 'WON' | 'LOST' | 'SETTLED' | 'REFUNDED';

/**
 * Auction - Represents an RWA token auction
 * Ref: AUTION.md Phase 0, 1, 2
 */
export interface Auction {
  auctionId: string;
  assetId: string;
  minInvestmentTokens: number;
  totalSupply: number;
  reservePrice: number;
  clearingPrice?: number;
  tokensSold?: number; // For AUCTION_RESULTS_DECLARED
  tokensRemaining?: number; // For AUCTION_RESULTS_DECLARED
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  totalBids: number;
  totalDemand: number;
  metadata?: AssetMetadata;
}

/**
 * Bid - Represents a user's bid in an auction
 * Ref: AUTION.md Phase 1, 3
 */
export interface Bid {
  bidId: string;
  auctionId: string;
  assetId?: string; // Alternative ID field for compatibility
  bidder: string;
  tokensRequested: number;
  maxPrice: number;
  tokensWon?: number;
  actualPrice?: number;
  refundAmount?: number;
  status: BidStatus;
  submittedAt: string;
  settledAt?: string;
  // Additional fields for UI display
  bidIndex?: number;
  tokenAmount?: string;
  price?: string;
  usdcDeposited?: string;
  bidDate?: string;
  txHash?: string;
}

/**
 * API Response types for auction endpoints
 */
export interface AuctionListResponse {
  success: boolean;
  count: number;
  auctions: Auction[];
}

export interface AuctionDetailsResponse {
  success: boolean;
  auction: Auction;
}

export interface UserBidsResponse {
  success: boolean;
  count: number;
  bids: Bid[];
}

/**
 * API Payload types for auction operations
 */
export interface CreateAuctionPayload {
  assetId: string;
  totalSupply: number;
  reservePrice: number;
  duration: number;
}

export interface SubmitBidPayload {
  auctionId: string;
  tokensRequested: number;
  maxPrice: number;
}

export interface EndAuctionPayload {
  auctionId: string;
  clearingPrice: number;
}
