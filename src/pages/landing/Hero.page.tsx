import { Button } from "../../components/ui/button";
import HeroBackground from "./HeroBackground";
import Logo from "../../assets/ALogo-removebg-preview.png";
import { useNavigate } from "react-router-dom";
import { useAccount, useSignMessage } from 'wagmi';
import { authService } from '../../lib/api/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useState } from 'react';

const HeroSection = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGetStarted = async () => {
    try {
      setError(null);

      // If wallet is not connected, navigate to auth page for wallet connection
      if (!isConnected || !address) {
        navigate('/auth');
        return;
      }

      // Wallet is connected, proceed with authentication
      setIsAuthenticating(true);
      setLoading(true);

      // Step 1: Get authentication challenge
      const challenge = await authService.getChallenge(address);

      // Step 2: Sign the message
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      // Step 3: Login with signature
      const loginResponse = await authService.login({
        walletAddress: address,
        message: challenge.message,
        signature: signature,
      });

      // Step 4: Store user data
      setUser(loginResponse.user);

      // Step 5: Navigate based on KYC status
      if (loginResponse.user.kyc === true) {
        // User has completed KYC → navigate to portfolio
        navigate('/portfolio');
      } else {
        // User needs to complete KYC → navigate to auth page for KYC form
        navigate('/auth', { state: { showKycForm: true } });
      }
    } catch (err: any) {
      console.error('Error during authentication:', err);
      setError(err.message || 'Authentication failed');
      // On error, navigate to auth page
      navigate('/auth');
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-24 bg-[#f0f8ffe6]">
      <HeroBackground />

      <div className="flex justify-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-foreground rounded-xl flex items-center justify-center shadow-lg">
          <div className="w-64 h-64 bg-background rounded-md">
            <img src={Logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
            RWA Truth, 
          </h1>
          <h1 className="font-beau text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">Execution</h1>
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
            & Yield Distribution Layer
          </h1>

          <p className="font-inter text-base md:text-lg text-foreground/80 mb-12 max-w-2xl mx-auto">
            We create a single, verifiable RWA truth layer on Mantle, combined with native marketplaces, lending, and yield distribution, and enable secure cross-chain RWA interoperability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {error && (
              <div className="w-full max-w-md p-3 bg-destructive/10 border border-destructive rounded-xl mb-2">
                <p className="text-sm text-destructive font-inter text-center">{error}</p>
              </div>
            )}

            <Button
              size="lg"
              className="btn-gradient text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm"
              style={{
                background: 'linear-gradient(135deg, hsla(204, 15%, 61%, 1.00) 0%, hsla(215, 46%, 54%, 1.00) 100%)',
                boxShadow: '0 4px 14px 0 rgba(75, 167, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
              }}
              onClick={handleGetStarted}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Authenticating...
                </span>
              ) : (
                'Get Started'
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;