// src/pages/public/auth/Auth.page.tsx

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectWallet } from '../../../components/wallet/ConnectWallet';
import { Input } from '../../../components/ui/input';
import { FileUpload } from '../../../components/ui/file-upload';
import { Button } from '../../../components/ui/button';
import { SignInPage } from '../../../components/ui/sign-in';
import { CheckCircle } from 'lucide-react';

import { authService } from '../../../lib/api/auth.service';
import { kycService } from '../../../lib/api/kyc.service';
import { useAuthStore } from '../../../stores/auth.store';
import type { WalletStatusResponse } from '../../../types/auth.types';

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
  const [isEmailValid, setIsEmailValid] = useState<boolean>(false);
  const [isVerifyingKyc, setIsVerifyingKyc] = useState<boolean>(false);


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
    setIsVerifyingKyc(true);

    // Deliberate 5-second delay to show verification process
    await new Promise(resolve => setTimeout(resolve, 5000));

    setIsVerifyingKyc(false);
    await submitKYC();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsEmailValid(newEmail.includes('@') && newEmail.includes('.'));
  };

  return (
    <SignInPage
      galleryImages={[
        {
          id: 1,
          src: "/Upload.png",
          alt: "Tokenized Real Estate",
          title: "Launch assets",
          span: "col-span-2 row-span-2"
        },
        {
          id: 2,
          src: "/Landing1.png",
          alt: "Start Tokenisation",
          title: "Unlock Real-World Value",
          span: "col-span-2 row-span-1"
        },
        {
          id: 3,
          src: "/Marketaplce4.png",
          alt: "TOA Marketplace",
          title: "TOA Marketplace",
          span: "col-span-2 row-span-1"
        },
        {
          id: 4,
          src: "/RWA1.webp",
          alt: "Investment Portfolio",
          title: "RWA",
          span: "col-span-1 row-span-1"
        },
        {
          id: 5,
          src: "/mantle.png",
          alt: "Modern Architecture",
          title: "Mantle Network",
          span: "col-span-1 row-span-1"
        },
        {
          id: 6,
          src: "/Portfolio1.png",
          alt: "Commercial Properties",
          title: "Investor Portfolio",
          span: "col-span-2 row-span-1"
        }
      ]}
      logoSrc="./ALogo-removebg-preview.svg"
      onLogoClick={() => window.location.href = "/"}
    >
      <div className="flex flex-col gap-6 bg-transparent border border-gray-100 shadow-sm rounded-3xl p-10 ">
        {/* Title */}
        <div className="animate-element animate-delay-100">
          <h3 className="text-3xl md:text-4xl font-medium leading-tight text-[#111111]">
            Welcome to  <span className="ml-1 font-beau text-5xl">Open Assets</span>
          </h3>
          <p className="text-[#6B7280] mt-2">
            {step === 'connect' && 'Connect your wallet to begin'}
            {step === 'existing_user' && 'Welcome back! Sign in to continue'}
            {step === 'new_user' && 'Complete your profile to get started'}
            {step === 'documents_uploaded' && 'Finalize your registration'}
            {step === 'authenticating' && 'Authenticating your wallet...'}
            {step === 'kyc_submit' && 'Completing verification...'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="animate-element animate-delay-300 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600 font-sans">{error}</p>
          </div>
        )}

        {/* STEP 3: Wallet Connection (First Action) */}
        {step === 'connect' && (
          <div className="space-y-4 animate-element animate-delay-400">
            <ConnectWallet onWalletConnected={checkWalletStatus} />
            <p className="text-xs text-center text-[#6B7280] font-sans">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        )}

        {/* CASE A: Existing User - Show Login */}
        {step === 'existing_user' && address && (
          <div className="space-y-6 animate-element animate-delay-300">
            <div className="p-6 bg-[#F3F4F6] rounded-2xl space-y-3">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-mono text-[#111111] break-all">
                  {address}
                </span>
              </div>
              <p className="text-sm text-[#6B7280] text-center">
                Click below to sign in with your wallet
              </p>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full font-sans font-medium rounded-2xl h-14 bg-black text-white hover:bg-gray-900 transition-colors"
              size="lg"
            >
              Sign In with Wallet
            </Button>
          </div>
        )}

        {/* CASE B: New User - Show Email Input and Document Upload */}
        {step === 'new_user' && address && (
          <div className="space-y-4 animate-element animate-delay-300">
            <div className="p-4 bg-white/20 rounded-2xl">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-mono text-[#111111] break-all">
                  {address}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#6B7280] font-sans">
                Email Address
              </label>
              <div className="rounded-2xl border border-gray-200 bg-[#F3F4F6] backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleEmailChange}
                  className="border-none bg-transparent font-sans rounded-2xl h-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {isEmailValid && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#6B7280] font-sans">
                    KYC Document
                  </label>
                  <FileUpload
                    onChange={(files) => {
                      if (files.length > 0) {
                        handleDocumentUpload({ aadhaar: files[0] });
                      }
                    }}
                    text="Upload Aadhaar Card"
                  />
                </div>

                <Button
                  onClick={handleCompleteRegistration}
                  disabled={!kycDocuments.aadhaar || !isEmailValid || isVerifyingKyc}
                  className="w-full rounded-2xl h-14 bg-black text-white hover:bg-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                >
                  {isVerifyingKyc ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Verifying KYC...</span>
                    </div>
                  ) : (
                    'Complete Registration'
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* CASE C: Documents Uploaded - Show Complete Registration */}
        {step === 'documents_uploaded' && address && (
          <div className="space-y-6 animate-element animate-delay-300">
            <div className="p-6 bg-[#F3F4F6] rounded-2xl space-y-4">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-mono text-[#111111] break-all">
                  {address}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium font-sans">Documents Uploaded</span>
              </div>
              <p className="text-sm text-[#6B7280] text-center font-sans">
                Click below to complete your registration
              </p>
            </div>

            <Button
              onClick={handleCompleteRegistration}
              className="w-full rounded-2xl h-14 bg-black text-white hover:bg-gray-900 font-medium transition-colors"
              size="lg"
            >
              Complete Registration
            </Button>
          </div>
        )}

        {/* Authenticating */}
        {step === 'authenticating' && (
          <div className="text-center space-y-4 animate-element animate-delay-300 p-8 bg-[#F3F4F6] rounded-2xl">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full" />
              <span className="text-sm text-[#111111] font-sans font-medium">
                Authenticating...
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-sans">
              Please sign the message in your wallet
            </p>
          </div>
        )}

        {/* Submitting KYC */}
        {step === 'kyc_submit' && (
          <div className="text-center space-y-4 animate-element animate-delay-300 p-8 bg-[#F3F4F6] rounded-2xl">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full" />
              <span className="text-sm text-[#111111] font-sans font-medium">
                Completing verification...
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-sans">
              This may take a few moments
            </p>
          </div>
        )}
      </div>
    </SignInPage>
  );
};

export default AuthPage;
