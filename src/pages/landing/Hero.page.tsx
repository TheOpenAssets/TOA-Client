import { Button } from "../../components/ui/button";
import HeroBackground from "./HeroBackground";
import Logo from "../../assets/ALogo-removebg-preview.png";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/auth');
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
            <Button
                  size="lg"
                  className="btn-gradient text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm"
                    style={{
                  background: 'linear-gradient(135deg, hsla(204, 15%, 61%, 1.00) 0%, hsla(215, 46%, 54%, 1.00) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(75, 167, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                }}
                  onClick={handleNavigate}
                >
                  Get Started
                </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;