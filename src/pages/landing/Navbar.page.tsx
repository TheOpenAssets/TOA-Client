
import { useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";
import { useAuthActions } from "../../hooks/useAuthActions";
import { ShimmerButton } from "../../components/ui/shimmer-button";



const Navbar = () => {

  const navigate = useNavigate();
  const { isAuthenticating, handleGetStarted } = useAuthActions();

  const handleGetUsdcClick = async () => {
    if (true) {
      navigate('/faucet');
      return;
    }

  };

  return (
    <header className="max-w-7xl mx-auto px-6 relative z-20 p-5">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row justify-between">
          {/* Logo */}
          <div className="navbar-logo">
            <img src="./ALogo-removebg-preview.svg" alt="Openassets" className="h-16 w-auto object-contain" />
          </div>

          {/* Navigation Links */}
          <nav className="navbar-nav">
            <a
              href="/changelog"
              className="nav-link underline-animation underline-animation-purple"
            >
              <p className="font-bold">Changelog</p>
            </a>

            <a href="/about" className="nav-link underline-animation underline-animation-purple">
              <p className="font-bold">About</p>
            </a>
            <a href="/how-it-works" className="nav-link underline-animation underline-animation-purple">
              <p className="font-bold">How it works</p>
            </a>
            <a 
              href="https://open-assets-core-proposal.notion.site/Open-Assets-Mantle-Network-2d5316cd01a780818164c5889beb1a19" 
              className="nav-link underline-animation underline-animation-purple"
              target="_blank"
              rel="noopener noreferrer"
            >
              <p className="font-bold">Documents</p>
            </a>

          </nav>
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-4">

          <ShimmerButton
            onClick={handleGetUsdcClick}
            className="shadow-2xl hover:scale-[1.02] transition-transform"
          >
            {'Faucet'}
          </ShimmerButton>
          <ShimmerButton
            onClick={handleGetStarted}
            disabled={isAuthenticating}
            className="shadow-2xl hover:scale-[1.02] transition-transform"
          >
            {isAuthenticating ? "Authenticating..." : "Explore Marketplace"}
          </ShimmerButton>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


