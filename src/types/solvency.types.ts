/**
 * Solvency Vault Domain Types
 * Comprehensive type definitions for the borrowing/lending system
 */

// ============================================
// CORE DOMAIN TYPES
// ============================================

export interface OAIDCreditLine {
  oaidId: string;
  walletAddress: string;
  creditLimit: number; // in USDC
  currentDebt: number; // in USDC
  availableCredit: number; // creditLimit - currentDebt
  healthFactor: number; // percentage (e.g., 150 means 150%)
  collateral: CollateralPosition[];
  interestRate: number; // APR percentage
  totalInterestAccrued: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollateralPosition {
  positionId?: number; // Optional position ID from backend
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number; // raw amount in token decimals
  valueUSD: number; // USD value of collateral
  ltvRatio: number; // 70 for RWA, 60 for Private Assets
  isRWA: boolean;
}



export interface Protocol {
  id: string;
  name: string;
  description: string;
  logo: string;
  apy: number; // Expected APY for investments
  tvl: number; // Total Value Locked
  borrowRate: number; // Interest rate for borrowing
  minBorrow: number; // Minimum borrow amount in USDC
  maxBorrow: number; // Maximum borrow amount in USDC
  isActive: boolean;
  category: string; // e.g., "DeFi", "RWA", "Yield Farming"
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GetCreditDataResponse {
  success: boolean;
  data: OAIDCreditLine | null;
  message?: string;
}

export interface GetPositionsResponse {
  positions: Position[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface GetProtocolsResponse {
  success: boolean;
  data: Protocol[];
  message?: string;
}

export interface SyncDepositRequest {
  txHash: string;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string; // string to avoid precision issues
  valueUSD: number;
  oaidId?: string; // Optional - backend may create new OAID
}

export interface SyncBorrowRequest {
  txHash: string;
  walletAddress: string;
  oaidId: string;
  amount: string;
  protocolId: string;
}

export interface SyncRepayRequest {
  txHash: string;
  walletAddress: string;
  oaidId: string;
  amount: string;
  positionId: string;
}

export interface SyncWithdrawRequest {
  txHash: string;
  walletAddress: string;
  oaidId: string;
  tokenAddress: string;
  amount: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  data?: {
    oaidId?: string;
    newHealthFactor?: number;
    newCreditLimit?: number;
  };
}

// ============================================
// TRANSACTION STATE TYPES
// ============================================

export type TransactionStatus =
  | 'idle'
  | 'validating'
  | 'approving_token'
  | 'depositing'
  | 'borrowing'
  | 'repaying'
  | 'withdrawing'
  | 'syncing'
  | 'success'
  | 'error';

export interface TransactionState {
  status: TransactionStatus;
  txHash?: string;
  error?: string;
  stage?: string; // Human-readable stage description
}

// ============================================
// HEALTH FACTOR TYPES
// ============================================

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthFactorData {
  current: number;
  status: HealthStatus;
  thresholdWarning: number; // 120%
  thresholdCritical: number; // 110%
  thresholdLiquidation: number; // 100%
}

export interface HealthFactorPreview {
  current: number;
  afterAction: number;
  change: number; // positive or negative
  statusBefore: HealthStatus;
  statusAfter: HealthStatus;
  isSafe: boolean; // true if afterAction > 110%
}

// ============================================
// FORM STATE TYPES
// ============================================

export interface BorrowFormState {
  protocol: Protocol | null;
  collateralToken: string | null;
  collateralAmount: string;
  borrowAmount: string;
  healthFactorPreview: HealthFactorPreview | null;
  isValid: boolean;
  validationError: string | null;
}

export interface RepayFormState {
  repayAmount: string;
  isFullRepayment: boolean;
  healthFactorPreview: HealthFactorPreview | null;
  isValid: boolean;
  validationError: string | null;
}

export interface WithdrawFormState {
  collateralToken: string | null;
  withdrawAmount: string;
  maxWithdrawable: number;
  healthFactorPreview: HealthFactorPreview | null;
  isValid: boolean;
  validationError: string | null;
}

// ============================================
// UI STATE TYPES
// ============================================

export type BorrowPageState =
  | 'initial'
  | 'loading'
  | 'success_with_credit'
  | 'success_no_credit'
  | 'unauthorized'
  | 'error';

export type PortfolioLoansState =
  | 'initial'
  | 'loading'
  | 'success_with_loans'
  | 'empty'
  | 'error';

// ============================================
// CONSTANTS TYPES
// ============================================

export interface LTVConfig {
  RWA: number; // 70%
  PRIVATE_ASSET: number; // 60%
}

export interface HealthThresholds {
  HEALTHY: number; // > 120%
  WARNING: number; // 110% - 120%
  CRITICAL: number; // 100% - 110%
  LIQUIDATION: number; // < 100%
}

export interface SolvencyConfig {
  ltv: LTVConfig;
  healthThresholds: HealthThresholds;
  interestRate: number; // 5% APR
  healthMonitorInterval: number; // 30 seconds
}

// ============================================
// SMART CONTRACT TYPES
// ============================================

export interface VaultContractMethods {
  getCollateralBalance(oaidId: string, tokenAddress: string): Promise<bigint>;
  getDebtBalance(oaidId: string): Promise<bigint>;
  calculateHealthFactor(oaidId: string): Promise<bigint>;
  depositCollateral(oaidId: string, tokenAddress: string, amount: bigint): Promise<string>;
  borrow(oaidId: string, amount: bigint): Promise<string>;
  repay(oaidId: string, amount: bigint): Promise<string>;
  withdrawCollateral(oaidId: string, tokenAddress: string, amount: bigint): Promise<string>;
}

export interface TokenApprovalState {
  isApproved: boolean;
  currentAllowance: bigint;
  requiredAmount: bigint;
}


// ============================================
// POSITION TYPES
// ============================================

/**
 * Represents the raw data for a single borrow position, as returned from the backend API.
 * This is the "domain model". Numeric values are represented as strings to avoid
 * precision loss.
 */
export interface Position {
  positionId: number;
  collateralTokenAddress: string;  // Token contract address
  collateralTokenType: string;     // "RWA" or "PRIVATE_ASSET"
  collateralAmount: string;        // e.g., "90000000000000000000" (18 decimals)
  tokenValueUSD: string;           // e.g., "76500000000" (6 decimals)
  usdcBorrowed: string;            // e.g., "50000000000" (6 decimals)
  totalPartnerDebt: string;        // e.g., "0" (6 decimals)
  totalRepaid: string;             // e.g., "0" (6 decimals)
  initialLTV: number;              // e.g., 6000 (representing 60.00%)
  currentHealthFactor: number;     // e.g., 15300 (representing 153.00%) or 2147483647 for no debt
  healthStatus: string;            // "HEALTHY", "WARNING", "CRITICAL", "LIQUIDATABLE"
  status: string;                  // "ACTIVE", "CLOSED", "LIQUIDATED", "SETTLED", "REPAID"
  loanDuration: number;            // Duration in seconds
  numberOfInstallments: number;    // Number of installments
  installmentInterval: number;     // Interval in seconds
  installmentsPaid: number;        // Number of installments paid
  missedPayments: number;          // Number of missed payments (0-3)
  isDefaulted: boolean;            // Whether position has been marked as defaulted
  oaidCreditIssued: boolean;       // Whether OAID credit was issued
  repaymentSchedule: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: string;
    status: 'PAID' | 'PENDING' | 'MISSED';
  }>;                               // Repayment schedule array
  nextPaymentDueDate?: string;     // Optional next payment due date
  depositTxHash: string;           // Deposit transaction hash
  depositBlockNumber: number;      // Deposit block number
  createdAt: string;
  updatedAt: string;
  
  // Optional legacy fields for backward compatibility
  collateralToken?: {
    address: string;
    symbol: string;
    name: string;
    type: string;
  };
  outstandingDebt?: string;        // Computed from usdcBorrowed + totalPartnerDebt
  healthFactor?: number;           // Alias for currentHealthFactor
  maxBorrowCapacity?: string;      // Optional max borrow capacity
}

/**
 * Represents a position that has been formatted for display in the UI.
 * This is a "view model". All financial values are human-readable strings.
 */
export interface PositionView {
  positionId: number;
  tokenSymbol: string;
  collateralAmountFormatted: string; // e.g., "90.00 wETH"
  collateralValueUSD: string;      // e.g., "$76,500.00"
  usdcBorrowed: string;            // e.g., "$50,000.00"
  outstandingDebt: string;         // e.g., "$50,041.10"
  healthFactor: string;            // e.g., "153%"
  healthStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  availableCredit: string;         // e.g., "$3,508.90"
}
