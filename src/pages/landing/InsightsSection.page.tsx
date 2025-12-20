import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import cloudImage from "../assets/cloud.png";

const InsightsSection = () => {
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

  const insights = [
    "Immutable Ownership Records",
    "Verifiable Creation Timestamps",
    "Transparent Licensing History",
    "Public IP Registry"
  ];

  const benefits = [
    "Automatic Royalty Payouts",
    "Seamless Derivative Linking",
    "Fair Revenue Distribution",
    "Clear Attribution Trails"
  ];

  return (
    <section id="insights" ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Ambient cloud background */}
      <div className="absolute top-1/2 left-0 pointer-events-none opacity-20 transform -translate-y-1/2 -translate-x-1/3">
        <img 
          src={cloudImage} 
          alt=""
          className="w-[500px] mix-blend-soft-light"
        />
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center mb-16 opacity-0" data-scroll-reveal>
          <h2 className="font-jakarta text-5xl md:text-[56px] font-italic text-foreground mb-4">
            Unveiling Orion Insights
          </h2>
          <p className="font-inter text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
            Gain unparalleled clarity into your intellectual property, from creation to monetization, all powered by Story Protocol.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Real-Time Insights */}
          <div className="opacity-0" data-scroll-reveal>
            <div className="bg-card rounded-2xl p-8 card-shadow hover-lift">
              <h3 className="font-inter text-2xl font-semibold text-foreground mb-4">
                On-Chain Provenance & Transparency
              </h3>
              <p className="font-inter text-base text-foreground/80 mb-6 leading-relaxed">
                Every action related to your IP is immutably recorded on the blockchain, providing undeniable proof of ownership, creation, and licensing history.
              </p>
              <div className="space-y-3">
                {insights.map((item, i) => (
                  <div key={`insight-${i}`} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-inter text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Analytics */}
          <div className="opacity-0" data-scroll-reveal>
            <div className="bg-card rounded-2xl p-8 card-shadow hover-lift">
              <h3 className="font-inter text-2xl font-semibold text-foreground mb-4">
                Automated Royalty & Derivative Tracking
              </h3>
              <p className="font-inter text-base text-foreground/80 mb-6 leading-relaxed">
                Experience seamless revenue distribution and automatic derivative linking, ensuring fair compensation and clear attribution across the entire IP lifecycle.
              </p>
              <div className="space-y-3">
                {benefits.map((item, i) => (
                  <div key={`benefit-${i}`} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-inter text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InsightsSection;
