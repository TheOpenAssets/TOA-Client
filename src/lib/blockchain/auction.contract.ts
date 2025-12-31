// src/lib/blockchain/auction.contract.ts
// 100% Script-Verified Auction Contract Integration
// Based on: investor-bidding.sh, investor-settle.sh, admin-endauction.sh

import { parseUnits, formatUnits } from 'viem';

/**
 * Deployed Contract Addresses (Mantle Sepolia Testnet)
 * Source: packages/contracts/deployed_contracts.json
 */
export const CONTRACTS = {
  AttestationRegistry: '0x03FE7d3736402D140659e7bD92B64808E31C3f51',
  TrustedIssuersRegistry: '0xf63B563b6D438122cBC87f4356e60b8BB3Bc53E2',
  IdentityRegistry: '0x2E310C62A225033055E88B690F8d054ece8bcbC4',
  YieldVault: '0xb9BfaEDe01f0f2b2162072b73e2b2038Fb42b5cD',
  TokenFactory: '0x7C75795Cf41ee32fB4FEB89964d7591F0a44BcfE',
  PrimaryMarketplace: '0x034Ca27695555CEeB44CB62d59c4E3f95F4Ef504',
  USDC: '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238',
  Faucet: '0x643b8c16F894B39399506cC921efa68d61A14905',
} as const;

/**
 * Contract ABIs (Minimal - Only Required Functions)
 */

// USDC ERC-20 ABI (investor-bidding.sh lines 223-227)
export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// PrimaryMarketplace ABI (investor-bidding.sh lines 229-232)
export const MARKETPLACE_ABI = [
  {
    name: 'submitBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'tokenAmount', type: 'uint256' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'settleBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'bidIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'endAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'clearingPrice', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'listings',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'tokenAddress', type: 'address' },
      { name: 'assetId', type: 'bytes32' },
      { name: 'listingType', type: 'uint8' },
      { name: 'staticPrice', type: 'uint256' },
      { name: 'reservePrice', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'clearingPrice', type: 'uint256' },
      { name: 'auctionPhase', type: 'uint8' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'sold', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'minInvestment', type: 'uint256' },
    ],
  },
] as const;

// IdentityRegistry ABI (investor-bidding.sh lines 87-90)
export const IDENTITY_REGISTRY_ABI = [
  {
    name: 'registerIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [],
  },
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * Helper Functions
 */

/**
 * Convert UUID to bytes32
 * VERIFIED: investor-bidding.sh line 244
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '');
  return `0x${hex.padEnd(64, '0')}` as `0x${string}`;
}

/**
 * Parse token amount to wei (18 decimals)
 * VERIFIED: investor-bidding.sh line 246
 */
export function parseTokenAmount(amount: string | number): bigint {
  return parseUnits(amount.toString(), 18);
}

/**
 * Parse USDC amount to wei (6 decimals)
 * VERIFIED: investor-bidding.sh line 247
 */
export function parseUSDC(amount: string | number): bigint {
  return parseUnits(amount.toString(), 6);
}

/**
 * Format token amount from wei
 */
export function formatTokenAmount(weiAmount: bigint): string {
  return formatUnits(weiAmount, 18);
}

/**
 * Format USDC amount from wei
 */
export function formatUSDCAmount(weiAmount: bigint): string {
  return formatUnits(weiAmount, 6);
}

/**
 * Calculate deposit needed for bid
 * VERIFIED: investor-bidding.sh line 273
 */
export function calculateDepositNeeded(
  pricePerToken: bigint,
  tokenAmount: bigint
): bigint {
  // depositNeeded = (pricePerToken * tokenAmount) / 1e18
  return (pricePerToken * tokenAmount) / parseUnits('1', 18);
}

/**
 * Type Definitions for Contract Interactions
 */

export interface BidSubmissionParams {
  assetId: string; // UUID
  tokenAmount: string | number; // Number of tokens (will be converted to wei)
  pricePerToken: string | number; // Price per token in USDC (will be converted to wei)
}

export interface BidSettlementParams {
  assetId: string; // UUID
  bidIndex: number;
}

export interface EndAuctionParams {
  assetId: string; // UUID
  clearingPrice: string | number; // USDC price (will be converted to wei)
}
