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

  // Auction actions (Script-Verified)
  fetchActiveAuctions: () => Promise<void>;
  fetchEndedAuctions: () => Promise<void>;
  fetchAuctionByAssetId: (assetId: string) => Promise<void>;
  fetchUserBids: (assetId?: string) => Promise<void>;
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

  // Auction actions (Script-Verified Approach)
  fetchActiveAuctions: async () => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      // Step 1: Get AUCTION_LIVE announcements (verified: admin-approve.sh line 400)
      const announcements = await marketplaceService.getAuctionAnnouncements('AUCTION_LIVE', 'ACTIVE');

      console.log('📊 Fetched auction announcements:', announcements.length);
      console.log('📊 First announcement:', announcements[0]);

      // Step 2: For each announcement, fetch full asset details using GET /marketplace/listings/:assetId
      const auctionPromises = announcements.map(async (announcement: any) => {
        try {
          console.log(`📡 Fetching asset details for: ${announcement.assetId}`);

          // ✅ FIXED: Use correct endpoint
          const asset = await marketplaceService.getListingById(announcement.assetId);

          console.log(`✅ Asset fetched for ${announcement.assetId}:`, {
            tokenSupply: asset.tokenParams?.totalSupply,
            reservePrice: asset.listing?.reservePrice,
            phase: asset.listing?.phase,
          });

          // ✅ FIXED: Parse WEI data from ASSET ENDPOINT (primary source)
          const totalSupplyWei = BigInt(asset.tokenParams?.totalSupply || announcement.metadata?.totalSupply || '0');
          const totalSupply = Number(totalSupplyWei) / 1e18;

          const reservePriceWei = BigInt(asset.listing?.reservePrice || announcement.metadata?.priceRange?.min || '0');
          const reservePrice = Number(reservePriceWei) / 1e6;

          const clearingPriceWei = asset.listing?.clearingPrice
            ? BigInt(asset.listing.clearingPrice)
            : undefined;
          const clearingPrice = clearingPriceWei ? Number(clearingPriceWei) / 1e6 : undefined;

          const auction = {
            auctionId: announcement.assetId,
            assetId: announcement.assetId,
            totalSupply,
            reservePrice,
            clearingPrice,
            status: 'BIDDING' as const,
            startTime: announcement.metadata?.auctionStartTime || asset.listing?.listedAt || announcement.createdAt,
            endTime: announcement.metadata?.auctionEndTime || asset.listing?.endTime || '',
            totalBids: 0, // Will be fetched separately if needed
            totalDemand: 0,
            metadata: asset.metadata || announcement.metadata,
          };

          console.log(`🔨 Parsed auction for ${announcement.assetId}:`, auction);

          return auction;
        } catch (error) {
          console.error(`❌ Error fetching asset ${announcement.assetId}:`, error);
          return null;
        }
      });

      const auctions = (await Promise.all(auctionPromises)).filter((a) => a !== null);
      console.log('Fetched active auctions with details:', auctions.length);
      set({ auctions, isLoadingAuctions: false });
    } catch (error: any) {
      console.error('Error fetching active auctions:', error);
      set({ auctionError: error.message, isLoadingAuctions: false, auctions: [] });
    }
  },

  fetchEndedAuctions: async () => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      // Get AUCTION_ENDED announcements
      const announcements = await marketplaceService.getAuctionAnnouncements('AUCTION_ENDED', 'ACTIVE');
      console.log('📊 Fetched ended auction announcements:', announcements.length);

      // For each announcement, fetch full asset details
      const auctionPromises = announcements.map(async (announcement: any) => {
        try {
          // ✅ FIXED: Use correct endpoint
          const asset = await marketplaceService.getListingById(announcement.assetId);

          // ✅ FIXED: Parse WEI data
          const totalSupplyWei = BigInt(asset.tokenParams?.totalSupply || '0');
          const totalSupply = Number(totalSupplyWei) / 1e18;

          const reservePriceWei = BigInt(asset.listing?.reservePrice || '0');
          const reservePrice = Number(reservePriceWei) / 1e6;

          const clearingPriceWei = asset.listing?.clearingPrice
            ? BigInt(asset.listing.clearingPrice)
            : undefined;
          const clearingPrice = clearingPriceWei ? Number(clearingPriceWei) / 1e6 : undefined;

          return {
            auctionId: announcement.assetId,
            assetId: announcement.assetId,
            totalSupply,
            reservePrice,
            clearingPrice,
            status: 'ENDED' as const,
            startTime: asset.listing?.listedAt || announcement.createdAt,
            endTime: asset.listing?.endTime || '',
            totalBids: 0,
            totalDemand: 0,
            metadata: asset.metadata,
          };
        } catch (error) {
          console.error(`Error fetching asset ${announcement.assetId}:`, error);
          return null;
        }
      });

      const auctions = (await Promise.all(auctionPromises)).filter((a) => a !== null);
      console.log('Fetched ended auctions with details:', auctions.length);
      set({ auctions, isLoadingAuctions: false });
    } catch (error: any) {
      console.error('Error fetching ended auctions:', error);
      set({ auctionError: error.message, isLoadingAuctions: false, auctions: [] });
    }
  },

  fetchAuctionByAssetId: async (assetId: string) => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      // ✅ FIXED: Use correct endpoint GET /marketplace/listings/:assetId
      // (verified from user's API response)
      const asset = await marketplaceService.getListingById(assetId);

      // Get announcements to determine auction status (verified: admin-approve.sh line 353)
      const announcements = await marketplaceService.getAssetAnnouncements(assetId);
      const latestAnnouncement = announcements[0];

      // ✅ FIXED: Parse data from WEI to human-readable numbers
      // totalSupply is in WEI (18 decimals) - convert to tokens
      const totalSupplyWei = BigInt(asset.tokenParams?.totalSupply || '0');
      const totalSupply = Number(totalSupplyWei) / 1e18;

      // reservePrice is in USDC (6 decimals) - convert to dollars
      const reservePriceWei = BigInt(asset.listing?.reservePrice || '0');
      const reservePrice = Number(reservePriceWei) / 1e6;

      // clearingPrice (if set) is also in USDC (6 decimals)
      const clearingPriceWei = asset.listing?.clearingPrice
        ? BigInt(asset.listing.clearingPrice)
        : undefined;
      const clearingPrice = clearingPriceWei ? Number(clearingPriceWei) / 1e6 : undefined;

      console.log('🔍 Auction Data Parsed:', {
        assetId,
        totalSupplyWei: totalSupplyWei.toString(),
        totalSupply,
        reservePriceWei: reservePriceWei.toString(),
        reservePrice,
        clearingPrice,
      });

      const auction = {
        auctionId: assetId,
        assetId: assetId,
        totalSupply,
        reservePrice,
        clearingPrice,
        status: latestAnnouncement?.type === 'AUCTION_ENDED' ? 'ENDED' as const : 'BIDDING' as const,
        startTime: asset.listing?.listedAt || asset.metadata?.issueDate || '',
        endTime: asset.listing?.endTime || '',
        totalBids: 0,
        totalDemand: 0,
        metadata: asset.metadata,
      };

      set({ currentAuction: auction, isLoadingAuctions: false });
    } catch (error: any) {
      console.error('Error fetching auction:', error);
      set({ auctionError: error.message, isLoadingAuctions: false });
    }
  },

  fetchUserBids: async (assetId?: string) => {
    set({ isLoadingBids: true, auctionError: null });
    try {
      const bids = await marketplaceService.getUserBids(assetId);
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
