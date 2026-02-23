/**
 * Solvency Vault API Service
 * Handles all backend API calls for borrowing/lending functionality
 *
 * IMPORTANT: Based on actual backend implementation from deposit-to-vaultsolvency.js
 */

import type { GetPositionsResponse, Position } from '../../types/solvency.types';
import type { AdminPositionsResponse } from '../../types/admin.types';
import BaseService from './base.service';

// ============================================
// RESPONSE TYPES (Matching actual backend)
// ============================================

export interface OAIDCreditResponse {
  totalCreditLimit: string;          // "35000000000" (6 decimals)
  totalCreditUsed: string;            // "20000000000" (6 decimals)
  totalAvailableCredit: string;       // "15000000000" (6 decimals)
  summary: {
    utilizationRate: string;          // "57.14%"
    activeCreditLines: number;
    totalCreditLines: number;
  };
  creditLines: Array<{
    creditLineId: number;
    solvencyPositionId: number;
    creditLimit: string;
    creditUsed: string;
    active: boolean;
    collateralToken: string;
    collateralAmount: string;
  }>;
}

export interface SyncPositionRequest {
  positionId: string;
  txHash: string;
  blockNumber: number;
}

export interface SyncPositionResponse {
  success: boolean;
  message: string;
  position: {
    id: string;
    positionId: number;
    userAddress: string;
    collateralTokenAddress: string;
    collateralAmount: string;
    tokenValueUSD: string;
    maxBorrowCapacity: string;
    status: string;
    oaidCreditLineId?: number;
  };
}

class SolvencyService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get user's OAID credit line data
   *
   * ✅ CORRECT ENDPOINT: GET /solvency/oaid/my-credit
   * Reference: deposit-to-vaultsolvency.js line 366
   *
   * BACKEND RESPONSE (line 376-394 in docs):
   * {
   *   totalCreditLimit: "35000000000",
   *   totalCreditUsed: "20000000000",
   *   totalAvailableCredit: "15000000000",
   *   summary: { utilizationRate, activeCreditLines, totalCreditLines },
   *   creditLines: [...]
   * }
   */
  async getOAIDCredit(): Promise<OAIDCreditResponse> {
    try {
      console.log('💳 Fetching OAID credit data...');

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/oaid/my-credit`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch OAID credit');
      }

      const data: OAIDCreditResponse = await response.json();
      console.log('✅ OAID credit data received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching OAID credit:', error);
      throw error;
    }
  }

  /**
   * Get user's borrow positions
   *
   * ✅ CORRECT ENDPOINT: GET /solvency/positions/my
   * Reference: SOLVENCY_INTEGRATION.md line 157
   *
   * BACKEND RESPONSE (line 160-188 in docs):
   * {
   *   positions: [...],
   *   meta: { total, limit, offset }
   * }
   */
  async getMyPositions(): Promise<GetPositionsResponse> {
    try {
      console.log('📊 Fetching user positions...');

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/positions/my`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch positions');
      }

      const data: GetPositionsResponse = await response.json();
      console.log('✅ Loan Positions received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Get single position details
   *
   * ✅ CORRECT ENDPOINT: GET /solvency/position/{positionId}
   * Reference: SOLVENCY_INTEGRATION.md line 886
   */
  async getPosition(positionId: number): Promise<Position> {
    try {
      console.log(`📋 Fetching position ${positionId}...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/position/${positionId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch position');
      }

      const data: Position = await response.json();
      console.log('✅ Position received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching position:', error);
      throw error;
    }
  }

  /**
   * Sync position after any on-chain transaction (deposit, borrow, repay, withdraw)
   *
   * ✅ CORRECT ENDPOINT: POST /solvency/sync-position
   * Reference: deposit-to-vaultsolvency.js line 330
   *
   * USAGE:
   * - After depositCollateral() → sync with positionId from PositionCreated event
   * - After borrow() → sync with positionId and txHash
   * - After repay() → sync with positionId and txHash
   * - After withdrawCollateral() → sync with positionId and txHash
   *
   * BACKEND RESPONSE (line 344 in docs):
   * {
   *   success: true,
   *   message: "Position synced successfully",
   *   position: {
   *     id: "...",
   *     positionId: 5,
   *     userAddress: "0x...",
   *     collateralTokenAddress: "0x...",
   *     collateralAmount: "90000000000000000000",
   *     tokenValueUSD: "76500000000",
   *     maxBorrowCapacity: "53550000000",
   *     status: "ACTIVE",
   *     oaidCreditLineId: 3
   *   }
   * }
   */
  async syncPosition(request: SyncPositionRequest): Promise<SyncPositionResponse> {
    try {
      console.log('🔄 Syncing position to backend:', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/sync-position`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        60000 // 60 second timeout for blockchain sync
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync position');
      }

      const data: SyncPositionResponse = await response.json();
      console.log('✅ Position synced successfully:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error syncing position:', error);
      throw error;
    }
  }

  /**
   * Get loan repayment schedule for a position
   *
   * ✅ ENDPOINT: GET /solvency/position/:positionId/schedule
   * Reference: Specification Section 6 - Loan Details
   *
   * Returns full installment schedule with payment status
   */
  async getPositionSchedule(positionId: number): Promise<{
    schedule: {
      loanDuration: number;
      numberOfInstallments: number;
      installmentInterval: number;
      installmentsPaid: number;
      missedPayments: number;
      nextPaymentDue: number;
      installments: Array<{
        installmentNumber: number;
        dueDate: number;
        amount: string;
        status: 'PAID' | 'PENDING' | 'MISSED';
      }>;
    };
  }> {
    try {
      console.log(`📅 Fetching repayment schedule for position ${positionId}...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/position/${positionId}/schedule`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch loan schedule');
      }

      const data = await response.json();
      console.log('✅ Loan schedule received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching loan schedule:', error);
      throw error;
    }
  }

  /**
   * Borrow USDC against a position (Backend API - not smart contract)
   *
   * ✅ ENDPOINT: POST /solvency/borrow
   * Reference: Specification Section 4 - Borrow Execution
   *
   * Backend handles:
   * - Credit availability validation
   * - On-chain borrowUSDC call
   * - Repayment schedule initialization
   * - OAID credit usage update
   */
  async borrowUSDC(request: {
    positionId: string;
    amount: string; // USDC amount in 6 decimals
    loanDuration: number; // Duration in seconds
    numberOfInstallments: number;
  }): Promise<{
    success: boolean;
    message: string;
    txHash?: string;
    blockNumber?: number;
  }> {
    try {
      console.log('💸 Initiating borrow request:', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/borrow`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to borrow');
      }

      const data = await response.json();
      console.log('✅ Borrow successful:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error borrowing:', error);
      throw error;
    }
  }

  /**
   * Repay loan installment (Backend API - not smart contract)
   *
   * ✅ ENDPOINT: POST /solvency/repay
   * Reference: Specification Section 7 - Repayment Flow
   *
   * Backend handles:
   * - Repayment schedule update
   * - OAID credit refresh
   */
  async repayLoan(request: {
    positionId: string;
    amount: string; // USDC amount in 6 decimals
  }): Promise<{
    success: boolean;
    message: string;
    txHash?: string;
    blockNumber?: number;
  }> {
    try {
      console.log('💵 Initiating repayment request:', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/repay`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to repay');
      }

      const data = await response.json();
      console.log('✅ Repayment successful:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error repaying:', error);
      throw error;
    }
  }

  /**
   * Withdraw collateral from position (Backend API - not smart contract)
   *
   * ✅ ENDPOINT: POST /solvency/withdraw
   * 
   * Backend handles:
   * - Position verification
   * - On-chain withdrawCollateral call
   * - Database update
   * - Private asset collateral tracking update
   */
  async withdrawCollateral(request: {
    positionId: string;
    amount: string; // Amount in wei (18 decimals)
  }): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    position: Position;
  }> {
    try {
      console.log('💰 Initiating collateral withdrawal:', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/withdraw`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to withdraw collateral');
      }

      const data = await response.json();
      console.log('✅ Withdrawal successful:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error withdrawing collateral:', error);
      throw error;
    }
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Admin: Get all positions
   *
   * ✅ ENDPOINT: GET /admin/solvency/positions
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async getAllPositions(): Promise<AdminPositionsResponse> {
    try {
      console.log('🔍 Fetching all positions (admin)...');

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/positions`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch all positions');
      }

      const data: AdminPositionsResponse = await response.json();
      console.log('✅ All positions received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching all positions:', error);
      throw error;
    }
  }

  /**
   * Admin: Get liquidatable positions
   *
   * ✅ ENDPOINT: GET /admin/solvency/liquidatable
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async getLiquidatablePositions(): Promise<{ positions: Position[] }> {
    try {
      console.log('⚠️ Fetching liquidatable positions (admin)...');

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/liquidatable`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch liquidatable positions');
      }

      const data = await response.json();
      console.log('✅ Liquidatable positions received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching liquidatable positions:', error);
      throw error;
    }
  }

  /**
   * Admin: Get positions with warnings
   *
   * ✅ ENDPOINT: GET /admin/solvency/warnings
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async getPositionsWithWarnings(): Promise<{ positions: Position[] }> {
    try {
      console.log('⚠️ Fetching positions with warnings (admin)...');

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/warnings`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch positions with warnings');
      }

      const data = await response.json();
      console.log('✅ Positions with warnings received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching positions with warnings:', error);
      throw error;
    }
  }

  /**
   * Admin: Manually sync a position
   *
   * ✅ ENDPOINT: POST /admin/solvency/position/:id/sync
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async adminSyncPosition(positionId: number): Promise<{ position: Position }> {
    try {
      console.log(`🔄 Manually syncing position ${positionId} (admin)...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/position/${positionId}/sync`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
        60000 // 60 second timeout
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync position');
      }

      const data = await response.json();
      console.log('✅ Position synced:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error syncing position:', error);
      throw error;
    }
  }

  /**
   * Admin: Mark payment as missed
   *
   * ✅ ENDPOINT: POST /admin/solvency/position/:id/mark-missed-payment
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async markMissedPayment(positionId: number): Promise<{
    success: boolean;
    message: string;
    txHash: string;
    positionId: number;
  }> {
    try {
      console.log(`⚠️ Marking missed payment for position ${positionId} (admin)...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/position/${positionId}/mark-missed-payment`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark missed payment');
      }

      const data = await response.json();
      console.log('✅ Missed payment marked:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error marking missed payment:', error);
      throw error;
    }
  }

  /**
   * Admin: Mark position as defaulted
   *
   * ✅ ENDPOINT: POST /admin/solvency/position/:id/mark-defaulted
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async markDefaulted(positionId: number): Promise<{
    success: boolean;
    message: string;
    txHash: string;
    positionId: number;
  }> {
    try {
      console.log(`⚠️ Marking position ${positionId} as defaulted (admin)...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/position/${positionId}/mark-defaulted`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark as defaulted');
      }

      const data = await response.json();
      console.log('✅ Position marked as defaulted:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error marking as defaulted:', error);
      throw error;
    }
  }

  /**
   * Admin: Liquidate a position
   *
   * ✅ ENDPOINT: POST /admin/solvency/liquidate/:id
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async liquidatePosition(positionId: number): Promise<{
    success: boolean;
    message?: string;
    txHash: string;
    blockNumber: number;
    marketplaceAssetId: string;
    discountedPrice: string;
    position: Position;
  }> {
    try {
      console.log(`⚠️ Liquidating position ${positionId}...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/liquidate/${positionId}`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to liquidate position');
      }

      const data = await response.json();
      console.log('✅ Position liquidated:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error liquidating position:', error);
      throw error;
    }
  }

  /**
   * Admin: Settle liquidation
   *
   * ✅ ENDPOINT: POST /admin/solvency/position/:id/settle-liquidation
   * Reference: FRONTEND_INTEGRATION_GUIDE.md
   */
  async settleLiquidation(positionId: number): Promise<{
    success: boolean;
    message: string;
    txHash: string;
    positionId: number;
    yieldReceived: string;
    debtRepaid: string;
    liquidationFee: string;
    userRefund: string;
  }> {
    try {
      console.log(`💰 Settling liquidation for position ${positionId} (admin)...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/position/${positionId}/settle-liquidation`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
        120000 // 2 minute timeout for blockchain tx
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to settle liquidation');
      }

      const data = await response.json();
      console.log('✅ Liquidation settled:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error settling liquidation:', error);
      throw error;
    }
  }

  /**
   * Admin: Get all loans for monitoring (Legacy endpoint)
   *
   * ✅ ENDPOINT: GET /admin/solvency/loans
   * Reference: Specification Section 9 - Admin Flow
   */
  async getAdminLoans(): Promise<{
    loans: Array<{
      userWallet: string;
      asset: string;
      positionId: number;
      outstandingDebt: string;
      healthFactor: number;
      ltv: number;
      status: string;
    }>;
  }> {
    try {
      console.log('🔍 Fetching admin loans...');

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/admin/solvency/loans`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch admin loans');
      }

      const data = await response.json();
      console.log('✅ Admin loans received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching admin loans:', error);
      throw error;
    }
  }

  /**
   * Notify backend of loan borrow transaction
   *
   * ✅ ENDPOINT: POST /solvency/loan/borrow-notify
   * Reference: LOAN_SYNC_IMPLEMENTATION.md
   *
   * Call after successful borrow transaction to sync backend database
   */
  async notifyLoanBorrow(request: {
    txHash: string;
    positionId: string;
    borrowAmount: string;
    loanDuration: string;
    numberOfInstallments: string;
    blockNumber?: string;
  }): Promise<{
    success: boolean;
    message: string;
    position: any;
  }> {
    try {
      console.log('📢 Notifying backend of loan borrow:', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/loan/borrow-notify`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        60000 // 60 second timeout
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify loan borrow');
      }

      const data = await response.json();
      console.log('✅ Loan borrow notification successful:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error notifying loan borrow:', error);
      throw error;
    }
  }

  /**
   * Notify backend of loan repayment transaction
   *
   * ✅ ENDPOINT: POST /solvency/loan/repay-notify
   * Reference: LOAN_SYNC_IMPLEMENTATION.md
   *
   * Call after successful repayment transaction to sync backend database
   */
  async notifyLoanRepayment(request: {
    txHash: string;
    positionId: string;
    repaymentAmount: string;
    blockNumber?: string;
  }): Promise<{
    success: boolean;
    message: string;
    position: any;
  }> {
    try {
      console.log('📢 Notifying backend of loan repayment:', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/loan/repay-notify`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        60000 // 60 second timeout
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify loan repayment');
      }

      const data = await response.json();
      console.log('✅ Loan repayment notification successful:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error notifying loan repayment:', error);
      throw error;
    }
  }


  async notifyCollateralWithdrawal(request: {
    positionId: string;
    amount: string;
  }): Promise<{
    success: boolean;
    message: string;
    position: any;
  }> {
    try {
      console.log('📢 Notifying backend of withdrawal', request);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/loan/withdrawal-notify`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
        60000 // 60 second timeout
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify loan repayment');
      }

      const data = await response.json();
      console.log('✅ Loan repayment notification successful:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error notifying loan repayment:', error);
      throw error;
    }
  }
}

export const solvencyService = new SolvencyService();
