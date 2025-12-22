// src/types/issuer.types.ts

// Example Issuer types
export interface Issuer {
  id: string;
  name: string;
}

/**
 * Issuer data received from Typeform submission
 * This data is stored in the backend when user submits the "List Your Asset" form
 */
export interface IssuerData {
  name: string;           // Issuer's full name
  company: string;        // Company name
  assetType: string;      // Type of asset (Real Estate, Bonds, etc.)
  location: string;       // Location of the asset/company
  email: string;          // Email address
}

/**
 * Response from token validation endpoint
 * Used to validate the onboarding token from email link
 */
export interface TokenValidationResponse {
  valid: boolean;         // Whether the token is valid and not expired
  issuerData?: IssuerData; // Issuer data if token is valid
  error?: string;         // Error message if token is invalid
}

/**
 * Request payload for validating an onboarding token
 */
export interface TokenValidationPayload {
  token: string;          // The onboarding token from URL parameter
}
