import { useState, useEffect } from "react";
import orion from "../../assets/ALogo.png";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 100); // Trigger after 100px scroll
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="navbar-container">
      <div className={`navbar-desktop ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <div className="logo-placeholder">
            <div className="logo-icon">
              <img src={orion} alt="Openassets" />
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="navbar-nav">
          <a href="/marketplace" className="nav-link">
            Marketplace
          </a>
          
        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
          <a href="/adminAuth" className="cta-button">
            Admin Login
          </a>
          <a href="/dashboard" className="cta-button">
            Launch App
          </a>
        </div>
      </div>

      {/* Mobile Version */}
      <div className={`navbar-mobile ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <div className="logo-placeholder">
            <div className="logo-icon">
              <img src={orion} alt="Openassets" />
            </div>
          </div>
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
