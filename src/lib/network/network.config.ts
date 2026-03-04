// src/lib/network/network.config.ts

export interface NetworkFeatures {
  leverage: boolean;
  faucet: boolean;
  solvency: boolean;
  secondaryMarket: boolean;
  borrow: boolean;
}

export interface NetworkConfig {
  type: string;
  displayName: string;
  apiUrl: string;
  explorerUrl: string;
  features: NetworkFeatures;
  walletType: 'evm' | 'stellar';
}

// ─── Single shared API URL ────────────────────────────────────────────────────
// All networks are served by one backend process. The X-Network header
// tells the backend which chain a request belongs to.
const SHARED_API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ─── Network Registry ─────────────────────────────────────────────────────────
// To add a new chain: add one entry here. Zero other code changes needed.
export const NETWORK_CONFIGS = {
  mantle: {
    type: 'mantle',
    displayName: 'Mantle',
    apiUrl: SHARED_API_URL,
    explorerUrl: 'https://explorer.testnet.mantle.xyz',
    features: { leverage: true, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm' as const,
  },
  arbitrum: {
    type: 'arbitrum',
    displayName: 'Arbitrum',
    apiUrl: SHARED_API_URL,
    explorerUrl: 'https://sepolia.arbiscan.io',
    features: { leverage: true, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm' as const,
  },
  stellar: {
    type: 'stellar',
    displayName: 'Stellar',
    apiUrl: SHARED_API_URL,
    explorerUrl: 'https://stellar.expert/explorer/testnet',
    features: { leverage: false, faucet: false, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'stellar' as const,
  },
  creditcoin: {
    type: 'creditcoin',
    displayName: 'Creditcoin Testnet',
    apiUrl: SHARED_API_URL,
    // Blockscout EVM explorer — ChainId 102031
    explorerUrl: 'https://creditcoin-testnet.blockscout.com',
    features: { leverage: false, faucet: true, solvency: true, secondaryMarket: true, borrow: true },
    walletType: 'evm' as const,
  },
} satisfies Record<string, NetworkConfig>;

// ─── Derived types ────────────────────────────────────────────────────────────
// NetworkType is automatically the union of all keys in NETWORK_CONFIGS.
// Adding a new network above automatically widens this type.
export type NetworkType = keyof typeof NETWORK_CONFIGS;

// ─── Supported networks list ──────────────────────────────────────────────────
export const SUPPORTED_NETWORKS = Object.keys(NETWORK_CONFIGS) as NetworkType[];

// ─── Default network ──────────────────────────────────────────────────────────
// Controlled by VITE_DEFAULT_NETWORK env variable.
// Change the env var — no code changes needed.
export const DEFAULT_NETWORK: NetworkType =
  (import.meta.env.VITE_DEFAULT_NETWORK as NetworkType | undefined) &&
    (import.meta.env.VITE_DEFAULT_NETWORK in NETWORK_CONFIGS)
    ? (import.meta.env.VITE_DEFAULT_NETWORK as NetworkType)
    : 'creditcoin';

// ─── Path utility ─────────────────────────────────────────────────────────────
// Used by services that need the current network outside of React context.
// Reads the first URL path segment and validates it against NETWORK_CONFIGS.
// Falls back to DEFAULT_NETWORK for unknown segments.
export const getNetworkFromPath = (): NetworkType => {
  const segment = window.location.pathname.split('/')[1];
  return segment in NETWORK_CONFIGS
    ? (segment as NetworkType)
    : DEFAULT_NETWORK;
};
