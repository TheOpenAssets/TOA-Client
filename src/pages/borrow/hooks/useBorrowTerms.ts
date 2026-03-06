/**
 * useBorrowTerms Hook
 * Fetches and manages user's borrow terms data (lazy by default)
 *
 * ✅ Uses correct API: GET /solvency/borrow-terms/:wallet
 * ✅ Lazy by default: only fetches when enabled is true
 * ✅ No caching: always fetches fresh data when enabled
 * ✅ Maintains previous data during refetch (no flickering to null)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { creditcoinService } from '../../../lib/api/creditcoin.service';
import type { BorrowTermsResponse } from '../../../types/creditcoin.types';

export const useBorrowTerms = (walletAddress: string | undefined, enabled: boolean = false) => {
  const [borrowTerms, setBorrowTerms] = useState<BorrowTermsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track fetch state to prevent concurrent requests
  const isFetching = useRef<boolean>(false);

  const fetchBorrowTerms = useCallback(async () => {
    if (!walletAddress) {
      setBorrowTerms(null);
      setError(null);
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log('⏳ Borrow terms fetch already in progress, skipping...');
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    // Don't reset error or data - keep previous values while loading

    try {
      console.log('🔄 Fetching fresh borrow terms...');
      const response = await creditcoinService.getBorrowTerms(walletAddress);

      // Update state
      setBorrowTerms(response);
      setError(null);
      console.log('✅ Borrow terms updated successfully');
    } catch (err: any) {
      console.error('❌ Error fetching borrow terms:', err);
      setError(err.message || 'Failed to fetch borrow terms');
      // Keep previous borrowTerms - don't reset to null on error
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [walletAddress]);

  // Fetch only when enabled is true
  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchBorrowTerms();
  }, [walletAddress, enabled, fetchBorrowTerms]);

  return {
    borrowTerms,
    isLoading,
    error,
    refetch: () => fetchBorrowTerms(),
  };
};
