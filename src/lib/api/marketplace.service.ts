// src/lib/api/marketplace.service.ts
import type {
  ListingResponse,
  AssetDetailsResponse,
  MarketplaceListing,
  AssetDetails,
  NotifyPurchasePayload,
  Bid,
  UserBidsResponse,
  SubmitBidPayload,
  TrendingAsset,
  PurchaseHistoryResponse,
} from '@/types/marketplace.types';
import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

/**
 * Marketplace Service - Handles marketplace-related API calls
 *
 * Endpoints:
 * - GET /marketplace/listings - Get all asset listings
 * - GET /marketplace/listings/:assetId - Get specific asset details
 */
class MarketplaceService extends BaseService {

  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get all marketplace listings
   *
   * ENDPOINT: GET /marketplace/listings
   *
   * BACKEND RESPONSE:
   * {
   *   success: boolean,
   *   count: number,
   *   listings: MarketplaceListing[]
   * }
   */
  async getListings(): Promise<MarketplaceListing[]> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/listings`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch marketplace listings');
      }

      const data: ListingResponse = await response.json();
      return data.listings;
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      throw error;
    }
  }

  /**
   * Get asset details by ID
   *
   * ENDPOINT: GET /marketplace/listings/:assetId
   *
   * BACKEND RESPONSE:
   * {
   *   success: boolean,
   *   asset: AssetDetails
   * }
   */
  async getListingById(assetId: string): Promise<AssetDetails> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/listings/${assetId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch asset with ID: ${assetId}`);
      }

      const data: AssetDetailsResponse = await response.json();
      return data.asset;
    } catch (error) {
      console.error(`Error fetching asset with ID ${assetId}:`, error);
      throw error;
    }
  }

  async notifyPurchase(payload: NotifyPurchasePayload): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/purchases/notify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify purchase');
      }

      return await response.json();
    } catch (error) {
      console.error('Error notifying purchase:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUCTION ENDPOINTS (100% Script-Verified from admin-approve.sh & investor-bidding.sh)
  // ============================================================================

  /**
   * Get auction announcements (SCRIPT-VERIFIED)
   *
   * ENDPOINT: GET /announcements?type=X&status=Y
   * VERIFIED: admin-approve.sh line 400
   *
   * Types:
   * - AUCTION_LIVE: Active auctions currently accepting bids
   * - AUCTION_ENDED: Auctions that have ended, awaiting settlement
   * - AUCTION_FAILED: Auctions that failed to activate
   *
   * Status: ACTIVE, INACTIVE
   *
   * Returns announcements, then use GET /assets/:assetId for full details
   *
   * Used by:
   * - Marketplace page to display active auctions
   * - Admin dashboard to view all auctions
   */
  async getAuctionAnnouncements(_type: 'AUCTION_LIVE'  = 'AUCTION_LIVE', _status: 'ACTIVE'  = 'ACTIVE'): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/announcements`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch auction announcements');
      }

      const data = await response.json();

      // ✅ FIXED: API returns { announcements: [...], pagination: {...} }
      console.log('📡 Announcements API Response:', data);

      if (data.announcements && Array.isArray(data.announcements)) {
        return data.announcements;
      }

      // Fallback for direct array response
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching auction announcements:', error);
      throw error;
    }
  }

  /**
   * Get announcements for a specific asset (SCRIPT-VERIFIED)
   *
   * ENDPOINT: GET /announcements/asset/:assetId
   * VERIFIED: admin-approve.sh line 353
   *
   * Returns all announcements (AUCTION_LIVE, AUCTION_ENDED, etc.) for an asset
   *
   * Used by:
   * - Auction detail page to show auction status
   * - Admin to verify auction activation
   */
  async getAssetAnnouncements(assetId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/announcements/asset/${assetId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch asset announcements');
      }

      const data = await response.json();

      // ✅ FIXED: Handle both response formats
      console.log('📡 Asset Announcements API Response:', data);

      if (data.announcements && Array.isArray(data.announcements)) {
        return data.announcements;
      }

      // Fallback for direct array response
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching asset announcements:', error);
      throw error;
    }
  }

  /**
   * Get asset details by ID (SCRIPT-VERIFIED)
   *
   * ENDPOINT: GET /assets/:assetId
   * VERIFIED: admin-approve.sh line 168
   *
   * Returns complete asset details including:
   * - metadata (industry, riskTier, faceValue, etc.)
   * - token (address, totalSupply)
   * - listing information (reservePrice, endTime, clearingPrice, auctionPhase)
   * - checkpoints (uploaded, attested, registered, tokenized)
   *
   * This is the PRIMARY endpoint for getting auction details
   *
   * Used by:
   * - Auction detail page to show full auction info
   * - After fetching announcements, to get complete auction data
   */
  async getAssetById(assetId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/assets/${assetId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch asset: ${assetId}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * End an auction (Admin only)
   *
   * ENDPOINT: POST /admin/compliance/end-auction (VERIFIED from admin-endauction.sh line 260)
   * REF: admin-endauction.sh Step 3
   *
   * Payload: { assetId, clearingPrice (in wei), transactionHash }
   *
   * Used by:
   * - Admin dashboard to end auctions and set clearing price
   */
  async endAuction(assetId: string, clearingPrice: string, transactionHash: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/admin/compliance/end-auction`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          assetId,
          clearingPrice, // in wei (6 decimals for USDC)
          transactionHash,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to end auction');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error ending auction ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's bids (optionally filtered by auction)
   *
   * ENDPOINT: GET /marketplace/bids/my-bids?assetId=:assetId (VERIFIED from investor-bidding.sh line 395)
   * REF: investor-bidding.sh Step 5
   *
   * Used by:
   * - Portfolio page to show "My Bids" section
   */
  async getUserBids(assetId?: string): Promise<Bid[]> {
    try {
      const queryParams = assetId ? `?assetId=${assetId}` : '';
      const response = await fetch(`${this.baseURL}/marketplace/bids/my-bids${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch user bids');
      }

      const data: UserBidsResponse = await response.json();
      return data.bids;
    } catch (error) {
      console.error('Error fetching user bids:', error);
      throw error;
    }
  }

  /**
   * Get all bids for an auction (Admin + Investor)
   *
   * ENDPOINT: GET /marketplace/auctions/:assetId/bids (VERIFIED from investor-bidding.sh line 403)
   * REF: investor-bidding.sh Step 5, admin-endauction.sh line 282
   *
   * Returns: { bids: Bid[], pricePoints: PricePoint[] }
   *
   * Used by:
   * - Admin dashboard to view auction results
   * - Investor to see auction bid distribution
   */
  async getAuctionBids(assetId: string): Promise<{ bids: Bid[]; pricePoints?: any[] }> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/auctions/${assetId}/bids`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch auction bids');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching bids for auction ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Notify backend after placing bid on-chain
   *
   * ENDPOINT: POST /marketplace/bids/notify (VERIFIED from investor-bidding.sh line 362)
   * REF: investor-bidding.sh Step 4
   *
   * Payload: { txHash, assetId, tokenAmount (wei), price (wei) }
   *
   * Called AFTER successful on-chain bid submission
   */
  async notifyBidPlaced(payload: {
    txHash: string;
    assetId: string;
    tokenAmount: string;
    price: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/bids/notify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify bid placement');
      }

      return await response.json();
    } catch (error) {
      console.error('Error notifying bid placement:', error);
      throw error;
    }
  }

  /**
   * Notify backend after settling bid on-chain
   *
   * ENDPOINT: POST /marketplace/bids/settle-notify (VERIFIED from investor-settle.sh line 264)
   * REF: investor-settle.sh Step 3
   *
   * Payload: { assetId, bidIndex, txHash, blockNumber }
   *
   * Called AFTER successful on-chain bid settlement
   */
  async notifyBidSettled(payload: {
    assetId: string;
    bidIndex: number;
    txHash: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/bids/settle-notify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to notify bid settlement');
      }

      return await response.json();
    } catch (error) {
      console.error('Error notifying bid settlement:', error);
      throw error;
    }
  }

  /**
   * Submit a bid on-chain (User)
   *
   * NOTE: This is a frontend-to-contract call - NOT a backend API
   * Contract: PrimaryMarketplace.submitBid(assetIdBytes32, tokenAmountWei, priceWei)
   * REF: investor-bidding.sh lines 297-302
   *
   * Steps:
   * 1. Approve USDC (lines 288-293)
   * 2. Call submitBid() on contract (line 297)
   * 3. Wait for confirmation
   * 4. Call notifyBidPlaced() to update backend
   */
  async submitBid(payload: SubmitBidPayload): Promise<any> {
    // TODO: Implement actual contract call using blockchain service
    // This is a placeholder - actual implementation should:
    // 1. Convert assetId to bytes32
    // 2. Approve USDC
    // 3. Call contract.submitBid()
    // 4. Call notifyBidPlaced()
    console.log('[PLACEHOLDER] Submit bid to contract:', payload);
    return Promise.resolve({ success: true, message: 'Bid submitted (placeholder)' });
  }

  /**
   * Settle/Claim bid on-chain (User)
   *
   * NOTE: This is a frontend-to-contract call - NOT a backend API
   * Contract: PrimaryMarketplace.settleBid(assetIdBytes32, bidIndex)
   * REF: investor-settle.sh lines 192
   *
   * Steps:
   * 1. Call settleBid() on contract (line 192)
   * 2. Wait for confirmation
   * 3. Call notifyBidSettled() to update backend
   */
  async settleBid(auctionId: string, bidIndex: number): Promise<any> {
    // TODO: Implement actual contract call using blockchain service
    // This is a placeholder - actual implementation should:
    // 1. Convert assetId to bytes32
    // 2. Call contract.settleBid()
    // 3. Call notifyBidSettled()
    console.log('[PLACEHOLDER] Settle bid on contract:', { auctionId, bidIndex });
    return Promise.resolve({ success: true, message: 'Bid settled (placeholder)' });
  }

  /**
   * Get marketplace aggregate info/statistics
   *
   * ENDPOINT: GET /marketplace/info
   *
   * Returns aggregate marketplace statistics:
   * {
   *   success: boolean,
   *   info: {
   *     totalAssets: number,          // Total tokenized assets
   *     activeUsers: number,          // Unique users who made purchases or bids
   *     totalSettlements: number,     // Total settlement records
   *     totalValueTokenized: number   // Sum of face values of all tokenized assets
   *   }
   * }
   *
   * Used by: Marketplace page for Platform Metrics Strip
   */
  async getMarketplaceInfo(): Promise<{
    totalAssets: number;
    activeUsers: number;
    totalSettlements: number;
    totalValueTokenized: number;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/info`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch marketplace info');
      }

      const data = await response.json();
      console.log('📡 Marketplace Info API Response:', data);

      return data.info;
    } catch (error) {
      console.error('Error fetching marketplace info:', error);
      throw error;
    }
  }

  /**
   * Get top-grossing/trending assets based on activity
   *
   * ENDPOINT: GET /marketplace/top-grossing?limit=N
   *
   * Returns the most popular assets based on purchase and bid activity.
   * Sorted by total activity (purchases + bids), highest first.
   *
   * Response:
   * {
   *   success: boolean,
   *   count: number,
   *   assets: [{
   *     assetId: string,
   *     tokenAddress: string,
   *     name: string,
   *     industry: string,
   *     faceValue: string,
   *     totalSupply: string,
   *     sold: string,
   *     percentageSold: number,
   *     pricePerToken: string,
   *     listingType: string,
   *     activityMetrics: {
   *       purchaseCount: number,
   *       bidCount: number,
   *       totalActivity: number
   *     }
   *   }]
   * }
   *
   * Used by: Marketplace page for "Trending Assets" section (sorted by percentageSold)
   */
  async getTopGrossingAssets(limit: number = 3): Promise<TrendingAsset[]> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/top-grossing?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch top grossing assets');
      }

      const data = await response.json();
      console.log('📡 Top Grossing Assets API Response:', data);

      return data.assets || [];
    } catch (error) {
      console.error('Error fetching top grossing assets:', error);
      throw error;
    }
  }

  async getPurchaseHistory(assetId: string): Promise<PurchaseHistoryResponse> {
    try {
      const response = await fetch(`${this.baseURL}/assets/${assetId}/purchase-history`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch purchase history for asset ID: ${assetId}`);
      }

      const data: PurchaseHistoryResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching purchase history for asset ID ${assetId}:`, error);
      throw error;
    }
  }
}

export const marketplaceService = new MarketplaceService();
