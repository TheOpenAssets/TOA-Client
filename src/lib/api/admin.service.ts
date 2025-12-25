// src/lib/api/admin.service.ts
import type {
  ChallengeResponse,
  LoginPayload,
  LoginResponse,
} from '../../types/auth.types';
import { UserRole } from '../../types/issuer.types';
import type { AdminAsset, AdminStats, AdminActivity } from '../../stores/admin.store';
import { calculateAdminStats, mockAdminActivities } from '../data/admin-mock-data';
import  type { SettlementFormData } from '../../types/admin.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class AdminService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getChallenge(walletAddress: string): Promise<ChallengeResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/auth/challenge?walletAddress=${walletAddress}&role=${UserRole.ADMIN}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
        headers: {
          'Content-Type': 'application/json',
        },
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

  async recordSettlement(formData: SettlementFormData): Promise<any> {
    // TODO: Backend endpoint for recording settlement is not in the script.
    // Assuming an endpoint like /admin/settlements/record
    console.warn('Mocking record settlement. Endpoint /admin/settlements/record is not in the script.');
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
  }

  // MOCKED METHODS FOR FETCHING ASSETS
  async getAssetsForCompliance(): Promise<AdminAsset[]> {
    console.warn("Using mock data for getAssetsForCompliance");
    return Promise.resolve([
      { id: '1', name: 'INV-2401', status: 'Pending', submittedDate: '2025-12-24' },
    ]);
  }

  async getAssetsForOperations(): Promise<AdminAsset[]> {
    console.warn("Using mock data for getAssetsForOperations");
    return Promise.resolve([
      { id: '1', name: 'INV-2401', status: 'Approved', submittedDate: '2025-12-24' },
    ]);
  }
  
  async getAssetsForSettlement(): Promise<AdminAsset[]> {
    console.warn("Using mock data for getAssetsForSettlement");
    return Promise.resolve([
      { id: '1', name: 'INV-2401', status: 'Tokenized', submittedDate: '2025-12-24' },
    ]);
  }
  
  async getAssetById(assetId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/admin/assets/${assetId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch asset');
    return response.json();
  }

  async getAdminStats(): Promise<AdminStats> {
    console.warn("Using mock data for getAdminStats");
    return Promise.resolve(calculateAdminStats());
  }

  async getAdminActivities(): Promise<AdminActivity[]> {
    console.warn("Using mock data for getAdminActivities");
    return Promise.resolve(mockAdminActivities);
  }
}

export const adminService = new AdminService(API_BASE_URL);
