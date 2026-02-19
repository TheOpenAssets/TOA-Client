import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';

interface EvmWalletProviderProps {
    children: ReactNode;
}

/**
 * EvmWalletProvider - Wraps app with RainbowKit
 * Requires WagmiProvider to be present in parent tree
 */
export const EvmWalletProvider = ({ children }: EvmWalletProviderProps) => {
    return (
        <RainbowKitProvider>
            {children}
        </RainbowKitProvider>
    );
};
