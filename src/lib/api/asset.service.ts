// src/lib/api/asset.service.ts
import type { IssuerAsset } from '@/types/issuer.types';
import BaseService from './base.service';

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
    super();
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
   * Get asset details by token address
   * Used to fetch maturity date for loan duration calculation
   *
   * ✅ ENDPOINT: GET /assets/token/:tokenAddress
   * Reference: COMPLETE_LOAN.md line 100-101
   *
   * @param tokenAddress - The token contract address
   * @returns Promise with asset data including maturity date
   */
  async getAssetByTokenAddress(tokenAddress: string): Promise<IssuerAsset> {
    try {
      console.log(`📋 Fetching asset details for token: ${tokenAddress}`);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/assets/token/${tokenAddress}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
        30000
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to fetch asset details. Asset may not exist or maturity date unavailable.'
        );
      }

      const responseData = await response.json();

      // Debug: Log full response structure
      console.log('📦 Full API response:', JSON.stringify(responseData, null, 2));

      // Extract asset from response (try different structures)
      let asset = responseData.asset || responseData.data || responseData;

      // Debug: Log extracted asset
      console.log('📋 Extracted asset:', {
        assetId: asset?.assetId,
        hasMetadata: !!asset?.metadata,
        dueDate: asset?.metadata?.dueDate,
        metadataKeys: asset?.metadata ? Object.keys(asset.metadata) : [],
      });

      // Validate asset has required fields
      if (!asset || !asset.metadata) {
        throw new Error('Invalid asset response: Missing metadata object');
      }

      if (!asset.metadata.dueDate) {
        throw new Error(`Invalid asset response: Missing dueDate in metadata. Metadata keys: ${Object.keys(asset.metadata).join(', ')}`);
      }

      console.log('✅ Asset details validated:', {
        assetId: asset.assetId,
        dueDate: asset.metadata.dueDate,
        status: asset.status,
      });

      return asset;
    } catch (error: any) {
      console.error('❌ Error fetching asset by token address:', error);
      throw error;
    }
  }

  /**
   * Calculate loan duration in seconds from asset maturity date
   * Used for borrowUSDC contract call
   *
   * @param asset - Asset data with maturity date
   * @returns Loan duration in seconds
   * @throws Error if asset has already matured
   */
  calculateLoanDuration(asset: IssuerAsset): number {
    if (!asset.metadata?.dueDate) {
      console.error('❌ Asset metadata missing dueDate:', asset.metadata?.dueDate);
      throw new Error('Asset does not have a maturity date. Cannot calculate loan duration.');
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const maturityDate = new Date(asset.metadata.dueDate).getTime() / 1000; // Asset maturity in seconds
    const loanDuration = Math.floor(maturityDate - now);

    if (loanDuration <= 0) {
      throw new Error('Asset has already matured. Cannot borrow against matured assets.');
    }

    console.log(`📅 Loan duration calculated: ${loanDuration}s (~${Math.floor(loanDuration / 86400)} days)`);

    return loanDuration;
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

      // Get network-aware auth headers and remove Content-Type so browser sets boundary
      const authHeaders = this.getAuthHeaders();
      const { 'Content-Type': _, ...headers } = authHeaders as any;

      // Use fetchWithTimeout with 5-minute timeout for file uploads
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/assets/upload`,
        {
          method: 'POST',
          headers,
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

