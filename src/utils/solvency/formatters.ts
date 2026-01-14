
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

/**
 * Format collateral amount from raw value to human-readable number
 * @param value Raw amount as number or string (e.g., 90000000000000000000)
 * @param decimals Token decimals (default: 18 for most ERC20 tokens)
 * @returns Formatted number (e.g., 90.00)
 */
export const formatCollateralAmount = (
  value: number | string | null | undefined,
  decimals: number = 18
): number => {
  if (value === null || value === undefined || value === 0 || value === '0') {
    return 0;
  }

  try {
    // Convert to string if it's a number
    // Use BigInt to handle scientific notation (e.g. 5e+21) which toString() would output
    const valueStr = typeof value === 'number' ? BigInt(value).toString() : value;

    // Use ethers to properly handle large numbers
    const formatted = ethers.formatUnits(valueStr, decimals);
    return parseFloat(formatted);
  } catch (error) {
    console.error('Error formatting collateral amount:', error, { value, decimals });
    return 0;
  }
};
