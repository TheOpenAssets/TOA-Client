/**
 * Credit & Currency Formatting Utilities
 * Safe formatting functions for displaying monetary values
 */

/**
 * Format USD amount with commas and 2 decimal places
 *
 * @param amount - Amount in USD
 * @returns Formatted string (e.g., "$1,234.56")
 */
export const formatUSD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format token amount with appropriate decimal places
 *
 * @param amount - Token amount
 * @param decimals - Number of decimal places (default 4)
 * @returns Formatted string
 */
export const formatTokenAmount = (
  amount: number | null | undefined,
  decimals: number = 4
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format large numbers with K, M, B suffixes
 *
 * @param amount - Amount to format
 * @returns Formatted string (e.g., "1.2M", "450K")
 */
export const formatCompactNumber = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
  }

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }

  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }

  return amount.toFixed(2);
};

/**
 * Format percentage value
 *
 * @param value - Percentage value
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted string with % symbol
 */
export const formatPercentage = (
  value: number | null | undefined,
  decimals: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  return `${value.toFixed(decimals)}%`;
};

/**
 * Format APR/APY percentage
 *
 * @param rate - Interest rate percentage
 * @returns Formatted string
 */
export const formatInterestRate = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined || isNaN(rate)) {
    return '0.00% APR';
  }

  return `${rate.toFixed(2)}% APR`;
};

/**
 * Format credit limit with available credit
 *
 * @param creditLimit - Total credit limit
 * @param availableCredit - Available credit
 * @returns Formatted string (e.g., "$5,000 / $10,000")
 */
export const formatCreditLimitDisplay = (
  creditLimit: number,
  availableCredit: number
): string => {
  const used = creditLimit - availableCredit;
  return `${formatUSD(used)} / ${formatUSD(creditLimit)}`;
};

/**
 * Format date to readable string
 *
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date to relative time (e.g., "2 days ago")
 *
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }

    if (diffDays === 1) {
      return 'Yesterday';
    }

    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }

    return formatDate(dateString);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Truncate wallet address for display
 *
 * @param address - Ethereum address
 * @param startLength - Number of characters from start (default 6)
 * @param endLength - Number of characters from end (default 4)
 * @returns Truncated address (e.g., "0x1234...5678")
 */
export const truncateAddress = (
  address: string | null | undefined,
  startLength: number = 6,
  endLength: number = 4
): string => {
  if (!address) {
    return 'N/A';
  }

  if (address.length <= startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

/**
 * Parse user input amount string to number
 * Handles commas, spaces, and invalid input
 *
 * @param input - User input string
 * @returns Parsed number or 0 if invalid
 */
export const parseAmountInput = (input: string): number => {
  if (!input || input.trim() === '') {
    return 0;
  }

  // Remove commas and spaces
  const cleaned = input.replace(/[,\s]/g, '');

  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Check if amount string is valid number
 *
 * @param input - User input string
 * @returns true if valid, false otherwise
 */
export const isValidAmountInput = (input: string): boolean => {
  if (!input || input.trim() === '') {
    return false;
  }

  const cleaned = input.replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);

  return !isNaN(parsed) && parsed > 0;
};
