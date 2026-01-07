/**
 * Solvency API Adapters
 * Converts between new API responses and old type expectations
 * This maintains backward compatibility while we migrate to correct APIs
 */

import type { OAIDCreditResponse, Position } from '../api/solvency.service';
import type { OAIDCreditLine, CollateralPosition } from '../../types/solvency.types';

/**
 * Convert new OAIDCreditResponse to old OAIDCreditLine format
 * This allows existing UI components to work without changes
 */
export function adaptCreditResponse(
  response: OAIDCreditResponse,
  walletAddress: string
): OAIDCreditLine {
  // Convert string amounts (6 decimals) to numbers
  const creditLimit = parseInt(response.totalCreditLimit) / 1_000_000;
  const currentDebt = parseInt(response.totalCreditUsed) / 1_000_000;
  const availableCredit = parseInt(response.totalAvailableCredit) / 1_000_000;

  // Convert credit lines to collateral positions
  const collateral: CollateralPosition[] = response.creditLines.map((line) => {
    const amount = parseInt(line.collateralAmount);
    const valueUSD = parseInt(line.creditLimit) / 1_000_000; // Credit limit is based on collateral value

    return {
      tokenAddress: line.collateralToken,
      tokenSymbol: 'UNKNOWN', // Backend doesn't return this, need to fetch from assets
      tokenName: 'UNKNOWN',
      amount,
      valueUSD,
      ltvRatio: 70, // Default for RWA
      isRWA: true,
    };
  });

  // Calculate health factor (simplified)
  const healthFactor = currentDebt > 0 
    ? Math.floor((creditLimit / currentDebt) * 100)
    : 10000; // 10000% if no debt

  return {
    oaidId: `oaid-${walletAddress}`, // Generate ID since backend doesn't return it
    walletAddress,
    creditLimit,
    currentDebt,
    availableCredit,
    healthFactor,
    collateral,
    interestRate: 5.0, // Default APR (backend doesn't return this)
    totalInterestAccrued: 0, // Backend doesn't return this
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert new Position to old CollateralPosition format
 */
export function adaptPosition(position: Position): CollateralPosition {
  const tokenValueUSD = parseInt(position.tokenValueUSD) / 1_000_000;
  const collateralAmount = parseInt(position.collateralAmount);

  return {
    tokenAddress: position.collateralToken.address,
    tokenSymbol: position.collateralToken.symbol,
    tokenName: position.collateralToken.name,
    amount: collateralAmount,
    valueUSD: tokenValueUSD,
    ltvRatio: position.collateralToken.type === 'RWA' ? 70 : 60,
    isRWA: position.collateralToken.type === 'RWA',
  };
}

/**
 * Calculate health factor from position
 * Health Factor = (Collateral Value × LTV) / Debt
 */
export function calculateHealthFactor(position: Position): number {
  const collateralValue = parseInt(position.tokenValueUSD) / 1_000_000;
  const debt = parseInt(position.outstandingDebt) / 1_000_000;
  
  if (debt === 0) return 10000; // 10000% if no debt
  
  const ltv = position.collateralToken.type === 'RWA' ? 0.70 : 0.60;
  const maxBorrow = collateralValue * ltv;
  
  return Math.floor((maxBorrow / debt) * 100);
}

/**
 * Format string amount (with decimals) to number
 */
export function formatAmount(amount: string, decimals: number = 6): number {
  return parseInt(amount) / Math.pow(10, decimals);
}

/**
 * Parse amount string to BigInt for on-chain operations
 */
export function parseAmount(amount: string | number, decimals: number = 6): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (BigInt(Math.floor(value * Math.pow(10, decimals)))).toString();
}
