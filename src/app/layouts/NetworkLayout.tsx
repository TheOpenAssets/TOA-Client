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
          // Note: StellarWalletProvider was just a QueryClientProvider wrapper, which is now hoisted.
          // We can skip it or keep it if it does other things. 
          // Checking file 453: it ONLY does QueryClientProvider. 
          // So we can remove it and just use StellarAuthProvider directly.
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
