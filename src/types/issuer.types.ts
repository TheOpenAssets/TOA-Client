// src/types/issuer.types.ts

import type { AuthTokens, User } from "./auth.types";

export const UserRole = {
  INVESTOR : 'INVESTOR',
  ORIGINATOR : 'ORIGINATOR',
  ADMIN : 'ADMIN'
} as const;

export interface Issuer {
  id: string;
  name: string;
}

export interface IssuerData {
  name: string;
  company: string;
  assetType: string;
  location: string;
  email: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  issuerData?: IssuerData;
  error?: string;
}

export interface LoginPayload {
  walletAddress: string;
  message: string;
  signature: string;
  onboardingToken?: string;
}

export interface TokenValidationPayload {
  token: string;
}

export interface ChallengeResponse {
  message: string;
  nonce: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export type AssetStatus =
  | 'UPLOADED'
  | 'HASHED'
  | 'MERKLED'
  | 'ATTESTED'
  | 'REGISTERED'
  | 'TOKENIZED'
  | 'LISTED'
  | 'SETTLED'
  | 'PAYOUT_COMPLETE';


export interface AssetMetadata {
    invoiceNumber: string;
    faceValue: string;
    currency: string;
    issueDate: string;
    dueDate: string;
    buyerName: string;
    industry: string;
    riskTier: string;
    name?: string;
    image?: string;
}

export interface TokenParams {
    totalSupply: string;
    minInvestment: string;
    minRaise: string;
}

export interface PriceRange {
    min: string;
    max: string;
}

export interface AssetListing {
    type: string;
    reservePrice: string;
    priceRange: PriceRange;
    duration: number;
    sold: string;
    active: boolean;
    listedAt: string;
    phase: string;
}

export interface BorrowAssetListing {
  type: string;
    active: boolean;
    listedAt: string;
    price: string;
    sold: string;
}

export interface Cryptography {
    documentHash: string;
    merkleLeaves: string[];
    merkleRoot: string;
}

export interface IssuerAsset {
  _id: string;
  assetId: string;
  originator: string;
  status: AssetStatus;
  assetType: string;
  metadata: AssetMetadata;
  tokenParams: TokenParams;
  files: any; 
  checkpoints: any;
  listing: BorrowAssetListing;
  createdAt: string;
  updatedAt: string;
  cryptography: Cryptography;
}
