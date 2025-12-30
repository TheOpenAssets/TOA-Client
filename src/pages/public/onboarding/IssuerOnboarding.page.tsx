// src/pages/public/onboarding/IssuerOnboarding.page.tsx

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectWallet } from '../../../components/wallet/ConnectWallet';
import { WalletAddress } from '../../../components/wallet/WalletAddress';
import { DocumentUploadModal } from '../../../components/wallet/DocumentUploadModal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { issuerService } from '../../../lib/api/issuer.service';
import { authService } from '../../../lib/api/auth.service';
import { kycService } from '../../../lib/api/kyc.service';
import { useAuthStore } from '../../../stores/auth.store';
import type { IssuerData } from '../../../types/issuer.types';
import { Mail, CheckCircle2, Circle, Loader2 } from 'lucide-react';

type OnboardingStep =
  | 'validating_token'     // Initial: Validating token from URL
  | 'token_invalid'        // Token is invalid or expired
  | 'connect_wallet'       // Step 1: Connect wallet
  | 'kyc_verification'     // Step 2: KYC verification
  | 'documents_uploaded'   // Documents uploaded, ready to register
  | 'authenticating'       // Step 3: Authenticating
  | 'kyc_submit'           // Submitting KYC
  | 'success';             // Success, ready to redirect

const IssuerOnboardingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading } = useAuthStore();

  const [step, setStep] = useState<OnboardingStep>('validating_token');
  const [token, setToken] = useState<string | null>(null);
  const [issuerData, setIssuerData] = useState<IssuerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kycDocuments, setKycDocuments] = useState<{ aadhaar: File | null; pan: File | null } | null>(null);
  const [email, setEmail] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * PHASE A: Token Validation (on page load)
   */
  useEffect(() => {
    const validateOnboardingToken = async () => {
      // Get token from URL parameter
      const tokenParam = searchParams.get('token');

      if (!tokenParam) {
        setError('No onboarding token provided. Please use the link from your email.');
        setStep('token_invalid');
        return;
      }

      setToken(tokenParam);

      try {
        setLoading(true);
        const response = await issuerService.validateToken(tokenParam);

        if (response.valid && response.issuerData) {
          // Token is valid, store issuer data
          setIssuerData(response.issuerData);
          setEmail(response.issuerData.email); // Pre-fill email
          setStep('connect_wallet');
        } else {
          // Token is invalid
          setError(response.error || 'Invalid onboarding token');
          setStep('token_invalid');
        }
      } catch (err: any) {
        console.error('Error validating token:', err);
        setError('Failed to validate token. Please try again.');
        setStep('token_invalid');
      } finally {
        setLoading(false);
      }
    };

    validateOnboardingToken();
  }, [searchParams, setLoading]);

  /**
   * PHASE B: Wallet Connection Handler
   * Note: We do NOT check wallet status - this is a new issuer
   */
  const handleWalletConnected = useCallback((walletAddress: string) => {
    console.log('Wallet connected:', walletAddress);
    // Move to KYC step
    setStep('kyc_verification');
  }, []);

  /**
   * Handle document upload modal completion
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
      setError('Email is required');
      return;
    }
    setError(null);
    setIsModalOpen(true);
  };

  /**
   * PHASE D: Complete Registration (Authentication + KYC)
   */
  const handleCompleteRegistration = async () => {
    if (!address || !token) {
      setError('Wallet not connected or token missing');
      return;
    }

    try {
      setStep('authenticating');
      setError(null);
      setLoading(true);

      // Step 1: Get Challenge
      const challenge = await authService.getChallenge(address);

      // Step 2: Sign Message
      const signature = await signMessageAsync({
        message: challenge.message,
        account: address,
      });

      // Step 3: Login with onboarding token
      const loginResponse = await authService.login({
        walletAddress: address,
        message: challenge.message,
        signature: signature,
        onboardingToken: token,  // Pass the token to link wallet to issuer record
      });

      // Store user in state
      setUser(loginResponse.user);

      // Step 4: Submit KYC
      if (loginResponse.user.kyc === false && kycDocuments) {
        setStep('kyc_submit');
        await submitKYC();
      } else {
        // Success, redirect to issuer dashboard
        setStep('success');
        setTimeout(() => {
          navigate('/issuer-dashboard');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error during registration:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setStep('documents_uploaded');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit KYC documents
   */
  const submitKYC = async () => {
    if (!kycDocuments) {
      setError('KYC documents not available');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      if (kycDocuments.aadhaar) {
        formData.append('document', kycDocuments.aadhaar);
      }
      if (kycDocuments.pan) {
        formData.append('document', kycDocuments.pan);
      }

      await kycService.submitKYC(formData);

      // Success
      setStep('success');
      setTimeout(() => {
        navigate('/issuer-dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting KYC:', err);
      setError(err.message || 'KYC submission failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get current step number for progress indicator
   */
  const getCurrentStepNumber = (): number => {
    switch (step) {
      case 'validating_token':
      case 'token_invalid':
        return 0;
      case 'connect_wallet':
        return 1;
      case 'kyc_verification':
      case 'documents_uploaded':
        return 2;
      case 'authenticating':
      case 'kyc_submit':
      case 'success':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepNumber = getCurrentStepNumber();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side: Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-cover bg-center items-center justify-center p-12" style={{backgroundImage: `url('https://images.unsplash.com/photo-1735660244565-9574ca46c57d?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`}}>
        <div className="max-w-md bg-black/40 backdrop-blur-sm p-8 rounded-lg">
          <h1 className="text-4xl font-antic font-bold text-white mb-4">
            Welcome to 
          </h1>
          <h1 className="text-4xl font-beau font-bold text-white mb-6">
            Open Assets
          </h1>
          <p className="text-lg text-white/80 font-antic">
            Complete your issuer onboarding to start tokenizing real-world assets.
          </p>
        </div>
      </div>

      {/* Right Side: Onboarding Panel */}
      <div className="flex-1 flex items-center justify-center p-8" style={{backgroundImage: `url('/src/assets/ALogo-removebg-preview.png')`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
        <div className='bg-white/50 w-full max-w-lg p-10 rounded-xl shadow-lg backdrop-blur-sm'>
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center font-antic">
              <h2 className="text-3xl font-bold text-foreground">Issuer Onboarding</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete verification to access your issuer dashboard
              </p>
            </div>

            {/* Progress Stepper */}
            {step !== 'token_invalid' && step !== 'validating_token' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {[
                    { num: 1, label: 'Email Verified' },
                    { num: 2, label: 'Connect Wallet' },
                    { num: 3, label: 'KYC Verification' },
                    { num: 4, label: 'Complete' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          currentStepNumber >= item.num
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {currentStepNumber > item.num ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-xs mt-1 text-muted-foreground">{item.label}</span>
                      </div>
                      {idx < 3 && (
                        <div className={`h-px flex-1 mx-2 ${
                          currentStepNumber > item.num ? 'bg-purple-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* STEP: Validating Token */}
            {step === 'validating_token' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                <p className="text-sm text-muted-foreground">Validating your onboarding link...</p>
              </div>
            )}

            {/* STEP: Token Invalid */}
            {step === 'token_invalid' && (
              <div className="text-center space-y-4">
                <div className="text-destructive">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Invalid or Expired Link</h3>
                <p className="text-sm text-muted-foreground">
                  The onboarding link is invalid or has expired. Please request a new link or contact support.
                </p>
                <Button onClick={() => navigate('/')} variant="outline">
                  Go to Homepage
                </Button>
              </div>
            )}

            {/* STEP: Connect Wallet */}
            {step === 'connect_wallet' && issuerData && (
              <div className="space-y-6">
                <div className="text-center space-y-2 font-antic">
                  <div className="flex items-center justify-center gap-2 text-green-500 mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Email Verified</span>
                  </div>
                  <h3 className="text-xl font-semibold">Welcome, {issuerData.company}!</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your wallet to link it to your issuer account
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg text-left text-sm space-y-1">
                    <p><span className="font-medium">Name:</span> {issuerData.name}</p>
                    <p><span className="font-medium">Company:</span> {issuerData.company}</p>
                    <p><span className="font-medium">Asset Type:</span> {issuerData.assetType}</p>
                    <p><span className="font-medium">Location:</span> {issuerData.location}</p>
                  </div>
                </div>

                <ConnectWallet onWalletConnected={handleWalletConnected} />
              </div>
            )}

            {/* STEP: KYC Verification */}
            {step === 'kyc_verification' && address && (
              <div className="space-y-6">
                <div className="text-center space-y-2 font-antic">
                  <WalletAddress address={address} />
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Wallet Connected</span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Complete KYC verification to continue
                  </p>
                </div>

                {/* Email Input (pre-filled) */}
                <div className="space-y-2 font-antic">
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
                      disabled
                    />
                  </div>
                </div>

                <Button
                  onClick={handleOpenDocumentModal}
                  className="w-full font-antic"
                  size="lg"
                  variant="link"
                >
                  Connect DigiLocker
                </Button>

                <DocumentUploadModal
                  open={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  onComplete={handleDocumentUpload as any}
                />
              </div>
            )}

            {/* STEP: Documents Uploaded */}
            {step === 'documents_uploaded' && address && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <WalletAddress address={address} />
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Documents Uploaded</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click below to complete your issuer registration
                  </p>
                </div>

                <Button
                  onClick={handleCompleteRegistration}
                  className="w-full"
                  size="lg"
                >
                  Complete Registration
                </Button>
              </div>
            )}

            {/* STEP: Authenticating */}
            {step === 'authenticating' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                <p className="text-sm text-muted-foreground">Authenticating...</p>
                <p className="text-xs text-muted-foreground">
                  Please sign the message in your wallet
                </p>
              </div>
            )}

            {/* STEP: Submitting KYC */}
            {step === 'kyc_submit' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                <p className="text-sm text-muted-foreground">Completing verification...</p>
              </div>
            )}

            {/* STEP: Success */}
            {step === 'success' && (
              <div className="text-center space-y-4">
                <div className="text-green-500">
                  <CheckCircle2 className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="font-semibold text-lg">Registration Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Redirecting to your issuer dashboard...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuerOnboardingPage;