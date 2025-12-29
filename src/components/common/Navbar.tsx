// src/components/common/Navbar.tsx
import { Link } from "react-router-dom";
import { useAuthActions } from "../../hooks/useAuthActions";
import { Button } from "../ui/button";

const Navbar = () => {
  const { error, isAuthenticating, handleGetStarted } = useAuthActions();

  return (
    <div className="navbar-container">
      <nav className="navbar-desktop">
        <Link to="/" className="navbar-logo">
          <img src="/logo-light.svg" alt="OpenAssets Logo" className="h-8" />
        </Link>
        <div className="navbar-nav">
          <Link to="/marketplace" className="nav-link underline-animation">
            Marketplace
          </Link>
          <Link to="/portfolio" className="nav-link underline-animation">
            Portfolio
          </Link>
          <Link to="/issuer/dashboard" className="nav-link underline-animation">
            Issuer
          </Link>
          <Link to="/admin" className="nav-link underline-animation">
            Admin
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {error && (
            <div className="p-2 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <Button
            onClick={handleGetStarted}
            disabled={isAuthenticating}
            className="cta-button"
          >
            {isAuthenticating ? "Authenticating..." : "Explore Marketplace"}
          </Button>
        </div>
      </nav>
      {/* Mobile Navbar will go here */}
    </div>
  );
};
export default Navbar;
