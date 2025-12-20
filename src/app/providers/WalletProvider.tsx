// src/app/providers/WalletProvider.tsx
import React, { createContext, useContext, useState } from 'react';

interface WalletContextType {
  account: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  return useContext(WalletContext);
};

const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = () => {
    // Logic to connect wallet
    setAccount('0x123...'); // Placeholder
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  const value = {
    account,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
