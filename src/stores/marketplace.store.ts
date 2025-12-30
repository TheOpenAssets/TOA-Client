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
  auctions: Auction[]; // AUCTION_LIVE only
  scheduledAuctions: Auction[]; // AUCTION_SCHEDULED only
  auctionResults: Auction[]; // AUCTION_RESULTS_DECLARED only
  currentAuction: Auction | null;
  userBids: Bid[];
  isLoadingAuctions: boolean;
  isLoadingBids: boolean;
  auctionError: string | null;

  // Marketplace Info (Platform Metrics)
  marketplaceInfo: {
    totalAssets: number;
    activeUsers: number;
    totalSettlements: number;
    totalValueTokenized: number;
  } | null;
  isLoadingInfo: boolean;

  // Top Grossing/Trending Assets
  trendingAssets: any[];
  isLoadingTrending: boolean;

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

  // New actions for marketplace info and trending assets
  fetchMarketplaceInfo: () => Promise<void>;
  fetchTrendingAssets: (limit?: number) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  // Existing listing state
  listings: [],
  currentAsset: null,
  isLoading: false,
  isLoadingAsset: false,
  error: null,

  // Auction state
  auctions: [], // AUCTION_LIVE only
  scheduledAuctions: [], // AUCTION_SCHEDULED only
  auctionResults: [], // AUCTION_RESULTS_DECLARED only
  currentAuction: null,
  userBids: [],
  isLoadingAuctions: false,
  isLoadingBids: false,
  auctionError: null,

  // Marketplace Info state
  marketplaceInfo: null,
  isLoadingInfo: false,

  // Trending Assets state
  trendingAssets: [],
  isLoadingTrending: false,

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

  // Auction actions - Fetch and filter AUCTION_LIVE and AUCTION_SCHEDULED
  fetchActiveAuctions: async () => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      // Step 1: Get ALL announcements (backend returns all types)
      const allAnnouncements = await marketplaceService.getAuctionAnnouncements('AUCTION_LIVE', 'ACTIVE');

      console.log('📊 Fetched all announcements:', allAnnouncements.length);

      // Step 2: Group announcements by assetId and get the latest one per asset
      const assetAnnouncementsMap = new Map<string, any>();

      allAnnouncements.forEach((announcement: any) => {
        const assetId = announcement.assetId;
        const existingAnnouncement = assetAnnouncementsMap.get(assetId);

        if (!existingAnnouncement) {
          assetAnnouncementsMap.set(assetId, announcement);
        } else {
          // Compare dates and keep the latest announcement
          const existingDate = new Date(existingAnnouncement.updatedAt || existingAnnouncement.createdAt);
          const currentDate = new Date(announcement.updatedAt || announcement.createdAt);

          if (currentDate > existingDate) {
            assetAnnouncementsMap.set(assetId, announcement);
          }
        }
      });

      // Step 3: Filter out assets with AUCTION_ENDED as latest status
      const latestAnnouncements = Array.from(assetAnnouncementsMap.values()).filter(
        (announcement: any) => announcement.type !== 'AUCTION_ENDED'
      );

      // Step 4: Separate into LIVE, SCHEDULED, and RESULTS based on latest announcement type
      const liveAnnouncements = latestAnnouncements.filter((a: any) => a.type === 'AUCTION_LIVE');
      const scheduledAnnouncements = latestAnnouncements.filter((a: any) => a.type === 'AUCTION_SCHEDULED');
      const resultsAnnouncements = latestAnnouncements.filter((a: any) => a.type === 'AUCTION_RESULTS_DECLARED');
      const endedCount = assetAnnouncementsMap.size - latestAnnouncements.length;

      console.log('🔨 AUCTION_LIVE count (latest status):', liveAnnouncements.length);
      console.log('📅 AUCTION_SCHEDULED count (latest status):', scheduledAnnouncements.length);
      console.log('🎯 AUCTION_RESULTS_DECLARED count (latest status):', resultsAnnouncements.length);
      console.log('❌ AUCTION_ENDED excluded (latest status):', endedCount);

      // Step 5: Process AUCTION_LIVE announcements
      const liveAuctionPromises = liveAnnouncements.map(async (announcement: any) => {
        try {
          console.log(`📡 Fetching LIVE auction: ${announcement.assetId}`);

          // Get asset details from marketplace endpoint
          const asset = await marketplaceService.getListingById(announcement.assetId);

          // Parse totalSupply from announcement metadata (already in wei 18 decimals)
          const totalSupplyWei = BigInt(announcement.metadata?.totalSupply || '0');
          const totalSupply = Number(totalSupplyWei) / 1e18;

          // Parse reserve price from announcement metadata (USDC 6 decimals)
          const reservePriceWei = BigInt(announcement.metadata?.priceRange?.min || '0');
          const reservePrice = Number(reservePriceWei) / 1e6;

          const auction = {
            auctionId: announcement.assetId,
            assetId: announcement.assetId,
            totalSupply,
            reservePrice,
            clearingPrice: undefined,
            status: 'BIDDING' as const,
            startTime: announcement.metadata?.auctionStartTime || announcement.createdAt,
            endTime: announcement.metadata?.auctionEndTime || '',
            totalBids: 0,
            totalDemand: 0,
            metadata: {
              ...asset.metadata,
              invoiceNumber: announcement.metadata?.invoiceNumber,
              industry: announcement.metadata?.industry,
              riskTier: announcement.metadata?.riskTier,
              faceValue: announcement.metadata?.faceValue,
            },
          };

          return auction;
        } catch (error) {
          console.error(`❌ Error fetching live auction ${announcement.assetId}:`, error);
          return null;
        }
      });

      // Step 6: Process AUCTION_SCHEDULED announcements
      const scheduledAuctionPromises = scheduledAnnouncements.map(async (announcement: any) => {
        try {
          console.log(`📡 Fetching SCHEDULED auction: ${announcement.assetId}`);

          // Get asset details from marketplace endpoint
          const asset = await marketplaceService.getListingById(announcement.assetId);

          // Parse totalSupply from announcement metadata
          const totalSupplyWei = BigInt(announcement.metadata?.totalSupply || '0');
          const totalSupply = Number(totalSupplyWei) / 1e18;

          // Parse reserve price from announcement metadata
          const reservePriceWei = BigInt(announcement.metadata?.priceRange?.min || '0');
          const reservePrice = Number(reservePriceWei) / 1e6;

          const auction = {
            auctionId: announcement.assetId,
            assetId: announcement.assetId,
            totalSupply,
            reservePrice,
            clearingPrice: undefined,
            status: 'SCHEDULED' as const,
            startTime: announcement.metadata?.auctionStartTime || announcement.createdAt,
            endTime: announcement.metadata?.auctionEndTime || '',
            totalBids: 0,
            totalDemand: 0,
            metadata: {
              ...asset.metadata,
              invoiceNumber: announcement.metadata?.invoiceNumber,
              industry: announcement.metadata?.industry,
              riskTier: announcement.metadata?.riskTier,
              faceValue: announcement.metadata?.faceValue,
            },
          };

          return auction;
        } catch (error) {
          console.error(`❌ Error fetching scheduled auction ${announcement.assetId}:`, error);
          return null;
        }
      });

      // Step 6.5: Process AUCTION_RESULTS_DECLARED announcements
      const resultsAuctionPromises = resultsAnnouncements.map(async (announcement: any) => {
        try {
          console.log(`📡 Fetching RESULTS auction: ${announcement.assetId}`);

          // Get asset details from marketplace endpoint
          const asset = await marketplaceService.getListingById(announcement.assetId);

          // Parse totalSupply from announcement metadata
          const totalSupplyWei = BigInt(announcement.metadata?.totalSupply || '0');
          const totalSupply = Number(totalSupplyWei) / 1e18;

          // Parse tokens sold and remaining from announcement metadata
          const tokensSoldWei = BigInt(announcement.metadata?.tokensSold || '0');
          const tokensSold = Number(tokensSoldWei) / 1e18;

          const tokensRemainingWei = BigInt(announcement.metadata?.tokensRemaining || '0');
          const tokensRemaining = Number(tokensRemainingWei) / 1e18;

          // Parse clearing price from announcement metadata (USDC 6 decimals)
          const clearingPriceWei = BigInt(announcement.metadata?.clearingPrice || '0');
          const clearingPrice = Number(clearingPriceWei) / 1e6;

          const auction = {
            auctionId: announcement.assetId,
            assetId: announcement.assetId,
            totalSupply,
            reservePrice: clearingPrice, // Use clearing price as display price
            clearingPrice,
            tokensSold,
            tokensRemaining,
            status: 'ENDED' as const,
            startTime: announcement.metadata?.auctionStartTime || announcement.createdAt,
            endTime: announcement.metadata?.auctionEndTime || announcement.createdAt,
            totalBids: 0,
            totalDemand: 0,
            metadata: {
              ...asset.metadata,
              invoiceNumber: announcement.metadata?.invoiceNumber,
              industry: announcement.metadata?.industry,
              riskTier: announcement.metadata?.riskTier,
              faceValue: announcement.metadata?.faceValue,
            },
          };

          return auction;
        } catch (error) {
          console.error(`❌ Error fetching results auction ${announcement.assetId}:`, error);
          return null;
        }
      });

      // Step 7: Wait for all promises and filter out nulls
      const liveAuctions = (await Promise.all(liveAuctionPromises)).filter((a) => a !== null);
      const scheduledAuctions = (await Promise.all(scheduledAuctionPromises)).filter((a) => a !== null);
      const resultsAuctions = (await Promise.all(resultsAuctionPromises)).filter((a) => a !== null);

      console.log('✅ Fetched LIVE auctions:', liveAuctions.length);
      console.log('✅ Fetched SCHEDULED auctions:', scheduledAuctions.length);
      console.log('✅ Fetched RESULTS auctions:', resultsAuctions.length);

      set({
        auctions: liveAuctions,
        scheduledAuctions: scheduledAuctions,
        auctionResults: resultsAuctions,
        isLoadingAuctions: false
      });
    } catch (error: any) {
      console.error('Error fetching auctions:', error);
      set({ auctionError: error.message, isLoadingAuctions: false, auctions: [], scheduledAuctions: [], auctionResults: [] });
    }
  },

  fetchEndedAuctions: async () => {
    set({ isLoadingAuctions: true, auctionError: null });
    try {
      // Get AUCTION_ENDED announcements
      const announcements = await marketplaceService.getAuctionAnnouncements('AUCTION_LIVE', 'ACTIVE');
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
            endTime: asset.listing?.scheduledEndTime || '',
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
        endTime: asset.listing?.scheduledEndTime || '',
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

  // Fetch marketplace info (Platform Metrics)
  fetchMarketplaceInfo: async () => {
    set({ isLoadingInfo: true });
    try {
      const info = await marketplaceService.getMarketplaceInfo();
      console.log('✅ Fetched marketplace info:', info);
      set({ marketplaceInfo: info, isLoadingInfo: false });
    } catch (error: any) {
      console.error('❌ Error fetching marketplace info:', error);
      set({ isLoadingInfo: false });
    }
  },

  // Fetch trending/top grossing assets
  fetchTrendingAssets: async (limit: number = 3) => {
    set({ isLoadingTrending: true });
    try {
      const assets = await marketplaceService.getTopGrossingAssets(limit);
      console.log('✅ Fetched trending assets:', assets);
      set({ trendingAssets: assets, isLoadingTrending: false });
    } catch (error: any) {
      console.error('❌ Error fetching trending assets:', error);
      set({ isLoadingTrending: false, trendingAssets: [] });
    }
  },
}));
