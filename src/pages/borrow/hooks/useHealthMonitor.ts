/**
 * useHealthMonitor Hook
 * Monitors health factor and provides real-time status updates
 */

import { useState, useEffect } from 'react';
import { getHealthStatus } from '../../../utils/solvency/health-factor.util';
import { SOLVENCY_CONFIG } from '../../../constants/solvency.constants';
import type { OAIDCreditLine, HealthStatus } from '../../../types/solvency.types';

export const useHealthMonitor = (creditData: OAIDCreditLine | null) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('unknown');
  const [healthFactor, setHealthFactor] = useState<number>(Infinity);

  useEffect(() => {
    if (!creditData) {
      setHealthStatus('unknown');
      setHealthFactor(Infinity);
      return;
    }

    // Update health status immediately
    const updateHealth = () => {
      const currentHealth = creditData.healthFactor;
      const status = getHealthStatus(currentHealth);

      setHealthFactor(currentHealth);
      setHealthStatus(status);
    };

    // Initial update
    updateHealth();

    // Set up interval to check health every 30 seconds
    const interval = setInterval(updateHealth, SOLVENCY_CONFIG.healthMonitorInterval);

    return () => clearInterval(interval);
  }, [creditData]);

  return {
    healthStatus,
    healthFactor,
  };
};
