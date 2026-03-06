import { useState, useCallback } from 'react';
import { partnerService } from '../../../lib/api/partner.service';
import type { PartnerLoan } from '../../../types/creditcoin.types';

export const usePartnerLoans = () => {
  const [loans, setLoans] = useState<PartnerLoan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await partnerService.getMyPartnerLoans();
      setLoans(data.loans);
    } catch (err: any) {
      setError(err.message || 'Failed to load partner loans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { loans, isLoading, error, refetch: fetchLoans };
};
