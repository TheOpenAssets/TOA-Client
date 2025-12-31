export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'LIQUIDATED' | 'SETTLED';

export interface LeveragePosition {
  positionId: number;
  userAddress: string;
  assetId: string;
  assetSymbol?: string; // e.g. "INV-001"
  mETHCollateral: string; // WEI
  usdcBorrowed: string; // USDC WEI (6 decimals)
  currentHealthFactor: number; // Basis points (15000 = 150%)
  healthStatus: HealthStatus;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
}

export interface LeverageQuote {
  mETHAmount: string; // WEI
  expectedUSDC: string; // USDC WEI
  expectedUSDCFormatted: string;
  ltv: number;
}

export interface MethPrice {
  price: string;
  priceFormatted: string;
  lastUpdated: string;
}
