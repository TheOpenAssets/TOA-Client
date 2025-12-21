import { useEffect, useRef } from "react";
import cloudImage from "../../assets/cloud.png";

const ReviewsSection = () => {
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

  const userFlows = [
    {
      role: "Asset Originator",
      steps: [
        "Uploads asset documents.",
        "Passes compliance checks.",
        "Asset is verified and registered on Mantle.",
        "Asset becomes globally attestable."
      ],
      icon: "M224,177.32V78.68a16,16,0,0,0-8.32-14L136,17.06a16,16,0,0,0-15.87,0l-80,46.68a16,16,0,0,0-8.13,14v98.64a16,16,0,0,0,8.23,14l80,46.67a16,16,0,0,0,15.69,0l80-46.72A16,16,0,0,0,224,177.32Z"
    },
    {
      role: "Investor",
      steps: [
        "Browses verified RWAs.",
        "Buys asset tokens in the primary market.",
        "Receives yield and can trade on secondary market.",
        "Can borrow against RWA tokens if needed."
      ],
      icon: "M128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152ZM240,96v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V96A16,16,0,0,1,32,80H224A16,16,0,0,1,240,96Z"
    },
    {
      role: "Cross-Chain Consumer",
      steps: [
        "References a Mantle-verified asset.",
        "Mints a mirror asset on another chain.",
        "Trusts Mantle as the root of truth.",
        "No re-verification needed."
      ],
      icon: "M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-15.37-1.07A24,24,0,1,0,153.39,82a8,8,0,1,1,15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4Z"
    }
  ];

  return (
    <section id="user-flow" ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
      {/* Ambient cloud background */}
      <div className="absolute top-0 right-0 pointer-events-none opacity-15 transform translate-x-1/3 -translate-y-1/4 -z-0">
        <img
          src={cloudImage}
          alt=""
          className="w-[450px] mix-blend-soft-light"
        />
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center mb-16 opacity-0" data-scroll-reveal>
          <h2 className="font-jakarta text-5xl md:text-[56px] font-italic text-foreground mb-4">
            How You'll Experience The Platform
          </h2>
          <p className="font-inter text-lg text-foreground/80 max-w-3xl mx-auto">
            Our platform provides distinct, streamlined experiences for each participant in the RWA lifecycle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {userFlows.map((flow, index) => (
            <div
              key={`flow-${index}`}
              data-scroll-reveal
              className="bg-card rounded-2xl p-8 card-shadow opacity-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 256 256">
                            <path d={flow.icon} />
                        </svg>
                    </div>
                    <h3 className="font-jakarta font-semibold text-xl text-foreground">
                        {flow.role}
                    </h3>
                </div>

              <div className="space-y-3">
                {flow.steps.map((step, stepIndex) => (
                   <div key={stepIndex} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 256 256"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"></path></svg>
                        </div>
                        <p className="font-inter text-sm text-foreground/80 leading-relaxed">
                            {step}
                        </p>
                    </div>
                ))}
                </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;