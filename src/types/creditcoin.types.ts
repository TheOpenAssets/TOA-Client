export interface CreditScoreResponse {
  compositeScore: number;
  tier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  layer1Score: number;
  layer2Score: number;
  effectiveLTV: number;       // basis points e.g. 7500
  maxBorrowMultiplier: number;
}

// BorrowTermsResponse has the same shape as CreditScoreResponse
export type BorrowTermsResponse = CreditScoreResponse;

export interface SubmitProofDto {
  walletAddress: string;
  sourceChain: 'ETHEREUM' | 'BSC' | 'BITCOIN';
  eventType: 'REPAYMENT' | 'DEFAULT' | 'STAKE';
  scoreDelta: number;
  txHash: string;
  proofData: string; // raw hex
}

export interface SubmitProofResponse {
  txHash: string;
  verified: boolean;
}

export interface USCEvent {
  sourceChain: 'ETHEREUM' | 'BSC' | 'BITCOIN' | string;
  eventType: 'REPAYMENT' | 'DEFAULT' | 'STAKE' | string;
  scoreDelta: number;
  verifiedAt: string;     // ISO timestamp
  txHash: string;         // Creditcoin testnet tx hash
}

export interface USCEventsResponse {
  events: USCEvent[];
}

// ─── Partner Gateway types ────────────────────────────────────────────────────

export interface Partner {
  partnerId: string;
  partnerName: string;
  tier: string;
  status: 'ACTIVE' | 'INACTIVE';
  contactEmail: string;
}

export interface PartnerBorrowTerms {
  walletAddress: string;
  compositeScore: number;
  tier: string;
  effectiveLtv: number;   // basis points, e.g. 8000 = 80%
  standardLtv: number;    // basis points, e.g. 7000 = 70%
  hasBoost: boolean;
  maxBorrowableUsdc: string; // 6-decimal string, e.g. "8000000000" = 8000 USDC
}

export interface PartnerBorrowResponse {
  success: boolean;
  internalLoanId: string;
  partnerLoanId: string;
  partnerName: string;
  principalAmount: string;
  borrowTxHash: string;
  recordTxHash: string;
  explorerLinks: {
    borrow: string;
    record: string;
  };
  creditBoost: {
    score: number;
    tier: string;
    appliedLtv: number;
    standardLtv: number;
    boosted: boolean;
  };
}

export interface PartnerLoan {
  internalLoanId: string;
  partnerLoanId: string;
  partnerId: string;
  partnerName: string;
  solvencyPositionId: number;
  principalAmount: string;
  remainingDebt: string;
  totalRepaid: string;
  status: 'ACTIVE' | 'REPAID';
  borrowedAt: string;
  borrowTxHash: string;
  repayTxHash: string | null;
  creditBoost?: {
    score: number;
    tier: string;
    appliedLtv: number;
    standardLtv: number;
    boosted: boolean;
  };
}

export interface PartnerLoansResponse {
  success: boolean;
  count: number;
  loans: PartnerLoan[];
}

export interface PartnerRepayResponse {
  success: boolean;
  internalLoanId: string;
  partnerName: string;
  repaymentAmount: string;
  remainingDebt: string;
  status: string;
  partnerRepayTxHash: string;
  vaultRepayTxHash: string;
  explorerLinks: {
    partnerRepay: string;
    vaultRepay: string;
  };
}
