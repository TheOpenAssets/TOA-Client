// src/pages/public/auth/Auth.page.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectWallet } from '../../../components/wallet/ConnectWallet';
import { WalletAddress } from '../../../components/wallet/WalletAddress';
import { DocumentUploadModal } from '../../../components/wallet/DocumentUploadModal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { authService } from '../../../lib/api/auth.service';
import { kycService } from '../../../lib/api/kyc.service';
import { useAuthStore } from '../../../stores/auth.store';
import type { WalletStatusResponse } from '../../../types/auth.types';
import { Mail } from 'lucide-react';

type AuthStep = 'connect' | 'existing_user' | 'new_user' | 'documents_uploaded' | 'authenticating' | 'kyc_submit';

const AuthPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('connect');
  const [walletStatus, setWalletStatus] = useState<WalletStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kycDocuments, setKycDocuments] = useState<{ aadhaar: File | null; pan: File | null } | null>(null);
  const [email, setEmail] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
   * Handle document upload modal completion
   * STEP 6: Document Upload (Frontend Only)
   */
  const handleDocumentUpload = (documents: { aadhaar: File | null; pan: File | null }) => {
    setKycDocuments(documents);
    setStep('documents_uploaded');
  };

  /**
   * Open document upload modal
   */
  const handleOpenDocumentModal = () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError(null);
    setIsModalOpen(true);
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
   * Only for users who uploaded documents
   */
  const submitKYC = async () => {
    if (!kycDocuments) {
      setError('KYC documents not available');
      return;
    }

    try {
      setLoading(true);

      // Convert files to document identifiers (in real app, upload files first)
      const documentData = {
        aadhaar: kycDocuments.aadhaar?.name || 'aadhaar_uploaded',
        pan: kycDocuments.pan?.name || 'pan_uploaded',
      };

      await kycService.submitKYC({
        source: 'DOCUMENT_UPLOAD',
        documents: documentData,
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

          {/* CASE B: New User - Show Email Input and Document Upload */}
          {step === 'new_user' && address && (
            <div className="space-y-6">
              <div className="text-center">
                <WalletAddress address={address} />
                <p className="mt-4 text-sm text-muted-foreground">
                  Complete your verification to continue
                </p>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Connect DigiLocker Button */}
              <Button
                onClick={handleOpenDocumentModal}
                className="w-full"
                size="lg"
              >
                Connect DigiLocker
              </Button>

              {/* Document Upload Modal */}
              <DocumentUploadModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onComplete={handleDocumentUpload}
              />
            </div>
          )}

          {/* CASE C: Documents Uploaded - Show Complete Registration */}
          {step === 'documents_uploaded' && address && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <WalletAddress address={address} />
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">Documents Uploaded</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click below to complete your registration
                </p>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full"
                size="lg"
              >
                Complete Registration
              </Button>
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
