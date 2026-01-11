/**
 * Solvency Vault Contract Service
 * Handles all smart contract interactions for borrowing/lending
 *
 * ✅ VERIFIED: Based on deposit-to-vaultsolvency.js (working script)
 * Contract ABI matches actual deployed contract
 */

import { ethers } from 'ethers';

// Contract addresses from environment
const VAULT_CONTRACT_ADDRESS = import.meta.env.VITE_SOLVENCY_VAULT || '0x9c276B10456aCF5FD74A0f110242bBEC5287fCFc';
const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238';

// Solvency Vault ABI - ✅ VERIFIED from deposit-to-vaultsolvency.js lines 115-121
// Updated borrowUSDC to include loanDuration and numberOfInstallments per COMPLETE_LOAN.md
const SOLVENCY_VAULT_ABI = [
  // Write functions
  'function depositCollateral(address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType, bool issueOAID) external returns (uint256 positionId)',
  'function borrowUSDC(uint256 positionId, uint256 amount, uint256 loanDuration, uint256 numberOfInstallments) external returns (uint256 loanId)',
  'function repayLoan(uint256 positionId, uint256 amount) external',
  'function withdrawCollateral(uint256 positionId, uint256 amount) external',

  // Read functions
  'function positions(uint256) view returns (address user, address collateralToken, uint256 collateralAmount, uint256 usdcBorrowed, uint256 tokenValueUSD, uint256 createdAt, bool active, uint8 tokenType)',
  'function repaymentPlans(uint256) view returns (uint256 loanDuration, uint256 numberOfInstallments, uint256 installmentInterval, uint256 installmentsPaid, uint256 missedPayments, uint256 nextPaymentDue, bool isActive)',
  'function seniorPool() view returns (address)',

  // Events
  'event PositionCreated(uint256 indexed positionId, address indexed user, address collateralToken, uint256 collateralAmount, uint256 tokenValueUSD, uint8 tokenType)',
  'event USDCBorrowed(uint256 indexed positionId, uint256 amount, uint256 totalDebt)',
  'event RepaymentPlanCreated(uint256 indexed positionId, uint256 loanDuration, uint256 numberOfInstallments, uint256 installmentInterval)',
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

// SeniorPool ABI - For repayment flow per COMPLETE_LOAN.md
const SENIOR_POOL_ABI = [
  'function repayLoan(uint256 positionId, uint256 amount) external',
  'function getOutstandingDebt(uint256 positionId) view returns (uint256)',

  // Events
  'event LoanRepaid(uint256 indexed positionId, uint256 amountPaid, uint256 principal, uint256 interest, uint256 remainingDebt)',
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

export interface RepaymentPlan {
  loanDuration: bigint;
  numberOfInstallments: bigint;
  installmentInterval: bigint;
  installmentsPaid: bigint;
  missedPayments: bigint;
  nextPaymentDue: bigint;
  isActive: boolean;
}

class SolvencyContractService {
  /**
   * Get provider and signer from browser wallet
   */
  private async getProviderAndSigner() {
    console.log('🔌 Getting provider and signer...');
    
    if (!window.ethereum) {
      throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
    }

    console.log('   Creating BrowserProvider...');
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    console.log('   Getting network...');
    const network = await provider.getNetwork();
    console.log(`   Connected to network: chainId ${network.chainId}`);

    // Check if on Mantle Sepolia (chainId: 5003)
    if (network.chainId !== 5003n) {
      throw new Error(
        `Wrong network. Please switch to Mantle Sepolia (chainId: 5003). Currently on chainId: ${network.chainId}`
      );
    }

    console.log('   Getting signer...');
    const signer = await provider.getSigner();
    console.log(`   Signer address: ${await signer.getAddress()}`);
    
    return { provider, signer };
  }

  /**
   * Get vault contract instance
   */
  private async getVaultContract() {
    console.log('📄 Getting vault contract instance...');
    console.log(`   Vault address: ${VAULT_CONTRACT_ADDRESS}`);
    
    const { signer } = await this.getProviderAndSigner();
    const contract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, SOLVENCY_VAULT_ABI, signer);
    
    console.log('✅ Vault contract created successfully');
    return contract;
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

  /**
   * Get SeniorPool contract instance
   * Per COMPLETE_LOAN.md: Repayments go directly to SeniorPool, not Vault
   */
  private async getSeniorPoolContract() {
    const { signer } = await this.getProviderAndSigner();
    const seniorPoolAddress = await this.getSeniorPoolAddress();
    return new ethers.Contract(seniorPoolAddress, SENIOR_POOL_ABI, signer);
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

  /**
   * Get SeniorPool address from vault
   * Required for repayment flow per COMPLETE_LOAN.md
   */
  async getSeniorPoolAddress(): Promise<string> {
    try {
      const vault = await this.getVaultContract();
      const seniorPoolAddress = await vault.seniorPool();
      console.log(`   SeniorPool address: ${seniorPoolAddress}`);
      return seniorPoolAddress;
    } catch (error: any) {
      console.error('❌ Error getting SeniorPool address:', error);
      throw new Error(`Failed to get SeniorPool address: ${error.message}`);
    }
  }

  /**
   * Get outstanding debt for a position
   * Per repay-solvency-loan.js: Used to cap repayment amount
   */
  async getOutstandingDebt(positionId: number): Promise<bigint> {
    try {
      console.log(`📊 Fetching outstanding debt for position ${positionId}...`);
      const seniorPool = await this.getSeniorPoolContract();
      const debt = await seniorPool.getOutstandingDebt(positionId);
      console.log(`   Outstanding Debt: $${ethers.formatUnits(debt, 6)} USDC`);
      return debt;
    } catch (error: any) {
      console.error('❌ Error getting outstanding debt:', error);
      throw new Error(`Failed to get outstanding debt: ${error.message}`);
    }
  }

  /**
   * Get repayment plan for a position
   * Used to check if position has an active loan
   */
  async getRepaymentPlan(positionId: number): Promise<RepaymentPlan | null> {
    try {
      console.log(`📋 Fetching repayment plan for position ${positionId}...`);
      const vault = await this.getVaultContract();
      const plan = await vault.repaymentPlans(positionId);
      
      return {
        loanDuration: plan[0],
        numberOfInstallments: plan[1],
        installmentInterval: plan[2],
        installmentsPaid: plan[3],
        missedPayments: plan[4],
        nextPaymentDue: plan[5],
        isActive: plan[6],
      };
    } catch (error: any) {
      console.error('❌ Error getting repayment plan:', error);
      return null;
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
   * ✅ UPDATED: Based on COMPLETE_LOAN.md - Now includes loanDuration and numberOfInstallments
   *
   * @param positionId - Position ID to borrow against
   * @param amount - USDC amount in wei (6 decimals)
   * @param loanDuration - Loan duration in seconds (calculated from asset maturity)
   * @param numberOfInstallments - Number of repayment installments (e.g., 6, 12)
   * @returns Transaction result
   */
  async borrowUSDC(
    positionId: number,
    amount: bigint,
    loanDuration: number,
    numberOfInstallments: number
  ): Promise<TransactionResult> {
    try {
      console.log('💸 Borrowing USDC:', {
        positionId,
        amount: amount.toString(),
        loanDuration,
        numberOfInstallments,
      });

      console.log('🔍 Step 1: Getting vault contract...');
      const vault = await this.getVaultContract();
      console.log('✅ Vault contract obtained:', vault.target);

      console.log(`📝 Step 2: Preparing transaction...`);
      console.log(`   Borrowing $${ethers.formatUnits(amount, 6)} USDC from SeniorPool...`);
      console.log(`   Loan Duration: ${loanDuration} seconds (~${Math.floor(loanDuration / 86400)} days)`);
      console.log(`   Installments: ${numberOfInstallments}`);

      console.log('🚀 Step 3: Calling vault.borrowUSDC()...');
      console.log('   Parameters:', {
        positionId,
        amount: amount.toString(),
        loanDuration,
        numberOfInstallments
      });

      console.log('⏳ WAITING FOR USER: Please approve the transaction in your wallet!');
      console.log('   Check MetaMask or your wallet extension...');

      const tx = await vault.borrowUSDC(positionId, amount, loanDuration, numberOfInstallments);

      console.log(`✅ Step 4: Transaction submitted successfully!`);
      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('⏳ Step 5: Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Step 6: Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse USDCBorrowed event
      console.log('🔍 Step 7: Parsing events...');
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
          }
          if (parsed && parsed.name === 'RepaymentPlanCreated') {
            console.log(`✅ Repayment Plan Created: ${numberOfInstallments} installments`);
          }
        } catch (e) {
          // Skip non-matching logs
        }
      }

      console.log(`🔗 Explorer: https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);
      console.log('✅ Step 8: Borrow completed successfully!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Borrow failed at some step:', error);
      console.error('   Error name:', error.name);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      if (error.reason) console.error('   Error reason:', error.reason);
      if (error.data) console.error('   Error data:', error.data);
      
      // Check for user rejection
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        console.log('👤 User rejected the transaction in wallet');
        return {
          success: false,
          error: 'Transaction rejected by user',
        };
      }
      
      // Check for insufficient funds
      if (error.code === 'INSUFFICIENT_FUNDS') {
        console.log('💰 Insufficient funds for transaction');
        return {
          success: false,
          error: 'Insufficient funds to complete transaction',
        };
      }
      
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

  /**
   * Approve USDC for Vault contract (FIXED: Was incorrectly approving SeniorPool)
   * Per repay-solvency-loan.js: Repayments require approval to Vault, not SeniorPool
   */
  async approveUSDCForSeniorPool(amount: bigint): Promise<TransactionResult> {
    try {
      console.log('🔓 Approving USDC for Vault (Repayment):', amount.toString());

      // Approve the Vault contract, not SeniorPool
      const vaultAddress = VAULT_CONTRACT_ADDRESS;
      const usdc = await this.getUSDCContract();

      // Check current allowance
      const { signer } = await this.getProviderAndSigner();
      const userAddress = await signer.getAddress();
      const currentAllowance = await usdc.allowance(userAddress, vaultAddress);

      console.log(`   Current allowance: ${ethers.formatUnits(currentAllowance, 6)} USDC`);

      if (currentAllowance >= amount) {
        console.log('✅ Sufficient allowance already granted');
        return {
          success: true,
          txHash: '',
          blockNumber: 0,
        };
      }

      console.log('⏳ WAITING FOR USER: Please approve USDC spending in your wallet!');
      const tx = await usdc.approve(vaultAddress, amount);

      console.log('⏳ Waiting for USDC approval confirmation...', tx.hash);
      const receipt = await tx.wait();

      console.log('✅ USDC approved for Vault successfully!', receipt.hash);
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ USDC approval for Vault failed:', error);
      
      // Check for user rejection
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        return {
          success: false,
          error: 'Approval rejected by user',
        };
      }
      
      return {
        success: false,
        error: error.message || 'USDC approval failed',
      };
    }
  }

  /**
   * Repay loan through Vault (FIXED: Was incorrectly calling SeniorPool)
   * Per repay-solvency-loan.js: Call SolvencyVault.repayLoan(), not SeniorPool
   *
   * @param positionId - Position ID to repay
   * @param amount - USDC amount to repay (6 decimals)
   * @returns Transaction result
   */
  async repayLoanViaSeniorPool(positionId: number, amount: bigint): Promise<TransactionResult> {
    try {
      console.log('💵 Repaying loan via Vault:', {
        positionId,
        amount: amount.toString(),
      });

      // Get vault contract (NOT SeniorPool - that was the bug!)
      const vault = await this.getVaultContract();

      console.log(`   Repaying $${ethers.formatUnits(amount, 6)} USDC via Vault...`);
      console.log('⏳ WAITING FOR USER: Please approve the transaction in your wallet!');

      // Call Vault.repayLoan() like the working script does
      const tx = await vault.repayLoan(positionId, amount);

      console.log(`   Transaction submitted: ${tx.hash}`);
      console.log('⏳ Waiting for repayment confirmation...');

      const receipt = await tx.wait();
      console.log(`✅ Repayment confirmed in block ${receipt.blockNumber}`);

      // Parse LoanRepaid event from Vault
      for (const log of receipt.logs) {
        try {
          const parsed = vault.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          if (parsed && parsed.name === 'LoanRepaid') {
            const amountPaid = parsed.args.amount;
            const principal = parsed.args.principal;
            const interest = parsed.args.interest;
            const remainingDebt = parsed.args.remainingDebt;
            console.log(`✅ Loan Repaid:`);
            console.log(`   Amount Paid: $${ethers.formatUnits(amountPaid, 6)} USDC`);
            console.log(`   Principal: $${ethers.formatUnits(principal, 6)} USDC`);
            console.log(`   Interest: $${ethers.formatUnits(interest, 6)} USDC`);
            console.log(`   Remaining Debt: $${ethers.formatUnits(remainingDebt, 6)} USDC`);
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
      console.error('❌ Repayment via Vault failed:', error);
      
      // Check for user rejection
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        return {
          success: false,
          error: 'Transaction rejected by user',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Repayment transaction failed',
      };
    }
  }
}

export const solvencyContractService = new SolvencyContractService();
