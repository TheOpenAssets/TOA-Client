// src/types/issuer.types.ts

import type { AuthTokens, User } from "./auth.types";



export const UserRole = {
  INVESTOR : 'INVESTOR',
  ORIGINATOR : 'ORIGINATOR',
  ADMIN : 'ADMIN'
} as const;

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

export interface LoginPayload {
  walletAddress: string;
  message: string;
  signature: string;
  onboardingToken?: string;  // Optional: For issuer onboarding flow
}


/**
 * Request payload for validating an onboarding token
 */
export interface TokenValidationPayload {
  token: string;          // The onboarding token from URL parameter
}

export interface ChallengeResponse {
  message: string;
  nonce: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

/**
 * Asset status types
 */
export type AssetStatus = 'pending' | 'registered' | 'listed' | 'partially_sold' | 'settled';

/**
 * Invoice details for an asset
 */
export interface InvoiceDetails {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  description: string;
  issueDate: string;
  paymentTerms: string;
}

/**
 * Risk assessment for an asset
 */
export interface RiskFactor {
  level: 'low' | 'medium' | 'high';
  category: string;
  description: string;
}

/**
 * Audit information for an asset
 */
export interface AuditInfo {
  auditor: string;
  auditDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  reportUrl?: string;
  findings?: string;
}

/**
 * Token distribution information
 */
export interface TokenDistribution {
  totalTokens: number;
  soldTokens: number;
  unsoldTokens: number;
  claimableTokens: number;
  tokenPrice: number;
}

/**
 * Complete asset data for issuer dashboard
 */
export interface IssuerAsset {
  id: string;
  name: string;
  assetType: string;
  status: AssetStatus;
  tokenDistribution: TokenDistribution;
  invoice: InvoiceDetails;
  riskFactors: RiskFactor[];
  audit?: AuditInfo;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  location?: string;
  overview?: string;
}

/**
 * Claim request payload
 */
export interface ClaimTokensPayload {
  assetId: string;
  amount: number;
  walletAddress: string;
}

/**
 * Claim response
 */
export interface ClaimTokensResponse {
  success: boolean;
  transactionHash?: string;
  claimedAmount: number;
  message?: string;
  error?: string;
}
