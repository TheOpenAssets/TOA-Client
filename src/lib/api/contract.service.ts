// src/lib/api/contract.service.ts

import { ethers } from 'ethers';

/**
 * Contract Service - Handles smart contract interactions for token purchase
 *
 * Smart Contracts:
 * - USDC: 0xfD61dC86e7799479597c049D7b19e6E638adDdd0
 * - PrimaryMarketplace: 0x444a6f69FC9411d0ea9627CbDdBD3Dfa563aE615
 */

// Contract addresses
const USDC_ADDRESS = '0xfD61dC86e7799479597c049D7b19e6E638adDdd0';
const PRIMARY_MARKETPLACE_ADDRESS = '0x444a6f69FC9411d0ea9627CbDdBD3Dfa563aE615';

// USDC ABI - Only the functions we need
const USDC_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
];

// PrimaryMarketplace ABI - Only the functions we need
const MARKETPLACE_ABI = [
  'function buyTokens(bytes32 assetId, uint256 amount) public',
  'event TokensPurchased(bytes32 indexed assetId, address indexed buyer, uint256 amount, uint256 payment)',
];

export interface PurchaseParams {
  assetId: string;
  tokenAmount: string;
  pricePerToken: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

class ContractService {
  /**
   * Convert UUID asset ID to bytes32 format required by smart contract
   * Example: "4d02feaa-7b32-4c35-980f-5710b73a982a" -> "0x4d02feaa7b324c35980f5710b73a982a00000000000000000000000000000000"
   */
  private assetIdToBytes32(assetId: string): string {
    // Remove hyphens and pad to 64 characters
    const cleanId = assetId.replace(/-/g, '');
    const paddedId = cleanId.padEnd(64, '0');
    return '0x' + paddedId;
  }

  /**
   * Calculate total payment needed in USDC (6 decimals)
   * Formula: (pricePerToken * tokenAmount) / 10^18 * 10^6
   */
  private calculatePayment(tokenAmount: string, pricePerToken: string): bigint {
    const tokenAmountWei = ethers.parseUnits(tokenAmount, 18);
    const pricePerTokenUSDC = BigInt(pricePerToken); // Already in USDC units (6 decimals)

    // Calculate: (tokenAmount * pricePerToken) / 10^18
    const payment = (tokenAmountWei * pricePerTokenUSDC) / BigInt(10 ** 18);

    return payment;
  }

  /**
   * Check USDC balance of user
   */
  async checkUSDCBalance(userAddress: string): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

      const balance = await usdcContract.balanceOf(userAddress);
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('Error checking USDC balance:', error);
      throw new Error('Failed to check USDC balance');
    }
  }

  /**
   * Check USDC allowance for marketplace
   */
  async checkUSDCAllowance(userAddress: string): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

      const allowance = await usdcContract.allowance(userAddress, PRIMARY_MARKETPLACE_ADDRESS);
      return ethers.formatUnits(allowance, 6);
    } catch (error) {
      console.error('Error checking USDC allowance:', error);
      throw new Error('Failed to check USDC allowance');
    }
  }

  /**
   * Approve USDC spending for marketplace
   * Step 1 of purchase flow
   */
  async approveUSDC(params: PurchaseParams): Promise<PurchaseResult> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

      // Calculate payment needed
      const payment = this.calculatePayment(params.tokenAmount, params.pricePerToken);

      console.log('Approving USDC spending:', {
        marketplace: PRIMARY_MARKETPLACE_ADDRESS,
        amount: ethers.formatUnits(payment, 6),
      });

      // Approve USDC
      const tx = await usdcContract.approve(PRIMARY_MARKETPLACE_ADDRESS, payment);
      console.log('Approval transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Approval confirmed:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Error approving USDC:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve USDC',
      };
    }
  }

  /**
   * Buy tokens from marketplace
   * Step 2 of purchase flow
   */
  async buyTokens(params: PurchaseParams): Promise<PurchaseResult> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = new ethers.Contract(
        PRIMARY_MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );

      // Convert asset ID to bytes32
      const assetIdBytes32 = this.assetIdToBytes32(params.assetId);
      const tokenAmountWei = ethers.parseUnits(params.tokenAmount, 18);

      console.log('Buying tokens:', {
        assetId: params.assetId,
        assetIdBytes32,
        tokenAmount: params.tokenAmount,
        tokenAmountWei: tokenAmountWei.toString(),
      });

      // Buy tokens
      const tx = await marketplaceContract.buyTokens(assetIdBytes32, tokenAmountWei);
      console.log('Purchase transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Purchase confirmed:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Error buying tokens:', error);
      return {
        success: false,
        error: error.message || 'Failed to buy tokens',
      };
    }
  }

  /**
   * Complete purchase flow: Approve USDC + Buy Tokens
   * Combines both steps into a single function
   */
  async completePurchase(params: PurchaseParams): Promise<{
    success: boolean;
    approvalTxHash?: string;
    purchaseTxHash?: string;
    error?: string;
  }> {
    try {
      // Step 1: Approve USDC
      console.log('Step 1: Approving USDC...');
      const approvalResult = await this.approveUSDC(params);

      if (!approvalResult.success) {
        return {
          success: false,
          error: `Approval failed: ${approvalResult.error}`,
        };
      }

      // Step 2: Buy tokens
      console.log('Step 2: Buying tokens...');
      const purchaseResult = await this.buyTokens(params);

      if (!purchaseResult.success) {
        return {
          success: false,
          approvalTxHash: approvalResult.transactionHash,
          error: `Purchase failed: ${purchaseResult.error}`,
        };
      }

      return {
        success: true,
        approvalTxHash: approvalResult.transactionHash,
        purchaseTxHash: purchaseResult.transactionHash,
      };
    } catch (error: any) {
      console.error('Error completing purchase:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete purchase',
      };
    }
  }

  /**
   * Get RWA token balance for a user
   * Requires the RWA token contract address
   */
  async getRWATokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address account) public view returns (uint256)'],
        provider
      );

      const balance = await tokenContract.balanceOf(userAddress);
      return ethers.formatUnits(balance, 18); // RWA tokens use 18 decimals
    } catch (error) {
      console.error('Error getting RWA token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }
}

export const contractService = new ContractService();
