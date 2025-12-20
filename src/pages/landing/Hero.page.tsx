import { useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import HeroBackground from "./HeroBackground";
import cloudImage from "../../assets/cloud.png";
import Logo from "../../assets/ALogo.png";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handlenavigate = () => {
    navigate('/issuer');
  };

  const handleMarketplaceNavigate = () => {
    navigate('/marketplace');
  };

  useEffect(() => {
    // Trigger hero animations on mount
    const elements = heroRef.current?.querySelectorAll('[data-animate]');
    elements?.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('animate-hero-word');
      }, index * 80);
    });
  }, []);

  // Split the title into words for staggered animation
  const titlePart1 = "Register,";
  const titlePart2 = "Manage,";  // Script font
  const titlePart3 = "& Monetize";
  const titlePart4 = "Your Creative IP with";
  const titlePart5 = " Story Protocol. ";  // Script font
  const titlePart6 = "";

  return (
    <section id="hero" ref={heroRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-24" style={{ backgroundColor: '#f0f8ffe6' }}>
      {/* Hero Background Effect */}
      <HeroBackground />

      {/* Logo Section */}
      <div className="flex justify-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-foreground rounded-xl flex items-center justify-center shadow-lg opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="w-8 h-8 bg-background rounded-md">
            <img src={Logo} alt="Openassets Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Cloud background behind text only - repositioned */}
          <div className="absolute inset-0 pointer-events-none opacity-20 -z-0">
            <img
              src={cloudImage}
              alt=""
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[40%] w-[900px] max-w-none mix-blend-soft-light"
            />
          </div>
          
          {/* Hero Title with word-by-word animation - moved down slightly */}
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight relative mt-8" style={{ zIndex: 2 }}>
            <span className="inline-block opacity-0" data-animate style={{ animationDelay: '0s' }}>
              {titlePart1}
            </span>
            {" "}
            <span className="inline-block font-beau text-[68px] opacity-0" data-animate style={{ animationDelay: '0.08s' }}>
              {titlePart2}
            </span>
            <span className="inline-block opacity-0" data-animate style={{ animationDelay: '0.16s' }}>
              {titlePart3}
            </span>
            <br />
            <span className="inline-block opacity-0" data-animate style={{ animationDelay: '0.24s' }}>
              {titlePart4}
            </span>
            {" "}
            <span className="inline-block font-beau text-[68px] opacity-0" data-animate style={{ animationDelay: '0.32s' }}>
              {titlePart5}
            </span>
            <span className="inline-block opacity-0" data-animate style={{ animationDelay: '0.4s' }}>
              {titlePart6}
            </span>
          </h1>

          <p className="font-inter text-base md:text-lg text-foreground/80 mb-12 max-w-xl mx-auto opacity-0 animate-fade-in-up relative" style={{ animationDelay: '0.8s', zIndex: 2 }}>
            Orion is the ultimate platform for creators to establish on-chain provenance, manage derivatives, and automate royalties for their digital and real-world intellectual property.
          </p>

          {/* CTA Buttons with spring animation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative" style={{ zIndex: 2 }}>
            <Button 
                  size="lg"
                  className="btn-gradient text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                  style={{ 
                    animation: 'fade-in-up 0.6s cubic-bezier(0.44, 0, 0.56, 1) forwards',
                    animationDelay: '1s',
                    background: 'linear-gradient(125deg, rgb(119, 75, 229) -4%, rgb(119, 75, 229) 100%)',
                    boxShadow: 'rgb(192, 176, 232) 0px 1px 2px 0px inset, rgba(99, 69, 173, 0.35) 0px 0.706592px 0.706592px -0.583333px, rgba(99, 69, 173, 0.34) 0px 1.80656px 1.80656px -1.16667px, rgba(99, 69, 173, 0.33) 0px 3.62176px 3.62176px -1.75px, rgba(99, 69, 173, 0.3) 0px 6.8656px 6.8656px -2.33333px, rgba(99, 69, 173, 0.26) 0px 13.6468px 13.6468px -2.91667px, rgba(99, 69, 173, 0.15) 0px 30px 30px -3.5px'
                  }}
                  onClick={handlenavigate}
                >
                  Register Your IP
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>
                  </svg>
                </Button>
            <Button 
                  size="lg"
                  className="text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                  style={{ 
                    animation: 'fade-in-up 0.6s cubic-bezier(0.44, 0, 0.56, 1) forwards',
                    animationDelay: '1.1s',
                    background: 'linear-gradient(127deg, rgb(14, 28, 41) -68%, rgb(50, 61, 104) 100%)',
                    boxShadow: 'rgb(184, 193, 230) 0px 1px 2px 0px inset, rgba(46, 64, 128, 0.35) 0px 0.706592px 0.706592px -0.583333px, rgba(46, 64, 128, 0.34) 0px 1.80656px 1.80656px -1.16667px, rgba(46, 64, 128, 0.33) 0px 3.62176px 3.62176px -1.75px, rgba(46, 64, 128, 0.3) 0px 6.8656px 6.8656px -2.33333px, rgba(46, 64, 128, 0.26) 0px 13.6468px 13.6468px -2.91667px, rgba(46, 64, 128, 0.15) 0px 30px 30px -3.5px'
                  }}
                  onClick={handleMarketplaceNavigate}
                >
                  Explore Marketplace
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/>
                  </svg>
                </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;