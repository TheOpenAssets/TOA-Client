// src/stores/marketplace.store.ts

import { create } from 'zustand';
import type { MarketplaceListing, AssetDetails } from '../types/marketplace.types';
import { marketplaceService } from '../lib/api/marketplace.service';

interface MarketplaceState {
  listings: MarketplaceListing[];
  currentAsset: AssetDetails | null;
  isLoading: boolean;
  isLoadingAsset: boolean;
  error: string | null;
  fetchListings: () => Promise<void>;
  fetchAssetDetails: (assetId: string) => Promise<void>;
  clearCurrentAsset: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  listings: [],
  currentAsset: null,
  isLoading: false,
  isLoadingAsset: false,
  error: null,

  fetchListings: async () => {
    set({ isLoading: true, error: null });
    try {
      const listings = await marketplaceService.getListings();
      set({ listings, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAssetDetails: async (assetId: string) => {
    set({ isLoadingAsset: true, error: null });
    try {
      const asset = await marketplaceService.getListingById(assetId);
      set({ currentAsset: asset, isLoadingAsset: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingAsset: false });
    }
  },

  clearCurrentAsset: () => {
    set({ currentAsset: null });
  },
}));
