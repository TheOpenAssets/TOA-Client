// src/lib/api/auth.service.ts

import type {
  WalletStatusResponse,
  ChallengeResponse,
  LoginPayload,
  LoginResponse,
} from '../../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Auth Service - Handles all authentication-related API calls
 * Factory pattern for service methods
 */
class AuthService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Check if wallet exists and KYC status
   * GET /users/exists?walletAddress=0xUSER
   */
  async checkWalletStatus(walletAddress: string): Promise<WalletStatusResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/users/exists?walletAddress=${walletAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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

  /**
   * Get authentication challenge
   * GET /auth/challenge?walletAddress=0xUSER
   */
  async getChallenge(walletAddress: string): Promise<ChallengeResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/auth/challenge?walletAddress=${walletAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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

  /**
   * Login with wallet signature
   * POST /auth/login
   * 🚫 Do NOT send KYC data
   * 🚫 Do NOT change payload structure
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      // Store tokens in localStorage
      if (data.tokens) {
        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);
      }

      return data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  /**
   * Logout - Clear tokens
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// Factory instance
export const authService = new AuthService(API_BASE_URL);
