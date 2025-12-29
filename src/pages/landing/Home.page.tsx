// src/pages/landing/Home.page.tsx

import HeroSection from "./Hero.page";
import Navbar from "./Navbar.page";
import Footer from "./Footer.page";
// import FAQSection from "./FAQ.page";
import AutoRepayingSection from "./AutoRepaying.page";
import HeroBackground from "./HeroBackground";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#f6fbff]">
      <main className="h-screen overflow-y-scroll snap-y snap-mandatory overflow-x-hidden">
        <div className="snap-start">
          <HeroBackground />
          <Navbar />
          <HeroSection />
        </div>
        <div className="snap-start">
          <div className="p-20">
          <AutoRepayingSection />
          </div>
        </div>
        <div className="snap-start">
          <Footer />
        </div>
      </main>
    </div>
  );
};
export default HomePage;