// src/lib/api/issuer.service.ts

import type {
  TokenValidationResponse,
  IssuerData,
} from '../../types/issuer.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ============================================================================
// MOCK MODE CONFIGURATION
// ============================================================================
// Set to true to use mock data (no backend required)
// Set to false when backend is ready
const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_AUTH === 'true' || true;

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
class IssuerService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
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
          headers: {
            'Content-Type': 'application/json',
          },
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
export const issuerService = new IssuerService(API_BASE_URL);
