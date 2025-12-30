// src/types/admin.types.ts

/**
 * Asset Lifecycle States
 * PENDING_COMPLIANCE -> COMPLIANCE_APPROVED -> REGISTERED -> TOKENIZED -> YIELDING
 */
export type AdminAssetStatus =
  | 'PENDING_COMPLIANCE'
  | 'COMPLIANCE_APPROVED'
  | 'COMPLIANCE_REJECTED'
  | 'REGISTERED'
  | 'TOKENIZED'
  | 'YIELDING'
  | 'SETTled';

/**
 * Risk Scoring System (0-100)
 * 0-30: Low Risk (Green)
 * 31-60: Medium Risk (Yellow)
 * 61-100: High Risk (Red)
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskScore {
  score: number; // 0-100
  level: RiskLevel;
  factors: {
    originatorHistory: number;
    documentCompleteness: number;
    legalJurisdiction: number;
    financialHealth: number;
  };
}

/**
 * Compliance Data
 */
export interface ComplianceData {
  kycStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  kycProvider?: string;
  kycTriggeredAt?: string;
  kycCompletedAt?: string;
  documentsVerified: boolean;
  complianceOfficer?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

/**
 * On-Chain Registry Data
 */
export interface RegistryData {
  blobId?: string;
  attestationHash?: string;
  registryContract?: string;
  registeredAt?: string;
  registeredBy?: string;
  mantleExplorerUrl?: string;
}

/**
 * Tokenization Data
 */
export interface TokenizationData {
  tokenAddress?: string;
  tokenStandard: 'ERC-3643';
  tokenSymbol?: string;
  totalSupply?: number;
  deployedAt?: string;
  deployedBy?: string;
  tokenExplorerUrl?: string;
}

/**
 * Settlement & Yield Data
 */
export interface Settlement {
  id: string;
  fiatAmount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  usdcAmount: number;
  settlementDate: string;
  recordedAt: string;
  recordedBy: string;
  transactionHash?: string;
}

export interface YieldData {
  totalDistributed: number; // Total USDC distributed
  lastDistribution?: string;
  distributionFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  nextDistributionDate?: string;
  settlements: Settlement[];
}

/**
 * Originator/Issuer Information
 */
export interface Originator {
  id: string;
  name: string;
  legalEntity: string;
  jurisdiction: string;
  walletAddress: string;
  email: string;
  kycCompleted: boolean;
  totalAssetsIssued: number;
}

/**
 * Admin Asset - Full Lifecycle View
 */
export interface AdminAsset {
  id: string;
  name: string;
  assetType: string;
  description: string;
  status: AdminAssetStatus;

  // Originator Info
  originator: Originator;

  // Financial Details
  totalValue: number;
  currency: string;
  tokenPrice: number;
  totalTokens: number;

  // Risk & Compliance
  riskScore: RiskScore;
  compliance: ComplianceData;

  // On-Chain Data
  registry?: RegistryData;
  tokenization?: TokenizationData;

  // Yield & Settlement
  yield?: YieldData;

  // Metadata
  uploadedAt: string;
  documents: {
    name: string;
    url: string;
    verified: boolean;
  }[];

  // Audit Trail
  statusHistory: {
    status: AdminAssetStatus;
    timestamp: string;
    actor: string;
    notes?: string;
  }[];
}

/**
 * Dashboard Stats
 */
export interface AdminDashboardStats {
  pendingCompliance: number;
  complianceApproved: number;
  onChainAssets: number;
  totalYieldDistributed: number;
  assetsUnderManagement: number;
  totalOriginators: number;
}

/**
 * Activity Log
 */
export interface AdminActivity {
  id: string;
  type: 'COMPLIANCE_APPROVED' | 'COMPLIANCE_REJECTED' | 'ASSET_REGISTERED' | 'ASSET_TOKENIZED' | 'YIELD_DISTRIBUTED';
  assetName: string;
  actor: string;
  timestamp: string;
  details: string;
}

/**
 * Settlement Form Data
 */
export interface SettlementFormData {
  assetId: string;
  fiatAmount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  settlementDate: string;
  notes?: string;
}

// From the /admin/assets API response

export interface AdminFile {
  tempPath: string;
  size: number;
  uploadedAt: string;
}

export interface AdminAssetCheckpoints {
  uploaded: boolean;
  hashed: boolean;
  merkled: boolean;
  attested: boolean;
  registered: boolean;
  tokenized: boolean;
  payoutComplete?: boolean;
}

export interface AdminAssetCryptography {
  documentHash: string;
  merkleLeaves: string[];
  merkleRoot: string;
}

export interface AdminAssetAttestation {
  attestor: string;
  hash: string;
  payload: string;
  signature: string;
  timestamp: string;
}

export interface AdminAssetRegistry {
  registeredAt: string;
  transactionHash: string;
  blockNumber: number;
}

export interface AdminAssetToken {
  address: string;
  compliance: string;
  deployedAt: string;
  supply: string;
  transactionHash: string;
}

export interface ApiAdminAsset {
  _id: string;
  assetId: string;
  originator: string;
  status: string; // Could be more specific e.g., 'LISTED' | 'TOKENIZED' etc.
  assetType: 'AUCTION' | 'STATIC';
  metadata: {
    invoiceNumber: string;
    faceValue: string;
    currency: string;
    issueDate: string;
    dueDate: string;
    buyerName: string;
    industry: string;
    riskTier: string;
  };
  tokenParams: {
    totalSupply: string;
    minInvestment: string;
    minRaise: string;
    pricePerToken?: string;
  };
  files: {
    invoice: AdminFile;
  };
  checkpoints: AdminAssetCheckpoints;
  listing?: {
    type: 'AUCTION' | 'STATIC';
    reservePrice?: string;
    priceRange?: {
      min: string;
      max: string;
    };
    duration?: number;
    sold: string;
    active: boolean;
    listedAt: string;
    phase?: 'BIDDING' | 'ENDED' | 'SETTLED';
    scheduledEndTime?: string;
    scheduledStartTime?: string;
    transactionHash?: string;
    price?: string;
    amountRaised?: string;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
  cryptography: AdminAssetCryptography;
  attestation: AdminAssetAttestation;
  registry: AdminAssetRegistry;
  token: AdminAssetToken;
}

export interface AdminAssetsResponse {
  assets: ApiAdminAsset[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuctionBid {
  bidder: string;
  tokenAmount: string;
  price: string;
  timestamp: string;
}

export interface AuctionPricePoint {
  price: string;
  cumulativeTokens: string;
  bidsCount: number;
}

export interface AuctionClearingPriceInfo {
  suggestedPrice: string;
  tokensAtPrice: string;
  percentageOfSupply: number;
  totalBids: number;
  allBids: AuctionBid[];
  priceBreakdown: AuctionPricePoint[];
}
