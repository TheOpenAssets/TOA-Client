import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore } from '../stores/auth.store';

/**
 * Global wallet address integrity monitor
 *
 * Continuously monitors the connected wallet address and compares it with
 * the wallet address used during authentication. If a mismatch is detected:
 * - Immediately invalidates the user session
 * - Clears all authentication state and tokens
 * - Forces logout and redirects to public entry page
 *
 * This ensures strict wallet-to-session binding.
 */
export const useWalletIntegrityMonitor = () => {
  const { address: currentWalletAddress, isConnected } = useAccount();
  const { authenticatedWalletAddress, isAuthenticated, logout } = useAuthStore();

  // Use ref to prevent multiple simultaneous logout calls
  const isLoggingOut = useRef(false);

  useEffect(() => {
    // Skip if not authenticated or already logging out
    if (!isAuthenticated || !authenticatedWalletAddress || isLoggingOut.current) {
      return;
    }

    // Case 1: Wallet disconnected while authenticated
    if (!isConnected || !currentWalletAddress) {
      console.warn('[WalletIntegrity] Wallet disconnected during active session. Forcing logout.');
      handleWalletIntegrityViolation('Wallet disconnected');
      return;
    }

    // Normalize addresses for comparison (case-insensitive)
    const normalizedCurrent = currentWalletAddress.toLowerCase();
    const normalizedAuthenticated = authenticatedWalletAddress.toLowerCase();

    // Case 2: Wallet address changed
    if (normalizedCurrent !== normalizedAuthenticated) {
      console.warn(
        '[WalletIntegrity] Wallet address mismatch detected!\n' +
        `  Authenticated: ${normalizedAuthenticated}\n` +
        `  Current: ${normalizedCurrent}\n` +
        'Forcing logout for security.'
      );
      handleWalletIntegrityViolation('Wallet address changed');
    }
  }, [currentWalletAddress, isConnected, authenticatedWalletAddress, isAuthenticated]);

  /**
   * Handles wallet integrity violation by:
   * 1. Setting logout flag to prevent race conditions
   * 2. Clearing all auth state and tokens
   * 3. Redirecting to public page with hard reload
   */
  const handleWalletIntegrityViolation = (reason: string) => {
    if (isLoggingOut.current) {
      return; // Prevent duplicate logout calls
    }

    isLoggingOut.current = true;

    // Clear all authentication state
    logout();

    // Log the violation
    console.info(`[WalletIntegrity] Session invalidated: ${reason}`);

    // Hard redirect to home page - this clears all React state and resets the app
    // Using window.location instead of navigate() since this component is outside Router context
    window.location.href = '/';
  };
};
