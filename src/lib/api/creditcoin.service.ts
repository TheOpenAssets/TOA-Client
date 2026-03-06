/**
 * Creditcoin API Service
 * Handles all backend API calls for Creditcoin credit scoring and event verification
 */

import type {
  CreditScoreResponse,
  BorrowTermsResponse,
  SubmitProofDto,
  SubmitProofResponse,
  USCEventsResponse,
} from '../../types/creditcoin.types';
import BaseService from './base.service';

class CreditcoinService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get user's credit score
   *
   * ENDPOINT: GET /credit-score/{walletAddress}
   *
   * RESPONSE:
   * {
   *   compositeScore: number,
   *   tier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
   *   layer1Score: number,
   *   layer2Score: number,
   *   effectiveLTV: number,
   *   maxBorrowMultiplier: number
   * }
   */
  async getCreditScore(walletAddress: string): Promise<CreditScoreResponse> {
    try {
      console.log(`📊 Fetching credit score for ${walletAddress}...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/credit-score/${walletAddress}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch credit score');
      }

      const data: CreditScoreResponse = await response.json();
      console.log('✅ Credit score received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching credit score:', error);
      throw error;
    }
  }

  /**
   * Get user's borrow terms
   *
   * ENDPOINT: GET /solvency/borrow-terms/{walletAddress}
   *
   * RESPONSE:
   * {
   *   compositeScore: number,
   *   tier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
   *   layer1Score: number,
   *   layer2Score: number,
   *   effectiveLTV: number,
   *   maxBorrowMultiplier: number
   * }
   */
  async getBorrowTerms(walletAddress: string): Promise<BorrowTermsResponse> {
    try {
      console.log(`📋 Fetching borrow terms for ${walletAddress}...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/solvency/borrow-terms/${walletAddress}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch borrow terms');
      }

      const data: BorrowTermsResponse = await response.json();
      console.log('✅ Borrow terms received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching borrow terms:', error);
      throw error;
    }
  }

  /**
   * Submit USC (Universal Staking Credential) proof
   *
   * ENDPOINT: POST /usc/submit-proof
   *
   * REQUEST:
   * {
   *   walletAddress: string,
   *   sourceChain: 'ETHEREUM' | 'BSC' | 'BITCOIN',
   *   eventType: 'REPAYMENT' | 'DEFAULT' | 'STAKE',
   *   scoreDelta: number,
   *   txHash: string,
   *   proofData: string
   * }
   *
   * RESPONSE:
   * {
   *   txHash: string,
   *   verified: boolean
   * }
   */
  async submitUSCProof(dto: SubmitProofDto): Promise<SubmitProofResponse> {
    try {
      console.log('🔐 Submitting USC proof:', dto);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/usc/submit-proof`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(dto),
        },
        60000 // 60 second timeout
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit USC proof');
      }

      const data: SubmitProofResponse = await response.json();
      console.log('✅ USC proof submitted:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error submitting USC proof:', error);
      throw error;
    }
  }

  /**
   * Get USC events for a wallet address
   *
   * ENDPOINT: GET /usc/events/{walletAddress}
   *
   * RESPONSE:
   * {
   *   events: [
   *     {
   *       sourceChain: string,
   *       eventType: string,
   *       scoreDelta: number,
   *       verifiedAt: string (ISO timestamp),
   *       txHash: string
   *     }
   *   ]
   * }
   */
  async getUSCEvents(walletAddress: string): Promise<USCEventsResponse> {
    try {
      console.log(`📅 Fetching USC events for ${walletAddress}...`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/usc/events/${walletAddress}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch USC events');
      }

      const data: USCEventsResponse = await response.json();
      console.log('✅ USC events received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching USC events:', error);
      throw error;
    }
  }
}

export const creditcoinService = new CreditcoinService();
