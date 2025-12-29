import { Button } from "../../components/ui/button";
import HeroBackground from "./HeroBackground";
import { useNavigate } from "react-router-dom";
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { authService } from '../../lib/api/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useState, useEffect } from 'react';
import { issuerService } from "../../lib/api/issuer.service";

const HeroSection = () => {
  const navigate = useNavigate();
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pendingAction, setPendingAction] = useState<'investor' | 'issuer' | null>(null);

  // Watch for wallet connection and execute pending action
  useEffect(() => {
    if (isConnected && address && pendingAction) {
      if (pendingAction === 'investor') {
        authenticateInvestor();
      } else if (pendingAction === 'issuer') {
        authenticateIssuer();
      }
      setPendingAction(null);
    }
  }, [isConnected, address, pendingAction]);

  const authenticateInvestor = async () => {
    if (!isConnected || !address) return;

    try {
      setIsAuthenticating(true);
      setLoading(true);
      setError(null);

      const challenge = await authService.getChallenge(address);
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      const loginResponse = await authService.login({
        walletAddress: address,
        message: challenge.message,
        signature: signature,
      });

      setUser(loginResponse.user);

      // Route based on role from login response
      if (loginResponse.user.role === 'ORIGINATOR') {
        navigate('/issuer/dashboard');
      } else if (loginResponse.user.role === 'INVESTOR') {
        if (loginResponse.user.kyc === true) {
          navigate('/portfolio');
        } else {
          navigate('/auth', { state: { showKycForm: true } });
        }
      } else if (loginResponse.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/auth', { state: { showKycForm: true } });
      }
    } catch (err: any) {
      console.error('Error during authentication:', err);
      setError(err.message || 'Authentication failed');
      navigate('/auth');
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const authenticateIssuer = async () => {
    if (!isConnected || !address) return;

    try {
      setIsAuthenticating(true);
      setLoading(true);
      setError(null);

      const challenge = await issuerService.getChallenge(address);
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      const loginResponse = await issuerService.login({
        walletAddress: address,
        message: challenge.message,
        signature: signature,
      });

      setUser(loginResponse.user);

      // Route based on role from login response
      if (loginResponse.user.role === 'ORIGINATOR') {
        if (loginResponse.user.kyc === true) {
          navigate('/issuer/dashboard');
        } else {
          navigate('/auth', { state: { showKycForm: true } });
        }
      } else if (loginResponse.user.role === 'INVESTOR') {
        navigate('/portfolio');
      } else if (loginResponse.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/auth', { state: { showKycForm: true } });
      }
    } catch (err: any) {
      console.error('Error during authentication:', err);
      setError(err.message || 'Authentication failed');
      navigate('/auth');
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const handleGetStarted = async () => {
    try {
      setError(null);

      if (!isConnected || !address) {
        // Open RainbowKit modal and set pending action for investor
        setPendingAction('investor');
        if (openConnectModal) {
          openConnectModal();
        } else {
          setError("Wallet connection not available");
        }
        return;
      }

      // Wallet is already connected, proceed with authentication
      // Role-based routing will happen in authenticateInvestor based on login response
      await authenticateInvestor();
    } catch (err: any) {
      console.error('Error during get started:', err);
      setError(err.message || 'Operation failed');
    }
  };

  const handleIssuerGetStarted = async () => {
    try {
      setError(null);

      if (!isConnected || !address) {
        // Open RainbowKit modal and set pending action
        setPendingAction('issuer');
        if (openConnectModal) {
          openConnectModal();
        } else {
          setError("Wallet connection not available");
        }
        return;
      }

      // Wallet is already connected, proceed with authentication
      await authenticateIssuer();
    } catch (err: any) {
      console.error('Error during issuer get started:', err);
      setError(err.message || 'Operation failed');
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-24 bg-[#f0f8ffe6]">
      <HeroBackground />

      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
           RWA Tokenization,
          </h1>
          <h1 className="font-beau text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">Settlement
</h1>
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
& Cross Protocol Credit 
          </h1>

          <p className="font-inter text-base md:text-lg text-foreground/80 mb-12 max-w-2xl mx-auto">
Tokenize and invest in real-world assets, leverage M-ETH for smart purchases, issue private or RWA-backed credit, and earn credible on-chain yields.
Tokenize. Invest. Borrow. Earn - all in one unified execution layer.          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {error && (
              <div className="w-full max-w-md p-3 bg-destructive/10 border border-destructive rounded-xl mb-2">
                <p className="text-sm text-destructive font-inter text-center">{error}</p>
              </div>
            )}

            <Button
              size="lg"
              className="cta-button"
              
              onClick={handleGetStarted}
              disabled={isAuthenticating}
            >
              Get Started
            </Button>
             <Button
                    size="lg"
                    onClick={handleIssuerGetStarted}
                    disabled={isAuthenticating}
                    className="cta-button"
             
                  >
                    Become an Issuer
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>
                    </svg>
                  </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;