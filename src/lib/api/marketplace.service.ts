// src/lib/api/marketplace.service.ts
import type {
  ListingResponse,
  AssetDetailsResponse,
  MarketplaceListing,
  AssetDetails,
  NotifyPurchasePayload,
  Auction,
  Bid,
  AuctionListResponse,
  AuctionDetailsResponse,
  UserBidsResponse,
  CreateAuctionPayload,
  SubmitBidPayload,
  EndAuctionPayload,
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
  // AUCTION ENDPOINTS (Based on AUTION.md API specification)
  // ============================================================================

  /**
   * Get all auctions (with optional status filter)
   *
   * ENDPOINT: GET /marketplace/auctions?status=BIDDING
   * REF: AUTION.md Phase 1
   *
   * Used by:
   * - Marketplace page to display active auctions
   * - Admin dashboard to view all auctions
   */
  async getAuctions(status?: string): Promise<Auction[]> {
    try {
      const queryParams = status ? `?status=${status}` : '';
      const response = await fetch(`${this.baseURL}/marketplace/auctions${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch auctions');
      }

      const data: AuctionListResponse = await response.json();
      return data.auctions;
    } catch (error) {
      console.error('Error fetching auctions:', error);
      throw error;
    }
  }

  /**
   * Get auction details by ID
   *
   * ENDPOINT: GET /marketplace/auctions/:auctionId
   * REF: AUTION.md Phase 1
   *
   * Used by:
   * - Auction detail page to show auction info and bid form
   */
  async getAuctionById(auctionId: string): Promise<Auction> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/auctions/${auctionId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch auction: ${auctionId}`);
      }

      const data: AuctionDetailsResponse = await response.json();
      return data.auction;
    } catch (error) {
      console.error(`Error fetching auction ${auctionId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new auction (Admin only)
   *
   * ENDPOINT: POST /marketplace/create-auction
   * REF: AUTION.md Phase 0
   *
   * Used by:
   * - Admin dashboard to create new auctions
   */
  async createAuction(payload: CreateAuctionPayload): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/create-auction`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create auction');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating auction:', error);
      throw error;
    }
  }

  /**
   * End an auction (Admin only)
   *
   * ENDPOINT: POST /marketplace/end-auction/:auctionId
   * REF: AUTION.md Phase 2
   *
   * Used by:
   * - Admin dashboard to end auctions and set clearing price
   */
  async endAuction(auctionId: string, clearingPrice: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/end-auction/${auctionId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ clearingPrice }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to end auction');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error ending auction ${auctionId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's bids (optionally filtered by auction)
   *
   * ENDPOINT: GET /users/:address/bids?auction=:auctionId
   * REF: AUTION.md Phase 3
   *
   * Used by:
   * - Portfolio page to show "My Bids" section
   */
  async getUserBids(address: string, auctionId?: string): Promise<Bid[]> {
    try {
      const queryParams = auctionId ? `?auction=${auctionId}` : '';
      const response = await fetch(`${this.baseURL}/users/${address}/bids${queryParams}`, {
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
   * Submit a bid (User)
   *
   * NOTE: This is a frontend-to-contract call placeholder
   * Actual implementation will use blockchain contract service
   * REF: AUTION.md Phase 1 - Step 5
   *
   * Contract call: MarketplaceContract.submitBid(auctionId, tokenAmount, maxPrice)
   */
  async submitBid(payload: SubmitBidPayload): Promise<any> {
    // TODO: This will be replaced with actual contract call
    // For now, this is a placeholder for the backend notification
    console.log('[PLACEHOLDER] Submit bid to contract:', payload);
    return Promise.resolve({ success: true, message: 'Bid submitted (placeholder)' });
  }

  /**
   * Settle/Claim bid (User)
   *
   * NOTE: This is a frontend-to-contract call placeholder
   * Actual implementation will use blockchain contract service
   * REF: AUTION.md Phase 3
   *
   * Contract call: MarketplaceContract.settleBid(auctionId, bidIndex)
   */
  async settleBid(auctionId: string, bidIndex: number): Promise<any> {
    // TODO: This will be replaced with actual contract call
    console.log('[PLACEHOLDER] Settle bid on contract:', { auctionId, bidIndex });
    return Promise.resolve({ success: true, message: 'Bid settled (placeholder)' });
  }
}

export const marketplaceService = new MarketplaceService();
