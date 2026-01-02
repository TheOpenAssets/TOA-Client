import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";
import { useAuthActions } from "../../hooks/useAuthActions";
import { Button } from "../../components/ui/button.tsx";



const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();


  const { isAuthenticating, handleGetStarted } = useAuthActions();
  
  const handleGetUsdcClick = async () => {
    if (true) {
      navigate('/faucet');
      return;
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
<a href="/" className="nav-link underline-animation underline-animation-purple">
  How it works 
</a>
<a href="/" className="nav-link underline-animation underline-animation-purple">
Features</a>

        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
       
        <Button
            onClick={handleGetUsdcClick}
            className="cta-button hover:scale-[1.02] transition-transform"
          >
            {'Faucet'}
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


