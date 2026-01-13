// src/pages/public/auth/Auth.page.tsx


import { useNavigate } from 'react-router-dom';
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
  const { address } = useAccount();

  const { setLoading, user } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('new_user');
  const [error, setError] = useState<string | null>(null);
  const [kycDocuments, setKycDocuments] = useState<{ aadhaar: File | null }>({ aadhaar: null });
  const [email, setEmail] = useState<string>('');
  const [isEmailValid, setIsEmailValid] = useState<boolean>(false);
  const [isVerifyingKyc, setIsVerifyingKyc] = useState<boolean>(false);
  const [isUsingTestAadhar, setIsUsingTestAadhar] = useState(false);



  useEffect(() => {
      setStep('new_user');
  }, [address]);

  const toggleTestAadhar = async (checked: boolean) => {
    setIsUsingTestAadhar(checked);
    if (checked) {
      try {
        const response = await fetch('/AadharGenerated.png');
        if (!response.ok) throw new Error('Failed to load test file');
        const blob = await response.blob();
        const file = new File([blob], 'AadharGenerated.png', { type: 'image/png' });
        handleDocumentUpload({ aadhaar: file });
      } catch (e) {
        console.error("Error loading test file", e);
      }
    } else {
      handleDocumentUpload({ aadhaar: null });
    }
  };

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
      <img src="./ALogo-removebg-preview.svg" alt="Background"  onClick={() => { navigate('/') }} className="fixed inset-0 top-5 left-5 w-22 h-22 object-cover z-50" />
      <div className="absolute top-0 left-0 w-full h-full mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="text-3xl md:text-5xl max-w-7xl tracking-tighter text-center font-regular text-black mb-4">
              <span className="font-gellix font-regular">Welcome to Open Assets</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-5">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-light font-beau text-7xl text-neutral-500"
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

            <p className="font-inter text-base md:text-lg text-black mb-3 max-w-2xl mx-auto">
              Tokenize and invest in real-world assets, leverage m-ETH for smart purchases, issue private or RWA-backed credit, and earn credible on-chain yields.<br />
              <span className="font-beau text-xl md:text-2xl font-semibold">Tokenize. Invest. Borrow. Earn.</span> All in one unified execution layer.
            </p>
          </div>

          <div className="animate-element animate-delay-100">
            <p className="text-[#000000] mt-1">
              {step === 'new_user' && 'Complete your profile to get started'}
              {step === 'documents_uploaded' && 'Finalize your registration'}
              {step === 'kyc_submit' && 'Completing verification...'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="animate-element animate-delay-300 p-4 bg-neutral-500/10 border border-red-400 rounded-2xl">
              <p className="text-sm text-red-600 font-sans">{error}</p>
            </div>
          )}

          <div className='border border-gray-500/10 bg-transparent rounded-3xl shadow-xl p-10'>
            {step === 'new_user' && address && (
              <div className="space-y-4 animate-element animate-delay-300">
                  <Button className=' bg-transparent shadow-xl rounded-full' onClick={() => { setStep('documents') }}>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                <div className="p-4 bg-transparent border border-gray-500/20 rounded-3xl shadow-3xl">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-mono text-[#000000] break-all">
                      {address}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#000000] font-sans">
                    Email Address
                  </label>
                  <div className="rounded-2xl border border-gray-500/20 bg-transparent shadow-lg focus-within:border-violet-400/70 focus-within:bg-transparent focus-within:shadow-none mt-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      className="border-none bg-transparent text-black font-sans rounded-2xl h-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 'documents' && isEmailValid && (
              <div className="space-y-6 animate-element animate-delay-300">
                <Button className=' bg-transparent shadow-xl rounded-full' onClick={() => { setStep('new_user'); setEmail(''); setIsEmailValid(false); }}>
                  <ArrowLeft className="w-4 h-4 text-black" />
                </Button>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2b2b2b] font-sans">
                    KYC Document
                  </label>
                  <FileUpload
                    onChange={(files) => {
                      if (files.length > 0) {
                        setIsUsingTestAadhar(false);
                        handleDocumentUpload({ aadhaar: files[0] });
                      }
                    }}
                    value={kycDocuments.aadhaar ? [kycDocuments.aadhaar] : []}
                    text="Upload Aadhaar Card"
                  >
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="test-aadhar"
                            checked={isUsingTestAadhar}
                            onChange={(e) => toggleTestAadhar(e.target.checked)}
                            className="w-4 h-4 text-violet-300 bg-gray-100 border-gray-300  focus:ring-violet-500 rounded-full"
                        />
                        <label htmlFor="test-aadhar" className="text-sm text-neutral-600 font-sans cursor-pointer">
                            Use TOA test Aadhar card for KYC
                        </label>
                    </div>
                  </FileUpload>
                </div>

                <Button
                  onClick={handleCompleteRegistration}
                  disabled={!kycDocuments.aadhaar || !isEmailValid || isVerifyingKyc}
                  className="w-full rounded-2xl h-14 bg-transparent text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:border hover:border-gray-500/40 shadow-xl"
                  type="submit"
                >
                  {isVerifyingKyc ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
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
                <Button className=' bg-transparent shadow-xl rounded-full' onClick={() => { setStep('documents') }}>
                  <ArrowLeft className="w-4 h-4 text-black" />
                </Button>
                <div className="p-6 border border-gray-500/60 bg-transparent rounded-3xl space-y-4 shadow-2xl">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-mono text-[#000000] break-all">
                      {address}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium font-sans">Documents Uploaded</span>
                  </div>
                  <p className="text-sm text-[#000000] text-center font-sans ">
                    Click below to complete your registration
                  </p>
                </div>

                <Button
                  onClick={handleCompleteRegistration}
                  className="w-full rounded-2xl h-14 bg-transparent text-gray-800  hover:border hover:border-gray-500/50 shadow-xl font-medium"
                  size="lg"
                >
                  Complete Registration
                </Button>
              </div>
            )}

            {/* Submitting KYC */}
            {step === 'kyc_submit' && (
              <div className="text-center space-y-4 animate-element animate-delay-300 p-8 border border-gray-500/60 bg-transparent rounded-3xl shadow-2xl">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                  <span className="text-sm text-[#ffffff] font-sans font-medium">
                    Completing verification...
                  </span>
                </div>
                <p className="text-xs text-[#000000] font-sans">
                  This may take a few moments
                </p>
              </div>
            )}
            {!isEmailValid && step === 'documents' &&(
              <div className='flex flex-row items-center justify-center gap-4 p-1'>
                <Button className=' w-6 h-6 bg-transparent shadow-xl border border-neutral-200 rounded-full' onClick={() => { setStep('new_user') }}>
                  <ArrowLeft className="w-4 h-4 text-black" />
                </Button>
                <span>Invalid step, please try again</span>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}