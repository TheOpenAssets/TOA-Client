import type {
  Partner,
  PartnerBorrowTerms,
  PartnerBorrowResponse,
  PartnerLoansResponse,
  PartnerRepayResponse,
} from '../../types/creditcoin.types';
import BaseService from './base.service';

class PartnerService extends BaseService {
  async getPartners(): Promise<Partner[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseURL}/partners/gateway/list`,
      { method: 'GET', headers: this.getAuthHeaders() }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to fetch partners');
    }
    return response.json();
  }

  async getPartnerBorrowTerms(walletAddress: string): Promise<PartnerBorrowTerms> {
    const response = await this.fetchWithTimeout(
      `${this.baseURL}/credit-score/borrow-terms/${walletAddress}`,
      { method: 'GET', headers: this.getAuthHeaders() }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to fetch borrow terms');
    }
    return response.json();
  }

  async borrowViaPartner(dto: {
    partnerId: string;
    amount: string;
    loanDuration: number;
    positionId?: number;
    vaultTxHash: string;
  }): Promise<PartnerBorrowResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseURL}/partners/gateway/borrow`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(dto),
      },
      60000 // blockchain tx can take ~15s
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Borrow failed');
    }
    return response.json();
  }

  async repayPartnerLoan(dto: {
    internalLoanId: string;
    amount: string;
  }): Promise<PartnerRepayResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseURL}/partners/gateway/repay`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(dto),
      },
      60000
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Repayment failed');
    }
    return response.json();
  }

  async getMyPartnerLoans(): Promise<PartnerLoansResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseURL}/solvency/partner-loans/my`,
      { method: 'GET', headers: this.getAuthHeaders() }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to fetch partner loans');
    }
    return response.json();
  }
}

export const partnerService = new PartnerService();
