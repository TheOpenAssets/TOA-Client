import { useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import cloudImage from "../../assets/cloud.png";

const AssetTokenizationSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

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

  const openTypeform = () => {
    // Open Typeform in a popup
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      'https://form.typeform.com/to/Y3ZrQIm2',
      'TypeformPopup',
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

              {/* CTA Button */}
              <div className="pt-4">
                <Button
                  size="lg"
                  onClick={openTypeform}
                  className="bg-white text-[#0e1c29] hover:bg-white/90 rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                  data-scroll-reveal
                  style={{
                    animationDelay: '0.7s',
                    boxShadow: '0 10px 40px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  List Your Asset
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>
                  </svg>
                </Button>
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
    </section>
  );
};

export default AssetTokenizationSection;
