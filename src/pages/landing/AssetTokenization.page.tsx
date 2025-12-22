import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import cloudImage from "../../assets/cloud.png";

const AssetTokenizationSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [isCheckingIssuer, setIsCheckingIssuer] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Mock list of approved issuer wallet addresses
  // In production, this would be checked against the backend
  const approvedIssuers = [
    // Add some mock addresses for testing
    // You can add your test wallet address here
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('[data-scroll-reveal]');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Check if connected wallet is an approved issuer
  useEffect(() => {
    if (isConnected && address && showConnectModal) {
      checkIssuerStatus(address);
    }
  }, [isConnected, address, showConnectModal]);

  const checkIssuerStatus = async (walletAddress: string) => {
    setIsCheckingIssuer(true);

    // Simulate checking backend (in real app, call API)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const isApprovedIssuer = approvedIssuers.includes(walletAddress.toLowerCase());

    if (isApprovedIssuer) {
      // Wallet is recognized - redirect to issuer dashboard
      navigate('/issuer-dashboard');
    } else {
      // Wallet not recognized - redirect to auth/onboarding
      navigate('/auth');
    }

    setIsCheckingIssuer(false);
    setShowConnectModal(false);
  };

  const handleAlreadyIssuerClick = () => {
    if (isConnected && address) {
      // Already connected, check status
      checkIssuerStatus(address);
    } else {
      // Not connected, show connect modal
      setShowConnectModal(true);
    }
  };

  // First typeform: Issuer Application (for new issuers)
  const openIssuerApplicationForm = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      'https://form.typeform.com/to/Y3ZrQIm2',
      'IssuerApplicationForm',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  // Second typeform: Asset Onboarding (for existing issuers to list assets)
  const openAssetOnboardingForm = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      'https://form.typeform.com/to/y0BQnYxs',
      'AssetOnboardingForm',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-[#f6fbff] to-white relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Main Card */}
        <div
          className="bg-gradient-to-br from-[#0e1c29] to-[#323d68] rounded-[20px] p-12 md:p-16 relative opacity-0 overflow-hidden"
          data-scroll-reveal
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animationDelay: '0.2s'
          }}
        >
          {/* Subtle cloud background */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <img
              src={cloudImage}
              alt=""
              className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/4 w-[600px] max-w-none mix-blend-soft-light"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                   <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm24,40a12,12,0,1,1-12-12A12,12,0,0,1,144,176Z"></path></svg>
                </div>
                <span className="text-sm font-medium text-white/90">Powered by Mantle</span>
              </div>

              {/* Heading */}
              <h2 className="font-antic text-white text-[44px] md:text-[52px] not-italic font-normal tracking-[-0.44px] leading-[1.1]">
                True Cross-Chain RWAs, Natively on Mantle
              </h2>

              {/* Description */}
              <p className="font-inter text-base md:text-lg text-white/80 leading-relaxed max-w-lg">
                Our platform leverages the entire Mantle stack to create a global source of truth for RWAs, enabling seamless interoperability and execution. This only works because of Mantle.
              </p>

              {/* Feature List */}
              <div className="space-y-3">
                {[
                  'Mantle DA for canonical asset commitments',
                  'Low-Cost EVM for marketplaces and yield',
                  'mETH as a native yield benchmark and liquidity',
                  'Mantle as the global RWA execution hub'
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 opacity-0"
                    data-scroll-reveal
                    style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/>
                      </svg>
                    </div>
                    <span className="text-white/90 text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    onClick={openIssuerApplicationForm}
                    className="bg-white text-[#0e1c29] hover:bg-white/90 rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                    data-scroll-reveal
                    style={{
                      animationDelay: '0.7s',
                      boxShadow: '0 10px 40px rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    Become an Issuer
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>
                    </svg>
                  </Button>
                  <Button
                    size="lg"
                    onClick={openAssetOnboardingForm}
                    variant="outline"
                    className="bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                    data-scroll-reveal
                    style={{
                      animationDelay: '0.8s',
                      boxShadow: '0 10px 40px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    List an Asset
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>
                    </svg>
                  </Button>
                </div>

                {/* Already an Issuer Button */}
                <div className="text-center opacity-0" data-scroll-reveal style={{ animationDelay: '0.9s' }}>
                  <Button
                    size="sm"
                    onClick={handleAlreadyIssuerClick}
                    disabled={isCheckingIssuer}
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10 font-inter text-sm"
                  >
                    {isCheckingIssuer ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking...
                      </>
                    ) : (
                      <>
                        Already an Issuer?
                        <span className="ml-1 underline">Access Dashboard</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md opacity-0" data-scroll-reveal style={{ animationDelay: '0.6s' }}>
                {/* Stats Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-[16px] p-6 border border-white/20">
                  <div className="space-y-6">
                    <h3 className="text-white font-bold text-lg">Cross-Chain Flow</h3>
                    {/* Stat 1 */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                      <div>
                        <div className="text-xs text-white/60 mb-1">Outbound (Mantle → Other Chains)</div>
                        <div className="text-base font-medium text-white">Mint "mirror assets" by referencing Mantle's registry and DA commitments.</div>
                      </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/60 mb-1">Inbound (Other Chains → Mantle)</div>
                        <div className="text-base font-medium text-white">Anchor external RWAs to Mantle, making it their execution and liquidity layer.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet Modal for Already an Issuer */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-antic text-2xl">Connect Wallet</DialogTitle>
            <DialogDescription className="font-inter">
              Connect your wallet to access your issuer dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <ConnectButton />
            <p className="text-xs text-muted-foreground text-center font-inter">
              Your wallet will be checked against our approved issuers list
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AssetTokenizationSection;
