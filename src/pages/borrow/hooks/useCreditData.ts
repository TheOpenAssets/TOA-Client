/**
 * useCreditData Hook
 * Fetches and manages user's OAID credit line data
 * 
 * ✅ Uses correct API: GET /solvency/oaid/my-credit
 */

import { useState, useEffect, useCallback } from 'react';
import { solvencyService } from '../../../lib/api/solvency.service';
import { adaptCreditResponse } from '../../../lib/utils/solvency-adapter.util';
import type { OAIDCreditLine } from '../../../types/solvency.types';

export const useCreditData = (walletAddress: string | undefined) => {
  const [creditData, setCreditData] = useState<OAIDCreditLine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditData = useCallback(async () => {
    if (!walletAddress) {
      setCreditData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ Using correct endpoint: GET /solvency/oaid/my-credit
      const response = await solvencyService.getOAIDCredit();
      
      // Adapt new API response to old format for backward compatibility
      const adapted = adaptCreditResponse(response, walletAddress);
      setCreditData(adapted);
    } catch (err: any) {
      console.error('Error fetching OAID credit:', err);
      setError(err.message || 'Failed to fetch OAID credit');
      setCreditData(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchCreditData();
  }, [fetchCreditData]);

  return {
    creditData,
    isLoading,
    error,
    refetch: fetchCreditData,
  };
};
