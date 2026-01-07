/**
 * Solvency Vault Contract Service
 * Handles all smart contract interactions for borrowing/lending
 *
 * ✅ VERIFIED: Based on deposit-to-vaultsolvency.js (working script)
 * Contract ABI matches actual deployed contract
 */

import { ethers } from 'ethers';

// Contract addresses from environment
const VAULT_CONTRACT_ADDRESS = import.meta.env.VITE_VAULT_CONTRACT_ADDRESS || '0x0849B8d12Ac2a7Fcab4FAe8a46154e9778579493';
const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238';

// Solvency Vault ABI - ✅ VERIFIED from deposit-to-vaultsolvency.js lines 115-121
const SOLVENCY_VAULT_ABI = [
  // Write functions
  'function depositCollateral(address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType, bool issueOAID) external returns (uint256 positionId)',
  'function borrowUSDC(uint256 positionId, uint256 amount) external',
  'function repayLoan(uint256 positionId, uint256 amount) external',
  'function withdrawCollateral(uint256 positionId, uint256 amount) external',

  // Read functions
  'function positions(uint256) view returns (address user, address collateralToken, uint256 collateralAmount, uint256 usdcBorrowed, uint256 tokenValueUSD, uint256 createdAt, bool active, uint8 tokenType)',

  // Events
  'event PositionCreated(uint256 indexed positionId, address indexed user, address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType)',
  'event USDCBorrowed(uint256 indexed positionId, uint256 amount, uint256 totalDebt)',
];

// ERC20 Token ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// USDC ABI (6 decimals)
const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  positionId?: string; // For depositCollateral
  error?: string;
}

export interface Position {
  user: string;
  collateralToken: string;
  collateralAmount: bigint;
  usdcBorrowed: bigint;
  tokenValueUSD: bigint;
  createdAt: bigint;
  active: boolean;
  tokenType: number; // 0 = RWA, 1 = PRIVATE_ASSET
}

class SolvencyContractService {
  /**
   * Get provider and signer from browser wallet
   */
  private async getProviderAndSigner() {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    // Check if on Mantle Sepolia (chainId: 5003)
    if (network.chainId !== 5003n) {
      throw new Error(
        `Wrong network. Please switch to Mantle Sepolia (chainId: 5003). Currently on chainId: ${network.chainId}`
      );
    }

    const signer = await provider.getSigner();
    return { provider, signer };
  }

  /**
   * Get vault contract instance
   */
  private async getVaultContract() {
    const { signer } = await this.getProviderAndSigner();
    return new ethers.Contract(VAULT_CONTRACT_ADDRESS, SOLVENCY_VAULT_ABI, signer);
  }

  /**
   * Get ERC20 token contract instance
   */
  private async getTokenContract(tokenAddress: string) {
    const { signer } = await this.getProviderAndSigner();
    return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  }

  /**
   * Get USDC contract instance
   */
  private async getUSDCContract() {
    const { signer } = await this.getProviderAndSigner();
    return new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);
  }

  // ============================================
  // READ FUNCTIONS
  // ============================================

  /**
   * Get position details from contract
   * Reference: deposit-to-vaultsolvency.js lines 304-322
   */
  async getPosition(positionId: number): Promise<Position> {
    try {
      const vault = await this.getVaultContract();
      const position = await vault.positions(positionId);

      return {
        user: position.user,
        collateralToken: position.collateralToken,
        collateralAmount: position.collateralAmount,
        usdcBorrowed: position.usdcBorrowed,
        tokenValueUSD: position.tokenValueUSD,
        createdAt: position.createdAt,
        active: position.active,
        tokenType: position.tokenType,
      };
    } catch (error: any) {
      console.error('❌ Error fetching position:', error);
      throw new Error(`Failed to fetch position: ${error.message}`);
    }
  }

  /**
   * Get token balance of user
   * Reference: deposit-to-vaultsolvency.js lines 171-180
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<bigint> {
    try {
      const token = await this.getTokenContract(tokenAddress);
      const balance: bigint = await token.balanceOf(userAddress);
      console.log(`   Token balance for ${userAddress}: ${ethers.formatUnits(balance, 18)}`);
      return balance;
    } catch (error: any) {
      console.error('❌ Error checking token balance:', error);
      throw new Error(`Failed to check token balance: ${error.message}`);
    }
  }

  /**
   * Get USDC balance of user
   */
  async getUSDCBalance(userAddress: string): Promise<bigint> {
    try {
      const usdc = await this.getUSDCContract();
      const balance: bigint = await usdc.balanceOf(userAddress);
      return balance;
    } catch (error: any) {
      console.error('❌ Error checking USDC balance:', error);
      throw new Error(`Failed to check USDC balance: ${error.message}`);
    }
  }

  /**
   * Check token allowance
   */
  async getTokenAllowance(
    tokenAddress: string,
    ownerAddress: string
  ): Promise<bigint> {
    try {
      const token = await this.getTokenContract(tokenAddress);
      const allowance: bigint = await token.allowance(ownerAddress, VAULT_CONTRACT_ADDRESS);
      return allowance;
    } catch (error: any) {
      console.error('❌ Error checking token allowance:', error);
      throw new Error(`Failed to check token allowance: ${error.message}`);
    }
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const token = await this.getTokenContract(tokenAddress);
      return await token.decimals();
    } catch (error: any) {
      console.error('❌ Error getting token decimals:', error);
      throw new Error(`Failed to get token decimals: ${error.message}`);
    }
  }

  /**
   * Get token symbol
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const token = await this.getTokenContract(tokenAddress);
      return await token.symbol();
    } catch (error: any) {
      console.error('❌ Error getting token symbol:', error);
      throw new Error(`Failed to get token symbol: ${error.message}`);
    }
  }

  // ============================================
  // WRITE FUNCTIONS
  // ============================================

  /**
   * Approve token for vault contract
   * Reference: deposit-to-vaultsolvency.js lines 182-199
   */
  async approveToken(
    tokenAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    try {
      console.log('🔓 Approving token:', { tokenAddress, amount: amount.toString() });

      const token = await this.getTokenContract(tokenAddress);

      // Check current allowance
      const { signer } = await this.getProviderAndSigner();
      const userAddress = await signer.getAddress();
      const currentAllowance = await token.allowance(userAddress, VAULT_CONTRACT_ADDRESS);

      console.log(`   Current allowance: ${ethers.formatUnits(currentAllowance, 18)}`);

      if (currentAllowance >= amount) {
        console.log('✅ Sufficient allowance already granted');
        return {
          success: true,
          txHash: '',
          blockNumber: 0,
        };
      }

      const tx = await token.approve(VAULT_CONTRACT_ADDRESS, amount);
      console.log(`   Approval transaction: ${tx.hash}`);
      console.log('⏳ Waiting for approval confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Token approved successfully!', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Token approval failed:', error);
      return {
        success: false,
        error: error.message || 'Token approval failed',
      };
    }
  }

  /**
   * Deposit collateral to vault
   *
   * ✅ VERIFIED: Based on deposit-to-vaultsolvency.js lines 201-256
   *
   * @param tokenAddress - RWA token address
   * @param amount - Amount in wei (18 decimals)
   * @param tokenValueUSD - USD value (6 decimals)
   * @param tokenType - 0 = RWA, 1 = PRIVATE_ASSET
   * @param issueOAID - Whether to create OAID credit line (usually true)
   * @returns Transaction result with positionId
   */
  async depositCollateral(
    tokenAddress: string,
    amount: bigint,
    tokenValueUSD: bigint,
    tokenType: number = 0,
    issueOAID: boolean = true
  ): Promise<TransactionResult> {
    try {
      console.log('💰 Depositing collateral:', {
        tokenAddress,
        amount: amount.toString(),
        tokenValueUSD: tokenValueUSD.toString(),
        tokenType,
        issueOAID,
      });

      const vault = await this.getVaultContract();

      console.log(`   Depositing ${ethers.formatUnits(amount, 18)} tokens...`);
      console.log(`   Token value: $${ethers.formatUnits(tokenValueUSD, 6)} USD`);
      console.log(`   Issue OAID: ${issueOAID}`);

      // Call depositCollateral (investor signs transaction directly)
      const tx = await vault.depositCollateral(
        tokenAddress,
        amount,
        tokenValueUSD,
        tokenType,
        issueOAID
      );

      console.log(`   Transaction submitted: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation (this may take up to 5 minutes)...');

      const receipt = await tx.wait();
      console.log(`✅ Deposit confirmed in block ${receipt.blockNumber}`);

      // Parse PositionCreated event to get positionId
      let positionId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = vault.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          if (parsed && parsed.name === 'PositionCreated') {
            positionId = parsed.args.positionId.toString();
            console.log(`✅ Position created with ID: ${positionId}`);
            break;
          }
        } catch (e) {
          // Skip non-matching logs
        }
      }

      if (!positionId) {
        throw new Error('Could not parse position ID from transaction');
      }

      console.log(`   Explorer: https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        positionId,
      };
    } catch (error: any) {
      console.error('❌ Deposit failed:', error);
      return {
        success: false,
        error: error.message || 'Deposit transaction failed',
      };
    }
  }

  /**
   * Borrow USDC from vault
   *
   * ✅ VERIFIED: Based on deposit-to-vaultsolvency.js lines 258-302
   *
   * @param positionId - Position ID to borrow against
   * @param amount - USDC amount in wei (6 decimals)
   * @returns Transaction result
   */
  async borrowUSDC(positionId: number, amount: bigint): Promise<TransactionResult> {
    try {
      console.log('💸 Borrowing USDC:', {
        positionId,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();

      console.log(`   Borrowing $${ethers.formatUnits(amount, 6)} USDC from SeniorPool...`);

      const tx = await vault.borrowUSDC(positionId, amount);

      console.log(`   Transaction submitted: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Borrow confirmed in block ${receipt.blockNumber}`);

      // Parse USDCBorrowed event
      let borrowed = null;
      let totalDebt = null;
      for (const log of receipt.logs) {
        try {
          const parsed = vault.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          if (parsed && parsed.name === 'USDCBorrowed') {
            borrowed = parsed.args.amount;
            totalDebt = parsed.args.totalDebt;
            console.log(`✅ Borrowed: $${ethers.formatUnits(borrowed, 6)} USDC`);
            console.log(`   Total Debt: $${ethers.formatUnits(totalDebt, 6)} USDC`);
            break;
          }
        } catch (e) {
          // Skip non-matching logs
        }
      }

      console.log(`   Explorer: https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Borrow failed:', error);
      return {
        success: false,
        error: error.message || 'Borrow transaction failed',
      };
    }
  }

  /**
   * Repay loan to vault
   *
   * @param positionId - Position ID to repay
   * @param amount - USDC amount to repay (6 decimals)
   * @returns Transaction result
   */
  async repayLoan(positionId: number, amount: bigint): Promise<TransactionResult> {
    try {
      console.log('💵 Repaying debt:', {
        positionId,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();
      const tx = await vault.repayLoan(positionId, amount);

      console.log(`   Transaction submitted: ${tx.hash}`);
      console.log('⏳ Waiting for repayment confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Repayment confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Repayment failed:', error);
      return {
        success: false,
        error: error.message || 'Repayment transaction failed',
      };
    }
  }

  /**
   * Withdraw collateral from vault
   *
   * @param positionId - Position ID to withdraw from
   * @param amount - Amount to withdraw (18 decimals)
   * @returns Transaction result
   */
  async withdrawCollateral(
    positionId: number,
    amount: bigint
  ): Promise<TransactionResult> {
    try {
      console.log('🏦 Withdrawing collateral:', {
        positionId,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();
      const tx = await vault.withdrawCollateral(positionId, amount);

      console.log(`   Transaction submitted: ${tx.hash}`);
      console.log('⏳ Waiting for withdrawal confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Withdrawal failed:', error);
      return {
        success: false,
        error: error.message || 'Withdrawal transaction failed',
      };
    }
  }

  /**
   * Approve USDC for vault contract
   */
  async approveUSDC(amount: bigint): Promise<TransactionResult> {
    try {
      console.log('🔓 Approving USDC:', amount.toString());

      const usdc = await this.getUSDCContract();
      const tx = await usdc.approve(VAULT_CONTRACT_ADDRESS, amount);

      console.log('⏳ Waiting for USDC approval confirmation...', tx.hash);
      const receipt = await tx.wait();

      console.log('✅ USDC approved successfully!', receipt.hash);
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ USDC approval failed:', error);
      return {
        success: false,
        error: error.message || 'USDC approval failed',
      };
    }
  }
}

export const solvencyContractService = new SolvencyContractService();
