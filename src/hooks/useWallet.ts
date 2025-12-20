// src/hooks/useWallet.ts
import { useWalletStore } from '../stores/wallet.store';

export const useWallet = () => {
  const { account, connectWallet, disconnectWallet } = useWalletStore();
  return { account, connectWallet, disconnectWallet };
};
