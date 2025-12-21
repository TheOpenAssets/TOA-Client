import { Button } from "../../components/ui/button";
import HeroBackground from "./HeroBackground";
import Logo from "../../assets/ALogo.png";
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
          <div className="w-8 h-8 bg-background rounded-md">
            <img src={Logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
            A Cross-Chain RWA Truth, Execution, and Yield Platform Built Natively on Mantle
          </h1>

          <p className="font-inter text-base md:text-lg text-foreground/80 mb-12 max-w-2xl mx-auto">
            We create a single, verifiable RWA truth layer on Mantle, combined with native marketplaces, lending, and yield distribution, and enable secure cross-chain RWA interoperability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
                  size="lg"
                  className="btn-gradient text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm"
                   style={{ 
                    background: 'linear-gradient(125deg, rgb(119, 75, 229) -4%, rgb(119, 75, 229) 100%)',
                    boxShadow: 'rgb(192, 176, 232) 0px 1px 2px 0px inset, rgba(99, 69, 173, 0.35) 0px 0.706592px 0.706592px -0.583333px, rgba(99, 69, 173, 0.34) 0px 1.80656px 1.80656px -1.16667px, rgba(99, 69, 173, 0.33) 0px 3.62176px 3.62176px -1.75px, rgba(99, 69, 173, 0.3) 0px 6.8656px 6.8656px -2.33333px, rgba(99, 69, 173, 0.26) 0px 13.6468px 13.6468px -2.91667px, rgba(99, 69, 173, 0.15) 0px 30px 30px -3.5px'
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