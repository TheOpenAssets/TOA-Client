/**
 * Solvency Vault Constants
 * All fixed values and thresholds for the borrowing system
 */

import { type SolvencyConfig } from '../types/solvency.types';

export const SOLVENCY_CONFIG: SolvencyConfig = {
  ltv: {
    RWA: 70, // 70% LTV for RWA tokens
    PRIVATE_ASSET: 60, // 60% LTV for Private Assets
  },
  healthThresholds: {
    HEALTHY: 120, // Health factor > 120% is healthy
    WARNING: 110, // Health factor 110-120% shows warning
    CRITICAL: 100, // Health factor 100-110% is critical
    LIQUIDATION: 100, // Health factor < 100% triggers liquidation
  },
  interestRate: 5, // 5% APR on borrowed USDC
  healthMonitorInterval: 30000, // Check health every 30 seconds
};

export const HEALTH_FACTOR_COLORS = {
  healthy: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    bar: 'bg-green-500',
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    bar: 'bg-yellow-500',
  },
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    bar: 'bg-red-500',
  },
  unknown: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    bar: 'bg-gray-400',
  },
} as const;

export const TRANSACTION_STAGES = {
  approving_token: 'Approving token...',
  depositing: 'Depositing collateral...',
  borrowing: 'Borrowing USDC...',
  repaying: 'Repaying debt...',
  withdrawing: 'Withdrawing collateral...',
  syncing: 'Syncing with backend...',
} as const;

export const ERROR_MESSAGES = {
  INSUFFICIENT_CREDIT: 'Insufficient available credit for this borrow amount',
  HEALTH_TOO_LOW: 'This action would bring your health factor below 110%',
  NO_CREDIT_LINE: 'You need to deposit collateral first to create a credit line',
  WALLET_DISCONNECTED: 'Please connect your wallet to continue',
  APPROVAL_FAILED: 'Token approval failed. Please try again.',
  TRANSACTION_FAILED: 'Transaction failed. Please check your wallet and try again.',
  SYNC_FAILED: 'Failed to sync transaction with backend. Please contact support.',
  FETCH_FAILED: 'Failed to load data. Please refresh the page.',
} as const;

export const SUCCESS_MESSAGES = {
  DEPOSIT_SUCCESS: 'Collateral deposited successfully!',
  BORROW_SUCCESS: 'USDC borrowed successfully!',
  REPAY_SUCCESS: 'Debt repaid successfully!',
  WITHDRAW_SUCCESS: 'Collateral withdrawn successfully!',
} as const;

// Minimum amounts
export const MIN_BORROW_AMOUNT = 100; // Minimum 100 USDC
export const MIN_DEPOSIT_AMOUNT = 0.01; // Minimum deposit amount in tokens

// Contract addresses (to be configured per environment)
export const VAULT_CONTRACT_ADDRESS = import.meta.env.VITE_VAULT_CONTRACT_ADDRESS || '0x0849B8d12Ac2a7Fcab4FAe8a46154e9778579493';
export const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '';
