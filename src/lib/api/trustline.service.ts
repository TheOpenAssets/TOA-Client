import BaseService from './base.service';

export interface NotifyTrustlineDto {
    txHash: string;
    assetId: string;
    network: string;
    blockNumber?: string;
}

export interface CheckAbilityResponseDto {
    canBuy: boolean;
    trustlineStatus: 'APPROVED' | 'PENDING' | 'NOT_REQUESTED';
    reason?: string;
}

export interface TrustlineRequest {
    requestId: string;
    investorAddress: string;
    assetId: string;
    assetCode: string;
    issuerAddress: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    txHash: string;
    createdAt: string;
    updatedAt: string;
    asset?: any;
}

export interface ApproveTrustlineDto {
    requestId: string;
    adminWallet: string;
}

class TrustlineService extends BaseService {
    /**
     * Notify backend that a trustline transaction has been submitted/completed on-chain
     */
    async notifyTrustlineAdded(data: NotifyTrustlineDto): Promise<{ success: boolean; requestId: string; status: string }> {
        const response = await fetch(`${this.baseURL}/trustline/add-trustline-notify`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to notify trustline added');
        }
        return await response.json();
    }

    /**
     * Check if the current user can buy the asset (i.e., has an approved trustline)
     */
    async checkAbilityToBuy(assetId: string): Promise<CheckAbilityResponseDto> {
        const response = await fetch(`${this.baseURL}/trustline/check-ability-to-buy/${assetId}`, {
            method: 'GET',
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to check ability to buy');
        }
        return await response.json();
    }

    /**
     * Get the current user's trustline requests
     */
    async getMyRequests(params?: { status?: string; limit?: number; offset?: number }): Promise<TrustlineRequest[]> {
        const queryParams = new URLSearchParams(params as any).toString();
        const response = await fetch(`${this.baseURL}/trustline/my-requests?${queryParams}`, {
            method: 'GET',
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get my requests');
        }
        return await response.json();
    }

    // --- Admin Endpoints ---

    /**
     * Get all pending trustline requests (Admin)
     */
    async getAdminRequests(params?: {
        status?: string;
        investorAddress?: string;
        assetId?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: string;
    }): Promise<{ requests: TrustlineRequest[]; totalCount: number; page: number; limit: number }> {
        const queryParams = new URLSearchParams(params as any).toString();
        const response = await fetch(`${this.baseURL}/admin/trustline-requests?${queryParams}`, {
            method: 'GET',
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get admin requests');
        }
        return await response.json();
    }

    /**
     * Get a specific request by ID (Admin)
     */
    async getRequestById(requestId: string): Promise<TrustlineRequest> {
        const response = await fetch(`${this.baseURL}/admin/trustline-requests/${requestId}`, {
            method: 'GET',
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get request by id');
        }
        return await response.json();
    }

    /**
     * Approve a trustline request (Admin)
     */
    async approveTrustline(data: ApproveTrustlineDto): Promise<{ success: boolean; transactionHash?: string; request: TrustlineRequest }> {
        const response = await fetch(`${this.baseURL}/admin/trustline-requests/approve`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to approve trustline');
        }
        return await response.json();
    }
}

export const trustlineService = new TrustlineService();
