// src/lib/api/auth.service.ts

import type {
  WalletStatusResponse,
  ChallengeResponse,
  LoginPayload,
  LoginResponse,
} from '../../types/auth.types';
import { UserRole } from '../../types/issuer.types';
import BaseService from './base.service';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

// ============================================================================
// MOCK MODE CONFIGURATION
// ============================================================================
// Set to true to use mock data (no backend required)
// Set to false when backend is ready
const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_AUTH === 'false' || false;

/**
 * Auth Service - Handles all authentication-related API calls
 *
 * MOCK MODE: Currently using simulated backend responses for development
 *
 * TO SWITCH TO REAL BACKEND:
 * 1. Set USE_MOCK_MODE = false (or set VITE_USE_MOCK_AUTH=false in .env)
 * 2. Ensure backend is running at API_BASE_URL
 * 3. No other code changes needed - all endpoints are already configured
 */
class AuthService extends BaseService {

  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Check if wallet exists and KYC status
   *
   * ENDPOINT: GET /users/exists?walletAddress=0xUSER
   *
   * BACKEND IMPLEMENTATION REQUIREMENTS:
   * - Query parameter: walletAddress (string, required)
   * - No authentication required (public endpoint)
   *
   * EXPECTED BACKEND RESPONSE:
   * {
   *   exists: boolean,  // true if wallet is registered in the system
   *   kyc: boolean      // true if user has completed KYC verification
   * }
   *
   * BACKEND LOGIC:
   * 1. Check if wallet address exists in users table
   * 2. If exists, check if user.kycStatus === 'APPROVED'
   * 3. Return { exists: true/false, kyc: true/false }
   *
   * ERROR CASES:
   * - 400: Invalid wallet address format
   * - 500: Database error
   */
  async checkWalletStatus(walletAddress: string): Promise<WalletStatusResponse> {
    // MOCK MODE: Simulate backend response
    if (true) {
      console.log('🔧 MOCK MODE: Simulating wallet status check');

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock logic: Simulate different scenarios based on wallet address
      // In real backend, this would query the database
      const mockResponse: WalletStatusResponse = {
        // Change these values to test different scenarios:
        // - exists: false, kyc: false -> New user (shows email + document upload)
        // - exists: true, kyc: true -> Existing user (shows login button)
        // - exists: true, kyc: false -> Registered but not verified (shows login, KYC required after)
        exists: false,  // Set to true to test existing user flow
        kyc: false,     // Set to true to test returning user flow
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

  /**
   * Get authentication challenge for wallet signature
   *
   * ENDPOINT: GET /auth/challenge?walletAddress=0xUSER
   *
   * BACKEND IMPLEMENTATION REQUIREMENTS:
   * - Query parameter: walletAddress (string, required)
   * - No authentication required
   *
   * EXPECTED BACKEND RESPONSE:
   * {
   *   message: string,  // The message to be signed by the wallet
   *   nonce: string     // Unique random value to prevent replay attacks
   * }
   *
   * BACKEND LOGIC:
   * 1. Generate a unique nonce (crypto.randomBytes(32).toString('hex'))
   * 2. Store nonce with walletAddress in temporary storage (Redis with 5min TTL)
   * 3. Create challenge message: "Sign this message to authenticate with TOA Platform\n\nWallet: {walletAddress}\nNonce: {nonce}\nTimestamp: {timestamp}"
   * 4. Return { message, nonce }
   *
   * SECURITY NOTES:
   * - Nonce should be cryptographically random
   * - Nonce should expire after 5 minutes
   * - Message should include wallet address to prevent signature reuse
   *
   * ERROR CASES:
   * - 400: Invalid wallet address
   * - 500: Failed to generate nonce
   */
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
                credentials: 'include',

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
   *
   * ENDPOINT: POST /auth/login
   *
   * REQUEST BODY:
   * {
   *   walletAddress: string,  // User's wallet address
   *   message: string,        // The challenge message that was signed
   *   signature: string,      // Wallet signature of the message
   *   onboardingToken?: string // Optional: Issuer onboarding token from email link
   * }
   *
   * BACKEND IMPLEMENTATION REQUIREMENTS:
   * 1. Verify the signature matches the wallet address
   * 2. Verify the nonce from the message is valid and not expired
   * 3. Check if user exists in database
   * 4. If onboardingToken is present:
   *    - Validate the token and get pending issuer data
   *    - Link wallet address to the pending issuer record
   *    - Set user role to 'ISSUER'
   *    - Mark issuer status as 'APPROVED'
   * 5. Generate JWT access token (15min expiry) and refresh token (7 days)
   * 6. Return user data and tokens
   *
   * EXPECTED BACKEND RESPONSE:
   * {
   *   user: {
   *     id: string,
   *     walletAddress: string,
   *     role: 'INVESTOR' | 'ISSUER' | 'ADMIN',
   *     kyc: boolean  // KYC completion status
   *   },
   *   tokens: {
   *     access: string,   // JWT access token
   *     refresh: string   // JWT refresh token
   *   }
   * }
   *
   * BACKEND SIGNATURE VERIFICATION:
   * - Use ethers.js or web3.js to verify signature
   * - Example: ethers.utils.verifyMessage(message, signature) === walletAddress
   *
   * BACKEND JWT GENERATION:
   * - Access token payload: { userId, walletAddress, role }
   * - Access token expiry: 15 minutes
   * - Refresh token expiry: 7 days
   * - Use environment variable for JWT_SECRET
   *
   * ERROR CASES:
   * - 400: Invalid signature or missing fields
   * - 401: Signature verification failed
   * - 404: User not found (if wallet not registered)
   * - 500: Database or token generation error
   *
   * IMPORTANT NOTES:
   * 🚫 Do NOT send KYC data in this endpoint
   * 🚫 Do NOT change payload structure
   * ✅ KYC submission is handled separately in /kyc/submit endpoint
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    // MOCK MODE: Simulate successful login
    if (USE_MOCK_MODE) {
      console.log('🔧 MOCK MODE: Simulating login with wallet signature');
      console.log('Payload:', { ...payload, signature: payload.signature.substring(0, 20) + '...' });

      // Check if this is issuer onboarding
      const isIssuerOnboarding = !!payload.onboardingToken;

      if (isIssuerOnboarding) {
        console.log('🔧 ISSUER ONBOARDING: Token detected -', payload.onboardingToken);
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock tokens (in real backend, generate JWTs)
      const mockAccessToken = 'mock_access_token_' + Math.random().toString(36);
      const mockRefreshToken = 'mock_refresh_token_' + Math.random().toString(36);

      const mockResponse: LoginResponse = {
        user: {
          id: 'mock_user_id_' + Math.random().toString(36).substring(2, 9),
          walletAddress: payload.walletAddress,
          role: isIssuerOnboarding ? UserRole.ORIGINATOR : UserRole.INVESTOR,  // Set role based on onboarding token
          kyc: false,         // Set to true to skip KYC flow in testing
        },
        tokens: {
          access: mockAccessToken,
          refresh: mockRefreshToken,
        },
      };

      // Store tokens in localStorage (same as real flow)
      localStorage.setItem('access_token', mockResponse.tokens.access);
      localStorage.setItem('refresh_token', mockResponse.tokens.refresh);

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
   *
   * OPTIONAL BACKEND ENDPOINT: POST /auth/logout
   * - Send refresh token to invalidate it (add to blacklist)
   * - Not required for basic functionality (frontend token removal is sufficient)
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

  /**
   * Get current authenticated user details
   *
   * ENDPOINT: GET /auth/me
   *
   * BACKEND IMPLEMENTATION REQUIREMENTS:
   * - Header: Authorization: Bearer {access_token}
   * - Validate JWT token
   * - Return user details from token payload
   *
   * EXPECTED BACKEND RESPONSE:
   * {
   *   id: string,
   *   walletAddress: string,
   *   role: 'INVESTOR' | 'ORIGINATOR' | 'ADMIN',
   *   kyc: boolean
   * }
   *
   * ERROR CASES:
   * - 401: Invalid or expired token
   * - 403: Token valid but user not authorized
   */
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
          // Token expired or invalid - clear tokens
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

