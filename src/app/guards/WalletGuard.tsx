// src/app/guards/WalletGuard.tsx
import React from 'react';

const WalletGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add wallet connection logic here
  const isWalletConnected = true; // Placeholder

  if (!isWalletConnected) {
    // Prompt to connect wallet
    return <div>Please connect your wallet</div>;
  }

  return <>{children}</>;
};

export default WalletGuard;
