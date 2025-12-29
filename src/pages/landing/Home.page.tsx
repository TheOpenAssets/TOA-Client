// src/pages/landing/Home.page.tsx

import HeroSection from "./Hero.page";
import Navbar from "./Navbar.page";
import Footer from "./Footer.page";
import FAQSection from "./FAQ.page";
import AutoRepayingSection from "./AutoRepaying.page";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#f6fbff]">

      <Navbar />
      <main className="overflow-x-hidden">

        <HeroSection />
        
        <AutoRepayingSection />
      
        <FAQSection />
    
       
       
      </main>
      <Footer />
    </div>
  );
};
export default HomePage;