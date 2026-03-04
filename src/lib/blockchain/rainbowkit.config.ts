// src/lib/blockchain/rainbowkit.config.ts
//
// Returns a Wagmi/RainbowKit config whose FIRST chain always matches the
// currently active network.  Wagmi uses the first chain in the array as the
// signing default, so this guarantees the correct wallet prompt every time.

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { NETWORK_CHAIN_MAP, ALL_SUPPORTED_CHAINS } from './chains.config';
import { DEFAULT_NETWORK } from '../network/network.config';
import type { NetworkType } from '../network/network.config';
import type { Chain } from 'wagmi/chains';

/**
 * Build a RainbowKit / Wagmi config that places `networkType`'s chain first.
 * Wagmi treats the first chain as the default for signing — so the wallet
 * will always prompt on the correct network.
 */
export function buildRainbowKitConfig(networkType: NetworkType) {
  const defaultChain = NETWORK_CHAIN_MAP[networkType];

  // Put the active network's chain first, then all others (deduped).
  const rest = (ALL_SUPPORTED_CHAINS as unknown as Chain[]).filter(
    (c) => c.id !== defaultChain.id,
  );
  const orderedChains = [defaultChain, ...rest] as [Chain, ...Chain[]];

  return getDefaultConfig({
    appName: 'Open Assets',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: orderedChains,
    ssr: false,
  });
}

/**
 * Static config used as a safe default / fallback (e.g. at top-level providers
 * that render before NetworkLayout resolves the active network).
 * Always matches VITE_DEFAULT_NETWORK.
 */
export const rainbowKitConfig = buildRainbowKitConfig(DEFAULT_NETWORK);
