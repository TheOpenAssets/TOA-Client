
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/[0.96] text-gray-300">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-purple-500 text-white font-bold text-xl px-2 py-1 rounded">Openassets</div>
              <span className="font-semibold text-xl text-white"></span>
            </div>
            <p className="text-sm mb-4">
              The next-generation platform for on-chain intellectual property, empowering creators with transparent registration, automated royalties, and derivative tracking.
            </p>
            <div className="flex space-x-4">
  <a
    href="https://x.com/TheOpenAssets"
    className="text-gray-400 hover:text-white"
  >
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
    </svg>
  </a>

  <a
    href="https://discord.gg/hKp6RTSp59"
    className="text-gray-400 hover:text-white"
  >
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.0371 19.7363 19.7363 0 00-4.8852 1.5152.0699.0699 0 00-.0321.0277C2.263 9.0458 1.6663 13.5799 2.0344 18.057c.0016.0162.0116.0315.0247.0416 2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.8732.8914.0766.0766 0 00-.0406.1066c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.9616-.6067 3.9491-1.5219 6.002-3.0294a.077.077 0 00.0247-.0416c.5004-5.177-.8382-9.6732-3.5485-13.6594a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9558-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0957 2.1568 2.4189 0 1.3333-.9558 2.419-2.1569 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9558-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0957 2.1568 2.4189 0 1.3333-.946 2.419-2.1568 2.419z"></path>
    </svg>
  </a>
</div>

          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/about" className="hover:text-white transition-colors">About Openassets</a></li>
              <li><a href="/marketplace" className="hover:text-white transition-colors">IP Marketplace</a></li>
              <li><a href="/support" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">IP Categories</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Digital Art</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Music</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Written Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Videos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Software</a></li>
            </ul>
          </div>
          
         
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between">
          <div className="flex flex-col space-y-2">
            <p className="text-sm">© 2025 Openassets. All rights reserved.</p>
            <p className="text-sm text-gray-400">
               Powered by{' '}
              <a 
                href="https://www.storyprotocol.xyz/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-purple-500 text-white font-bold text-sm px-2 py-1 rounded"
              >
                Mantle
              </a>
            </p>
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-sm hover:text-white transition-colors">Legal</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
