// src/app/layouts/NetworkLayout.tsx
//
// ⚠️  WagmiProvider MUST receive a stable config reference — never recreate it
//     inside a component (useMemo or otherwise) as that breaks connector state
//     in Wagmi v2 ("getChainId is not a function").
//     The correct chain order (default network first) is baked into the
//     module-level `rainbowKitConfig` in rainbowkit.config.ts.

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useNetwork } from '../../lib/network/NetworkContext';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { rainbowKitConfig } from '../../lib/blockchain/rainbowkit.config';
import { queryClient } from '../../lib/api/queryClient';
import { EvmWalletProvider } from '../providers/EvmWalletProvider';
import { WalletIntegrityProvider } from '../providers/WalletIntegrityProvider';
import { EvmAuthProvider } from '../../components/auth/EvmAuthProvider';
import { StellarAuthProvider } from '../../components/auth/StellarAuthProvider';

export const NetworkLayout: React.FC = () => {
  const { network } = useNetwork();

  console.log('🏗️ NetworkLayout mounting for network:', network.type);

  return (
    <WagmiProvider config={rainbowKitConfig}>
      <QueryClientProvider client={queryClient}>
        {network.walletType === 'stellar' ? (
          // Stellar Branch
          <StellarAuthProvider>
            <Outlet />
          </StellarAuthProvider>
        ) : (
          // EVM Branch
          <EvmWalletProvider>
            <WalletIntegrityProvider>
              <EvmAuthProvider>
                <Outlet />
              </EvmAuthProvider>
            </WalletIntegrityProvider>
          </EvmWalletProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
