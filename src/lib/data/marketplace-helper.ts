// src/lib/data/marketplace-mock-data.ts

import {
  type AssetCategory,
} from '../../types/marketplace.types';


// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

// Helper function to get category label
export const getCategoryLabel = (category: AssetCategory): string => {
  const labels: Record<AssetCategory, string> = {
    'invoice': 'Invoice',
    'real-estate': 'Real Estate',
    'trade-finance': 'Trade Finance',
    'equipment-lease': 'Equipment Lease',
  };
  return labels[category];
};

// Helper function to get category icon
export const getCategoryIcon = (category: AssetCategory | string): string => {
  const icons: Record<string, string> = {
    'invoice': '📄',
    'real-estate': '🏢',
    'trade-finance': '🚢',
    'equipment-lease': '🏗️',
  };
  // Return matching icon or default to invoice icon for any unknown category
  return icons[category.toLowerCase()] || icons['invoice'];
};
