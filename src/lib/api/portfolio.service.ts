// src/lib/api/portfolio.service.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface PortfolioAsset {
  assetId: string;
  tokenAddress: string;
  totalAmount: string;
  totalInvested: string;
  purchaseCount: number;
  firstPurchase: string;
  lastPurchase: string;
  metadata: {
    assetName: string;
    industry: string;
    riskTier: string;
  };
}

export interface PortfolioResponse {
  success: boolean;
  investorWallet: string;
  totalAssets: number;
  totalPurchases: number;
  portfolio: PortfolioAsset[];
}

class PortfolioService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
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
      
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      const response = await fetch(`${this.baseURL}/marketplace/portfolio`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
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
      
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      const response = await fetch(`${this.baseURL}/marketplace/purchases/notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
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

export const portfolioService = new PortfolioService(API_BASE_URL);
