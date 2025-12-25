// src/stores/admin.store.ts
import { create } from 'zustand';
import { adminService } from '../lib/api/admin.service';

export interface AdminAsset {
  id: string;
  name: string;
  status: string;
  submittedDate: string;
  [key: string]: any;
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
