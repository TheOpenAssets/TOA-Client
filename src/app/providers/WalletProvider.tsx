// src/app/providers/WalletProvider.tsx

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rainbowKitConfig } from '../../lib/blockchain/rainbowkit.config';

const queryClient = new QueryClient();

interface WalletProviderProps {
  children: React.ReactNode;
}

/**
 * WalletProvider - Wraps app with RainbowKit and Wagmi
 * Provides wallet connection functionality throughout the app
 */
export const WalletProvider = ({ children }: WalletProviderProps) => {
  return (
    <WagmiProvider config={rainbowKitConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
