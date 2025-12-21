// src/types/auth.types.ts

export type UserRole = 'INVESTOR' | 'ISSUER' | 'ADMIN';

export interface User {
  id: string;
  walletAddress: string;
  role: UserRole;
  kyc: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ChallengeResponse {
  message: string;
  nonce: string;
}

export interface WalletStatusResponse {
  exists: boolean;
  kyc: boolean;
}

export interface LoginPayload {
  walletAddress: string;
  message: string;
  signature: string;
}

export interface KYCSubmitPayload {
  source: 'DIGILOCKER_SIMULATION' | 'DOCUMENT_UPLOAD';
  documents: {
    aadhaar: string;
    pan: string;
  };
}

export interface KYCSubmitResponse {
  success: boolean;
  message: string;
}
