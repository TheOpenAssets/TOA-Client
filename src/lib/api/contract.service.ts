// src/lib/api/contract.service.ts

import { ethers } from 'ethers';

/**
 * Contract Service - Handles smart contract interactions for token purchase
 *
 * Smart Contracts (Updated: 2025-12-25):
 * - USDC: 0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238
 * - PrimaryMarketplace: 0x034Ca27695555CEeB44CB62d59c4E3f95F4Ef504
 */

// Contract addresses - Updated to match deployed_contracts.json (2025-12-25)
const USDC_ADDRESS = '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238';
const PRIMARY_MARKETPLACE_ADDRESS = '0x034Ca27695555CEeB44CB62d59c4E3f95F4Ef504';
const YIELD_VAULT_ADDRESS = '0xb9BfaEDe01f0f2b2162072b73e2b2038Fb42b5cD';

// USDC ABI - Only the functions we need
const USDC_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
];

// PrimaryMarketplace ABI - Must match the actual deployed contract
const MARKETPLACE_ABI = [
  // For ending auctions
  'function endAuction(bytes32 assetId, uint256 clearingPrice) external',

  // For static listings
  'function buyTokens(bytes32 assetId, uint256 amount) external',

  // Universal listings function (from end-auction script, more up-to-date)
  'function listings(bytes32) view returns (address tokenAddress, bytes32 assetId, uint8 listingType, uint256 staticPrice, uint256 reservePrice, uint256 endTime, uint256 clearingPrice, uint8 auctionPhase, uint256 totalSupply, uint256 sold, bool active, uint256 minInvestment)',

  // Event
  'event TokensPurchased(bytes32 indexed assetId, address indexed buyer, uint256 amount, uint256 payment)',
];

// YieldVault ABI - For claiming USDC yield via burn-to-claim model (matches investor-claim-yield.sh)
const YIELD_VAULT_ABI = [
  'function getSettlementInfo(address tokenAddress) view returns (uint256 totalSettlement, uint256 totalTokenSupply, uint256 totalClaimed, uint256 totalTokensBurned, uint256 yieldPerToken)',
  'function getClaimableForTokens(address tokenAddress, uint256 tokenAmount) view returns (uint256)',
  'function claimYield(address tokenAddress, uint256 tokenAmount) external',
  'event YieldClaimed(address indexed user, address indexed tokenAddress, uint256 tokensBurned, uint256 usdcReceived, uint256 timestamp)',
];

// ERC20 ABI for RWA tokens
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
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

      // Get listing to determine type and price
      const listing = await marketplaceContract.listings(assetId);
      const staticPrice = listing[3];
      const totalSupply = listing[8]; // totalSupply is at index 8
      const minInvestmentRaw = listing[11]; // minInvestment is at index 11 (matches buyTokens)

      // FIX: Backend sends minInvestment in 1e18 format (token decimals)
      // but contract expects 1e6 format (USDC decimals)
      // Convert: divide by 1e12 to go from 1e18 to 1e6
      const minInvestment = minInvestmentRaw / BigInt(10 ** 12);

      console.log('\n📊 Listing Details:');
      console.log('Static Price:', ethers.formatUnits(staticPrice, 6), 'USDC per token');
      console.log('Min Investment (raw from backend):', minInvestmentRaw.toString());
      console.log('Min Investment (converted):', ethers.formatUnits(minInvestment, 6), 'USDC');
      console.log('Total Supply:', ethers.formatUnits(totalSupply, 18), 'tokens');

      // Always use staticPrice to avoid revert issues with getCurrentPrice()
      // Note: getCurrentPrice() seems to revert even for auctions in this contract
      const currentPrice = staticPrice;
      console.log('Using static price from listing:', ethers.formatUnits(currentPrice, 6), 'USDC');

      // Calculate payment needed (matching script formula)
      const tokenAmountWei = ethers.parseUnits(params.tokenAmount, 18);
      const payment = (currentPrice * tokenAmountWei) / BigInt(10 ** 18);

      console.log('\n💰 Purchase Calculation:');
      console.log('Token Amount:', params.tokenAmount, 'tokens (', tokenAmountWei.toString(), 'wei)');
      console.log('Price per Token:', ethers.formatUnits(currentPrice, 6), 'USDC');
      console.log('Total Payment:', ethers.formatUnits(payment, 6), 'USDC');
      console.log('Min Investment:', ethers.formatUnits(minInvestment, 6), 'USDC');
      console.log('Payment >= MinInvestment?', payment >= minInvestment ? '✅ YES' : '❌ NO');

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

        const listingType = listing[2]; // 0 = STATIC, 1 = DUTCH_AUCTION
        const staticPrice = listing[3];

        console.log('Listing details (UUID format):', {
          tokenAddress,
          listingType: listingType === 0 ? 'STATIC' : 'DUTCH_AUCTION',
          staticPrice: staticPrice.toString(),
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
            const altStaticPrice = altListing[3];
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

              // Always use staticPrice - getCurrentPrice() reverts in this contract
              const currentPrice = altStaticPrice;

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

        // Always use staticPrice - getCurrentPrice() seems to revert in this contract
        const currentPrice = staticPrice;
        console.log('Using static price:', ethers.formatUnits(currentPrice, 6), 'USDC per token');

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
      const staticPrice = listing[3];
      const totalSupply = listing[8];
      const sold = listing[9];
      const minInvestmentRaw = listing[11];

      // FIX: Backend sends minInvestment in 1e18 format (token decimals)
      // but contract expects 1e6 format (USDC decimals)
      // Convert: divide by 1e12 to go from 1e18 to 1e6
      const minInvestment = minInvestmentRaw / BigInt(10 ** 12);

      console.log('🔧 FRONTEND FIX: Converting minInvestment from backend');
      console.log('Backend sent (1e18 format):', minInvestmentRaw.toString());
      console.log('Converted (1e6 format):', minInvestment.toString());
      console.log('Converted (USDC):', ethers.formatUnits(minInvestment, 6), 'USDC');

      // Always use staticPrice - getCurrentPrice() reverts in this contract
      const currentPrice = staticPrice;
      console.log('Using static price:', ethers.formatUnits(currentPrice, 6), 'USDC per token');

      console.log('Token Address:', tokenAddress);
      console.log('Current Price:', ethers.formatUnits(currentPrice, 6), 'USDC per token');
      console.log('Min Investment:', ethers.formatUnits(minInvestment, 6), 'USDC');
      console.log('Sold:', ethers.formatUnits(sold, 18), '/', ethers.formatUnits(totalSupply, 18), 'tokens');

      // Calculate payment needed (matching script formula)
      const payment = (currentPrice * tokenAmountWei) / BigInt(10 ** 18);
      console.log('\n💰 Payment Calculation:');
      console.log('Payment Required (raw):', payment.toString());
      console.log('Payment Required:', ethers.formatUnits(payment, 6), 'USDC');
      console.log('Min Investment (raw):', minInvestment.toString());
      console.log('Min Investment:', ethers.formatUnits(minInvestment, 6), 'USDC');
      console.log('Payment >= MinInvestment?', payment >= minInvestment ? '✅ YES' : '❌ NO');

      // Check if payment meets minimum investment requirement
      if (payment < minInvestment) {
        const minTokensNeeded = (minInvestment * BigInt(10 ** 18)) / currentPrice;
        throw new Error(
          `Purchase amount (${ethers.formatUnits(payment, 6)} USDC) is below minimum investment (${ethers.formatUnits(minInvestment, 6)} USDC). ` +
          `You need to buy at least ${ethers.formatUnits(minTokensNeeded, 18)} tokens to meet the minimum investment requirement.`
        );
      }

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

  /**
   * Get settlement info and token balance for investor (Step 1 from investor-claim-yield.sh)
   *
   * This matches the bash script's approach:
   * 1. Calls YieldVault.getSettlementInfo(tokenAddress) to get settlement details
   * 2. Gets investor's token balance
   * 3. Checks allowance for YieldVault
   * 4. Calculates expected USDC yield based on token balance
   *
   * Contract: YieldVault 0xb9BfaEDe01f0f2b2162072b73e2b2038Fb42b5cD
   *
   * @param tokenAddress - The RWA token contract address
   * @param investorAddress - The investor wallet address (optional, uses connected wallet if not provided)
   * @returns Settlement info, token balance, allowance, and calculated yield
   */
  async getSettlementInfo(tokenAddress: string, investorAddress?: string): Promise<{
    success: boolean;
    totalSettlement?: string;
    totalTokenSupply?: string;
    totalClaimed?: string;
    totalTokensBurned?: string;
    yieldPerToken?: string;
    investorBalance?: string;
    tokenDecimals?: number;
    tokenSymbol?: string;
    allowance?: string;
    expectedUsdcForAllTokens?: string;
    yieldVaultAddress?: string;
    error?: string;
  }> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = investorAddress || await signer.getAddress();

      const yieldVaultContract = new ethers.Contract(
        YIELD_VAULT_ADDRESS,
        YIELD_VAULT_ABI,
        provider
      );

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      console.log('🔍 Step 1: Checking Settlement Info & Token Balance');
      console.log('━'.repeat(50));
      console.log('YieldVault Address:', YIELD_VAULT_ADDRESS);
      console.log('Token Address:', tokenAddress);
      console.log('Investor Wallet:', userAddress);
      console.log();

      // Get settlement info
      const settlementInfo = await yieldVaultContract.getSettlementInfo(tokenAddress);
      const totalSettlement = settlementInfo[0];
      const totalTokenSupply = settlementInfo[1];
      const totalClaimed = settlementInfo[2];
      const totalTokensBurned = settlementInfo[3];
      const yieldPerToken = settlementInfo[4];

      const settlementUsdc = ethers.formatUnits(totalSettlement, 6);
      const claimedUsdc = ethers.formatUnits(totalClaimed, 6);
      const remainingUsdc = ethers.formatUnits(totalSettlement - totalClaimed, 6);
      const tokensSupply = ethers.formatUnits(totalTokenSupply, 18);
      const tokensBurned = ethers.formatUnits(totalTokensBurned, 18);
      const yieldPerTokenFormatted = ethers.formatUnits(yieldPerToken, 6);

      console.log('Settlement Info:');
      console.log('  Total Settlement:', settlementUsdc, 'USDC');
      console.log('  Token Supply:', tokensSupply, 'tokens');
      console.log('  Yield Per Token:', yieldPerTokenFormatted, 'USDC/token');
      console.log('  Total Claimed:', claimedUsdc, 'USDC');
      console.log('  Tokens Burned:', tokensBurned, 'tokens');
      console.log('  Remaining:', remainingUsdc, 'USDC');
      console.log();

      // Get investor's token balance
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();
      const balanceFormatted = ethers.formatUnits(balance, decimals);

      console.log('Your Token Balance:', balanceFormatted, symbol);
      console.log();

      // Check allowance for YieldVault
      const allowance = await tokenContract.allowance(userAddress, YIELD_VAULT_ADDRESS);
      const allowanceFormatted = ethers.formatUnits(allowance, decimals);

      console.log('YieldVault Allowance:', allowanceFormatted, symbol);
      console.log();

      // Calculate expected USDC for all tokens (matching script formula)
      let expectedUsdc = '0';
      if (totalTokenSupply > 0n && balance > 0n) {
        const expectedUsdcWei = (balance * totalSettlement) / totalTokenSupply;
        expectedUsdc = ethers.formatUnits(expectedUsdcWei, 6);
        console.log('Expected USDC for all your tokens:', expectedUsdc, 'USDC');
        console.log();
      }

      // Validation checks (matching script)
      if (totalSettlement === 0n) {
        console.log('⚠️  No settlement deposited for this token yet!');
        console.log('Wait for admin to deposit settlement to YieldVault');
      }

      if (balance === 0n) {
        console.log('⚠️  You don\'t own any tokens!');
      }

      return {
        success: true,
        totalSettlement: totalSettlement.toString(),
        totalTokenSupply: totalTokenSupply.toString(),
        totalClaimed: totalClaimed.toString(),
        totalTokensBurned: totalTokensBurned.toString(),
        yieldPerToken: yieldPerToken.toString(),
        investorBalance: balance.toString(),
        tokenDecimals: Number(decimals),
        tokenSymbol: symbol,
        allowance: allowance.toString(),
        expectedUsdcForAllTokens: expectedUsdc,
        yieldVaultAddress: YIELD_VAULT_ADDRESS,
      };
    } catch (error: any) {
      console.error('❌ Error checking settlement info:', error);
      return {
        success: false,
        error: error.message || 'Failed to check settlement info',
      };
    }
  }

  /**
   * Approve YieldVault to burn tokens (Step 2 from investor-claim-yield.sh)
   *
   * This approves the YieldVault contract to spend/burn the investor's RWA tokens.
   * Required before calling claimYield.
   *
   * @param tokenAddress - The RWA token contract address
   * @param burnAmountWei - The amount of tokens to approve (in wei)
   * @param currentAllowance - Current allowance (optional, will check if not provided)
   * @returns Transaction result
   */
  async approveYieldVault(
    tokenAddress: string,
    burnAmountWei: string,
    currentAllowance?: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    skipped?: boolean;
    error?: string;
  }> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const investorAddress = await signer.getAddress();

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      // Check current allowance if not provided
      let allowance = currentAllowance ? BigInt(currentAllowance) : 0n;
      if (!currentAllowance) {
        allowance = await tokenContract.allowance(investorAddress, YIELD_VAULT_ADDRESS);
      }

      const burnAmount = BigInt(burnAmountWei);

      console.log('✅ Step 2: Approve YieldVault to Burn Tokens');
      console.log('━'.repeat(50));
      console.log('Token Address:', tokenAddress);
      console.log('YieldVault Address:', YIELD_VAULT_ADDRESS);
      console.log('Current Allowance:', ethers.formatUnits(allowance, 18), 'tokens');
      console.log('Burn Amount:', ethers.formatUnits(burnAmount, 18), 'tokens');
      console.log();

      // Skip if already approved
      if (allowance >= burnAmount) {
        console.log('✅ Tokens already approved - skipping approval step');
        console.log();
        return {
          success: true,
          skipped: true,
        };
      }

      // Approve YieldVault
      console.log('⏳ Approving YieldVault to spend tokens...');
      const tx = await tokenContract.approve(YIELD_VAULT_ADDRESS, burnAmount);
      console.log('TX Hash:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Approved in block', receipt.blockNumber);
      console.log();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Error approving YieldVault:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve YieldVault',
      };
    }
  }

  /**
   * Burn tokens and claim USDC yield (Step 3 from investor-claim-yield.sh)
   *
   * This is the BURN-TO-CLAIM model:
   * - Burns investor's RWA tokens permanently
   * - Transfers pro-rata share of settlement USDC to investor
   *
   * Formula: USDC = (tokensBurned * totalSettlement) / totalTokenSupply
   *
   * Emits: YieldClaimed(address user, address tokenAddress, uint256 tokensBurned, uint256 usdcReceived, uint256 timestamp)
   *
   * Contract: YieldVault 0xb9BfaEDe01f0f2b2162072b73e2b2038Fb42b5cD
   *
   * @param tokenAddress - The RWA token contract address
   * @param burnAmountWei - Amount of tokens to burn (in wei, 18 decimals)
   * @returns Transaction result with actual tokens burned and USDC received
   */
  async claimYield(
    tokenAddress: string,
    burnAmountWei: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    tokensBurned?: string;
    usdcReceived?: string;
    tokensBurnedFormatted?: string;
    usdcReceivedFormatted?: string;
    error?: string;
  }> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please connect your wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const investorAddress = await signer.getAddress();

      const yieldVaultContract = new ethers.Contract(
        YIELD_VAULT_ADDRESS,
        YIELD_VAULT_ABI,
        signer
      );

      console.log('🔥 Step 3: Burn Tokens & Claim USDC');
      console.log('━'.repeat(50));
      console.log('YieldVault:', YIELD_VAULT_ADDRESS);
      console.log('Token Address:', tokenAddress);
      console.log('Investor:', investorAddress);
      console.log('Burn Amount:', ethers.formatUnits(burnAmountWei, 18), 'tokens');
      console.log();
      console.log('⚠️  THIS WILL BURN YOUR TOKENS PERMANENTLY!');
      console.log();

      // Call claimYield(tokenAddress, tokenAmount)
      console.log('⏳ Submitting claimYield() transaction...');
      const tx = await yieldVaultContract.claimYield(tokenAddress, burnAmountWei);
      console.log('TX Hash:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
      console.log();

      // Parse YieldClaimed event to get actual amounts
      let tokensBurned = '0';
      let usdcReceived = '0';

      for (const log of receipt.logs) {
        try {
          const parsed = yieldVaultContract.interface.parseLog(log);
          if (parsed && parsed.name === 'YieldClaimed') {
            tokensBurned = parsed.args.tokensBurned.toString();
            usdcReceived = parsed.args.usdcReceived.toString();

            const tokensBurnedFormatted = ethers.formatUnits(tokensBurned, 18);
            const usdcReceivedFormatted = ethers.formatUnits(usdcReceived, 6);

            console.log('Tokens Burned:', tokensBurnedFormatted, 'tokens 🔥');
            console.log('USDC Received:', usdcReceivedFormatted, 'USDC');
            console.log();
          }
        } catch (e) {
          // Skip non-matching logs
        }
      }

      console.log('✅ Yield claimed successfully!');
      console.log('TX Hash:', tx.hash);
      console.log('Block:', receipt.blockNumber);
      console.log('Explorer:', `https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);
      console.log();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokensBurned: tokensBurned,
        usdcReceived: usdcReceived,
        tokensBurnedFormatted: ethers.formatUnits(tokensBurned, 18),
        usdcReceivedFormatted: ethers.formatUnits(usdcReceived, 6),
      };
    } catch (error: any) {
      console.error('❌ Error claiming yield:', error);
      return {
        success: false,
        error: error.message || 'Failed to claim yield',
      };
    }
  }

  /**
   * Approve PrimaryMarketplace to spend RWA tokens (Admin action after listing)
   *
   * This is executed by the ADMIN wallet directly on-chain after listing an asset.
   * Matches approve-marketplace.js script:
   * - Checks current allowance first
   * - Only approves if allowance is 0
   * - Uses MaxUint256 for unlimited approval
   *
   * Contract Addresses (Mantle Testnet):
   * - PrimaryMarketplace: 0x034Ca27695555CEeB44CB62d59c4E3f95F4Ef504
   *
   * @param tokenAddress - The RWA token address to approve
   * @returns { success, transactionHash, blockNumber, alreadyApproved }
   */
  async approveMarketplaceForRWAToken(tokenAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    alreadyApproved?: boolean;
    error?: string;
  }> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please connect your admin wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const adminAddress = await signer.getAddress();

      const RWA_TOKEN_ABI = [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function name() view returns (string)',
        'function symbol() view returns (string)',
      ];

      const rwaToken = new ethers.Contract(tokenAddress, RWA_TOKEN_ABI, signer);

      console.log('💰 Approving Marketplace to Spend RWA Tokens');
      console.log('━'.repeat(50));
      console.log('Token:', tokenAddress);
      console.log('Marketplace:', PRIMARY_MARKETPLACE_ADDRESS);
      console.log('Admin Wallet:', adminAddress);
      console.log();

      // Get token info
      const tokenName = await rwaToken.name();
      const tokenSymbol = await rwaToken.symbol();
      const balance = await rwaToken.balanceOf(adminAddress);

      console.log(`Token: ${tokenName} (${tokenSymbol})`);
      console.log(`Admin Balance: ${ethers.formatEther(balance)} tokens`);
      console.log();

      // Check current allowance
      const currentAllowance = await rwaToken.allowance(adminAddress, PRIMARY_MARKETPLACE_ADDRESS);
      console.log(`Current Allowance: ${ethers.formatEther(currentAllowance)} tokens`);

      if (currentAllowance > 0n) {
        console.log('✅ Marketplace already has approval!');
        return {
          success: true,
          alreadyApproved: true,
        };
      }

      // Approve max amount (unlimited approval for convenience)
      const maxApproval = ethers.MaxUint256;

      console.log('⏳ Approving marketplace (unlimited)...');
      const tx = await rwaToken.approve(PRIMARY_MARKETPLACE_ADDRESS, maxApproval);
      console.log('TX:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
      console.log('✅ Marketplace approved!');
      console.log('Explorer:', `https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);
      console.log();
      console.log('✅ Marketplace can now transfer tokens to buyers!');

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Error approving marketplace:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve marketplace',
      };
    }
  }

  async endAuctionOnChain(assetId: string, clearingPrice: string): Promise<{ success: boolean, transactionHash?: string, blockNumber?: number, clearingPriceWei?: string, error?: string }> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please connect your admin wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const adminAddress = await signer.getAddress();

      const marketplaceContract = new ethers.Contract(PRIMARY_MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const assetIdBytes32 = this.assetIdToBytes32(assetId);
      const clearingPriceWei = ethers.parseUnits(clearingPrice, 6); // USDC has 6 decimals

      console.log('🔥 Ending Auction On-Chain');
      console.log('━'.repeat(50));
      console.log('Asset ID (bytes32):', assetIdBytes32);
      console.log('Admin Wallet:', adminAddress);
      console.log('Clearing Price:', clearingPrice, 'USDC');
      console.log('Clearing Price (wei):', clearingPriceWei.toString());
      
      console.log('Submitting endAuction transaction...');
      const tx = await marketplaceContract.endAuction(assetIdBytes32, clearingPriceWei);
      console.log('TX Hash:', tx.hash);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Confirmed in block', receipt.blockNumber);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        clearingPriceWei: clearingPriceWei.toString(),
      };

    } catch (error: any) {
      console.error('❌ Error ending auction on-chain:', error);
      return {
        success: false,
        error: error.message || 'Failed to end auction on-chain',
      };
    }
  }
}

export const contractService = new ContractService();
