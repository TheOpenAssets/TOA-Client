// src/pages/public/auth/Auth.page.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectWallet } from '../../../components/wallet/ConnectWallet';
import { WalletAddress } from '../../../components/wallet/WalletAddress';
import { DigiLockerSimulation } from '../../../components/wallet/DigiLockerSimulation';
import { Button } from '../../../components/ui/button';
import { authService } from '../../../lib/api/auth.service';
import { kycService } from '../../../lib/api/kyc.service';
import { useAuthStore } from '../../../stores/auth.store';
import type { WalletStatusResponse } from '../../../types/auth.types';

type AuthStep = 'connect' | 'checking' | 'existing_user' | 'new_user' | 'authenticating' | 'kyc_submit';

const AuthPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('connect');
  const [walletStatus, setWalletStatus] = useState<WalletStatusResponse | null>(null);
  const [authChallenge, setAuthChallenge] = useState<{ message: string; nonce: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kycDocuments, setKycDocuments] = useState<{ aadhaar: string; pan: string } | null>(null);

  // When wallet connects, check status
  useEffect(() => {
    if (isConnected && address && step === 'connect') {
      checkWalletStatus(address);
    }
  }, [isConnected, address, step]);

  /**
   * STEP 4: Wallet Status Pre-Check (CRITICAL)
   * GET /users/exists?walletAddress=0xUSER
   */
  const checkWalletStatus = async (walletAddress: string) => {
    try {
      setStep('checking');
      setError(null);
      setLoading(true);

      const status = await authService.checkWalletStatus(walletAddress);
      setWalletStatus(status);

      // STEP 5: UI DECISION BASED ON BACKEND RESPONSE
      if (status.exists && status.kyc) {
        // Case A: Wallet exists AND KYC is completed
        setStep('existing_user');
      } else {
        // Case B: Wallet not whitelisted OR KYC not done
        setStep('new_user');
      }
    } catch (err: any) {
      console.error('Error checking wallet status:', err);
      setError(err.message || 'Failed to check wallet status');
      setStep('connect');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle DigiLocker simulation completion
   * STEP 6: DigiLocker Simulation (Frontend Only)
   */
  const handleDigiLockerComplete = (documents: { aadhaar: string; pan: string }) => {
    setKycDocuments(documents);
    // After DigiLocker, proceed to authentication
    handleLogin();
  };

  /**
   * STEP 7: AUTHENTICATION FLOW
   */
  const handleLogin = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setStep('authenticating');
      setError(null);
      setLoading(true);

      // Step 7.1: Get Challenge
      const challenge = await authService.getChallenge(address);
      setAuthChallenge(challenge);

      // Step 7.2: Wallet Signs Message
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      // Step 7.3: Login API (AUTH ONLY)
      const loginResponse = await authService.login({
        walletAddress: address,
        message: challenge.message,
        signature: signature,
      });

      // STEP 8: Backend Login Result
      setUser(loginResponse.user);

      // STEP 9: Post-Login Handling
      if (loginResponse.user.kyc === true) {
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Submit KYC completion
        setStep('kyc_submit');
        await submitKYC();
      }
    } catch (err: any) {
      console.error('Error during authentication:', err);
      setError(err.message || 'Authentication failed');
      setStep(walletStatus?.exists && walletStatus?.kyc ? 'existing_user' : 'new_user');
    } finally {
      setLoading(false);
    }
  };

  /**
   * STEP 10: KYC Completion API (Separate)
   * Only for users who saw DigiLocker
   */
  const submitKYC = async () => {
    if (!kycDocuments) {
      setError('KYC documents not available');
      return;
    }

    try {
      setLoading(true);

      await kycService.submitKYC({
        source: 'DIGILOCKER_SIMULATION',
        documents: kycDocuments,
      });

      // After success: Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error submitting KYC:', err);
      setError(err.message || 'KYC submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side: Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Open Assets
          </h1>
          <p className="text-lg text-muted-foreground">
            Secure, transparent, and compliant real-world asset tokenization platform.
          </p>
        </div>
      </div>

      {/* Right Side: Authentication Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Get Started</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your wallet to continue
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* STEP 3: Wallet Connection (First Action) */}
          {step === 'connect' && (
            <div className="space-y-4">
              <ConnectWallet onWalletConnected={(addr) => checkWalletStatus(addr)} />
              <p className="text-xs text-center text-muted-foreground">
                By connecting, you agree to our Terms of Service
              </p>
            </div>
          )}

          {/* Checking Status */}
          {step === 'checking' && (
            <div className="text-center space-y-4">
              {address && <WalletAddress address={address} />}
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-muted-foreground">
                  Checking wallet status...
                </span>
              </div>
            </div>
          )}

          {/* CASE A: Existing User - Show Login */}
          {step === 'existing_user' && address && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <WalletAddress address={address} />
                <p className="text-lg font-medium text-foreground">Welcome back</p>
                <p className="text-sm text-muted-foreground">
                  Click below to sign in with your wallet
                </p>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full"
                size="lg"
              >
                Login
              </Button>
            </div>
          )}

          {/* CASE B: New User - Show DigiLocker */}
          {step === 'new_user' && address && (
            <div className="space-y-6">
              <div className="text-center">
                <WalletAddress address={address} />
              </div>

              <DigiLockerSimulation onComplete={handleDigiLockerComplete} />
            </div>
          )}

          {/* Authenticating */}
          {step === 'authenticating' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-muted-foreground">
                  Authenticating...
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Please sign the message in your wallet
              </p>
            </div>
          )}

          {/* Submitting KYC */}
          {step === 'kyc_submit' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-muted-foreground">
                  Completing verification...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
