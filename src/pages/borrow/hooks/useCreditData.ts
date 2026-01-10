/**
 * useCreditData Hook
 * Fetches and manages user's OAID credit line data
 * 
 * ✅ Uses correct API: GET /solvency/oaid/my-credit
 * ✅ Implements caching to prevent unnecessary refetches
 * ✅ Maintains previous data during refetch (no flickering to zero)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { solvencyService } from '../../../lib/api/solvency.service';
import { adaptCreditResponse } from '../../../lib/utils/solvency-adapter.util';
import type { OAIDCreditLine } from '../../../types/solvency.types';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Global cache to persist across component remounts
let globalCreditCache: {
  data: OAIDCreditLine | null;
  timestamp: number;
  walletAddress: string | null;
} = {
  data: null,
  timestamp: 0,
  walletAddress: null,
};

export const useCreditData = (walletAddress: string | undefined) => {
  // Initialize with cached data if available for this wallet
  const [creditData, setCreditData] = useState<OAIDCreditLine | null>(() => {
    if (walletAddress && globalCreditCache.walletAddress === walletAddress) {
      const now = Date.now();
      const isCacheValid = (now - globalCreditCache.timestamp) < CACHE_DURATION;
      if (isCacheValid && globalCreditCache.data) {
        console.log('📦 Initializing with cached credit data');
        return globalCreditCache.data;
      }
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track last fetch time for caching
  const lastFetchTime = useRef<number>(globalCreditCache.timestamp);
  const isFetching = useRef<boolean>(false);

  const fetchCreditData = useCallback(async (forceRefresh = false) => {
    if (!walletAddress) {
      setCreditData(null);
      setError(null);
      globalCreditCache = { data: null, timestamp: 0, walletAddress: null };
      return;
    }

    // Check cache validity - skip if data is fresh and not forcing refresh
    const now = Date.now();
    const isCacheValid = (now - lastFetchTime.current) < CACHE_DURATION;
    
    if (!forceRefresh && isCacheValid && creditData) {
      console.log('📦 Using cached credit data');
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
      console.log('🔄 Fetching fresh credit data...');
      // ✅ Using correct endpoint: GET /solvency/oaid/my-credit
      const response = await solvencyService.getOAIDCredit();
      
      // Adapt new API response to old format for backward compatibility
      const adapted = adaptCreditResponse(response, walletAddress);
      
      // Update state and global cache
      setCreditData(adapted);
      lastFetchTime.current = Date.now();
      globalCreditCache = {
        data: adapted,
        timestamp: lastFetchTime.current,
        walletAddress: walletAddress,
      };
      
      setError(null);
      console.log('✅ Credit data updated and cached successfully');
    } catch (err: any) {
      console.error('❌ Error fetching OAID credit:', err);
      setError(err.message || 'Failed to fetch OAID credit');
      // Keep previous creditData - don't reset to null on error
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [walletAddress, creditData]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    // Check if we have valid cached data for this wallet
    if (walletAddress && globalCreditCache.walletAddress === walletAddress) {
      const now = Date.now();
      const isCacheValid = (now - globalCreditCache.timestamp) < CACHE_DURATION;
      if (isCacheValid && globalCreditCache.data) {
        console.log('📦 Using existing cache, skipping fetch');
        return;
      }
    }
    
    // Only fetch if no valid cache
    fetchCreditData();
  }, [walletAddress]); // Only depend on walletAddress, not the whole callback

  return {
    creditData,
    isLoading,
    error,
    refetch: (forceRefresh = false) => fetchCreditData(forceRefresh),
  };
};
