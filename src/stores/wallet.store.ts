// src/stores/wallet.store.ts
import { create } from 'zustand';

interface WalletState {
  account: string | null;
  connectWallet: (account: string) => void;
  disconnectWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  account: null,
  connectWallet: (account) => set({ account }),
  disconnectWallet: () => set({ account: null }),
}));
