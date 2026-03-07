import React, { createContext, useContext, useCallback } from 'react';
import type { NetworkConfig, NetworkFeatures, NetworkType } from './network.config';

interface NetworkContextValue {
  network: NetworkConfig;
  networkType: NetworkType;
  isFeatureAvailable: (feature: keyof NetworkFeatures) => boolean;
  networkPath: (path: string) => string;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProviderInternal: React.FC<{ network: NetworkConfig; children: React.ReactNode }> = ({ network, children }) => {
  const isFeatureAvailable = useCallback(
    (feature: keyof NetworkFeatures) => {
      return network.features[feature];
    },
    [network.features]
  );

  const networkPath = useCallback(
    (path: string) => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `/${network.type}${cleanPath}`;
    },
    [network.type]
  );

  const value: NetworkContextValue = {
    network,
    networkType: network.type as NetworkType,
    isFeatureAvailable,
    networkPath,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
