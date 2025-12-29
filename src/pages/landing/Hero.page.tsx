import { Button } from "../../components/ui/button";
import { useAuthActions } from "../../hooks/useAuthActions";

const HeroSection = () => {
  const { error, isAuthenticating, handleGetStarted, handleIssuerGetStarted } = useAuthActions();

  return (
    <section id="hero" className="relative max-h-screen flex flex-col justify-center pt-20 pb-24 bg-transparent">
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