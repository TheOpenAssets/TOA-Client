// src/lib/blockchain/rainbowkit.config.ts
//
// ⚠️  IMPORTANT: In Wagmi v2 the config object MUST be created ONCE at module
// level and never recreated inside a React component.  Creating a new config
// (even via useMemo) breaks connector state and causes runtime errors like
// "connection.connector.getChainId is not a function".
//
// Strategy:
//  - Include ALL supported chains in one stable config.
//  - Put the DEFAULT_NETWORK chain first so Wagmi/RainbowKit treats it as the
//    signing default (first chain = default chain in Wagmi v2).
//  - NetworkLayout simply consumes this single exported constant.

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { NETWORK_CHAIN_MAP, ALL_SUPPORTED_CHAINS } from './chains.config';
import { DEFAULT_NETWORK } from '../network/network.config';
import type { Chain } from 'wagmi/chains';

// Put the default network's chain first; keep the rest in their defined order.
const defaultChain: Chain = NETWORK_CHAIN_MAP[DEFAULT_NETWORK];
const otherChains = (ALL_SUPPORTED_CHAINS as unknown as Chain[]).filter(
  (c) => c.id !== defaultChain.id,
);
const orderedChains = [defaultChain, ...otherChains] as [Chain, ...Chain[]];

/**
 * Single, stable Wagmi / RainbowKit configuration.
 * The first chain in `orderedChains` is driven by VITE_DEFAULT_NETWORK so
 * wallet signing always prompts on the correct network without any runtime
 * config recreation.
 */
export const rainbowKitConfig = getDefaultConfig({
  appName: 'Open Assets',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: orderedChains,
  ssr: false,
});
