// src/lib/api/kyc.service.ts

import type { KYCSubmitPayload, KYCSubmitResponse } from '../../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * KYC Service - Handles KYC-related API calls
 * Separate from auth service as per requirements
 */
class KYCService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Submit KYC completion
   * POST /kyc/submit
   * Authorization: Bearer ACCESS_TOKEN
   * Only for users who saw DigiLocker simulation
   */
  async submitKYC(payload: KYCSubmitPayload): Promise<KYCSubmitResponse> {
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      const response = await fetch(`${this.baseURL}/kyc/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'KYC submission failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting KYC:', error);
      throw error;
    }
  }
}

// Factory instance
export const kycService = new KYCService(API_BASE_URL);
