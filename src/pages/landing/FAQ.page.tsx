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
      question: "What is OpenAssets?",
      answer: (
        <div className="space-y-3">
          <p>A compliant RWA tokenization platform built on Mantle.</p>
          <div className="pl-4 border-l-2 border-purple-500 space-y-2">
            <p className="text-sm">✓ Buy, trade, and manage tokenized real-world assets</p>
            <p className="text-sm">✓ ERC-3643 security tokens with built-in compliance</p>
            <p className="text-sm">✓ Everything happens on-chain—transparent and legally sound</p>
          </div>
        </div>
      )
    },
    {
      question: "Why choose OpenAssets?",
      answer: (
        <div className="space-y-3">
          <p className="font-medium">Compliance is built directly into the blockchain.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-white/50 rounded-lg p-3">
              <p className="font-semibold text-purple-600 text-sm mb-1">For Issuers</p>
              <p className="text-sm">Faster capital access without traditional friction</p>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <p className="font-semibold text-blue-600 text-sm mb-1">For Investors</p>
              <p className="text-sm">Transparent, liquid, compliant investments</p>
            </div>
          </div>
          <p className="text-sm italic">KYC/AML checks and regulatory requirements are automatically enforced—no manual intervention.</p>
        </div>
      )
    },
    {
      question: "How does OpenAssets work?",
      answer: (
        <div className="space-y-4">
          <p className="font-medium">A simple, fully on-chain process:</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-semibold text-sm">Issuers submit assets</p>
                <p className="text-sm text-gray-600">Invoices, receivables, and other RWAs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-semibold text-sm">We verify & tokenize</p>
                <p className="text-sm text-gray-600">Using ERC-3643 compliant security tokens</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="font-semibold text-sm">Investors buy on marketplace</p>
                <p className="text-sm text-gray-600">Fixed-price or auction mechanisms</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <p className="font-semibold text-sm">Smart contracts automate everything</p>
                <p className="text-sm text-gray-600">Compliance checks, trading, and yield distribution</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 mt-4">
            <p className="text-sm font-medium text-center">🔒 Full transparency from registration to settlement</p>
          </div>
        </div>
      )
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
              Discover how OpenAssets brings compliant, on-chain tokenization to real-world assets.
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
