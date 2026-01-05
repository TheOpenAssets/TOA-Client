// src/lib/api/portfolio.service.ts
import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

export interface PortfolioAsset {
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

export interface PortfolioResponse {
  success: boolean;
  investorWallet: string;
  totalAssets: number;
  totalPurchases: number;
  totalLeveragePositions?: number;
  portfolio: PortfolioAsset[];
}

class PortfolioService extends BaseService {

  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get investor's complete portfolio
   * 
   * ENDPOINT: GET /marketplace/portfolio
   * 
   * BACKEND RESPONSE:
   * {
   *   success: boolean,
   *   investorWallet: string,
   *   totalAssets: number,
   *   totalPurchases: number,
   *   portfolio: PortfolioAsset[]
   * }
   */
  async getPortfolio(): Promise<PortfolioResponse> {
    try {
      console.log('📊 Fetching portfolio from API...');

      const response = await fetch(`${this.baseURL}/marketplace/portfolio`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();

        // 401 will be handled by global fetch interceptor, but throw error anyway
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }

        throw new Error(error.message || 'Failed to fetch portfolio');
      }

      const data: PortfolioResponse = await response.json();
      console.log('✅ Portfolio data received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching portfolio:', error);
      throw error;
    }
  }

  /**
   * Notify backend after successful token purchase
   * 
   * ENDPOINT: POST /marketplace/purchases/notify
   * 
   * BACKEND RESPONSE:
   * {
   *   success: boolean,
   *   purchaseId: string,
   *   assetId: string,
   *   amount: string,
   *   totalPayment: string,
   *   tokenAddress: string
   * }
   */
  async notifyPurchase(data: {
    txHash: string;
    assetId: string;
    amount: string;
    blockNumber: string;
  }): Promise<{
    success: boolean;
    purchaseId: string;
    assetId: string;
    amount: string;
    totalPayment: string;
    tokenAddress: string;
  }> {
    try {
      console.log('📝 Notifying backend of purchase:', data);
      
      const response = await fetch(`${this.baseURL}/marketplace/purchases/notify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify purchase');
      }

      const result = await response.json();
      console.log('✅ Purchase notification sent:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Error notifying purchase:', error);
      throw error;
    }
  }
}

export const portfolioService = new PortfolioService();
