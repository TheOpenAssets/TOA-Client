import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";
import { useAuthActions } from "../../hooks/useAuthActions";
import { Button } from "../../components/ui/button.tsx";
import { useAccount } from "wagmi";
import { faucetService } from "../../lib/api/faucet.service";
import { useToast } from "../../hooks/useToast";
import { Loader2 } from "lucide-react";


const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { address } = useAccount();
  const { success, error: toastError, info } = useToast();
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [activeFaucet, setActiveFaucet] = useState<'USDC' | 'mETH' | null>(null);

  const { isAuthenticating, handleGetStarted } = useAuthActions();
  
  const handleGetUsdcClick = async () => {
    if (!address) {
      navigate('/faucet');
      return;
    }

    setIsFaucetLoading(true);
    setActiveFaucet('USDC');
    info('Requesting USDC...', 'The faucet is processing your request.');
    try {
      const response = await faucetService.getUsdcFromFaucet(address);
      success('USDC Received!', `${response.amount} USDC sent to your wallet.`);
    } catch (err: any) {
      toastError('Faucet Error', err.message || 'Failed to get USDC.');
    } finally {
      setIsFaucetLoading(false);
      setActiveFaucet(null);
    }
  };

  const handleGetMethClick = async () => {
    if (!address) {
      navigate('/faucet');
      return;
    }

    setIsFaucetLoading(true);
    setActiveFaucet('mETH');
    info('Requesting mETH...', 'The faucet is processing your request.');
    try {
      const response = await faucetService.getMethFromFaucet(address);
      success('mETH Received!', `${response.amount} mETH sent to your wallet.`);
    } catch (err: any) {
      toastError('Faucet Error', err.message || 'Failed to get mETH.');
    } finally {
      setIsFaucetLoading(false);
      setActiveFaucet(null);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 100); // Trigger after 100px scroll
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="max-w-7xl mx-auto px-6 relative z-20">
      <div className={`navbar-desktop ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <img src="./ALogo-removebg-preview.svg" alt="Openassets" className="h-16 w-auto object-contain" />
        </div>

        {/* Navigation Links */}
        <nav className="navbar-nav">
         <a
  href="/"
  className="nav-link underline-animation underline-animation-purple"
>
  Changelog
</a>

<a href="/" className="nav-link underline-animation underline-animation-purple">
  About
</a>

        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
        <Button
            onClick={handleGetMethClick}
            disabled={isFaucetLoading}
            className="cta-button hover:scale-[1.02] transition-transform"
          >
            {isFaucetLoading && activeFaucet === 'mETH' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ...</>
            ) : (
              'Get mETH'
            )}
          </Button>
        <Button
            onClick={handleGetUsdcClick}
            disabled={isFaucetLoading}
            className="cta-button hover:scale-[1.02] transition-transform"
          >
            {isFaucetLoading && activeFaucet === 'USDC' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ...</>
            ) : (
              'Get USDC'
            )}
          </Button>
         <Button
                     onClick={handleGetStarted}
                     disabled={isAuthenticating}
                     className="cta-button"
                   >
                     {isAuthenticating ? "Authenticating..." : "Explore Marketplace"}
                   </Button>
        </div>
      </div>

      {/* Mobile Version */}
      <div className={`navbar-mobile ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <img src="./ALogo-removebg-preview.svg" alt="Openassets" className="h-12 w-auto object-contain" />
        </div>

        {/* Hamburger Menu */}
        <div className="hamburger-menu">
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


