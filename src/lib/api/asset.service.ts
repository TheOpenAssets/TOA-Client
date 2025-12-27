// src/lib/api/asset.service.ts
import type { IssuerAsset } from '@/types/issuer.types';
import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

/**
 * Response type for paginated assets
 */
export interface AssetsResponse {
  assets: IssuerAsset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parameters for getting assets
 */
export interface GetAssetsParams {
  status?: string;
  page?: number;
  limit?: number;
}

class AssetService extends BaseService {

  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get all assets for the current originator (issuer)
   * 
   * Endpoint: GET /assets
   * Supports filters: status (e.g., TOKENIZED)
   * Supports pagination: page, limit
   * 
   * @param params - Optional filters and pagination
   * @returns Promise with assets and pagination info
   */
  async getAllAssets(params: GetAssetsParams = {}): Promise<AssetsResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.page !== undefined) queryParams.append('page', params.page.toString());
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/assets${queryString ? `?${queryString}` : ''}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, 30000);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch assets: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  }

  /**
   * Get a single asset by ID
   *
   * Endpoint: GET /assets/:id
   *
   * @param assetId - The asset ID
   * @returns Promise with asset data
   */
  async getAssetById(assetId: string): Promise<IssuerAsset | undefined> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/assets/${assetId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, 30000);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch asset: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching asset:', error);
      throw error;
    }
  }

  /**
   * Upload a new asset
   *
   * Endpoint: POST /assets/upload
   *
   * @param formData - FormData containing all asset information
   * @returns Promise with upload response
   */
  async uploadAsset(formData: FormData): Promise<any> {
    try {
      console.log('⬆️ Starting asset upload...');

      // Use fetchWithTimeout with 5-minute timeout for file uploads
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/assets/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            // Don't set Content-Type - browser will set it with boundary for FormData
          },
          body: formData,
        },
        300000 // 5 minutes
      );

      console.log('✅ Upload request completed');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload asset: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        console.error('❌ Upload timeout: Request took longer than 5 minutes');
        throw new Error('Upload timeout: Request took longer than 5 minutes. Please try again or contact support.');
      }
      console.error('Error uploading asset:', error);
      throw error;
    }
  }
}

export const assetService = new AssetService();

