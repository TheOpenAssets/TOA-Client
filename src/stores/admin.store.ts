// src/stores/admin.store.ts
import { create } from 'zustand';
import { adminService } from '../lib/api/admin.service';

export interface AssetMetadata {
  invoiceNumber: string;
  faceValue: string;
  buyerName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  industry: string;
  riskTier: string;
}

export interface TokenParams {
  totalSupply: string;
  pricePerToken: string;
  minInvestment: string;
}

export interface AssetCheckpoints {
  uploaded: boolean;
  attested: boolean;
  registered: boolean;
  tokenized: boolean;
  listed: boolean;
}

export interface AssetCryptography {
  merkleRoot?: string;
  assetIdBytes32?: string;
}

export interface AssetAttestation {
  hash?: string;
  timestamp?: string;
  blockNumber?: number;
}

export interface AssetRegistry {
  transactionHash?: string;
  blockNumber?: number;
}

export interface AssetToken {
  address?: string;
  name?: string;
  symbol?: string;
  complianceAddress?: string;
}

export interface AssetListing {
  listingId?: string;
  type?: string; // 'STATIC' | 'AUCTION'
  price?: string;
  minInvestment?: string;
  transactionHash?: string;
  active?: boolean; // Whether the asset is currently listed
  reservePrice?: string; // For AUCTION type
  duration?: number; // Auction duration in seconds
  startTime?: string; // Auction start time
  endTime?: string; // Auction end time
  phase?: string; // 'BIDDING' | 'ENDED' | 'SETTLED'
}

export interface FileInvoice {
  tempPath: string;
  size: number;
  uploadedAt: string;
}

export interface AdminAsset {
  _id: string;
  assetId: string;
  originator: string;
  status: string;
  assetType?: string; // 'AUCTION' | 'STATIC'
  metadata: AssetMetadata;
  tokenParams: TokenParams;
  files?:   FileInvoice[];
  checkpoints: AssetCheckpoints;
  cryptography: AssetCryptography;
  attestation: AssetAttestation;
  registry: AssetRegistry;
  token: AssetToken;
  listing?: AssetListing;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  pendingCompliance: number;
  complianceApproved: number;
  onChainAssets: number;
  totalYieldDistributed: number;
}

export interface AdminActivity {
  id: string;
  assetName: string;
  details: string;
  actor: string;
  timestamp: string;
  minraise: string;
  type: string;
}

interface AdminState {
  assetsForCompliance: AdminAsset[];
  assetsForOperations: AdminAsset[];
  assetsForSettlement: AdminAsset[];
  stats: AdminStats | null;
  activities: AdminActivity[];
  isLoading: boolean;
  error: string | null;
  fetchAdminDashboardData: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  assetsForCompliance: [],
  assetsForOperations: [],
  assetsForSettlement: [],
  stats: null,
  activities: [],
  isLoading: false,
  error: null,
  fetchAdminDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        assetsForCompliance,
        assetsForOperations,
        assetsForSettlement,
        stats,
        activities,
      ] = await Promise.all([
        adminService.getAssetsForCompliance(),
        adminService.getAssetsForOperations(),
        adminService.getAssetsForSettlement(),
        adminService.getAdminStats(),
        adminService.getAdminActivities(),
      ]);
      set({
        assetsForCompliance,
        assetsForOperations,
        assetsForSettlement,
        stats,
        activities,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
