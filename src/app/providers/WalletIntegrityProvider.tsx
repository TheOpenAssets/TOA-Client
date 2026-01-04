import { type ReactNode } from 'react';
import { useWalletIntegrityMonitor } from '../../hooks/useWalletIntegrityMonitor';

interface WalletIntegrityProviderProps {
  children: ReactNode;
}

/**
 * WalletIntegrityProvider - Global wallet address integrity monitor
 *
 * This provider continuously monitors the connected wallet address and
 * ensures it matches the wallet address used during authentication.
 *
 * If the wallet address changes or disconnects during an active session:
 * - Immediately invalidates the session
 * - Clears all authentication state and tokens
 * - Forces logout and redirects to public page
 *
 * This component should wrap the entire application to provide
 * global, continuous wallet-to-session binding enforcement.
 *
 * @example
 * ```tsx
 * <WalletIntegrityProvider>
 *   <App />
 * </WalletIntegrityProvider>
 * ```
 */
export const WalletIntegrityProvider = ({ children }: WalletIntegrityProviderProps) => {
  // Initialize global wallet integrity monitoring
  useWalletIntegrityMonitor();

  return <>{children}</>;
};
