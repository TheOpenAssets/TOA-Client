
/**
 * Formats token amounts handling both raw wei values (e.g. "1000000000000000000")
 * and canonical decimal strings (e.g. "1.0000").
 * 
 * @param amount - The amount to format (string or number)
 * @param decimals - The number of decimals for the token (default: 18)
 * @returns The parsed number in canonical units
 */
export const parseTokenAmount = (amount: string | number | undefined | null, decimals: number = 18): number => {
    if (amount === undefined || amount === null || amount === '') return 0;

    const strAmount = amount.toString();

    // If it contains a decimal point, assume it's already in canonical format
    if (strAmount.includes('.')) {
        return parseFloat(strAmount);
    }

    // If no decimal point, we need to guess if it's raw units or canonical integer
    const value = Number(strAmount);

    if (isNaN(value)) return 0;

    // Heuristic based on decimals:
    // For high-decimal tokens (e.g. 18 dec), Raw values are huge (1e18).
    // For low-decimal tokens (e.g. 6 dec USDC), Raw values are smaller (1e6).

    // Threshold to distinguish Canonical Integer from Raw Integer.
    // Values below threshold are treated as Canonical (e.g. "100" tokens).
    // Values above are treated as Raw (e.g. "1000000" USDC wei).

    // If decimals > 9 (e.g. 18): Threshold 1e12 (1 Trillion).
    //   "100" < 1e12 -> 100 Tokens.
    //   "1e18" > 1e12 -> 1 Token.

    // If decimals <= 9 (e.g. 6): Threshold 1e5 (100,000).
    //   "100" < 1e5 -> 100 USDC.
    //   "1,000,000" (1 USDC Raw) > 1e5 -> 1 USDC.

    const threshold = decimals > 9 ? 1e12 : 1e5;

    if (value < threshold) {
        return value;
    }

    return value / Math.pow(10, decimals);
};

/**
 * Formats a number as a localized string with specific decimals
 */
export const formatNumber = (value: number, maxDecimals: number = 2): string => {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals
    });
};

/**
 * Formats a currency value
 */
export const formatCurrency = (value: number, decimals: number = 2): string => {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};
