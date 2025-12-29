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
    title: "Canonical RWA Tokenization",
    description:
      "Real-world assets are verified, structured, and minted on-chain as compliant RWA tokens. The protocol currently focuses on invoices, with extensibility to additional asset classes over time."
  },
  {
    title: "Leveraged RWA Buying (M-ETH)",
    description:
      "Users acquire RWA tokens using M-ETH deposited into a leveraged vault. USDC is sourced from the protocol’s lending pool, while M-ETH yield is programmatically applied toward loan repayment."
  },
  {
    title: "Automated Leverage Repayment Engine",
    description:
      "Interest earned on M-ETH is routed through Fluxion or protocol-native swaps to service senior pool obligations, reducing user debt without manual intervention."
  },
  {
    title: "RWA & Private Asset–Backed Credit",
    description:
      "Issue on-chain credit using tokenized RWAs or privately documented assets held in a solvency vault, without fractionalizing ownership or exposing sensitive asset data."
  },
  {
    title: "Cross-Protocol Borrowing Access",
    description:
      "Collateralized positions can source liquidity from multiple partner protocols and the native lending pool, enabling flexible credit routing without breaking solvency guarantees."
  },
  {
    title: "Deterministic Yield Distribution",
    description:
      "Real-world cash flows are settled on-chain and distributed pro-rata to RWA token holders using deterministic, index-based accounting."
  },
  {
    title: "Secondary & OTC RWA Marketplace",
    description:
      "Trade RWA tokens via a native peer-to-peer and OTC marketplace, with on-chain buy and sell orders that counterparties can directly satisfy."
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
            Core Capabilities
          </p>
          <h2 className="font-antic text-5xl md:text-[56px] font-italic text-foreground mb-4">
            A Platform for Verifiable RWA Execution
          </h2>
          <p className="font-inter text-base md:text-lg text-foreground/80 max-w-3xl mx-auto">
            Our infrastructure platform turns real-world cash-flow assets into cryptographically verifiable, compliant, and yield-bearing on-chain assets, with Mantle as the canonical execution and trust layer.
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
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Cryptographic Truth</div>
          </div>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">On-chain Execution</div>
          </div>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Native Yield</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AutoRepayingSection;
