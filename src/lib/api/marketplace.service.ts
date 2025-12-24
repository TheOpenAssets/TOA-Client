// src/lib/api/marketplace.service.ts

import type {
  ListingResponse,
  AssetDetailsResponse,
  MarketplaceListing,
  AssetDetails
} from '@/types/marketplace.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Marketplace Service - Handles marketplace-related API calls
 *
 * Endpoints:
 * - GET /marketplace/listings - Get all asset listings
 * - GET /marketplace/listings/:assetId - Get specific asset details
 */
class MarketplaceService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
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
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      const response = await fetch(`${this.baseURL}/marketplace/listings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
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
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      const response = await fetch(`${this.baseURL}/marketplace/listings/${assetId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
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
}

export const marketplaceService = new MarketplaceService(API_BASE_URL);
