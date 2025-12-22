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
  | 'SETTLED';

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
