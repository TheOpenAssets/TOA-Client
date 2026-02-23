import { create } from 'zustand';
import type { LeveragePosition, LeveragePositionDetails, LeverageQuote } from '../types/leverage.types';
import { leverageService } from '../lib/api/leverage.service';
import { parseUnits } from 'viem';

interface LeverageState {
  // State
  stARBPrice: number;
  positions: LeveragePosition[];
  positionDetails: LeveragePositionDetails[];
  activeQuote: LeverageQuote | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchstARBPrice: () => Promise<void>;
  fetchMyPositions: () => Promise<void>;
  fetchAssetPositions: (id: number) => Promise<void>;
  getQuote: (stARBAmount: string) => Promise<void>;
  clearQuote: () => void;
  createPosition: (params: {
    assetId: string;
    tokenAddress: string;
    tokenAmount: string;
    pricePerToken: string;
    stARBCollateral: string;
  }) => Promise<void>;
}

export const useLeverageStore = create<LeverageState>((set, get) => ({
  stARBPrice: 0,
  positions: [],
  positionDetails: [],
  activeQuote: null,
  isLoading: false,
  error: null,

  fetchstARBPrice: async () => {
    try {
      const data = await leverageService.getstARBPrice();
      // Use priceUSD (human-readable) instead of price (raw 6-decimal USDC)
      const priceVal = data.priceUSD ?? parseFloat(data.price) / 1e6;
      if (!isNaN(priceVal) && priceVal > 0) {
        set({ stARBPrice: priceVal });
      }
    } catch (error: any) {
      console.error('Failed to fetch stARB price:', error);
    }
  },

  fetchMyPositions: async () => {
    set({ isLoading: true, error: null });
    try {
      const positions = await leverageService.getMyPositions();
      set({ positions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

   fetchAssetPositions: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const positionDetails = await leverageService.getPositionDetails(id);
      set({ positionDetails: [positionDetails], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  getQuote: async (stARBAmount: string) => {
    if (!stARBAmount || parseFloat(stARBAmount) <= 0) {
      set({ activeQuote: null });
      return;
    }

    try {
      // Convert to WEI
      const weiAmount = parseUnits(stARBAmount, 18).toString();
      const quote = await leverageService.getQuote(weiAmount);
      set({ activeQuote: quote, error: null });
    } catch (error: any) {
      console.error('Failed to get quote:', error);
      set({ activeQuote: null }); // Clear quote on error
    }
  },

  clearQuote: () => set({ activeQuote: null }),

  createPosition: async (params) => {
    set({ isLoading: true, error: null });
    try {
      await leverageService.initiatePosition(params);
      await get().fetchMyPositions(); // Refresh list
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error; // Re-throw so UI can handle it (e.g. show toast)
    }
  }
}));
