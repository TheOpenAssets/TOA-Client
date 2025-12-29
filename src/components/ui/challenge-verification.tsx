import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { useAuthStore } from "../../stores/auth.store";
import { authService } from "../../lib/api/auth.service";
import { ParticleTextEffect } from "./interactive-text-particle";

export const ChallengeVerificationPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { setUser } = useAuthStore();
  const { signMessageAsync } = useSignMessage();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerification = async () => {
    if (!isConnected || !address) {
      console.error("Wallet not connected");
      alert("Please connect your wallet first");
      navigate("/auth");
      return;
    }

    setIsVerifying(true);

    try {
      // Step 1: Get challenge from backend
      const challenge = await authService.getChallenge(address);

      // Step 2: Sign the challenge message
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      // Step 3: Login with signature
      const loginResponse = await authService.login({
        walletAddress: address,
        message: challenge.message,
        signature: signature,
      });

      // Update user state
      setUser(loginResponse.user);

      console.log("Verification successful!");

      // Check if there's a redirect path stored
      const redirectPath = localStorage.getItem('redirect_after_verification');

      if (redirectPath) {
        // Clear the stored path and redirect back
        localStorage.removeItem('redirect_after_verification');
        navigate(redirectPath);
      } else {
        // Redirect based on user role and KYC status
        if (loginResponse.user.role === "INVESTOR") {
          if (loginResponse.user.kyc) {
            navigate("/portfolio");
          } else {
            navigate("/auth");
          }
        } else if (loginResponse.user.role === "ORIGINATOR") {
          navigate("/issuer/dashboard");
        } else if (loginResponse.user.role === "ADMIN") {
          navigate("/admin");
        }
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      alert(error.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#f6fbff] relative overflow-hidden">
      {/* Particle Text Effect Background */}
      <ParticleTextEffect
        text="VERIFY"
        className="absolute top-0 left-0"
        colors={['10b981', '34d399', '6ee7b7', '3b82f6', '60a5fa']}
        animationForce={80}
        particleDensity={4}
      />

      {/* Content */}
      <div className=" bottom-0 z-10 flex flex-col items-center gap-8">
        {/* Verification Button */}
        <button
          onClick={handleVerification}
          disabled={isVerifying || !isConnected}
          className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-base font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>Verify & Continue</span>
            </>
          )}
        </button>

        {!isConnected && (
          <p className="text-sm text-red-600 bg-white/90 px-4 py-2 rounded-lg shadow-md">
            Wallet not connected. Please connect your wallet first.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChallengeVerificationPage;
