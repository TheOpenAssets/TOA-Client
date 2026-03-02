// src/stores/auth.store.ts

import { create } from 'zustand';
import type { User } from '../types/auth.types';
import { getNetworkFromPath, SUPPORTED_NETWORKS } from '../lib/network/network.config';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authenticatedWalletAddress: string | null;

  // Actions
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  setAuthenticatedWallet: (address: string) => void;
}

/**
 * Auth Store - Global authentication state
 * Uses Zustand for state management
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authenticatedWalletAddress: (() => {
    const network = getNetworkFromPath();
    return localStorage.getItem(`${network}_authenticated_wallet_address`) || localStorage.getItem('authenticated_wallet_address');
  })(),

  setUser: (user: User) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  setAuthenticatedWallet: (address: string) => {
    const network = getNetworkFromPath();

    localStorage.setItem(`${network}_authenticated_wallet_address`, address.toLowerCase());
    localStorage.setItem('authenticated_wallet_address', address.toLowerCase()); // legacy fallback
    set({ authenticatedWalletAddress: address.toLowerCase() });
  },

  logout: () => {
    SUPPORTED_NETWORKS.forEach(n => {
      localStorage.removeItem(`${n}_access_token`);
      localStorage.removeItem(`${n}_refresh_token`);
      localStorage.removeItem(`${n}_authenticated_wallet_address`);
    });
    
    // legacy cleanup
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('authenticated_wallet_address');
    
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authenticatedWalletAddress: null,
    });
  },
}));
