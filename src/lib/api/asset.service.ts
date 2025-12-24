// src/lib/api/asset.service.ts
import type { IssuerAsset } from '@/types/issuer.types';
import { mockAssetDetails } from '../data/asset-details-mock';

const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_AUTH === 'true' || true;

class AssetService {
  async getAssetById(assetId: string): Promise<IssuerAsset | undefined> {
    if (USE_MOCK_MODE) {
      console.log('🔧 MOCK MODE: Fetching asset by ID', assetId);
      await new Promise(resolve => setTimeout(resolve, 500));
      // In a real scenario, you would use assetId to fetch the correct asset.
      // For this mock, we return the same detailed asset regardless of ID.
      return mockAssetDetails;
    }

    // REAL MODE: Fetch from backend
    try {
      const response = await fetch(`/api/assets/${assetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch asset');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching asset:', error);
      throw error;
    }
  }
}

export const assetService = new AssetService();
