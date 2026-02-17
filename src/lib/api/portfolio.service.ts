// src/lib/api/portfolio.service.ts
import BaseService from './base.service';
import type { PortfolioResponse } from '../../types/portfolio.types';

class PortfolioService extends BaseService {

  constructor() {
    super();
  }

  /**
   * Get investor's complete portfolio
   * 
   * ENDPOINT: GET /marketplace/portfolio
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

        // 401 will be handled by global fetch interceptor
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
   */
  async notifyPurchase(data: {
    txHash: string;
    assetId: string;
    amount: string;
    blockNumber: string;
    type?: string;
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
