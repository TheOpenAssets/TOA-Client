/**
 * Solvency Vault Contract Service
 * Handles all smart contract interactions for borrowing/lending
 */

import { ethers } from 'ethers';
import { type TokenApprovalState } from '../../types/solvency.types';

// Contract addresses from environment
const VAULT_CONTRACT_ADDRESS = import.meta.env.VITE_VAULT_CONTRACT_ADDRESS || '';
const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238';

// Vault Contract ABI - Based on SOLVENCY_INTEGRATION.md
const VAULT_ABI = [
  // Read functions
  'function getCollateralBalance(bytes32 oaidId, address tokenAddress) view returns (uint256)',
  'function getDebtBalance(bytes32 oaidId) view returns (uint256)',
  'function calculateHealthFactor(bytes32 oaidId) view returns (uint256)',
  'function getCreditLimit(bytes32 oaidId) view returns (uint256)',

  // Write functions
  'function depositCollateral(bytes32 oaidId, address tokenAddress, uint256 amount) external',
  'function borrow(bytes32 oaidId, uint256 amount) external',
  'function repay(bytes32 oaidId, uint256 amount) external',
  'function withdrawCollateral(bytes32 oaidId, address tokenAddress, uint256 amount) external',

  // Events
  'event CollateralDeposited(bytes32 indexed oaidId, address indexed user, address tokenAddress, uint256 amount)',
  'event Borrowed(bytes32 indexed oaidId, address indexed user, uint256 amount)',
  'event Repaid(bytes32 indexed oaidId, address indexed user, uint256 amount)',
  'event CollateralWithdrawn(bytes32 indexed oaidId, address indexed user, address tokenAddress, uint256 amount)',
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
  error?: string;
}

class SolvencyContractService {
  /**
   * Convert UUID OAID to bytes32 format
   * Example: "4d02feaa-7b32-4c35-980f-5710b73a982a" -> "0x4d02feaa7b324c35980f5710b73a982a00000000000000000000000000000000"
   */
  private oaidToBytes32(oaidId: string): string {
    const cleanId = oaidId.replace(/-/g, '');
    const paddedId = cleanId.padEnd(64, '0');
    return '0x' + paddedId;
  }

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
    return new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer);
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
   * Get collateral balance for a specific token
   */
  async getCollateralBalance(oaidId: string, tokenAddress: string): Promise<bigint> {
    try {
      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);
      const balance: bigint = await vault.getCollateralBalance(bytes32OaidId, tokenAddress);
      return balance;
    } catch (error: any) {
      console.error('❌ Error fetching collateral balance:', error);
      throw new Error(`Failed to fetch collateral balance: ${error.message}`);
    }
  }

  /**
   * Get debt balance in USDC
   */
  async getDebtBalance(oaidId: string): Promise<bigint> {
    try {
      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);
      const debt: bigint = await vault.getDebtBalance(bytes32OaidId);
      return debt;
    } catch (error: any) {
      console.error('❌ Error fetching debt balance:', error);
      throw new Error(`Failed to fetch debt balance: ${error.message}`);
    }
  }

  /**
   * Calculate health factor (returned as percentage * 100)
   * Example: 15000 = 150.00%
   */
  async calculateHealthFactor(oaidId: string): Promise<bigint> {
    try {
      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);
      const healthFactor: bigint = await vault.calculateHealthFactor(bytes32OaidId);
      return healthFactor;
    } catch (error: any) {
      console.error('❌ Error calculating health factor:', error);
      throw new Error(`Failed to calculate health factor: ${error.message}`);
    }
  }

  /**
   * Get credit limit in USDC
   */
  async getCreditLimit(oaidId: string): Promise<bigint> {
    try {
      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);
      const creditLimit: bigint = await vault.getCreditLimit(bytes32OaidId);
      return creditLimit;
    } catch (error: any) {
      console.error('❌ Error fetching credit limit:', error);
      throw new Error(`Failed to fetch credit limit: ${error.message}`);
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
   * Check USDC allowance
   */
  async getUSDCAllowance(ownerAddress: string): Promise<bigint> {
    try {
      const usdc = await this.getUSDCContract();
      const allowance: bigint = await usdc.allowance(ownerAddress, VAULT_CONTRACT_ADDRESS);
      return allowance;
    } catch (error: any) {
      console.error('❌ Error checking USDC allowance:', error);
      throw new Error(`Failed to check USDC allowance: ${error.message}`);
    }
  }

  /**
   * Get token balance of user
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<bigint> {
    try {
      const token = await this.getTokenContract(tokenAddress);
      const balance: bigint = await token.balanceOf(userAddress);
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
   * Check if token approval is sufficient
   */
  async checkTokenApproval(
    tokenAddress: string,
    ownerAddress: string,
    requiredAmount: bigint
  ): Promise<TokenApprovalState> {
    try {
      const currentAllowance = await this.getTokenAllowance(tokenAddress, ownerAddress);

      return {
        isApproved: currentAllowance >= requiredAmount,
        currentAllowance,
        requiredAmount,
      };
    } catch (error: any) {
      console.error('❌ Error checking token approval:', error);
      throw new Error(`Failed to check token approval: ${error.message}`);
    }
  }

  // ============================================
  // WRITE FUNCTIONS
  // ============================================

  /**
   * Approve token for vault contract
   */
  async approveToken(
    tokenAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    try {
      console.log('🔓 Approving token:', { tokenAddress, amount: amount.toString() });

      const token = await this.getTokenContract(tokenAddress);
      const tx = await token.approve(VAULT_CONTRACT_ADDRESS, amount);

      console.log('⏳ Waiting for approval confirmation...', tx.hash);
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

  /**
   * Deposit collateral to vault
   */
  async depositCollateral(
    oaidId: string,
    tokenAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    try {
      console.log('💰 Depositing collateral:', {
        oaidId,
        tokenAddress,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);

      const tx = await vault.depositCollateral(bytes32OaidId, tokenAddress, amount);

      console.log('⏳ Waiting for deposit confirmation...', tx.hash);
      const receipt = await tx.wait();

      console.log('✅ Collateral deposited successfully!', receipt.hash);
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
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
   */
  async borrow(oaidId: string, amount: bigint): Promise<TransactionResult> {
    try {
      console.log('💸 Borrowing USDC:', {
        oaidId,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);

      const tx = await vault.borrow(bytes32OaidId, amount);

      console.log('⏳ Waiting for borrow confirmation...', tx.hash);
      const receipt = await tx.wait();

      console.log('✅ Borrow successful!', receipt.hash);
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
   * Repay debt to vault
   */
  async repay(oaidId: string, amount: bigint): Promise<TransactionResult> {
    try {
      console.log('💵 Repaying debt:', {
        oaidId,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);

      const tx = await vault.repay(bytes32OaidId, amount);

      console.log('⏳ Waiting for repayment confirmation...', tx.hash);
      const receipt = await tx.wait();

      console.log('✅ Repayment successful!', receipt.hash);
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
   */
  async withdrawCollateral(
    oaidId: string,
    tokenAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    try {
      console.log('🏦 Withdrawing collateral:', {
        oaidId,
        tokenAddress,
        amount: amount.toString(),
      });

      const vault = await this.getVaultContract();
      const bytes32OaidId = this.oaidToBytes32(oaidId);

      const tx = await vault.withdrawCollateral(bytes32OaidId, tokenAddress, amount);

      console.log('⏳ Waiting for withdrawal confirmation...', tx.hash);
      const receipt = await tx.wait();

      console.log('✅ Withdrawal successful!', receipt.hash);
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
}

export const solvencyContractService = new SolvencyContractService();
