// src/pages/landing/Home.page.tsx

import HeroSection from "./Hero.page";
import Navbar from "./Navbar.page";
import Footer from "./Footer.page";

import AutoRepayingSection from "./AutoRepaying.page";
import FAQSection from "./FAQ.page";
import ReviewsSection from "./Reviews.page";
import CTASection from "./CTA.page";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#f6fbff]">

      <Navbar />
      <main className="overflow-x-hidden">

        <HeroSection />

        <AutoRepayingSection />
        <FAQSection />
        <ReviewsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};
export default HomePage;