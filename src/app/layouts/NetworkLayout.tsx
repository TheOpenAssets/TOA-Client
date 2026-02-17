import React from 'react';
import { Outlet } from 'react-router-dom';
import { useNetwork } from '../../lib/network/NetworkContext';
import { WalletProvider } from '../providers/WalletProvider';
import { WalletIntegrityProvider } from '../providers/WalletIntegrityProvider';
import { StellarWalletProvider } from '../providers/StellarWalletProvider';
import { EvmAuthProvider } from '../../components/auth/EvmAuthProvider';
import { StellarAuthProvider } from '../../components/auth/StellarAuthProvider';

export const NetworkLayout: React.FC = () => {
  const { networkType } = useNetwork();

  console.log('🏗️ NetworkLayout mounting for network:', networkType);

  if (networkType === 'stellar') {
    return (
      <StellarWalletProvider>
        <StellarAuthProvider>
          <Outlet />
        </StellarAuthProvider>
      </StellarWalletProvider>
    );
  }

  return (
    <WalletProvider>
      <WalletIntegrityProvider>
        <EvmAuthProvider>
          <Outlet />
        </EvmAuthProvider>
      </WalletIntegrityProvider>
    </WalletProvider>
  );
};
