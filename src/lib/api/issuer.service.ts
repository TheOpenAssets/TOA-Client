// src/lib/api/issuer.service.ts
import {
  type TokenValidationResponse,
  type IssuerData,
  type ChallengeResponse,
  type LoginResponse,
  type LoginPayload,
  UserRole
} from '../../types/issuer.types';
import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

// ============================================================================
// MOCK MODE CONFIGURATION
// ============================================================================
// Set to true to use mock data (no backend required)
// Set to false when backend is ready
const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_AUTH === 'false' || false;

/**
 * Issuer Service - Handles issuer onboarding-related API calls
 *
 * MOCK MODE: Currently using simulated backend responses for development
 *
 * TO SWITCH TO REAL BACKEND:
 * 1. Set USE_MOCK_MODE = false (or set VITE_USE_MOCK_AUTH=false in .env)
 * 2. Ensure backend is running at API_BASE_URL
 * 3. No other code changes needed - all endpoints are already configured
 */
class IssuerService extends BaseService {

  constructor() {
    super(API_BASE_URL);
  }

  // Challenge
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
          `${this.baseURL}/auth/challenge?walletAddress=${walletAddress}&role=${UserRole.ORIGINATOR}`,
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

    // login

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
              UserRole: isIssuerOnboarding ? 'ISSUER' : 'INVESTOR',  // Set role based on onboarding token
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
   * Validate onboarding token from email link
   *
   * ENDPOINT: GET /issuer/validate-token?token=xyz123
   *
   * BACKEND IMPLEMENTATION REQUIREMENTS:
   * - Query parameter: token (string, required)
   * - No authentication required (public endpoint)
   *
   * EXPECTED BACKEND RESPONSE:
   * {
   *   valid: boolean,        // true if token is valid and not expired
   *   issuerData?: {         // Only present if valid=true
   *     name: string,        // Issuer's full name from Typeform
   *     company: string,     // Company name from Typeform
   *     assetType: string,   // Type of asset (Real Estate, Bonds, etc.)
   *     location: string,    // Location from Typeform
   *     email: string        // Email address from Typeform
   *   },
   *   error?: string         // Error message if valid=false
   * }
   *
   * BACKEND LOGIC:
   * 1. Look up token in pending_issuers table
   * 2. Check if token is not expired (e.g., valid for 24 hours)
   * 3. Check if token has not been used already
   * 4. If valid, return issuer data from Typeform submission
   * 5. If invalid, return { valid: false, error: "Token expired/invalid" }
   *
   * ERROR CASES:
   * - 400: Missing token parameter
   * - 404: Token not found
   * - 410: Token expired or already used
   * - 500: Database error
   */
  async validateToken(token: string): Promise<TokenValidationResponse> {
    // MOCK MODE: Simulate token validation
    if (USE_MOCK_MODE) {
      console.log('🔧 MOCK MODE: Simulating token validation');
      console.log('Token:', token);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock logic: Accept any token for development
      // In production, backend will validate against database

      // Simulate different scenarios based on token value for testing:
      // - token = 'expired' -> Invalid token
      // - token = 'invalid' -> Invalid token
      // - Any other value -> Valid token with mock data

      if (token === 'expired' || token === 'invalid') {
        return {
          valid: false,
          error: 'Token is invalid or has expired. Please request a new link.',
        };
      }

      // Mock successful validation
      const mockIssuerData: IssuerData = {
        name: 'John Doe',
        company: 'ABC Corporation',
        assetType: 'Real Estate',
        location: 'Mumbai, India',
        email: 'john.doe@abccorp.com',
      };

      return {
        valid: true,
        issuerData: mockIssuerData,
      };
    }

    // REAL MODE: Call actual backend
    try {
      const response = await fetch(
        `${this.baseURL}/issuer/validate-token?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        // Handle HTTP error responses
        if (response.status === 404 || response.status === 410) {
          return {
            valid: false,
            error: 'Token is invalid or has expired.',
          };
        }
        throw new Error('Failed to validate token');
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating token:', error);
      return {
        valid: false,
        error: 'Failed to validate token. Please try again.',
      };
    }
  }
}

// Factory instance
export const issuerService = new IssuerService();
