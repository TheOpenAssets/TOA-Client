import { useNavigate } from "react-router-dom";
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { authService } from '../lib/api/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { useState, useEffect } from 'react';
import { issuerService } from "../lib/api/issuer.service";
import { useNetwork } from "../lib/network/NetworkContext";

export const useAuthActions = () => {
  const navigate = useNavigate();
  const { networkPath } = useNetwork();
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading, setAuthenticatedWallet } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pendingAction, setPendingAction] = useState<'investor' | 'issuer' | null>(null);

  useEffect(() => {
    if (isConnected && address && pendingAction) {
      if (pendingAction === 'investor') {
        authenticateInvestor();
      } else if (pendingAction === 'issuer') {
        authenticateIssuer();
      }
      setPendingAction(null);
    }
  }, [isConnected, address, pendingAction]);

  const authenticateInvestor = async () => {
    if (!isConnected || !address) return;

    try {
      setIsAuthenticating(true);
      setLoading(true);
      setError(null);

      const challenge = await authService.getChallenge(address);
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

  return {
    error,
    isAuthenticating,
    handleGetStarted,
    handleIssuerGetStarted,
  };
};
