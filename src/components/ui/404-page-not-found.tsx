import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ParticleTextEffect } from "./interactive-text-particle";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#000000] relative overflow-hidden">
      {/* Particle Text Effect Background */}
      <ParticleTextEffect
        text="404"
        className="absolute top-0 left-0"
        colors={['9333ea', 'a855f7', 'c084fc', '3b82f6', '60a5fa']}
        animationForce={80}
        particleDensity={4}
      />
      <h1 className="absolute font-bold font-geist top-4/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-gray-700">Page not Found</h1>

      {/* Return Home Button */}
      <div className="absolute top-8 left-8 z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-8 py-3.5 cta-button rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Return Home</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
