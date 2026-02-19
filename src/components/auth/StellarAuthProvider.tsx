import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '../../lib/network/NetworkContext';
import { AuthStrategyProvider } from '../../lib/auth/AuthStrategyContext';
import type { AuthStrategy } from '../../lib/auth/AuthStrategyContext';
import { useAuthStore } from '../../stores/auth.store';
import {
    isConnected,
    requestAccess,
    getAddress,
    signMessage
} from "@stellar/freighter-api";
import { authService } from '../../lib/api/auth.service';
import { issuerService } from '../../lib/api/issuer.service';

export const StellarAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { networkPath } = useNetwork();
    const { setUser, setLoading, setAuthenticatedWallet, logout: storeLogout } = useAuthStore();

    const [error, setError] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [address, setAddress] = useState<string | undefined>(undefined);

    // Restore session on mount
    React.useEffect(() => {
        const restoreSession = async () => {
            try {
                // 1. Check for existing token
                const token = localStorage.getItem('stellar_access_token') || localStorage.getItem('mantle_access_token');

                if (!token) {
                    // No backend session, just clear state
                    return;
                }

                // 2. Check if Freighter is installed and we have access
                if (await isConnected()) {
                    const addressData = await getAddress();
                    if (addressData.address) {
                        setAddress(addressData.address);
                        setAuthenticatedWallet(addressData.address);

                        // 3. Verify backend session
                        try {
                            // Force base service to use the found token if needed, but it should auto-detect
                            // We call getCurrentUser to validate token and get user role/kyc
                            const user = await authService.getCurrentUser();
                            setUser(user);
                        } catch (e) {
                            console.warn("Backend session invalid:", e);
                            handleLogout(); // Token invalid, force logout
                        }
                    }
                }
            } catch (err) {
                // Silent failure - user just needs to login again if info cannot be retrieved
                console.debug("Failed to restore Stellar session:", err);
            }
        };
        restoreSession();
    }, [setAuthenticatedWallet]);

    const authenticateStellar = async (role: 'investor' | 'issuer') => {
        try {
            setError(null);
            setIsAuthenticating(true);
            setLoading(true);

            // 1. Check if Freighter is installed
            const installed = await isConnected();
            if (!installed) {
                throw new Error("Freighter wallet is not installed. Please install it to continue.");
            }

            // 2. Request access
            const allowed = await requestAccess();
            if (!allowed) {
                throw new Error("User denied access to Freighter wallet.");
            }

            // 3. Get Public Key
            const addressData = await getAddress();
            if (addressData.error) {
                throw new Error(typeof addressData.error === 'string' ? addressData.error : "Failed to retrieve address");
            }

            const publicKey = addressData.address;
            if (!publicKey) {
                throw new Error("Failed to retrieve public key from Freighter.");
            }
            setAddress(publicKey);

            // 4. Get Challenge & Sign
            const service = role === 'issuer' ? issuerService : authService;
            const challenge = await service.getChallenge(publicKey);

            const signResponse = await signMessage(challenge.message);
            if (signResponse.error) {
                throw new Error(typeof signResponse.error === 'string' ? signResponse.error : "Failed to sign message");
            }

            let signature = signResponse.signedMessage;
            if (!signature) throw new Error("User denied message signature.");

            // Convert Buffer/Uint8Array to Base64 string (Backend expects Base64 for Stellar)
            if (typeof signature !== 'string') {
                try {
                    // Check if it's a Buffer-like object or Uint8Array
                    // @ts-ignore
                    if (signature.type === 'Buffer' || signature.constructor?.name === 'Buffer' || signature instanceof Uint8Array || Array.isArray(signature)) {
                        // Convert to Uint8Array first to be safe
                        // @ts-ignore
                        const byteArray = signature instanceof Uint8Array ? signature : new Uint8Array(signature);

                        // Convert to binary string
                        let binary = '';
                        const len = byteArray.byteLength;
                        for (let i = 0; i < len; i++) {
                            binary += String.fromCharCode(byteArray[i]);
                        }

                        // Convert to Base64
                        signature = window.btoa(binary);
                    } else {
                        // Fallback for unknown types, try standard toString or fail gracefully
                        console.warn("Unknown signature format, attempting toString:", signature);
                        signature = signature.toString();
                    }
                } catch (e) {
                    console.error("Signature conversion failed:", e);
                    throw new Error("Failed to process wallet signature");
                }
            }

            // 5. Login
            const loginResponse = await service.login({
                walletAddress: publicKey,
                message: challenge.message,
                signature: signature as string,
            });

            // 6. Persist Token Explicitly (Fix for missing token issue)
            if (loginResponse.tokens) {
                localStorage.setItem('stellar_access_token', loginResponse.tokens.access);
                localStorage.setItem('stellar_refresh_token', loginResponse.tokens.refresh);
            }

            // 7. Update State
            setUser(loginResponse.user);
            setAuthenticatedWallet(publicKey);

            // 8. Navigate
            if (loginResponse.user.role === 'ORIGINATOR') {
                if (loginResponse.user.kyc === true) {
                    navigate(networkPath('/issuer/dashboard'));
                } else {
                    navigate(networkPath('/auth'), { state: { showKycForm: true } });
                }
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
            console.error('Stellar Authentication Error:', err);
            setError(err.message || "Authentication failed");
        } finally {
            setIsAuthenticating(false);
            setLoading(false);
        }
    };

    const handleGetStarted = async () => {
        await authenticateStellar('investor');
    };

    const handleIssuerGetStarted = async () => {
        await authenticateStellar('issuer');
    };

    const handleLogout = () => {
        setAddress(undefined);
        localStorage.removeItem('stellar_access_token');
        localStorage.removeItem('stellar_refresh_token');
        storeLogout();
        navigate(networkPath('/'));
    };

    const strategy: AuthStrategy = {
        isAuthenticating,
        isAuthenticated: !!address,
        address,
        error,
        login: handleGetStarted,
        logout: handleLogout,
        handleGetStarted,
        handleIssuerGetStarted,
    };

    return <AuthStrategyProvider strategy={strategy}>{children}</AuthStrategyProvider>;
};
