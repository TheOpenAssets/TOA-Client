import { useState, useEffect } from "react";
import orion from "../../assets/ALogo-removebg-preview.png";
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
          <img src={orion} alt="Openassets" className="h-16 w-auto object-contain" />
        </div>

        {/* Navigation Links */}
        <nav className="navbar-nav">
         <a
  href="/"
  className="nav-link underline-animation underline-animation-purple"
>
  Change log
</a>

<a href="/" className="nav-link underline-animation underline-animation-purple">
  About
</a>

        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
       
          <a href="/marketplace" className="cta-button">
            Explore Marketplace
          </a>
        </div>
      </div>

      {/* Mobile Version */}
      <div className={`navbar-mobile ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <img src={orion} alt="Openassets" className="h-12 w-auto object-contain" />
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
