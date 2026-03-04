// src/lib/blockchain/chains.config.ts
//
// Maps every NetworkType to its Wagmi chain object.
// Defines custom chains that are not in the wagmi/chains package.

import {
    arbitrumSepolia,
    sepolia,
    mantleSepoliaTestnet,
} from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';
import type { NetworkType } from '../network/network.config';

// ─── Custom chain definitions ────────────────────────────────────────────────

export const creditcoinTestnet = {
    id: 102031,
    name: 'Creditcoin Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Testnet Creditcoin',
        symbol: 'tCTC',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.cc3-testnet.creditcoin.network'],
            webSocket: ['wss://rpc.cc3-testnet.creditcoin.network'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://creditcoin-testnet.blockscout.com',
        },
    },
    testnet: true,
} as const satisfies Chain;

// ─── Network → Chain map ────────────────────────────────────────────────────
// The first entry in the `chains` array passed to getDefaultConfig becomes
// the default chain Wagmi/RainbowKit uses for signing.
// By deriving this map from NetworkType we avoid any hardcoding in the config.

export const NETWORK_CHAIN_MAP: Record<NetworkType, Chain> = {
    creditcoin: creditcoinTestnet,     // ChainId 102031

    mantle: mantleSepoliaTestnet,   // ChainId 5003
    arbitrum: arbitrumSepolia,        // ChainId 421614
    stellar: arbitrumSepolia,        // Stellar uses its own signing, EVM fallback not used
};

// All unique chains we ever need to register so switching networks works.
export const ALL_SUPPORTED_CHAINS = [
    creditcoinTestnet,
    mantleSepoliaTestnet,
    arbitrumSepolia,
    sepolia,
] as const;
