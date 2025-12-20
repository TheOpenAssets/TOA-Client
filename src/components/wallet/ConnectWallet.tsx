// src/components/wallet/ConnectWallet.tsx

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';

interface ConnectWalletProps {
  onWalletConnected: (address: string) => void;
}

/**
 * ConnectWallet Component
 * Uses RainbowKit for wallet connection
 */
export const ConnectWallet = ({ onWalletConnected }: ConnectWalletProps) => {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      onWalletConnected(address);
    }
  }, [isConnected, address, onWalletConnected]);

  return (
    <div className="w-full">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-8 py-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="w-full inline-flex items-center justify-center rounded-lg bg-destructive px-8 py-6 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div className="flex gap-3">
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? 'Chain icon'}
                          src={chain.iconUrl}
                          className="h-4 w-4"
                        />
                      )}
                      {chain.name}
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
};
