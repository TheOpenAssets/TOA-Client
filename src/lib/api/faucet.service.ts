// src/lib/api/faucet.service.ts
import BaseService from './base.service';

export interface FaucetResponse {
  success: boolean;
  message: string;
  transactionHash: string;
  amount: string;
  receiverAddress: string;
  explorerUrl: string;
}

class FaucetService extends BaseService {
  constructor() {
    super();
  }

  async getUsdcFromFaucet(receiverAddress: string): Promise<FaucetResponse> {
    try {
      const response = await fetch(`${this.baseURL}/faucet/usdc`, {
        method: 'POST',
        headers: this.getHeaders(), // Use non-authed headers
        body: JSON.stringify({ receiverAddress }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to get USDC from faucet.');
      }

      return data;
    } catch (error: unknown) {
      console.error('Error getting USDC from faucet:', error);
      const e = error as Error;
      throw new Error(`Failed to get USDC from faucet: ${e.message}`);
    }
  }

  async getMethFromFaucet(receiverAddress: string): Promise<FaucetResponse> {
    try {
      const response = await fetch(`${this.baseURL}/faucet/meth`, {
        method: 'POST',
        headers: this.getHeaders(), // Use non-authed headers
        body: JSON.stringify({ receiverAddress }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to get mETH from faucet.');
      }

      return data;
    } catch (error: unknown) {
      console.error('Error getting mETH from faucet:', error);
      const e = error as Error;
      throw new Error(`Failed to get mETH from faucet: ${e.message}`);
    }
  }
}

export const faucetService = new FaucetService();
