// src/stores/auth.store.ts

import { create } from 'zustand';
import type { User } from '../types/auth.types';

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
  authenticatedWalletAddress: localStorage.getItem('authenticated_wallet_address'),

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
    localStorage.setItem('authenticated_wallet_address', address.toLowerCase());
    set({ authenticatedWalletAddress: address.toLowerCase() });
  },

  logout: () => {
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
