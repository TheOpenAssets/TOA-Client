import { useEffect } from "react";
import { useAuthActions } from "../../hooks/useAuthActions";
import { useToast } from "../../hooks/useToast";
import { Button } from "../../components/ui/button";
import { Landmark, User } from "lucide-react";

const HeroSection = () => {
  const { error, isAuthenticating, handleGetStarted, handleIssuerGetStarted } = useAuthActions();
  const { error: showError } = useToast();

  useEffect(() => {
    if (error) {
      showError("Authentication Error", error);
    }
  }, [error, showError]);


  return (
    <section id="hero" className="relative max-h-screen flex flex-col justify-center pt-20 pb-24 bg-transparent">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
            Onchain,
          </h1>
          <h1 className="font-beau text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight"> Private Credit
          </h1>
          <h1 className="font-antic text-5xl md:text-6xl lg:text-[64px] font-normal text-foreground mb-6 leading-tight tracking-tight">
            for emerging markets
          </h1>

          <p className="font-beau  md:text-3xl text-foreground/80 mb-12 max-w-2xl mx-auto">
            Connecting global stablecoin liquidity to Indian credit markets. <br />
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">

            <Button
              className="hover:scale-[1.02] transition-transform rounded-3xl border-2 border-neutral-500 bg-neutral-200/80"
              onClick={handleGetStarted}
              disabled={isAuthenticating}
            >
              <User className="w-4 h-4" />
              Get Started
            </Button>
            <Button
              onClick={handleIssuerGetStarted}
              disabled={isAuthenticating}
              className="flex hover:scale-[1.02] items-center gap-2 px-4 py-2 bg-[#111111] text-white rounded-2xl text-sm font-medium hover:bg-[#000000] transition-colors shadow-sm"
            >
              <Landmark className="w-4 h-4" />
              Become an Issuer
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
