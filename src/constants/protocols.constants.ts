/**
 * Protocol Constants
 * 
 * IMPORTANT: Protocols are 3RD PARTY services, not managed by our backend!
 * Each protocol has its own API and integration method.
 * 
 * In real implementation:
 * - API keys would be stored in environment variables
 * - Each protocol would have its own SDK/API integration
 * - When user clicks "Borrow", the protocol's modal opens
 * - After successful borrow, protocol notifies us via webhook
 */

import type { Protocol as ProtocolType } from '../types/solvency.types';

// Re-export the type for convenience
export type Protocol = ProtocolType;

/**
 * Available protocols for borrowing against OAID credit
 * These are HARDCODED in the frontend (not fetched from backend)
 */
export const SUPPORTED_PROTOCOLS: Protocol[] = [
  {
    id: 'aave',
    name: 'Aave',
    description: 'Leading decentralized lending protocol with over $10B TVL',
    logo: '/protocols/aave.svg',
    apy: 3.2,
    tvl: 10500000000, // $10.5B
    borrowRate: 3.2,
    minBorrow: 1000, // $1,000
    maxBorrow: 1000000, // $1M
    isActive: true,
    category: 'DeFi',
  },
  {
    id: 'compound',
    name: 'Compound',
    description: 'Algorithmic money market protocol on Ethereum',
    logo: '/protocols/compound.svg',
    apy: 2.8,
    tvl: 3200000000, // $3.2B
    borrowRate: 2.8,
    minBorrow: 1000,
    maxBorrow: 500000,
    isActive: true,
    category: 'DeFi',
  },
  {
    id: 'morpho',
    name: 'Morpho',
    description: 'Optimized lending rates through peer-to-peer matching',
    logo: '/protocols/morpho.svg',
    apy: 3.8,
    tvl: 1800000000, // $1.8B
    borrowRate: 3.8,
    minBorrow: 1000,
    maxBorrow: 750000,
    isActive: false, // Coming soon
    category: 'DeFi',
  },
];

/**
 * Get protocol by ID
 */
export const getProtocolById = (id: string): Protocol | undefined => {
  return SUPPORTED_PROTOCOLS.find(p => p.id === id);
};

/**
 * Get active protocols only
 */
export const getActiveProtocols = (): Protocol[] => {
  return SUPPORTED_PROTOCOLS.filter(p => p.isActive);
};

/**
 * Protocol API Keys (from environment)
 * In production, these would be used to integrate with protocol SDKs
 */
export const PROTOCOL_API_KEYS = {
  aave: import.meta.env.VITE_AAVE_API_KEY,
  compound: import.meta.env.VITE_COMPOUND_API_KEY,
  morpho: import.meta.env.VITE_MORPHO_API_KEY,
};

/**
 * Protocol integration methods
 * Each protocol would have its own integration logic
 */
export const PROTOCOL_INTEGRATIONS = {
  aave: {
    /**
     * Opens Aave's borrow modal
     * In production, this would:
     * 1. Initialize Aave SDK with API key
     * 2. Open modal with user's OAID
     * 3. Handle borrow transaction
     * 4. Notify backend after success
     */
    openBorrowModal: async (oaidAddress: string, amount: string) => {
      console.log('🏦 Opening Aave borrow modal', { oaidAddress, amount });
      // TODO: Integrate with Aave SDK
      alert('Aave integration coming soon!');
    },
  },
  
  compound: {
    /**
     * Opens Compound's borrow modal
     */
    openBorrowModal: async (oaidAddress: string, amount: string) => {
      console.log('🏦 Opening Compound borrow modal', { oaidAddress, amount });
      // TODO: Integrate with Compound SDK
      alert('Compound integration coming soon!');
    },
  },
  
  morpho: {
    /**
     * Redirects to Morpho's website
     */
    redirectToBorrow: (oaidAddress: string, amount: string) => {
      console.log('🏦 Redirecting to Morpho', { oaidAddress, amount });
      // TODO: Build redirect URL with parameters
      window.open('https://morpho.xyz', '_blank');
    },
  },
};
