/**
 * useProtocols Hook
 * Returns available protocols for borrowing
 * 
 * ⚠️ IMPORTANT: Protocols are HARDCODED in frontend (not from backend API)
 * Protocols are 3rd party services with their own APIs
 */

import { useState, useEffect } from 'react';
import { getActiveProtocols, type Protocol } from '../../../constants/protocols.constants';

export const useProtocols = () => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProtocols = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // ✅ Protocols are hardcoded constants (not API call)
        // In production, this could include runtime checks like:
        // - Checking if API keys are configured
        // - Validating protocol availability
        // - Fetching live APR rates from protocol APIs
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async
        const activeProtocols = getActiveProtocols();
        setProtocols(activeProtocols);
      } catch (err: any) {
        console.error('Error loading protocols:', err);
        setError(err.message || 'Failed to load protocols');
        setProtocols([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProtocols();
  }, []);

  return {
    protocols,
    isLoading,
    error,
  };
};
