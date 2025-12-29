import React from 'react';
import { ParticleTextEffect } from '../../components/ui/particle-text-effect';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/[0.96] text-gray-300 overflow-hidden relative min-h-[600px]">
      {/* Layer 1: Powered by Mantle Badge - Top Left */}
      <div className="absolute top-0 left-0 z-20 p-4">
        <p className="flex items-center gap-2 text-sm text-gray-500">
          Powered by
          <span className="bg-gradient-to-r from-purple-500 to-purple-500 text-white font-semibold text-sm px-3 py-1 rounded">
            Mantle
          </span>
        </p>
      </div>

      {/* Layer 2: Particle Text Effect - Centered with top spacing */}
      <div className="absolute w-full h-full flex items-center justify-center pt-24">
        <ParticleTextEffect
          words={["OPENASSETS", "RWA","Tokenization","Borrowing","Cross Protocol"]}
          canvasHeight={400}
          canvasWidth={1400}
          fontSize={140}
          showControls={false}
          className="w-full"
        />
      </div>

      {/* Layer 3: Copyright - Bottom Center (overlaps with particle text) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-8">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500 text-center">
            © 2025 OpenAssets. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
