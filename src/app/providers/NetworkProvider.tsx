import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { NETWORK_CONFIGS, DEFAULT_NETWORK } from '../../lib/network/network.config';
import type { NetworkType } from '../../lib/network/network.config';
import { NetworkProviderInternal } from '../../lib/network/NetworkContext';

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { network } = useParams<{ network: string }>();

  const resolvedNetwork = (network as NetworkType) || DEFAULT_NETWORK;
  const config = NETWORK_CONFIGS[resolvedNetwork as NetworkType];

  console.log('🌐 NetworkProvider: resolved network =', resolvedNetwork, 'config =', config);

  if (!config) {
    return <Navigate to={`/${DEFAULT_NETWORK}`} replace />;
  }

  return <NetworkProviderInternal network={config}>{children}</NetworkProviderInternal>;
};
