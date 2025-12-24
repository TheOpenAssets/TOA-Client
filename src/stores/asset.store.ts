// src/stores/asset.store.ts
import { create } from 'zustand';
import type { IssuerAsset } from '../types/issuer.types';
import { assetService } from '../lib/api/asset.service';

interface AssetState {
  asset: IssuerAsset | null;
  isLoading: boolean;
  error: string | null;
  fetchAsset: (assetId: string) => Promise<void>;
}

export const useAssetStore = create<AssetState>((set) => ({
  asset: null,
  isLoading: false,
  error: null,
  fetchAsset: async (assetId: string) => {
    set({ isLoading: true, error: null });
    try {
      const asset = await assetService.getAssetById(assetId);
      if (asset) {
        set({ asset, isLoading: false });
      } else {
        throw new Error('Asset not found');
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
