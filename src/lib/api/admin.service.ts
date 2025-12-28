// src/lib/api/admin.service.ts
import type {
  ChallengeResponse,
  LoginPayload,
  LoginResponse,
} from '../../types/auth.types';
import { UserRole } from '../../types/issuer.types';
import type { AdminAsset, AdminStats, AdminActivity } from '../../stores/admin.store';
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

    const data = await response.json();

    // Check both HTTP status AND success field
    if (!response.ok || data.success === false) {
      // If asset is already registered, that's actually OK - just warn
      if (data.error === 'Asset Already Registered') {
        console.warn('⚠️ Asset already registered, skipping...');
        return {
          success: true,
          message: 'Asset was already registered',
          alreadyRegistered: true,
        };
      }
      throw new Error(data.message || data.error || 'Failed to register asset');
    }

    return data;
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

    const data = await response.json();

    // Check both HTTP status AND success field
    if (!response.ok || data.success === false) {
      // If token is already deployed, that's actually OK - just warn
      if (data.error && (data.error.includes('already deployed') || data.error.includes('already tokenized'))) {
        console.warn('⚠️ Token already deployed, skipping...');
        return {
          success: true,
          message: 'Token was already deployed',
          alreadyDeployed: true,
        };
      }
      throw new Error(data.message || data.error || 'Failed to deploy token');
    }

    return data;
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

  async scheduleAuction(assetId: string, startDelayMinutes: number): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/compliance/schedule-auction`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ assetId, startDelayMinutes }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.error || 'Failed to schedule auction');
    }

    return data;
  }

  /**
   * Record yield settlement for an asset
   * Step 3 from admin-yeild.sh script
   *
   * @param assetId - The asset ID to settle
   * @param settlementAmount - Settlement amount in USD (e.g., 100000)
   * @param settlementDate - Settlement date in ISO format
   * @returns Settlement ID, platform fee (1.5%), and net distribution amount
   */
  async recordYieldSettlement(
    assetId: string,
    settlementAmount: number,
    settlementDate: string
  ): Promise<{
    _id: string;
    settlementId?: string;
    netDistribution: number;
    platformFee: number;
    status: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/admin/yield/settlement`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          assetId,
          settlementAmount,
          settlementDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to record yield settlement');
      }

      return data;
    } catch (error) {
      console.error('Error recording yield settlement:', error);
      throw error;
    }
  }

  /**
   * Confirm USDC conversion for a settlement
   * Step 4 from admin-yeild.sh script
   *
   * @param settlementId - The settlement ID
   * @param usdcAmount - USDC amount in wei (6 decimals)
   * @returns Updated settlement with status READY_FOR_DISTRIBUTION
   */
  async confirmUSDCConversion(
    settlementId: string,
    usdcAmount: string
  ): Promise<{
    status: string;
    usdcAmount: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/admin/yield/confirm-usdc`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          settlementId,
          usdcAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to confirm USDC conversion');
      }

      return data;
    } catch (error) {
      console.error('Error confirming USDC conversion:', error);
      throw error;
    }
  }

  /**
   * Distribute yield on-chain to token holders
   * Step 5 from admin-yeild.sh script
   * Executes: USDC approval → deposit to YieldVault → distribute (time-weighted)
   *
   * @param settlementId - The settlement ID
   * @returns Distribution results with total distributed, holders, token-days, effective yield
   */
  async distributeYield(
    settlementId: string
  ): Promise<{
    message: string;
    totalDistributed: string;
    holders: number;
    totalTokenDays: string;
    effectiveYield: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/admin/yield/distribute`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          settlementId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to distribute yield');
      }

      return data;
    } catch (error) {
      console.error('Error distributing yield:', error);
      throw error;
    }
  }

  /**
   * Get settlement details by ID
   * Step 6 from admin-yeild.sh script
   *
   * @param settlementId - The settlement ID
   * @returns Settlement details with status
   */
  async getSettlement(settlementId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/admin/yield/settlement/${settlementId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settlement');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching settlement ${settlementId}:`, error);
      throw error;
    }
  }

  /**
   * Get all settlements
   * For displaying settlements list in admin dashboard
   *
   * @returns Array of all settlements
   */
  async getAllSettlements(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/admin/yield/settlements`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settlements');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.settlements || [];
    } catch (error) {
      console.error('Error fetching settlements:', error);
      return [];
    }
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
      // Get ALL assets and filter based on STATUS (not checkpoints!)
      // Assets ready for compliance: status = MERKLED (needs attestation/approval)
      const { assets: allAssets } = await this.getAllAssets();

      const complianceAssets = allAssets.filter((asset: any) =>
        asset.status === 'MERKLED'
      );

      console.log('📋 Assets for Compliance (status=MERKLED, needs attestation):', complianceAssets);
      return complianceAssets;
    } catch (error) {
      console.error('Error fetching compliance assets:', error);
      return [];
    }
  }

  async getAssetsForOperations(): Promise<AdminAsset[]> {
    try {
      // Get ALL assets and filter based on STATUS (not checkpoints!)
      const { assets: allAssets } = await this.getAllAssets();

      // Operations includes:
      // 1. status = ATTESTED (approved, ready to register on-chain)
      // 2. status = REGISTERED (registered on-chain, ready to deploy token)
      // 3. status = TOKENIZED (tokenized, ready to list on marketplace)
      const operationsAssets = allAssets.filter((asset: any) =>
        asset.status === 'ATTESTED' ||
        asset.status === 'REGISTERED' ||
        asset.status === 'TOKENIZED'
      );

      console.log('⚙️ Assets for Operations (status=ATTESTED|REGISTERED|TOKENIZED):', operationsAssets);
      return operationsAssets;
    } catch (error) {
      console.error('Error fetching operation assets:', error);
      return [];
    }
  }

  async getAssetsForSettlement(): Promise<AdminAsset[]> {
    try {
      // Get ALL assets and filter based on STATUS (not checkpoints!)
      // Assets ready for yield settlement: status = PAYOUT_COMPLETE
      // According to admin-yeild.sh script, asset must be in PAYOUT_COMPLETE status
      const { assets: allAssets } = await this.getAllAssets();

      const settlementAssets = allAssets.filter((asset: any) =>
        asset.status === 'PAYOUT_COMPLETE'
      );

      console.log('💰 Assets for Yield Settlement (status=PAYOUT_COMPLETE):', settlementAssets);
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

  /**
   * Execute payout to originator for a listed asset
   *
   * @param assetId - The asset ID to payout
   * @returns Promise with payout details
   */
  async executePayout(assetId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/assets/${assetId}/payout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to execute payout');
      }

      return data;
    } catch (error) {
      console.error(`Error executing payout for ${assetId}:`, error);
      throw error;
    }
  }

  async getAdminStats(): Promise<AdminStats> {
    try {
      // Get all assets and calculate stats based on STATUS (not checkpoints!)
      const { assets: allAssets } = await this.getAllAssets();

      const stats: AdminStats = {
        // Pending Compliance: status = MERKLED (needs attestation)
        pendingCompliance: allAssets.filter((a: any) =>
          a.status === 'MERKLED'
        ).length,
        // Compliance Approved: status = ATTESTED (ready to register)
        complianceApproved: allAssets.filter((a: any) =>
          a.status === 'ATTESTED'
        ).length,
        // On-Chain Assets: status = REGISTERED, TOKENIZED, or LISTED
        onChainAssets: allAssets.filter((a: any) =>
          a.status === 'REGISTERED' || a.status === 'TOKENIZED' || a.status === 'LISTED'
        ).length,
        totalYieldDistributed: 0, // TODO: This needs a separate endpoint
      };

      console.log('📊 Admin Stats (using status field):', stats);
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
      // Get recent assets (limit to 10 most recent)
      const { assets } = await this.getAllAssets({ limit: 10 });

      // Convert assets to activity format
      const activities: AdminActivity[] = assets.map((asset: any, index: number) => {
        // Extract metadata fields
        const invoiceNumber = asset.metadata?.invoiceNumber || 'N/A';
        const buyerName = asset.metadata?.buyerName || 'Unknown';
        const faceValue = asset.metadata?.faceValue || '0';
        const currency = asset.metadata?.currency || 'USD';

        // Create descriptive asset name
        const assetName = `Invoice ${invoiceNumber} - ${buyerName}`;

        // Create detailed description based on status and type
        let details = '';
        if (asset.assetType === 'AUCTION') {
          details = `${asset.status} • Auction • ${currency} ${faceValue}`;
        } else {
          details = `${asset.status} • Static • ${currency} ${faceValue}`;
        }

        // Format originator address (show first 6 and last 4 characters)
        const originator = asset.originator
          ? `${asset.originator.substring(0, 6)}...${asset.originator.substring(asset.originator.length - 4)}`
          : 'System';

        return {
          id: asset._id || asset.assetId || `activity-${index}`,
          assetName,
          details,
          actor: originator,
          timestamp: asset.updatedAt || asset.createdAt || new Date().toISOString(),
          type: this.getActivityType(asset.status),
        };
      });

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
      case 'MERKLED':
        return 'COMPLIANCE_PENDING';
      case 'ATTESTED':
        return 'COMPLIANCE_APPROVED';
      case 'REGISTERED':
        return 'ASSET_REGISTERED';
      case 'TOKENIZED':
        return 'ASSET_TOKENIZED';
      case 'LISTED':
        return 'ASSET_LISTED';
      case 'PAYOUT_COMPLETE':
        return 'YIELD_DISTRIBUTED';
      default:
        return 'ASSET_REGISTERED';
    }
  }
}

export const adminService = new AdminService();