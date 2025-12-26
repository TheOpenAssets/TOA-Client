// src/lib/api/admin.service.ts
import type {
  ChallengeResponse,
  LoginPayload,
  LoginResponse,
} from '../../types/auth.types';
import { UserRole } from '../../types/issuer.types';
import type { AdminAsset, AdminStats, AdminActivity } from '../../stores/admin.store';
import  type { SettlementFormData } from '../../types/admin.types';
import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

class AdminService extends BaseService {

  constructor() {
    super(API_BASE_URL);
  }

  async getChallenge(walletAddress: string): Promise<ChallengeResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/auth/challenge?walletAddress=${walletAddress}&role=${UserRole.ADMIN}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting challenge:', error);
      throw error;
    }
  }

  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      if (data.tokens) {
        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);
      }

      return data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  async approveAsset(assetId: string, adminWallet: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/compliance/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ assetId, adminWallet }),
    });
    if (!response.ok) throw new Error('Failed to approve asset');
    return response.json();
  }

  async registerAsset(assetId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/assets/${assetId}/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to register asset');
    return response.json();
  }

  async syncStatus(assetId: string, txHash: string, status: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/sync/update-status`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ assetId, txHash, status }),
    });
    if (!response.ok) throw new Error('Failed to sync status');
    return response.json();
  }

  async deployToken(assetId: string, name: string, symbol: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/assets/deploy-token`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ assetId, name, symbol }),
    });
    if (!response.ok) throw new Error('Failed to deploy token');
    return response.json();
  }

  async listOnMarketplace(assetId: string, type: string, price: string, minInvestment: string, duration: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/assets/list-on-marketplace`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ assetId, type, price, minInvestment, duration }),
    });
    if (!response.ok) throw new Error('Failed to list on marketplace');
    return response.json();
  }

  // @ts-ignore
  async recordSettlement(formData: SettlementFormData): Promise<any> {
    // TODO: Backend endpoint for recording settlement is not in the script.
    // Assuming an endpoint like /admin/settlements/record
    console.warn('Mocking record settlement. Endpoint /admin/settlements/record is not in the script.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  // FETCH ASSETS FROM BACKEND
  async getAllAssets(params?: {
    status?: string;
    needsAttention?: boolean;
    originator?: string;
    page?: number;
    limit?: number;
  }): Promise<{ assets: AdminAsset[]; pagination?: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.needsAttention) queryParams.append('needsAttention', 'true');
      if (params?.originator) queryParams.append('originator', params.originator);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${this.baseURL}/admin/assets${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('🔍 Fetching admin assets from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin assets');
      }

      const data = await response.json();
      console.log('✅ Admin assets fetched:', data);
      return data;
    } catch (error) {
      console.error('Error fetching admin assets:', error);
      throw error;
    }
  }

  async getAssetsForCompliance(): Promise<AdminAsset[]> {
    try {
      // Get ALL assets and filter based on checkpoints
      // Assets ready for compliance: uploaded, hashed, merkled BUT NOT attested
      const { assets: allAssets } = await this.getAllAssets();

      const complianceAssets = allAssets.filter((asset: any) =>
        asset.checkpoints?.uploaded === true &&
        asset.checkpoints?.merkled === true &&
        asset.checkpoints?.attested !== true
      );

      console.log('📋 Assets for Compliance (merkled but not attested):', complianceAssets);
      return complianceAssets;
    } catch (error) {
      console.error('Error fetching compliance assets:', error);
      return [];
    }
  }

  async getAssetsForOperations(): Promise<AdminAsset[]> {
    try {
      // Get ALL assets and filter based on checkpoints
      const { assets: allAssets } = await this.getAllAssets();

      // Operations includes:
      // 1. Attested but NOT registered (ready to register)
      // 2. Registered but NOT tokenized (ready to deploy token)
      // 3. Tokenized (ready to list on marketplace)
      const operationsAssets = allAssets.filter((asset: any) =>
        (asset.checkpoints?.attested === true && asset.checkpoints?.registered !== true) ||
        (asset.checkpoints?.registered === true && asset.checkpoints?.tokenized !== true) ||
        asset.checkpoints?.tokenized === true
      );

      console.log('⚙️ Assets for Operations (attested, registered, or tokenized):', operationsAssets);
      return operationsAssets;
    } catch (error) {
      console.error('Error fetching operation assets:', error);
      return [];
    }
  }

  async getAssetsForSettlement(): Promise<AdminAsset[]> {
    try {
      // Get ALL assets and filter based on checkpoints
      // Assets ready for settlement: tokenized
      const { assets: allAssets } = await this.getAllAssets();

      const settlementAssets = allAssets.filter((asset: any) =>
        asset.checkpoints?.tokenized === true
      );

      console.log('💰 Assets for Settlement (tokenized):', settlementAssets);
      return settlementAssets;
    } catch (error) {
      console.error('Error fetching settlement assets:', error);
      return [];
    }
  }

  async getAssetById(assetId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/admin/assets/${assetId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch asset');
      return await response.json();
    } catch (error) {
      console.error(`Error fetching asset ${assetId}:`, error);
      throw error;
    }
  }

  async getAdminStats(): Promise<AdminStats> {
    try {
      // Get all assets and calculate stats based on checkpoints
      const { assets: allAssets } = await this.getAllAssets();

      const stats: AdminStats = {
        // Pending Compliance: merkled but not attested
        pendingCompliance: allAssets.filter((a: any) =>
          a.checkpoints?.merkled === true && a.checkpoints?.attested !== true
        ).length,
        // Compliance Approved: attested but not registered
        complianceApproved: allAssets.filter((a: any) =>
          a.checkpoints?.attested === true && a.checkpoints?.registered !== true
        ).length,
        // On-Chain Assets: registered or tokenized
        onChainAssets: allAssets.filter((a: any) =>
          a.checkpoints?.registered === true || a.checkpoints?.tokenized === true
        ).length,
        totalYieldDistributed: 0, // TODO: This needs a separate endpoint
      };

      console.log('📊 Admin Stats:', stats);
      return stats;
    } catch (error) {
      console.error('Error calculating admin stats:', error);
      // Return fallback stats
      return {
        pendingCompliance: 0,
        complianceApproved: 0,
        onChainAssets: 0,
        totalYieldDistributed: 0,
      };
    }
  }

  async getAdminActivities(): Promise<AdminActivity[]> {
    try {
      // Get recent assets with needsAttention flag
      const { assets } = await this.getAllAssets({ needsAttention: true, limit: 10 });

      // Convert assets to activity format
      const activities: AdminActivity[] = assets.map((asset: any, index: number) => ({
        id: asset.id || `activity-${index}`,
        assetName: asset.name || asset.invoiceNumber || `Asset ${asset.id}`,
        details: `Status: ${asset.status}`,
        actor: asset.originator || 'System',
        timestamp: asset.createdAt || asset.uploadedAt || new Date().toISOString(),
        type: this.getActivityType(asset.status),
      }));

      console.log('🔔 Admin Activities:', activities);
      return activities;
    } catch (error) {
      console.error('Error fetching admin activities:', error);
      return [];
    }
  }

  private getActivityType(status: string): string {
    switch (status) {
      case 'UPLOADED':
        return 'COMPLIANCE_PENDING';
      case 'ATTESTED':
        return 'COMPLIANCE_APPROVED';
      case 'REGISTERED':
        return 'ASSET_REGISTERED';
      case 'TOKENIZED':
        return 'ASSET_TOKENIZED';
      case 'LISTED':
        return 'ASSET_LISTED';
      default:
        return 'UNKNOWN';
    }
  }
}

export const adminService = new AdminService();