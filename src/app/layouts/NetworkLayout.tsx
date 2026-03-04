import React from 'react';
import { Outlet } from 'react-router-dom';
import { useNetwork } from '../../lib/network/NetworkContext';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { buildRainbowKitConfig } from '../../lib/blockchain/rainbowkit.config';
import { queryClient } from '../../lib/api/queryClient';
import { EvmWalletProvider } from '../providers/EvmWalletProvider';
import { WalletIntegrityProvider } from '../providers/WalletIntegrityProvider';
import { EvmAuthProvider } from '../../components/auth/EvmAuthProvider';
import { StellarAuthProvider } from '../../components/auth/StellarAuthProvider';
import type { NetworkType } from '../../lib/network/network.config';
import { useMemo } from 'react';

export const NetworkLayout: React.FC = () => {
  const { network } = useNetwork();

  console.log('🏗️ NetworkLayout mounting for network:', network.type);

  // Build a Wagmi config whose first chain matches the active network.
  // Memoised on network.type so it only rebuilds when the network changes.
  const wagmiConfig = useMemo(
    () => buildRainbowKitConfig(network.type as NetworkType),
    [network.type],
  );

  return (
    <WagmiProvider config={wagmiConfig}>
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

