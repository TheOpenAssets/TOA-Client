// src/lib/blockchain/rainbowkit.config.ts

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, optimism, arbitrum } from 'wagmi/chains';
import { type Chain } from 'wagmi/chains';

/**
 * Mantle Sepolia Testnet Configuration
 */
export const mantleSepolia: Chain = {
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: {
    name: 'MNT',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://explorer.sepolia.mantle.xyz',
    },
  },
  testnet: true,
};

/**
 * RainbowKit Configuration
 * Configures supported chains and wallet connection
 * Mantle Sepolia is set as the default chain
 */
export const rainbowKitConfig = getDefaultConfig({
  appName: 'Open Assets',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mantleSepolia, sepolia, mainnet, polygon, optimism, arbitrum],
  ssr: false,
});
