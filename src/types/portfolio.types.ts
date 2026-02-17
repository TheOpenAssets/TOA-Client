export type PortfolioAsset = {
  purchaseType: 'STATIC' | 'LEVERAGE';
  assetId: string;
  tokenAddress: string;
  totalAmount: string;
  status: string;
  // STATIC-specific fields
  totalInvested?: string;
  purchaseCount?: number;
  firstPurchase: string;
  lastPurchase?: string;
  metadata: {
    assetName?: string;
    industry?: string;
    riskTier?: string;
    positionType?: string;
  };
  yieldInfo?: {
    settlementDistributed: boolean;
    claimableYield: string;
    claimableYieldFormatted: string;
    settlementDate?: string;
    settlementId?: string;
    yieldClaimTxHash?: string;
  };
  // LEVERAGE-specific fields
  positionId?: number;
  createdAt?: string;
  mETHCollateral?: string;
  usdcBorrowed?: string;
  healthFactor?: number;
  healthStatus?: string;
  totalInterestPaid?: string;
  lastHarvestTime?: string;
  settlementTxHash?: string;
  leverageInfo?: {
    type: 'ACTIVE' | 'SETTLED';
    mETHCollateralFormatted: string;
    usdcBorrowedFormatted: string;
    healthFactorFormatted?: string;
    healthStatus?: string;
    totalInterestPaidFormatted: string;
    claimableYield: string;
    claimableYieldFormatted: string;
    userYield?: string;
    userYieldFormatted?: string;
    mETHReturned?: string;
    mETHReturnedFormatted?: string;
    settlementTxHash?: string;
    settlementDate?: string;
  };
}

export type PortfolioResponse = {
  success: boolean;
  investorWallet: string;
  totalAssets: number;
  totalPurchases: number;
  totalLeveragePositions?: number;
  portfolio: PortfolioAsset[];
}
