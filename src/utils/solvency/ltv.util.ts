/**
 * LTV (Loan-to-Value) Utility Functions
 * Calculations for credit limits based on collateral
 */

import { SOLVENCY_CONFIG } from '@/constants/solvency.constants';
import type { CollateralPosition } from '@/types/solvency.types';

/**
 * Calculate credit limit based on collateral value and LTV ratio
 *
 * @param collateralValueUSD - Collateral value in USD
 * @param ltvRatio - LTV ratio (70 for RWA, 60 for Private Assets)
 * @returns Credit limit in USD
 */
export const calculateCreditLimit = (
  collateralValueUSD: number,
  ltvRatio: number
): number => {
  return collateralValueUSD * (ltvRatio / 100);
};

/**
 * Calculate total credit limit from multiple collateral positions
 *
 * @param collateralPositions - Array of collateral positions
 * @returns Total credit limit in USD
 */
export const calculateTotalCreditLimit = (
  collateralPositions: CollateralPosition[]
): number => {
  return collateralPositions.reduce((total, position) => {
    const creditLimit = calculateCreditLimit(position.valueUSD, position.ltvRatio);
    return total + creditLimit;
  }, 0);
};

/**
 * Get LTV ratio for a token based on whether it's RWA or Private Asset
 *
 * @param isRWA - Whether the token is an RWA token
 * @returns LTV ratio percentage
 */
export const getLTVRatio = (isRWA: boolean): number => {
  return isRWA ? SOLVENCY_CONFIG.ltv.RWA : SOLVENCY_CONFIG.ltv.PRIVATE_ASSET;
};

/**
 * Calculate available credit (credit limit minus current debt)
 *
 * @param creditLimit - Total credit limit
 * @param currentDebt - Current debt amount
 * @returns Available credit amount
 */
export const calculateAvailableCredit = (
  creditLimit: number,
  currentDebt: number
): number => {
  return Math.max(0, creditLimit - currentDebt);
};

/**
 * Calculate required collateral value to borrow a specific amount
 *
 * @param borrowAmountUSD - Desired borrow amount in USD
 * @param ltvRatio - LTV ratio to use
 * @returns Required collateral value in USD
 */
export const calculateRequiredCollateral = (
  borrowAmountUSD: number,
  ltvRatio: number
): number => {
  return borrowAmountUSD / (ltvRatio / 100);
};

/**
 * Calculate credit utilization percentage
 *
 * @param currentDebt - Current debt amount
 * @param creditLimit - Total credit limit
 * @returns Utilization percentage (0-100)
 */
export const calculateCreditUtilization = (
  currentDebt: number,
  creditLimit: number
): number => {
  if (creditLimit === 0) {
    return 0;
  }

  return Math.min(100, (currentDebt / creditLimit) * 100);
};

/**
 * Format LTV ratio for display
 *
 * @param ltvRatio - LTV ratio value
 * @returns Formatted string with % symbol
 */
export const formatLTVRatio = (ltvRatio: number): string => {
  return `${ltvRatio}%`;
};

/**
 * Check if user has sufficient credit limit to borrow amount
 *
 * @param availableCredit - Available credit amount
 * @param borrowAmount - Requested borrow amount
 * @returns true if sufficient, false otherwise
 */
export const hasSufficientCredit = (
  availableCredit: number,
  borrowAmount: number
): boolean => {
  return availableCredit >= borrowAmount;
};

/**
 * Calculate collateral value in USD based on token price
 *
 * @param tokenAmount - Amount of tokens
 * @param tokenPriceUSD - Price per token in USD
 * @returns Total collateral value in USD
 */
export const calculateCollateralValueUSD = (
  tokenAmount: number,
  tokenPriceUSD: number
): number => {
  return tokenAmount * tokenPriceUSD;
};
