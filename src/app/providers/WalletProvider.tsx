// src/app/providers/WalletProvider.tsx

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rainbowKitConfig } from '../../lib/blockchain/rainbowkit.config';

// Create a single QueryClient instance with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface WalletProviderProps {
  children: React.ReactNode;
}

/**
 * WalletProvider - Wraps app with RainbowKit and Wagmi
 * Provides wallet connection functionality throughout the app
 */
export const WalletProvider = ({ children }: WalletProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={rainbowKitConfig}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
};
