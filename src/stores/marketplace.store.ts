// src/stores/marketplace.store.ts

import { create } from 'zustand';
import type {
  MarketplaceListing,
  AssetDetails,
  Auction,
  Bid,
} from '../types/marketplace.types';
import { marketplaceService } from '../lib/api/marketplace.service';

interface MarketplaceState {
  // Existing listing state
  listings: MarketplaceListing[];
  currentAsset: AssetDetails | null;
  isLoading: boolean;
  isLoadingAsset: boolean;
  error: string | null;

  // Auction state
  auctions: Auction[];
  currentAuction: Auction | null;
  userBids: Bid[];
  isLoadingAuctions: boolean;
  isLoadingBids: boolean;
  auctionError: string | null;

  // Existing actions
  fetchListings: () => Promise<void>;
  fetchAssetDetails: (assetId: string) => Promise<void>;
  clearCurrentAsset: () => void;

  // Auction actions
  fetchAuctions: (status?: string) => Promise<void>;
  fetchAuctionById: (auctionId: string) => Promise<void>;
  fetchUserBids: (address: string, auctionId?: string) => Promise<void>;
  clearAuctionError: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  // Existing listing state
  listings: [],
  currentAsset: null,
  isLoading: false,
  isLoadingAsset: false,
  error: null,

  // Auction state
  auctions: [],
  currentAuction: null,
  userBids: [],
  isLoadingAuctions: false,
  isLoadingBids: false,
  auctionError: null,

  // Existing actions
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
        if (Array.isArray(response)) {
          listings = response;
        }
        // Fallback: if response itself is an array
        else if (Array.isArray(response)) {
          listings = response;
        }
        // Fallback: if response has a data property
        else if (Array.isArray(response)) {
          listings = response;
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

  // Auction actions
  fetchAuctions: async (status?: string) => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      const auctions = await marketplaceService.getAuctions(status);
      console.log('Fetched auctions:', auctions.length);
      set({ auctions, isLoadingAuctions: false });
    } catch (error: any) {
      console.error('Error fetching auctions:', error);
      set({ auctionError: error.message, isLoadingAuctions: false, auctions: [] });
    }
  },

  fetchAuctionById: async (auctionId: string) => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      const auction = await marketplaceService.getAuctionById(auctionId);
      set({ currentAuction: auction, isLoadingAuctions: false });
    } catch (error: any) {
      console.error('Error fetching auction:', error);
      set({ auctionError: error.message, isLoadingAuctions: false });
    }
  },

  fetchUserBids: async (address: string, auctionId?: string) => {
    set({ isLoadingBids: true, auctionError: null });
    try {
      const bids = await marketplaceService.getUserBids(address, auctionId);
      console.log('Fetched user bids:', bids.length);
      set({ userBids: bids, isLoadingBids: false });
    } catch (error: any) {
      console.error('Error fetching user bids:', error);
      set({ auctionError: error.message, isLoadingBids: false, userBids: [] });
    }
  },

  clearAuctionError: () => {
    set({ auctionError: null });
  },
}));
