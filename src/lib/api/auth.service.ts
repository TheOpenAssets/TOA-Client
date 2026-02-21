// src/lib/api/auth.service.ts

import type {
  WalletStatusResponse,
  ChallengeResponse,
  LoginPayload,
  LoginResponse,
} from '../../types/auth.types';
import { UserRole } from '../../types/issuer.types';
import BaseService from './base.service';

// ============================================================================
// MOCK MODE CONFIGURATION
// ============================================================================
// Set to true to use mock data (no backend required)
// Set to false when backend is ready
const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_AUTH === 'false' || false;

/**
 * Auth Service - Handles all authentication-related API calls
 */
class AuthService extends BaseService {

  constructor() {
    super();
  }

  private getNetwork(): string {
    const segment = window.location.pathname.split('/')[1];
    return ['arbitrum', 'stellar'].includes(segment) ? segment : 'arbitrum';
  }

  async checkWalletStatus(walletAddress: string): Promise<WalletStatusResponse> {
    // MOCK MODE: Simulate backend response
    if (false) {
      console.log('🔧 MOCK MODE: Simulating wallet status check');

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockResponse: WalletStatusResponse = {
        exists: false,
        kyc: false,
      };

      return mockResponse;
    }

    // REAL MODE: Call actual backend
    try {
      const response = await fetch(
        `${this.baseURL}/users/exists?walletAddress=${walletAddress}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check wallet status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking wallet status:', error);
      throw error;
    }
  }

  async getChallenge(walletAddress: string): Promise<ChallengeResponse> {
    // MOCK MODE: Generate mock challenge
    if (USE_MOCK_MODE) {
      console.log('🔧 MOCK MODE: Generating mock authentication challenge');

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock nonce (in real backend, use crypto.randomBytes)
      const mockNonce = Math.random().toString(36).substring(2, 15);
      const timestamp = new Date().toISOString();

      const mockResponse: ChallengeResponse = {
        message: `Sign this message to authenticate with TOA Platform\n\nWallet: ${walletAddress}\nNonce: ${mockNonce}\nTimestamp: ${timestamp}`,
        nonce: mockNonce,
      };

      return mockResponse;
    }

    // REAL MODE: Get challenge from backend
    try {
      const response = await fetch(
        `${this.baseURL}/auth/challenge?walletAddress=${walletAddress}&role=INVESTOR`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting challenge:', error);
      throw error;
    }
  }

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const network = this.getNetwork();

    // MOCK MODE: Simulate successful login
    if (USE_MOCK_MODE) {
      console.log('🔧 MOCK MODE: Simulating login with wallet signature');
      
      const isIssuerOnboarding = !!payload.onboardingToken;

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockAccessToken = 'mock_access_token_' + Math.random().toString(36);
      const mockRefreshToken = 'mock_refresh_token_' + Math.random().toString(36);

      const mockResponse: LoginResponse = {
        user: {
          id: 'mock_user_id_' + Math.random().toString(36).substring(2, 9),
          walletAddress: payload.walletAddress,
          role: isIssuerOnboarding ? UserRole.ORIGINATOR : UserRole.INVESTOR,
          kyc: false,
        },
        tokens: {
          access: mockAccessToken,
          refresh: mockRefreshToken,
        },
      };

      // Store tokens in localStorage (network-scoped)
      localStorage.setItem(`${network}_access_token`, mockResponse.tokens.access);
      localStorage.setItem(`${network}_refresh_token`, mockResponse.tokens.refresh);

      return mockResponse;
    }

    // REAL MODE: Call backend login
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      // Store tokens in localStorage (network-scoped)
      if (data.tokens) {
        localStorage.setItem(`${network}_access_token`, data.tokens.access);
        localStorage.setItem(`${network}_refresh_token`, data.tokens.refresh);
      }

      return data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  logout(): void {
    const network = this.getNetwork();
    localStorage.removeItem(`${network}_access_token`);
    localStorage.removeItem(`${network}_refresh_token`);
  }

  getAccessToken(): string | null {
    const network = this.getNetwork();
    return localStorage.getItem(`${network}_access_token`) || localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    const network = this.getNetwork();
    return localStorage.getItem(`${network}_refresh_token`) || localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  async getCurrentUser(): Promise<{ id: string; walletAddress: string; role: string; kyc: boolean }> {
    const token = this.getAccessToken();

    if (!token) {
      throw new Error('No access token found');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to verify authentication');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }
}

// Factory instance
export const authService = new AuthService();

