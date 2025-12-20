// src/lib/blockchain/rainbowkit.config.ts

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, optimism, arbitrum } from 'wagmi/chains';

/**
 * RainbowKit Configuration
 * Configures supported chains and wallet connection
 */
export const rainbowKitConfig = getDefaultConfig({
  appName: 'Open Assets',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia, polygon, optimism, arbitrum],
  ssr: false,
});
