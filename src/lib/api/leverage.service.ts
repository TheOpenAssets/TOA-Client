import BaseService from './base.service';
import type { LeveragePosition, LeverageQuote, MethPrice } from '../../types/leverage.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

class LeverageService extends BaseService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get current mETH price in USD
   * ENDPOINT: GET /leverage/meth-price
   */
  async getMethPrice(): Promise<MethPrice> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/leverage/meth-price`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch mETH price');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching mETH price:', error);
      throw error;
    }
  }

  /**
   * Get Swap Quote
   * ENDPOINT: GET /leverage/quote/:mETHAmount
   */
  async getQuote(mETHAmount: string): Promise<LeverageQuote> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/leverage/quote/${mETHAmount}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  }

  /**
   * Initiate Leveraged Purchase
   * ENDPOINT: POST /leverage/initiate
   */
  async initiatePosition(payload: {
    assetId: string;
    tokenAddress: string;
    tokenAmount: string; // WEI
    pricePerToken: string; // USDC WEI
    mETHCollateral: string; // WEI
  }): Promise<{ success: boolean; positionId: number; transactionHash: string }> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/leverage/initiate`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate position');
      }

      return await response.json();
    } catch (error) {
      console.error('Error initiating position:', error);
      throw error;
    }
  }

  /**
   * Get My Positions
   * ENDPOINT: GET /leverage/positions/my
   */
  async getMyPositions(): Promise<LeveragePosition[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/leverage/positions/my`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      return data.positions || [];
    } catch (error) {
      console.error('Error fetching my positions:', error);
      throw error;
    }
  }

  /**
   * Get Position Details
   * ENDPOINT: GET /leverage/position/:id
   */
  async getPositionDetails(id: number): Promise<LeveragePosition> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/leverage/position/${id}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch position details');
      }

      const data = await response.json();
      return data.position;
    } catch (error) {
      console.error('Error fetching position details:', error);
      throw error;
    }
  }
}

export const leverageService = new LeverageService();
