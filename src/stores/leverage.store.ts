import { create } from 'zustand';
import type { LeveragePosition, LeveragePositionDetails, LeverageQuote } from '../types/leverage.types';
import { leverageService } from '../lib/api/leverage.service';
import { parseUnits } from 'viem';

interface LeverageState {
  // State
  methPrice: number;
  positions: LeveragePosition[];
  positionDetails: LeveragePositionDetails[];
  activeQuote: LeverageQuote | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMethPrice: () => Promise<void>;
  fetchMyPositions: () => Promise<void>;
  fetchAssetPositions: (id: number) => Promise<void>;
  getQuote: (mETHAmount: string) => Promise<void>;
  clearQuote: () => void;
  createPosition: (params: {
    assetId: string;
    tokenAddress: string;
    tokenAmount: string;
    pricePerToken: string;
    mETHCollateral: string;
  }) => Promise<void>;
}

export const useLeverageStore = create<LeverageState>((set, get) => ({
  methPrice: 0,
  positions: [],
  positionDetails: [],
  activeQuote: null,
  isLoading: false,
  error: null,

  fetchMethPrice: async () => {
    try {
      const data = await leverageService.getMethPrice();
      set({ methPrice: parseFloat(data.price) });
    } catch (error: any) {
      console.error('Failed to fetch mETH price:', error);
      // set({ error: error.message }); // Optional: don't block UI on price fail
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

  getQuote: async (mETHAmount: string) => {
    if (!mETHAmount || parseFloat(mETHAmount) <= 0) {
      set({ activeQuote: null });
      return;
    }

    try {
      // Convert to WEI
      const weiAmount = parseUnits(mETHAmount, 18).toString();
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
