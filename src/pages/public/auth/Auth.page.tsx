// src/pages/public/auth/Auth.page.tsx


import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Input } from '../../../components/ui/input';
import { FileUpload } from '../../../components/ui/file-upload';
import { Button } from '../../../components/ui/button';
// import { SignInPage } from '../../../components/ui/sign-in';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { kycService } from '../../../lib/api/kyc.service';
import { useAuthStore } from '../../../stores/auth.store';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wavy } from '../../../components/ui/wavy';


type AuthStep = 'new_user' | 'documents' | 'documents_uploaded' | 'kyc_submit';

export default function AuthPage() {

  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useAccount();

  const { setLoading, user } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('new_user');
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
  /**
   * Handle document upload modal completion
   * STEP 6: Document Upload (Frontend Only)
   */
  const handleDocumentUpload = (documents: { aadhaar: File | null }) => {
    setKycDocuments(documents);
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

  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Tokenise", "Invest", "Leverage", "Trade", "Borrow"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <Wavy />
      <img src="./ALogo-removebg-preview.svg" alt="Background" onClick={() => { navigate('/') }} className="fixed inset-0 top-5 left-5 w-22 h-22 object-cover" />
      <div className="absolute top-0 left-0 w-full h-full mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="text-3xl md:text-5xl max-w-7xl tracking-tighter text-center font-regular text-white">
              <span className="font-gellix font-regular">Welcome to Open Assets</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-5">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-light font-beau text-7xl text-neutral-100"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                          y: 0,
                          opacity: 1,
                        }
                        : {
                          y: titleNumber > index ? -150 : 150,
                          opacity: 0,
                        }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="font-inter text-base md:text-lg text-white mb-3 max-w-2xl mx-auto">
              Tokenize and invest in real-world assets, leverage m-ETH for smart purchases, issue private or RWA-backed credit, and earn credible on-chain yields.<br />
              <span className="font-beau text-xl md:text-2xl font-semibold">Tokenize. Invest. Borrow. Earn.</span> All in one unified execution layer.
            </p>
          </div>

          <div className="animate-element animate-delay-100">
            <p className="text-[#ffffff] mt-1">
              {step === 'new_user' && 'Complete your profile to get started'}
              {step === 'documents_uploaded' && 'Finalize your registration'}
              {step === 'kyc_submit' && 'Completing verification...'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="animate-element animate-delay-300 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm text-red-600 font-sans">{error}</p>
            </div>
          )}
          <div className='border border-gray-500/60 bg-transparent rounded-3xl shadow-xl p-10'>
            {step === 'new_user' && address && (
              <div className="space-y-4 animate-element animate-delay-300">
                  <Button className='border border-neutral-200 bg-transparent shadow-xl rounded-full' onClick={() => { setStep('documents') }}>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                <div className="p-4 border border-gray-500/60 bg-transparent rounded-3xl shadow-2xl">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-mono text-[#ffffff] break-all">
                      {address}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#ffffff] font-sans">
                    Email Address
                  </label>
                  <div className="rounded-2xl border border-gray-500/60 bg-transparent shadow-lg focus-within:border-violet-400/70 focus-within:bg-transparent focus-within:shadow-none mt-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      className="border-none bg-transparent text-white font-sans rounded-2xl h-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 'documents' && isEmailValid && (
              <div className="space-y-6 animate-element animate-delay-300">
                <Button className='border border-neutral-200 bg-transparent shadow-xl rounded-full' onClick={() => { setStep('new_user'); setEmail(''); setIsEmailValid(false); }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
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
              </div>
            )}

            {/* CASE C: Documents Uploaded - Show Complete Registration */}
            {step === 'documents_uploaded' && address && (
              <div className="space-y-6 animate-element animate-delay-300">
                <Button className='border border-neutral-200 bg-transparent shadow-xl rounded-full' onClick={() => { setStep('documents') }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
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
        </div>
      </div>
    </div>
  );
}

