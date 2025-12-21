import { useEffect, useRef } from "react";
import{Accordion, AccordionContent, AccordionItem, AccordionTrigger}from"../../components/ui/accordion";

const FAQSection = () => {
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

  const faqs = [
    {
      question: "What is this platform in one sentence?",
      answer: "It’s a platform that creates a single, verifiable RWA truth layer on Mantle, combined with native marketplaces, lending, and yield distribution, and enables secure cross-chain RWA interoperability."
    },
    {
      question: "What kind of assets can be used?",
      answer: "The platform is designed for real-world cash-flow assets such as invoices, receivables, letters of payment, and other credit instruments."
    },
    {
      question: "Why is Mantle essential for this platform?",
      answer: "Mantle serves as the canonical execution and trust layer. It's used for the RWA registry, all economic activities (minting, trading, yield), and authorizing cross-chain actions. Its low-cost execution and Mantle DA are critical for the platform's functionality."
    },
    {
      question: "How does the platform handle sensitive data?",
      answer: "Instead of storing raw data on-chain, raw asset metadata and documents are anchored to EigenDA. Only the canonical commitments (hashes, IDs, state) are anchored to Mantle, keeping sensitive data private and scalable."
    },
    {
      question: "Can assets from this platform be used on other chains?",
      answer: "Yes. The platform enables true cross-chain RWAs. Other chains can mint 'mirror assets' by referencing the Mantle registry state without re-verification, with Mantle acting as the single source of truth."
    }
  ];

  return (
    <section id="faqs" ref={sectionRef} className="py-24 bg-[#f6fbff] relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Floating Card Component - Matching Integration Section Style */}
        <div 
          className="bg-[#d8dfe5] rounded-[20px] p-12 md:p-16 card-shadow relative opacity-0"
          data-scroll-reveal
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animationDelay: '0.2s'
          }}
        >
          <div className="text-center mb-16">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-gray-700 mb-6">
              FAQ
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] mb-2 text-[#0e1c29] text-[44px] not-italic font-normal h-[52.8px] tracking-[-0.44px] leading-[52.8px]">
              Frequently Asked Questions
            </h2>
            <p className="font-inter text-base md:text-lg text-[#0e1c29]/80 max-w-2xl mx-auto mt-4">
              Key information about our RWA platform and its integration with the Mantle ecosystem.
            </p>
          </div>

          <div className="max-w-3xl mx-auto opacity-0" data-scroll-reveal style={{ animationDelay: '0.4s' }}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={`faq-${index}`} 
                  value={`item-${index}`}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 border-0"
                  style={{
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <AccordionTrigger className="font-jakarta text-lg font-semibold text-[#0e1c29] hover:no-underline py-6 text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-inter text-base text-[#0e1c29]/80 leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;