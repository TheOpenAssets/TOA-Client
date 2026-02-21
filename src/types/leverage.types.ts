export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'LIQUIDATED' | 'SETTLED';

export interface HarvestEvent {
  timestamp: string;
  transactionHash: string; // Real field name from backend
  stARBSwapped: string; // WEI
  usdcReceived: string; // USDC WEI (6 decimals)
  interestPaid: string; // USDC WEI (6 decimals)
  healthFactorBefore: number; // Basis points
  healthFactorAfter: number; // Basis points
}

export interface PositionTimelineData {
  timestamp: string;
  stARBSwapped?: number; // stARB swapped at this harvest (in ETH)
  interestPaid?: number; // Interest paid at this harvest (in USD)
  usdcReceived?: number; // USDC received at this harvest (in USD)
  healthFactor: number; // Health factor at this point
  stARBValue?: number; // USD value of remaining stARB collateral (deprecated, for backwards compatibility)
  cumulativeInterest?: number; // Cumulative interest paid in USD (deprecated, for backwards compatibility)
}

export interface LeveragePosition {
  positionId: number;
  userAddress: string;
  assetId: string;
  assetSymbol?: string; // e.g. "INV-001"
  rwaTokenAddress?: string;
  rwaTokenAmount?: string;
  stARBCollateral: string; // WEI
  usdcBorrowed: string; // USDC WEI (6 decimals)
  currentHealthFactor: number; // Basis points (15000 = 150%)
  healthStatus: HealthStatus;
  status: 'ACTIVE' | 'CLOSED' | 'SETTLED' | 'LIQUIDATABLE';
  createdAt: string;
  lastHarvestTime?: string;
  totalInterestPaid?: string; // USDC WEI (6 decimals)
  totalstARBHarvested?: string; // stARB WEI (18 decimals)
  harvestHistory?: HarvestEvent[]; // Harvest events for this position
  timelineData?: PositionTimelineData[]; // Optional - can be built from harvestHistory
  // Settlement fields (when position is settled/closed)
  settlementTimestamp?: string;
  settlementTxHash?: string;
  settlementUSDCReceived?: string;
  userYieldDistributed?: string;
  stARBReturnedToUser?: string;
  liquidationTxHash?: string;
}

export interface LeverageQuote {
  stARBAmount: string; // WEI
  expectedUSDC: string; // USDC WEI
  expectedUSDCFormatted: string;
  ltv: number;
}


export interface LeveragePositionDetails {
  positionId: number;
  userAddress: string;
  assetId: string;
  assetSymbol?: string;
  rwaTokenAddress: string;
  rwaTokenAmount: string;
  stARBCollateral: string; // WEI
  usdcBorrowed: string; // USDC WEI (6 decimals)
  initialLTV: number; // Basis points
  currentHealthFactor: number; // Basis points (15000 = 150%)
  healthStatus: HealthStatus;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  lastHarvestTime?: string;
  totalInterestPaid?: string; // USDC WEI (6 decimals)
  totalstARBHarvested?: string; // stARB WEI (18 decimals)
  harvestHistory?: HarvestEvent[]; // Harvest events for this position
  liquidationTimestamp?: string;
  liquidationTxHash?: string;
  stARBSoldInLiquidation?: string;
  usdcRecoveredInLiquidation?: string;
  liquidationShortfall?: string;
  settlementTimestamp?: string;
  settlementTxHash?: string;
  settlementUSDCReceived?: string;
  seniorRepayment?: string;
  interestRepayment?: string;
  userYieldDistributed?: string;
  stARBReturnedToUser?: string;
  warningNotificationSent?: boolean;
  criticalNotificationSent?: boolean;
  lastNotificationTime?: string;
}

export interface stARBPrice {
  price: string;
  priceUSD: number;
  priceFormatted: string;
  lastUpdated: string;
}
