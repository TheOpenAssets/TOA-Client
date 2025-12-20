import { useEffect, useRef } from "react";
import cloudImage from "../../assets/cloud.png";

const AutoRepayingSection = () => {
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

  const features = [
    {
      title: "Effortless Royalty Distribution",
      description: "Story Protocol automates royalty payouts directly to all eligible rights holders, ensuring fair and transparent compensation without manual intervention."
    },
    {
      title: "Seamless Derivative Tracking",
      description: "Automatically link and track derivative works to their parent IPs, maintaining a clear chain of provenance and ensuring creators benefit from their original content."
    },
    {
      title: "On-Chain Licensing & Usage",
      description: "Manage and enforce IP licenses directly on the blockchain, granting permissions and collecting fees with unparalleled transparency and security."
    },
    {
      title: "Real-Time Revenue Insights",
      description: "Gain instant visibility into your IP's performance and royalty earnings through comprehensive, up-to-date dashboards and analytics."
    },
    {
      title: "Dispute Resolution Framework",
      description: "Our integrated system provides tools and processes for efficiently resolving IP disputes, supported by transparent on-chain records."
    },
    {
      title: "Global Reach & Accessibility",
      description: "Expand the reach of your intellectual property to a global audience with a decentralized platform that operates 24/7, accessible to creators worldwide."
    }
  ];

  return (
    <section id="auto-repaying" ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
      {/* Ambient cloud */}
      <div className="absolute top-0 right-0 pointer-events-none opacity-20 -z-0">
        <img
          src={cloudImage}
          alt=""
          className="w-[400px] mix-blend-soft-light"
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center mb-16 opacity-0" data-scroll-reveal>
          <p className="font-inter text-sm font-medium text-primary mb-3 uppercase tracking-wider">
            Automated Monetization
          </p>
          <h2 className="font-antic text-5xl md:text-[56px] font-italic text-foreground mb-4">
            Automatic Royalty & Derivative Management
          </h2>
          <p className="font-inter text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
            Orion streamlines your IP monetization, ensuring creators are fairly compensated and derivatives are tracked seamlessly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={`auto-feature-${index}`}
              data-scroll-reveal
              className="rounded-2xl p-8 card-shadow opacity-0 hover-lift"
              style={{ 
                background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
                animationDelay: `${index * 0.1}s`
              }}
            >
              <h3 className="font-inter text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="font-inter text-sm text-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-6 opacity-0" data-scroll-reveal>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Fair Compensation</div>
          </div>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Transparent Transactions</div>
          </div>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Creator Empowerment</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AutoRepayingSection;
