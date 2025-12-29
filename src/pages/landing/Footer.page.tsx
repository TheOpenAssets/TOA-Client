import React from 'react';
import { ParticleTextEffect } from '../../components/ui/particle-text-effect';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-gray-300 relative h-screen" >
      {/* Layer 1: Powered by Mantle Badge - Top Left */}
      <div className="absolute top-0 left-0 z-20 p-4">
        <p className="flex items-center gap-2 text-sm text-gray-500">
          Powered by
         <img src="./logo-light.svg"  alt="Mantle Logo" className="h-6 w-auto object-contain  " />
        </p>
      </div>

      <div className="absolute top-0 right-0 z-20 p-4">
        <p className="flex items-center gap-2 text-sm text-gray-500 gap-5">
          <a href="mailto:theopenassets@gmail.com" className="hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.573l8.073-6.08c1.618-1.214 3.927-.059 3.927 1.964z"/>
</svg>
          </a>
        <a href="https://discord.gg/hKp6RTSp59" className="hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
        <a href="https://t.me/the_open_assets" className="hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0C5.346 0 0 5.346 0 11.944s5.346 11.944 11.944 11.944 11.944-5.346 11.944-11.944S18.542 0 11.944 0zm5.206 8.191l-1.882 8.869c-.141.631-.514.787-1.042.489l-2.871-2.116-1.385 1.332c-.153.153-.282.282-.578.282l.206-2.924 5.322-4.809c.231-.206-.051-.32-.36-.115L8.036 12.98l-2.834-.887c-.616-.192-.628-.616.128-.911l11.071-4.266c.513-.186.962.119.749 1.275z"/>
          </svg>
        </a>
        <a href="https://x.com/TheOpenAssets" className="hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
          </svg>
        </a>
        <a href="https://www.linkedin.com/company/the-open-assets" className="hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
        </a>
           </p>
      </div>

    

      {/* Layer 2: Particle Text Effect - Centered with top spacing */}
       <div className="absolute w-full h-full flex items-center justify-center pt-24">
        <ParticleTextEffect
         
        />
      </div>
      {/* Layer 3: Copyright - Bottom Center (overlaps with particle text) */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="flex flex-col items-center pb-2">
          <p className="text-sm text-gray-500 text-center">
            © 2025 OpenAssets. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
