// src/stores/portfolio.store.ts
import { create } from 'zustand';
import { portfolioService, type PortfolioResponse } from '../lib/api/portfolio.service';

interface PortfolioState {
  portfolio: PortfolioResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchPortfolio: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolio: null,
  isLoading: false,
  error: null,
  
  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const portfolio = await portfolioService.getPortfolio();
      set({ portfolio, isLoading: false });
    } catch (error: any) {
      console.error('Portfolio store error:', error);
      set({ error: error.message, isLoading: false, portfolio: null });
    }
  },
}));
