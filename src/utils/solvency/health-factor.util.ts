/**
 * Health Factor Utility Functions
 * Calculations and helpers for health factor management
 */

import  type{ HealthFactorData, HealthFactorPreview, HealthStatus } from '../../types/solvency.types';
import { SOLVENCY_CONFIG } from '../../constants/solvency.constants';

/**
 * Calculate health factor as percentage
 * Formula: (Total Collateral Value / Total Debt Value) * 100
 *
 * @param collateralValueUSD - Total collateral value in USD
 * @param debtValueUSD - Total debt value in USD
 * @returns Health factor as percentage (e.g., 150 means 150%)
 */
export const calculateHealthFactor = (
  collateralValueUSD: number,
  debtValueUSD: number
): number => {
  if (debtValueUSD === 0) {
    return Infinity; // No debt means infinite health
  }

  if (collateralValueUSD === 0) {
    return 0; // No collateral with debt is critical
  }

  return (collateralValueUSD / debtValueUSD) * 100;
};

/**
 * Determine health status based on health factor value
 *
 * @param healthFactor - Health factor percentage
 * @returns HealthStatus enum
 */
export const getHealthStatus = (healthFactor: number): HealthStatus => {
  if (healthFactor === Infinity || isNaN(healthFactor)) {
    return 'unknown';
  }

  if (healthFactor >= SOLVENCY_CONFIG.healthThresholds.HEALTHY) {
    return 'healthy';
  }

  if (healthFactor >= SOLVENCY_CONFIG.healthThresholds.WARNING) {
    return 'warning';
  }

  return 'critical';
};

/**
 * Get complete health factor data with status
 *
 * @param collateralValueUSD - Total collateral value in USD
 * @param debtValueUSD - Total debt value in USD
 * @returns HealthFactorData object
 */
export const getHealthFactorData = (
  collateralValueUSD: number,
  debtValueUSD: number
): HealthFactorData => {
  const current = calculateHealthFactor(collateralValueUSD, debtValueUSD);
  const status = getHealthStatus(current);

  return {
    current,
    status,
    thresholdWarning: SOLVENCY_CONFIG.healthThresholds.HEALTHY,
    thresholdCritical: SOLVENCY_CONFIG.healthThresholds.WARNING,
    thresholdLiquidation: SOLVENCY_CONFIG.healthThresholds.LIQUIDATION,
  };
};

/**
 * Preview health factor after an action (borrow, repay, deposit, withdraw)
 *
 * @param currentCollateralUSD - Current collateral value
 * @param currentDebtUSD - Current debt value
 * @param collateralChange - Change in collateral (positive for deposit, negative for withdraw)
 * @param debtChange - Change in debt (positive for borrow, negative for repay)
 * @returns HealthFactorPreview object
 */
export const previewHealthFactorChange = (
  currentCollateralUSD: number,
  currentDebtUSD: number,
  collateralChange: number,
  debtChange: number
): HealthFactorPreview => {
  const currentHealth = calculateHealthFactor(currentCollateralUSD, currentDebtUSD);
  const statusBefore = getHealthStatus(currentHealth);

  const newCollateralUSD = currentCollateralUSD + collateralChange;
  const newDebtUSD = currentDebtUSD + debtChange;

  const afterActionHealth = calculateHealthFactor(newCollateralUSD, newDebtUSD);
  const statusAfter = getHealthStatus(afterActionHealth);

  const change = afterActionHealth - currentHealth;
  const isSafe = afterActionHealth >= SOLVENCY_CONFIG.healthThresholds.WARNING;

  return {
    current: currentHealth,
    afterAction: afterActionHealth,
    change,
    statusBefore,
    statusAfter,
    isSafe,
  };
};

/**
 * Calculate maximum amount that can be borrowed without dropping health below threshold
 *
 * @param collateralValueUSD - Current collateral value
 * @param currentDebtUSD - Current debt
 * @param minHealthFactor - Minimum acceptable health factor (default 110%)
 * @returns Maximum borrowable amount in USD
 */
export const calculateMaxBorrowable = (
  collateralValueUSD: number,
  currentDebtUSD: number,
  minHealthFactor: number = SOLVENCY_CONFIG.healthThresholds.WARNING
): number => {
  if (collateralValueUSD === 0) {
    return 0;
  }

  // Formula: maxBorrow = (collateral / (minHealthFactor / 100)) - currentDebt
  const maxTotalDebt = collateralValueUSD / (minHealthFactor / 100);
  const maxBorrowable = maxTotalDebt - currentDebtUSD;

  return Math.max(0, maxBorrowable);
};

/**
 * Calculate maximum amount that can be withdrawn without dropping health below threshold
 *
 * @param collateralValueUSD - Current collateral value
 * @param currentDebtUSD - Current debt
 * @param minHealthFactor - Minimum acceptable health factor (default 110%)
 * @returns Maximum withdrawable amount in USD
 */
export const calculateMaxWithdrawable = (
  collateralValueUSD: number,
  currentDebtUSD: number,
  minHealthFactor: number = SOLVENCY_CONFIG.healthThresholds.WARNING
): number => {
  if (currentDebtUSD === 0) {
    return collateralValueUSD; // Can withdraw all if no debt
  }

  // Formula: minCollateral = debt * (minHealthFactor / 100)
  const minRequiredCollateral = currentDebtUSD * (minHealthFactor / 100);
  const maxWithdrawable = collateralValueUSD - minRequiredCollateral;

  return Math.max(0, maxWithdrawable);
};

/**
 * Format health factor for display
 *
 * @param healthFactor - Health factor value
 * @returns Formatted string with % symbol
 */
export const formatHealthFactor = (healthFactor: number): string => {
  if (healthFactor === Infinity) {
    return '∞ (No debt)';
  }

  if (isNaN(healthFactor)) {
    return 'N/A';
  }

  return `${healthFactor.toFixed(2)}%`;
};

/**
 * Check if health factor allows borrowing more
 *
 * @param healthFactor - Current health factor
 * @returns true if can borrow, false otherwise
 */
export const canBorrow = (healthFactor: number): boolean => {
  return healthFactor >= SOLVENCY_CONFIG.healthThresholds.WARNING;
};

/**
 * Check if health factor allows withdrawing collateral
 *
 * @param healthFactor - Current health factor
 * @returns true if can withdraw, false otherwise
 */
export const canWithdraw = (healthFactor: number): boolean => {
  return healthFactor >= SOLVENCY_CONFIG.healthThresholds.WARNING;
};

/**
 * Get health factor description message
 *
 * @param status - Health status
 * @returns Human-readable description
 */
export const getHealthStatusMessage = (status: HealthStatus): string => {
  switch (status) {
    case 'healthy':
      return 'Your account is healthy. You can safely borrow more.';
    case 'warning':
      return 'Your health factor is getting low. Consider adding collateral or repaying debt.';
    case 'critical':
      return 'Critical! Your account is at risk of liquidation. Add collateral or repay debt immediately.';
    case 'unknown':
      return 'Unable to determine health status.';
  }
};
