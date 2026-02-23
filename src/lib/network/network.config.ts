export type NetworkType = 'arbitrum' | 'stellar';

export interface NetworkFeatures {
  leverage: boolean;
  faucet: boolean;
  solvency: boolean;
  secondaryMarket: boolean;
  borrow: boolean;
}

// src/lib/network/network.config.ts

export interface NetworkConfig {
  type: NetworkType;
  displayName: string;
  apiUrl: string;
  explorerUrl: string;
  features: NetworkFeatures;
  walletType: 'evm' | 'stellar';
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  arbitrum: {
    type: 'arbitrum',
    displayName: 'Arbitrum',
    apiUrl: import.meta.env.VITE_ARBITRUM_API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    explorerUrl: 'https://sepolia.arbiscan.io',
    features: { leverage: true, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm',
  },
  stellar: {
    type: 'stellar',
    displayName: 'Stellar',
    apiUrl: import.meta.env.VITE_STELLAR_API_URL ?? 'http://localhost:3001',
    explorerUrl: 'https://stellar.expert/explorer/testnet',
    features: { leverage: false, faucet: false, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'stellar',
  },
};

export const SUPPORTED_NETWORKS: NetworkType[] = ['arbitrum', 'stellar'];
export const DEFAULT_NETWORK: NetworkType = 'arbitrum';
