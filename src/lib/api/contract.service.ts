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

// PrimaryMarketplace ABI - Add more functions for debugging
const MARKETPLACE_ABI = [
  'function buyTokens(bytes32 assetId, uint256 amount) public',
  'function getListingDetails(bytes32 assetId) public view returns (address tokenAddress, uint256 pricePerToken, uint256 availableSupply, bool isActive)',
  'function listings(bytes32) public view returns (address tokenAddress, uint256 pricePerToken, uint256 totalSupply, uint256 availableSupply, uint256 minInvestment, bool isActive)',
  'event TokensPurchased(bytes32 indexed assetId, address indexed buyer, uint256 amount, uint256 payment)',
  // Common custom errors
  'error InsufficientSupply(uint256 requested, uint256 available)',
  'error ListingNotActive()',
  'error InsufficientPayment(uint256 required, uint256 provided)',
  'error InvalidAmount()',
];

export interface PurchaseParams {
  assetId: string;
  tokenAmount: string;
  pricePerToken: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
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
        blockNumber: receipt.blockNumber,
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
   * Debug: Check multiple assetId formats to find the correct one
   */
  async debugAssetId(assetId: string, tokenAddress: string): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const marketplaceContract = new ethers.Contract(
        PRIMARY_MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        provider
      );

      console.log('=== DEBUGGING ASSET ID FORMATS ===');
      console.log('Original assetId:', assetId);
      console.log('Token Address:', tokenAddress);

      // Format 1: UUID padded with zeros
      const format1 = this.assetIdToBytes32(assetId);
      console.log('\n1. UUID padded:', format1);
      try {
        const details1 = await marketplaceContract.listings(format1);
        console.log('✅ Format 1 FOUND:', {
          tokenAddress: details1[0],
          pricePerToken: details1[1].toString(),
          totalSupply: details1[2].toString(),
          availableSupply: details1[3].toString(),
          minInvestment: details1[4].toString(),
          isActive: details1[5],
        });
      } catch (e) {
        console.log('❌ Format 1 not found');
      }

      // Format 2: Keccak256 hash of UUID
      const format2 = ethers.keccak256(ethers.toUtf8Bytes(assetId));
      console.log('\n2. Keccak256(UUID):', format2);
      try {
        const details2 = await marketplaceContract.listings(format2);
        console.log('✅ Format 2 FOUND:', {
          tokenAddress: details2[0],
          pricePerToken: details2[1].toString(),
          totalSupply: details2[2].toString(),
          availableSupply: details2[3].toString(),
          minInvestment: details2[4].toString(),
          isActive: details2[5],
        });
      } catch (e) {
        console.log('❌ Format 2 not found');
      }

      // Format 3: Keccak256 hash of token address
      const format3 = ethers.keccak256(ethers.getBytes(tokenAddress));
      console.log('\n3. Keccak256(tokenAddress):', format3);
      try {
        const details3 = await marketplaceContract.listings(format3);
        console.log('✅ Format 3 FOUND:', {
          tokenAddress: details3[0],
          pricePerToken: details3[1].toString(),
          totalSupply: details3[2].toString(),
          availableSupply: details3[3].toString(),
          minInvestment: details3[4].toString(),
          isActive: details3[5],
        });
      } catch (e) {
        console.log('❌ Format 3 not found');
      }

      // Format 4: Just the token address as bytes32
      const format4 = ethers.zeroPadValue(tokenAddress, 32);
      console.log('\n4. Token address as bytes32:', format4);
      try {
        const details4 = await marketplaceContract.listings(format4);
        console.log('✅ Format 4 FOUND:', {
          tokenAddress: details4[0],
          pricePerToken: details4[1].toString(),
          totalSupply: details4[2].toString(),
          availableSupply: details4[3].toString(),
          minInvestment: details4[4].toString(),
          isActive: details4[5],
        });
      } catch (e) {
        console.log('❌ Format 4 not found');
      }

      console.log('=== END DEBUG ===\n');
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }

  /**
   * Verify listing is available before purchase
   */
  async verifyListing(assetId: string, tokenAddress?: string): Promise<{
    isValid: boolean;
    error?: string;
    details?: any;
    correctAssetId?: string;
  }> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const marketplaceContract = new ethers.Contract(
        PRIMARY_MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        provider
      );

      // If tokenAddress provided, run debug to find correct format
      if (tokenAddress) {
        await this.debugAssetId(assetId, tokenAddress);
      }

      // Try UUID format first
      const assetIdBytes32 = this.assetIdToBytes32(assetId);
      
      try {
        const details = await marketplaceContract.listings(assetIdBytes32);
        
        console.log('Listing details (UUID format):', {
          tokenAddress: details[0],
          pricePerToken: details[1].toString(),
          totalSupply: details[2].toString(),
          availableSupply: details[3].toString(),
          minInvestment: details[4].toString(),
          isActive: details[5],
        });

        // Check if listing exists (tokenAddress should not be zero address)
        if (details[0] === ethers.ZeroAddress) {
          // Try alternative format: keccak256 of UUID
          const altAssetId = ethers.keccak256(ethers.toUtf8Bytes(assetId));
          console.log('Trying alternative format:', altAssetId);
          
          try {
            const altDetails = await marketplaceContract.listings(altAssetId);
            
            if (altDetails[0] !== ethers.ZeroAddress) {
              console.log('✅ Found listing with keccak256 format!');
              
              if (!altDetails[5]) {
                return { isValid: false, error: 'Listing is not active' };
              }
              
              if (altDetails[3] === 0n) {
                return { isValid: false, error: 'No tokens available for purchase' };
              }
              
              return {
                isValid: true,
                correctAssetId: altAssetId,
                details: {
                  tokenAddress: altDetails[0],
                  pricePerToken: altDetails[1].toString(),
                  availableSupply: ethers.formatUnits(altDetails[3], 18),
                  isActive: altDetails[5],
                },
              };
            }
          } catch (e) {
            console.error('Alternative format also failed:', e);
          }
          
          return {
            isValid: false,
            error: 'Listing not found in contract. The asset may not be listed yet.',
          };
        }

        if (!details[5]) {
          return { isValid: false, error: 'Listing is not active' };
        }

        if (details[3] === 0n) {
          return { isValid: false, error: 'No tokens available for purchase' };
        }

        return {
          isValid: true,
          correctAssetId: assetIdBytes32,
          details: {
            tokenAddress: details[0],
            pricePerToken: details[1].toString(),
            availableSupply: ethers.formatUnits(details[3], 18),
            isActive: details[5],
          },
        };
      } catch (error: any) {
        console.warn('Could not verify listing:', error);
        return {
          isValid: false,
          error: 'Failed to query listing from contract',
        };
      }
    } catch (error: any) {
      console.error('Error verifying listing:', error);
      return {
        isValid: false,
        error: error.message || 'Failed to verify listing',
      };
    }
  }

  /**
   * Buy tokens from marketplace
   * Step 2 of purchase flow
   */
  async buyTokens(params: PurchaseParams, correctAssetId?: string): Promise<PurchaseResult> {
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

      // Use correctAssetId if provided from verification, otherwise convert UUID
      const assetIdBytes32 = correctAssetId || this.assetIdToBytes32(params.assetId);
      const tokenAmountWei = ethers.parseUnits(params.tokenAmount, 18);

      console.log('Buying tokens:', {
        assetId: params.assetId,
        assetIdBytes32,
        tokenAmount: params.tokenAmount,
        tokenAmountWei: tokenAmountWei.toString(),
      });

      // Try to estimate gas first to catch errors before sending transaction
      
      // Buy tokens
      const tx = await marketplaceContract.buyTokens(assetIdBytes32, tokenAmountWei);
      console.log('Purchase transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Purchase confirmed:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
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
   * Complete purchase flow: Verify + Approve USDC + Buy Tokens
   * Combines all steps into a single function
   */
  async completePurchase(params: PurchaseParams, tokenAddress?: string): Promise<{
    success: boolean;
    approvalTxHash?: string;
    purchaseTxHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      // Step 0: Verify listing is available
      console.log('Step 0: Verifying listing...');
      const verification = await this.verifyListing(params.assetId, tokenAddress);
      
      if (!verification.isValid) {
        return {
          success: false,
          error: verification.error || 'Listing verification failed',
        };
      }

      console.log('Listing verified:', verification.details);

      // Step 1: Approve USDC
      console.log('Step 1: Approving USDC...');
      const approvalResult = await this.approveUSDC(params);

      if (!approvalResult.success) {
        return {
          success: false,
          error: `Approval failed: ${approvalResult.error}`,
        };
      }

      // Step 2: Buy tokens with correct assetId
      console.log('Step 2: Buying tokens...');
      const purchaseResult = await this.buyTokens(params, verification.correctAssetId);

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
        blockNumber: purchaseResult.blockNumber,
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
