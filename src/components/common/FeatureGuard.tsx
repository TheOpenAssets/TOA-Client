import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNetwork } from '../../lib/network/NetworkContext';
import type { NetworkFeatures } from '../../lib/network/network.config';

interface FeatureGuardProps {
  feature: keyof NetworkFeatures;
  children: React.ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children }) => {
  const { isFeatureAvailable, networkPath } = useNetwork();

  if (!isFeatureAvailable(feature)) {
    return <Navigate to={networkPath('/')} replace />;
  }

  return <>{children}</>;
};
