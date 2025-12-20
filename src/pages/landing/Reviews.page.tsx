import { useEffect, useRef } from "react";
import { Star } from "lucide-react";
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

  const reviews = [
    {
      name: "Alex 'BeatMaster' Reed",
      role: "Independent Musician",
      content: "Orion with Story Protocol has been a game-changer for my music. Registering my tracks on-chain and seeing royalties flow directly has brought a level of transparency and control I never thought possible. No more opaque record deals!",
      rating: 5
    },
    {
      name: "Maya 'PixelDreams' Singh",
      role: "Digital Artist & NFT Creator",
      content: "As a digital artist, protecting my work is crucial. Orion's derivative tracking is incredible; it ensures that even remixes and adaptations of my art give proper attribution and royalties. It’s truly empowering!",
      rating: 5
    },
    {
      name: "Dr. Ben Carter",
      role: "Academic Author & Researcher",
      content: "The on-chain provenance provided by Orion is invaluable for academic integrity. Registering my research papers secures my authorship and allows for clear licensing terms for collaborations and further studies. A revolutionary tool for creators.",
      rating: 5
    }
  ];

  return (
    <section id="reviews" ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
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
            Creators Trust Orion.
          </h2>
          <p className="font-inter text-lg text-foreground/80 max-w-2xl mx-auto">
            Hear from artists, musicians, and innovators benefiting from transparent IP management.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <div
              key={`review-${index}`}
              data-scroll-reveal
              className="bg-card rounded-2xl p-8 card-shadow opacity-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: review.rating }, (_, i) => (
                  <Star key={`star-${index}-${i}`} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="font-inter text-base text-foreground/90 mb-6 leading-relaxed">
                "{review.content}"
              </p>
              <div className="border-t border-border divider-dotted pt-4">
                <p className="font-jakarta font-semibold text-foreground">
                  {review.name}
                </p>
                <p className="font-inter text-sm text-foreground/70">
                  {review.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;