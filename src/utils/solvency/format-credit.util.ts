// src/utils/solvency/format-credit.util.ts

export const formatUSD = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 1e6); // Assuming value is in 1e6 format
};

export const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
}