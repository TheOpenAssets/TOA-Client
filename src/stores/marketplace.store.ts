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
      const response = await marketplaceService.getListings();
      
      // Log the actual response structure for debugging
      console.log('Marketplace: API Response', response);
      
      // Handle the API response structure: { count: number, listings: array }
      let listings: MarketplaceListing[] = [];
      
      if (response && typeof response === 'object') {
        // Check if response has listings property (expected structure)
        if (Array.isArray(response.listings)) {
          listings = response.listings;
        } 
        // Fallback: if response itself is an array
        else if (Array.isArray(response)) {
          listings = response;
        }
        // Fallback: if response has a data property
        else if (Array.isArray(response.data)) {
          listings = response.data;
        }
      }
      
      console.log('Processed listings count:', listings.length, listings);
      set({ listings, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      set({ error: error.message, isLoading: false, listings: [] });
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
