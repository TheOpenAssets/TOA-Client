
import { ethers } from 'ethers';
import type { Position, PositionView } from '../../types/solvency.types';

/**
 * Formats a raw string value from a contract (in WEI or with decimals) into a human-readable currency string.
 * @param value The raw string value (e.g., "50000000000").
 * @param decimals The number of decimals the value has (e.g., 6 for USDC).
 * @returns A formatted currency string (e.g., "$50,000.00").
 */
const formatCurrency = (value: string | null | undefined, decimals: number): string => {
  try {
    const formatted = ethers.formatUnits(value ?? '0', decimals);
    return parseFloat(formatted).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  } catch (error) {
    console.error(`Error formatting currency value: ${value}`, error);
    return '$0.00';
  }
};

/**
 * Transforms a raw `Position` object from the API into a `PositionView` object
 * suitable for display in the UI.
 *
 * @param position The raw `Position` object.
 * @returns A `PositionView` object with formatted, human-readable values.
 */
export const formatPosition = (position: Position): PositionView => {
  const usdcBorrowedNum = parseFloat(ethers.formatUnits(position.usdcBorrowed ?? '0', 6));
  const maxBorrowCapacityNum = parseFloat(ethers.formatUnits(position.maxBorrowCapacity ?? '0', 6));
  const availableCreditNum = maxBorrowCapacityNum - usdcBorrowedNum;

  let healthStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  switch (position.healthStatus?.toUpperCase()) {
    case 'HEALTHY':
      healthStatus = 'HEALTHY';
      break;
    case 'WARNING':
      healthStatus = 'WARNING';
      break;
    case 'CRITICAL':
    default:
      healthStatus = 'CRITICAL';
      break;
  }

  const tokenSymbol = position.collateralToken?.symbol ?? 'N/A';

  return {
    positionId: position.positionId,
    tokenSymbol: tokenSymbol,
    collateralAmountFormatted: `${parseFloat(ethers.formatUnits(position.collateralAmount ?? '0', 18)).toFixed(4)} ${tokenSymbol}`,
    collateralValueUSD: formatCurrency(position.tokenValueUSD, 6),
    usdcBorrowed: formatCurrency(position.usdcBorrowed, 6),
    outstandingDebt: formatCurrency(position.outstandingDebt, 6),
    healthFactor: `${((position.healthFactor ?? 0) / 100).toFixed(2)}%`,
    healthStatus: healthStatus,
    availableCredit: availableCreditNum.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
  };
};
