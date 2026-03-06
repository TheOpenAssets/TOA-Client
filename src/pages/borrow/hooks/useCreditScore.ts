/**
 * useCreditScore Hook
 * Fetches and manages user's credit score data
 *
 * ✅ Uses correct API: GET /credit-score/:wallet
 * ✅ Implements caching to prevent unnecessary refetches (10 minutes)
 * ✅ Maintains previous data during refetch (no flickering to null)
 * ✅ Cache is per-wallet
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { creditcoinService } from '../../../lib/api/creditcoin.service';
import type { CreditScoreResponse } from '../../../types/creditcoin.types';

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

// Global cache to persist across component remounts
let globalCreditScoreCache: {
  data: CreditScoreResponse | null;
  timestamp: number;
  walletAddress: string | null;
} = {
  data: null,
  timestamp: 0,
  walletAddress: null,
};

export const useCreditScore = (walletAddress: string | undefined) => {
  // Initialize with cached data if available for this wallet
  const [creditScore, setCreditScore] = useState<CreditScoreResponse | null>(() => {
    if (walletAddress && globalCreditScoreCache.walletAddress === walletAddress) {
      const now = Date.now();
      const isCacheValid = (now - globalCreditScoreCache.timestamp) < CACHE_DURATION;
      if (isCacheValid && globalCreditScoreCache.data) {
        console.log('📦 Initializing with cached credit score');
        return globalCreditScoreCache.data;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last fetch time for caching
  const lastFetchTime = useRef<number>(globalCreditScoreCache.timestamp);
  const isFetching = useRef<boolean>(false);

  const fetchCreditScore = useCallback(async (forceRefresh = false) => {
    if (!walletAddress) {
      setCreditScore(null);
      setError(null);
      globalCreditScoreCache = { data: null, timestamp: 0, walletAddress: null };
      return;
    }

    // Check cache validity - skip if data is fresh and not forcing refresh
    const now = Date.now();
    const isCacheValid = (now - lastFetchTime.current) < CACHE_DURATION;

    if (!forceRefresh && isCacheValid && creditScore) {
      console.log('📦 Using cached credit score');
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log('⏳ Fetch already in progress, skipping...');
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    // Don't reset error or data - keep previous values while loading

    try {
      console.log('🔄 Fetching fresh credit score...');
      const response = await creditcoinService.getCreditScore(walletAddress);

      // Update state and global cache
      setCreditScore(response);
      lastFetchTime.current = Date.now();
      globalCreditScoreCache = {
        data: response,
        timestamp: lastFetchTime.current,
        walletAddress: walletAddress,
      };

      setError(null);
      console.log('✅ Credit score updated and cached successfully');
    } catch (err: any) {
      console.error('❌ Error fetching credit score:', err);
      setError(err.message || 'Failed to fetch credit score');
      // Keep previous creditScore - don't reset to null on error
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [walletAddress, creditScore]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    // Check if we have valid cached data for this wallet
    if (walletAddress && globalCreditScoreCache.walletAddress === walletAddress) {
      const now = Date.now();
      const isCacheValid = (now - globalCreditScoreCache.timestamp) < CACHE_DURATION;
      if (isCacheValid && globalCreditScoreCache.data) {
        console.log('📦 Using existing cache, skipping fetch');
        return;
      }
    }

    // Only fetch if no valid cache
    fetchCreditScore();
  }, [walletAddress]); // Only depend on walletAddress, not the whole callback

  return {
    creditScore,
    isLoading,
    error,
    refetch: (forceRefresh = false) => fetchCreditScore(forceRefresh),
  };
};
