import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { useAuthStore } from "../../stores/auth.store";
import { authService } from "../../lib/api/auth.service";

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
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] relative overflow-hidden">
      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center">
        {/* Illustration */}
        <div className="w-full max-w-2xl mb-12">
          <svg
            viewBox="0 0 1200 600"
            className="w-full h-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shield with checkmark illustration */}
            <g>
              {/* Background circles */}
              <circle cx="950" cy="120" r="40" fill="#3B82F6" opacity="0.9" />
              <circle cx="1000" cy="120" r="40" fill="#E5E7EB" opacity="0.6" />
            </g>

            {/* Mountains background */}
            <g stroke="#D1D5DB" strokeWidth="2" fill="none">
              <path d="M 100 450 Q 200 250, 350 350 Q 450 400, 500 450" />
              <path d="M 300 450 Q 400 200, 600 300 Q 700 350, 800 450" />
              <path d="M 700 450 Q 850 280, 1000 380 Q 1080 420, 1150 450" />
              <path d="M 300 150 Q 600 100, 900 150" />
            </g>

            {/* Ground line */}
            <line x1="100" y1="500" x2="1100" y2="500" stroke="#D1D5DB" strokeWidth="2" />

            {/* Central Shield Icon */}
            <g transform="translate(600, 300)">
              {/* Shield outline */}
              <path
                d="M 0,-100 L 80,-80 L 80,20 Q 80,80 0,120 Q -80,80 -80,20 L -80,-80 Z"
                fill="none"
                stroke="#374151"
                strokeWidth="8"
                strokeLinejoin="round"
              />

              {/* Inner shield fill */}
              <path
                d="M 0,-90 L 70,-72 L 70,20 Q 70,75 0,110 Q -70,75 -70,20 L -70,-72 Z"
                fill="#3B82F6"
                opacity="0.1"
              />

              {/* Lock/Security symbol */}
              <g transform="translate(0, -20)">
                {/* Lock body */}
                <rect x="-25" y="10" width="50" height="45" rx="5" fill="#374151" />
                {/* Lock shackle */}
                <path
                  d="M -20,-10 L -20,-25 Q -20,-40 0,-40 Q 20,-40 20,-25 L 20,-10"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Keyhole */}
                <circle cx="0" cy="25" r="6" fill="#3B82F6" />
                <rect x="-3" y="25" width="6" height="15" fill="#3B82F6" />
              </g>

              {/* Alert/Warning indicator */}
              <circle cx="50" cy="-60" r="20" fill="#EF4444" />
              <text
                x="50"
                y="-52"
                fontSize="28"
                fontWeight="bold"
                fill="white"
                textAnchor="middle"
              >
                !
              </text>
            </g>
          </svg>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-[#1f2937]">
            Verification Required
          </h1>
          <p className="text-base md:text-lg text-[#6b7280] max-w-md">
            You need to verify your wallet ownership to continue. Please sign the challenge message to proceed.
          </p>
        </div>

        {/* Verification Button */}
        <button
          onClick={handleVerification}
          disabled={isVerifying || !isConnected}
          className="flex items-center gap-3 px-8 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
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
          <p className="mt-4 text-sm text-red-600">
            Wallet not connected. Please connect your wallet first.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChallengeVerificationPage;
