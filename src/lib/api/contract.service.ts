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

// PrimaryMarketplace ABI - Must match the actual deployed contract
const MARKETPLACE_ABI = [
  'function buyTokens(bytes32 assetId, uint256 amount) external',
  'function getCurrentPrice(bytes32 assetId) view returns (uint256)',
  'function listings(bytes32) view returns (address tokenAddress, bytes32 assetId, uint8 listingType, uint256 staticPrice, uint256 startPrice, uint256 endPrice, uint256 duration, uint256 startTime, uint256 totalSupply, uint256 sold, bool active, uint256 minInvestment)',
  'event TokensPurchased(bytes32 indexed assetId, address indexed buyer, uint256 amount, uint256 payment)',
];

export interface PurchaseParams {
  assetId: string;
  tokenAmount: string;
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
   * Step 1 of purchase flow - Matches buy-tokens.js script exactly
   */
  async approveUSDC(params: PurchaseParams, assetIdBytes32?: string): Promise<PurchaseResult> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      const marketplaceContract = new ethers.Contract(PRIMARY_MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

      // Get current price from contract
      const assetId = assetIdBytes32 || this.assetIdToBytes32(params.assetId);
      const currentPrice = await marketplaceContract.getCurrentPrice(assetId);

      // Calculate payment needed (matching script formula)
      const tokenAmountWei = ethers.parseUnits(params.tokenAmount, 18);
      const payment = (currentPrice * tokenAmountWei) / BigInt(10 ** 18);

      console.log('\n✅ Step 1: Approving USDC...');
      console.log('Payment to approve:', ethers.formatUnits(payment, 6), 'USDC');

      // Check current allowance (matching script)
      const allowance = await usdcContract.allowance(userAddress, PRIMARY_MARKETPLACE_ADDRESS);
      console.log('Current allowance:', ethers.formatUnits(allowance, 6), 'USDC');

      if (allowance < payment) {
        // Approve USDC
        const tx = await usdcContract.approve(PRIMARY_MARKETPLACE_ADDRESS, payment);
        console.log('Approve TX:', tx.hash);

        const receipt = await tx.wait();
        console.log('✅ USDC approved');

        return {
          success: true,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
        };
      } else {
        console.log('✅ USDC already approved');
        return {
          success: true,
          transactionHash: '0x0', // No transaction needed
          blockNumber: 0,
        };
      }
    } catch (error: any) {
      console.error('❌ Error approving USDC:', error);
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
        const listing1 = await marketplaceContract.listings(format1);
        console.log('✅ Format 1 FOUND:', {
          tokenAddress: listing1[0],
          totalSupply: listing1[8].toString(),
          sold: listing1[9].toString(),
          availableSupply: (listing1[8] - listing1[9]).toString(),
          minInvestment: listing1[11].toString(),
          isActive: listing1[10],
        });
      } catch (e) {
        console.log('❌ Format 1 not found');
      }

      // Format 2: Keccak256 hash of UUID
      const format2 = ethers.keccak256(ethers.toUtf8Bytes(assetId));
      console.log('\n2. Keccak256(UUID):', format2);
      try {
        const listing2 = await marketplaceContract.listings(format2);
        console.log('✅ Format 2 FOUND:', {
          tokenAddress: listing2[0],
          totalSupply: listing2[8].toString(),
          sold: listing2[9].toString(),
          availableSupply: (listing2[8] - listing2[9]).toString(),
          minInvestment: listing2[11].toString(),
          isActive: listing2[10],
        });
      } catch (e) {
        console.log('❌ Format 2 not found');
      }

      // Format 3: Keccak256 hash of token address
      const format3 = ethers.keccak256(ethers.getBytes(tokenAddress));
      console.log('\n3. Keccak256(tokenAddress):', format3);
      try {
        const listing3 = await marketplaceContract.listings(format3);
        console.log('✅ Format 3 FOUND:', {
          tokenAddress: listing3[0],
          totalSupply: listing3[8].toString(),
          sold: listing3[9].toString(),
          availableSupply: (listing3[8] - listing3[9]).toString(),
          minInvestment: listing3[11].toString(),
          isActive: listing3[10],
        });
      } catch (e) {
        console.log('❌ Format 3 not found');
      }

      // Format 4: Just the token address as bytes32
      const format4 = ethers.zeroPadValue(tokenAddress, 32);
      console.log('\n4. Token address as bytes32:', format4);
      try {
        const listing4 = await marketplaceContract.listings(format4);
        console.log('✅ Format 4 FOUND:', {
          tokenAddress: listing4[0],
          totalSupply: listing4[8].toString(),
          sold: listing4[9].toString(),
          availableSupply: (listing4[8] - listing4[9]).toString(),
          minInvestment: listing4[11].toString(),
          isActive: listing4[10],
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
        const listing = await marketplaceContract.listings(assetIdBytes32);

        // Correct field mapping from actual contract:
        // [0] tokenAddress, [1] assetId, [2] listingType, [3] staticPrice,
        // [4] startPrice, [5] endPrice, [6] duration, [7] startTime,
        // [8] totalSupply, [9] sold, [10] active, [11] minInvestment

        const tokenAddress = listing[0];
        const totalSupply = listing[8];
        const sold = listing[9];
        const active = listing[10];
        const minInvestment = listing[11];

        console.log('Listing details (UUID format):', {
          tokenAddress,
          totalSupply: totalSupply.toString(),
          sold: sold.toString(),
          availableSupply: (totalSupply - sold).toString(),
          minInvestment: minInvestment.toString(),
          isActive: active,
        });

        // Check if listing exists (tokenAddress should not be zero address)
        if (tokenAddress === ethers.ZeroAddress) {
          // Try alternative format: keccak256 of UUID
          const altAssetId = ethers.keccak256(ethers.toUtf8Bytes(assetId));
          console.log('Trying alternative format:', altAssetId);
          
          try {
            const altListing = await marketplaceContract.listings(altAssetId);
            const altTokenAddress = altListing[0];
            const altTotalSupply = altListing[8];
            const altSold = altListing[9];
            const altActive = altListing[10];

            if (altTokenAddress !== ethers.ZeroAddress) {
              console.log('✅ Found listing with keccak256 format!');

              if (!altActive) {
                return { isValid: false, error: 'Listing is not active' };
              }

              const availableSupply = altTotalSupply - altSold;
              if (Number(availableSupply) === 0) {
                return { isValid: false, error: 'No tokens available for purchase' };
              }

              // Get current price
              const currentPrice = await marketplaceContract.getCurrentPrice(altAssetId);

              return {
                isValid: true,
                correctAssetId: altAssetId,
                details: {
                  tokenAddress: altTokenAddress,
                  currentPrice: currentPrice.toString(),
                  availableSupply: ethers.formatUnits(availableSupply, 18),
                  isActive: altActive,
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

        if (!active) {
          return { isValid: false, error: 'Listing is not active' };
        }

        const availableSupply = totalSupply - sold;
        if (Number(availableSupply) === 0) {
          return { isValid: false, error: 'No tokens available for purchase' };
        }

        // Get current price using getCurrentPrice()
        const currentPrice = await marketplaceContract.getCurrentPrice(assetIdBytes32);
        console.log('Current price:', ethers.formatUnits(currentPrice, 18), 'USDC per token');

        return {
          isValid: true,
          correctAssetId: assetIdBytes32,
          details: {
            tokenAddress,
            currentPrice: currentPrice.toString(),
            availableSupply: ethers.formatUnits(availableSupply, 18),
            isActive: active,
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
   * Step 2 of purchase flow - Matches buy-tokens.js script exactly
   */
  async buyTokens(params: PurchaseParams, correctAssetId?: string): Promise<PurchaseResult> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const marketplaceContract = new ethers.Contract(
        PRIMARY_MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

      // Use correctAssetId if provided from verification, otherwise convert UUID
      const assetIdBytes32 = correctAssetId || this.assetIdToBytes32(params.assetId);
      const tokenAmountWei = ethers.parseUnits(params.tokenAmount, 18);

      console.log('🛒 Buying RWA Tokens from Marketplace');
      console.log('━'.repeat(50));
      console.log('Asset ID:', params.assetId);
      console.log('Asset ID (bytes32):', assetIdBytes32);
      console.log('Buyer:', userAddress);
      console.log('Marketplace:', PRIMARY_MARKETPLACE_ADDRESS);
      console.log('USDC:', USDC_ADDRESS);
      console.log('Token Amount:', params.tokenAmount, 'tokens');
      console.log('Token Amount (wei):', tokenAmountWei.toString());

      // Get listing info (matching script)
      console.log('\n📋 Fetching listing info...');
      const listing = await marketplaceContract.listings(assetIdBytes32);
      const tokenAddress = listing[0];
      const currentPrice = await marketplaceContract.getCurrentPrice(assetIdBytes32);
      const totalSupply = listing[8];
      const sold = listing[9];
      const minInvestment = listing[11];

      console.log('Token Address:', tokenAddress);
      console.log('Current Price:', ethers.formatUnits(currentPrice, 18), 'USDC per token');
      console.log('Min Investment:', ethers.formatUnits(minInvestment, 18), 'tokens');
      console.log('Sold:', ethers.formatUnits(sold, 18), '/', ethers.formatUnits(totalSupply, 18), 'tokens');

      // Calculate payment needed (matching script formula)
      const payment = (currentPrice * tokenAmountWei) / BigInt(10 ** 18);
      console.log('\n💰 Payment Required (raw):', payment.toString());
      console.log('💰 Payment Required:', ethers.formatUnits(payment, 6), 'USDC');

      // Check USDC balance
      const usdcBalance = await usdcContract.balanceOf(userAddress);
      console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');

      if (usdcBalance < payment) {
        throw new Error(`Insufficient USDC balance! Need ${ethers.formatUnits(payment, 6)} USDC but have ${ethers.formatUnits(usdcBalance, 6)} USDC`);
      }

      // Check current allowance
      const currentAllowance = await usdcContract.allowance(userAddress, PRIMARY_MARKETPLACE_ADDRESS);
      console.log('Current USDC Allowance:', ethers.formatUnits(currentAllowance, 6), 'USDC');

      if (currentAllowance < payment) {
        throw new Error(`Insufficient USDC allowance! Please approve USDC first. Need ${ethers.formatUnits(payment, 6)} USDC allowance but have ${ethers.formatUnits(currentAllowance, 6)} USDC`);
      }

      // Buy tokens
      console.log('\n✅ Step 2: Buying tokens...');
      const tx = await marketplaceContract.buyTokens(assetIdBytes32, tokenAmountWei);
      console.log('Buy TX:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
      console.log('\n✅ Purchase Complete!');
      console.log('━'.repeat(50));
      console.log(`Explorer: https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('\n❌ Error buying tokens:', error);
      if (error.data) {
        console.error('Error data:', error.data);
      }
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

      // Step 1: Approve USDC with correct assetId
      console.log('Step 1: Approving USDC...');
      const approvalResult = await this.approveUSDC(params, verification.correctAssetId);

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
