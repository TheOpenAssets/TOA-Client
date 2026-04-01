// src/pages/landing/Home.page.tsx

import HeroSection from "./Hero.page";
import Navbar from "./Navbar.page";
import Footer from "./Footer.page";
import FeaturePage from "./FeaturePage";
import FadeIn from "../../components/ui/fadein"; // Adjust path as needed
import { Wavy } from "../../components/ui/wavy";


const HomePage = () => {
  return (
    <>
      <Wavy />
    <main className="snap-y snap-mandatory overflow-x-hidden h-screen w-screen">
      {/* SECTION 1: HERO */}
      <div className="snap-start min-h-screen z-20">
        {/* Background & Nav usually shouldn't fade in/out on scroll, they are structural */}
        <Navbar />

        {/* The actual Hero Content fades in */}
        <div className="relative z-10 pt-20"> {/* Ensure content is above background */}
          <FadeIn>
            <HeroSection />
          </FadeIn>
        </div>
      </div>

      {/* SECTION 2: PLATFORM FEATURES */}
      <div className="snap-start h-screen flex items-center justify-center">
        {/* We use w-full to ensure the fade wrapper takes full width */}
        <FadeIn className="w-full">
          <FeaturePage />
        </FadeIn>
      </div>


      {/* SECTION 3: FOOTER */}
      <div className="snap-start min-h-screen flex items-end">
        <FadeIn className="w-full">
          <Footer />
        </FadeIn>
      </div>
    </main>
    </>
  );
};

export default HomePage;