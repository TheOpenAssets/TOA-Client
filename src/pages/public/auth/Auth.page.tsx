// src/pages/public/auth/Auth.page.tsx

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectWallet } from '../../../components/wallet/ConnectWallet';
import { WalletAddress } from '../../../components/wallet/WalletAddress';
import { DocumentUploadModal } from '../../../components/wallet/DocumentUploadModal';
import { Button } from '../../../components/ui/button';

import { authService } from '../../../lib/api/auth.service';
import { kycService } from '../../../lib/api/kyc.service';
import { useAuthStore } from '../../../stores/auth.store';
import type { WalletStatusResponse } from '../../../types/auth.types';
import SignupForm from '../../../components/ui/signup-form';

import HeroBackground from '../../landing/HeroBackground';
import ALogo from '../../../assets/ALogo-removebg-preview.png'; // Import the logo image

type AuthStep = 'connect' | 'existing_user' | 'new_user' | 'documents_uploaded' | 'authenticating' | 'kyc_submit';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading, user } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('connect');
  const [walletStatus, setWalletStatus] = useState<WalletStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kycDocuments, setKycDocuments] = useState<{ aadhaar: File | null }>({ aadhaar: null });
  const [email, setEmail] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Check if user is coming from Hero section after authentication
   * If yes, show KYC form directly
   */
  useEffect(() => {
    const state = location.state as { showKycForm?: boolean } | null;
    if (state?.showKycForm && address && user && !user.kyc) {
      // User is authenticated but needs to complete KYC
      setStep('new_user');
    }
  }, [location.state, address, user]);

  /**
   * STEP 4: Wallet Status Pre-Check (CRITICAL)
   * GET /users/exists?walletAddress=0xUSER
   * Memoized to prevent infinite re-render loops
   */
  const checkWalletStatus = useCallback(async (walletAddress: string) => {
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
  }, [setLoading]);

  /**
   * Handle document upload modal completion
   * STEP 6: Document Upload (Frontend Only)
   */
  const handleDocumentUpload = (documents: { aadhaar: File | null }) => {
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
        account: address,
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
        // Existing user with KYC → redirect to portfolio
        navigate('/portfolio');
      } else {
        // New user → Stay on auth page, wait for user to submit KYC
        setError('Please complete KYC verification to continue');
        setStep('new_user');
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
    if (!kycDocuments?.aadhaar) {
      setError('Aadhaar document not available');
      return;
    }

    try {
      setStep('kyc_submit');
      setLoading(true);

      const formData = new FormData();
      formData.append('document', kycDocuments.aadhaar);

      await kycService.submitKYC(formData);

      // After success: First-time user → Redirect to marketplace
      if (user?.role === 'INVESTOR')
      navigate('/marketplace');
     else
      navigate('/issuer/dashboard');
    } catch (err: any) {
      console.error('Error submitting KYC:', err);
      setError(err.message || 'KYC submission failed');
      setStep('documents_uploaded');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Complete Registration button click
   * This is called when user has uploaded documents and is ready to submit KYC
   */
  const handleCompleteRegistration = async () => {
    await submitKYC();
  };

  return (
    <div className="min-h-screen bg-[#ffffff] relative overflow-hidden">
      {/* Logo */}
      <img
        src={ALogo}
        alt="App Logo"
        className="absolute top-6 left-6 w-32 h-auto z-20"
      />
      {/* Hero Background */}
      <HeroBackground />

      <div className="relative z-10 min-h-screen flex items-center">
        {/* Right Side: Authentication Panel */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="w-full max-w-lg p-10 rounded-2xl transition-all duration-300"
            
          >
            <div className="w-full space-y-8">
            <div className="text-start mb-8">
              <h2 className="text-3xl font-sans font-normal text-foreground mb-4 leading-tight">
                Welcome to <span className="whitespace-nowrap font-beau font-bold">Open Assets</span>
              </h2>
            </div>
          {/* Header */}
          <div className="text-start">
            <h3 className="text-2xl font-sans font-normal text-foreground">Get Started</h3>
            <p className="mt-2 text-sm text-foreground/70 font-sans">
              Connect your wallet to continue
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-xl">
              <p className="text-sm text-destructive font-sans text-start">{error}</p>
            </div>
          )}

          {/* STEP 3: Wallet Connection (First Action) */}
          {step === 'connect' && (
            <div className="space-y-4">
              <ConnectWallet onWalletConnected={checkWalletStatus} />
              <p className="text-xs text-start text-foreground/60 font-sans">
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
                <p className="text-lg font-geist font-normal text-foreground">Welcome back</p>
                <p className="text-sm text-foreground/70 font-sans">
                  Click below to sign in with your wallet
                </p>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full font-sans font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                }}
                size="lg"
              >
                Login
              </Button>
            </div>
          )}

          {/* CASE B: New User - Show Email Input and Document Upload */}
          {step === 'new_user' && address && (
            <div className="space-y-6">
              <SignupForm
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOpenDocumentModal();
                }}
                email={email}
                setEmail={setEmail}
              />
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
                  <span className="text-sm font-medium font-sans">Documents Uploaded</span>
                </div>
                <p className="text-sm text-foreground/70 font-sans">
                  Click below to complete your registration
                </p>
              </div>

              <Button
                onClick={handleCompleteRegistration}
                className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] "
          type="submit"
                
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
                <span className="text-sm text-foreground/70 font-sans">
                  Authenticating...
                </span>
              </div>
              <p className="text-xs text-foreground/60 font-sans">
                Please sign the message in your wallet
              </p>
            </div>
          )}

          {/* Submitting KYC */}
          {step === 'kyc_submit' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-foreground/70 font-sans">
                  Completing verification...
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="link"
              className="text-xs text-foreground/60 font-sans underline-offset-4 hover:underline"
              onClick={() => navigate('/marketplace')}
            >
            skip to marketplace 
              </Button>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
