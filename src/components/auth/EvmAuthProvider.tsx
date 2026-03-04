import React, { useState } from 'react';
import { useAccount, useSignMessage, useDisconnect, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { authService } from '../../lib/api/auth.service';
import { issuerService } from '../../lib/api/issuer.service';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '../../lib/network/NetworkContext';
import { NETWORK_CHAIN_MAP } from '../../lib/blockchain/chains.config';
import { AuthStrategyProvider } from '../../lib/auth/AuthStrategyContext';
import type { AuthStrategy } from '../../lib/auth/AuthStrategyContext';

export const EvmAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { networkType, networkPath } = useNetwork();
    const { openConnectModal } = useConnectModal();
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { switchChainAsync } = useSwitchChain();
    const { disconnect } = useDisconnect();
    const { setUser, setLoading, setAuthenticatedWallet, logout: storeLogout } = useAuthStore();

    const [error, setError] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [pendingAction, setPendingAction] = useState<'investor' | 'issuer' | null>(null);

    // Re-use logic from original useAuthActions
    // We can't easily reuse useAuthActions because it's being refactored to USE this provider.
    // So we move the logic here.

    const authenticateInvestor = async () => {
        if (!isConnected || !address) return;

        try {
            setIsAuthenticating(true);
            setLoading(true);
            setError(null);

            const challenge = await authService.getChallenge(address);
            await switchChainAsync({ chainId: NETWORK_CHAIN_MAP[networkType].id });
            const signature = await signMessageAsync({
                message: challenge.message,
            });

            const loginResponse = await authService.login({
                walletAddress: address,
                message: challenge.message,
                signature: signature,
            });

            setUser(loginResponse.user);
            setAuthenticatedWallet(address);

            if (loginResponse.user.role === 'ORIGINATOR') {
                navigate(networkPath('/issuer/dashboard'));
            } else if (loginResponse.user.role === 'INVESTOR') {
                if (loginResponse.user.kyc === true) {
                    navigate(networkPath('/portfolio'));
                } else {
                    navigate(networkPath('/auth'), { state: { showKycForm: true } });
                }
            } else if (loginResponse.user.role === 'ADMIN') {
                navigate(networkPath('/admin'));
            } else {
                navigate(networkPath('/auth'), { state: { showKycForm: true } });
            }
        } catch (err: any) {
            console.error('Error during authentication:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setIsAuthenticating(false);
            setLoading(false);
        }
    };

    const authenticateIssuer = async () => {
        if (!isConnected || !address) return;

        try {
            setIsAuthenticating(true);
            setLoading(true);
            setError(null);

            const challenge = await issuerService.getChallenge(address);
            await switchChainAsync({ chainId: NETWORK_CHAIN_MAP[networkType].id });
            const signature = await signMessageAsync({
                message: challenge.message,
            });

            const loginResponse = await issuerService.login({
                walletAddress: address,
                message: challenge.message,
                signature: signature,
            });

            setUser(loginResponse.user);
            setAuthenticatedWallet(address);

            if (loginResponse.user.role === 'ORIGINATOR') {
                if (loginResponse.user.kyc === true) {
                    navigate(networkPath('/issuer/dashboard'));
                } else {
                    navigate(networkPath('/auth'), { state: { showKycForm: true } });
                }
            } else if (loginResponse.user.role === 'INVESTOR') {
                navigate(networkPath('/portfolio'));
            } else if (loginResponse.user.role === 'ADMIN') {
                navigate(networkPath('/admin'));
            } else {
                navigate(networkPath('/auth'), { state: { showKycForm: true } });
            }
        } catch (err: any) {
            console.error('Error during authentication:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setIsAuthenticating(false);
            setLoading(false);
        }
    };

    // Handle pending actions after connection
    React.useEffect(() => {
        if (isConnected && address && pendingAction) {
            if (pendingAction === 'investor') {
                authenticateInvestor();
            } else if (pendingAction === 'issuer') {
                authenticateIssuer();
            }
            setPendingAction(null);
        }
    }, [isConnected, address, pendingAction]);

    const handleGetStarted = async () => {
        try {
            setError(null);

            if (!isConnected || !address) {
                setPendingAction('investor');
                if (openConnectModal) {
                    openConnectModal();
                } else {
                    setError("Wallet connection not available");
                }
                return;
            }

            await authenticateInvestor();
        } catch (err: any) {
            console.error('Error during get started:', err);
            setError(err.message || 'Operation failed');
        }
    };

    const handleIssuerGetStarted = async () => {
        try {
            setError(null);

            if (!isConnected || !address) {
                setPendingAction('issuer');
                if (openConnectModal) {
                    openConnectModal();
                } else {
                    setError("Wallet connection not available");
                }
                return;
            }

            await authenticateIssuer();
        } catch (err: any) {
            console.error('Error during issuer get started:', err);
            setError(err.message || 'Operation failed');
        }
    };

    const handleLogout = () => {
        disconnect();
        storeLogout();
        navigate(networkPath('/'));
    };

    const strategy: AuthStrategy = {
        isAuthenticating,
        isAuthenticated: isConnected && !!address, // Simplified check
        address: address,
        error,
        login: handleGetStarted, // Alias for now
        logout: handleLogout,
        handleGetStarted,
        handleIssuerGetStarted,
    };

    return <AuthStrategyProvider strategy={strategy}>{children}</AuthStrategyProvider>;
};
