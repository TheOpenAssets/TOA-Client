// src/lib/blockchain/rainbowkit.config.ts

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, optimism, arbitrum, arbitrumSepolia } from 'wagmi/chains';

/**
 * RainbowKit Configuration
 * Configures supported chains and wallet connection
 * Arbitrum Sepolia is set as the default chain
 */
export const rainbowKitConfig = getDefaultConfig({
  appName: 'Open Assets',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [arbitrumSepolia, sepolia, mainnet, polygon, optimism, arbitrum],
  ssr: false,
});
