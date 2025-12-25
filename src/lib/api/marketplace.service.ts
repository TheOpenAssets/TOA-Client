// src/lib/api/marketplace.service.ts
import type {
  ListingResponse,
  AssetDetailsResponse,
  MarketplaceListing,
  AssetDetails,
  NotifyPurchasePayload,
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
}

export const marketplaceService = new MarketplaceService();
