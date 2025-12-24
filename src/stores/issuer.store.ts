// src/stores/issuer.store.ts
import { create } from 'zustand';
import type { User } from '../types/auth.types';

interface IssuerState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useIssuerStore = create<IssuerState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
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
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  logout: () => {
    // Clear tokens from localStorage or wherever they are stored
    localStorage.removeItem('issuer_access_token');
    localStorage.removeItem('issuer_refresh_token');
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));
