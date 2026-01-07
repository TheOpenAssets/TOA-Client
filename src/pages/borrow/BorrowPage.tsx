/**
 * Borrow Page - Action Page Only
 * Simplified page that triggers the unified borrow modal
 */

import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { UnifiedBorrowModal } from './components/UnifiedBorrowModal';
import { portfolioService, type PortfolioAsset } from '../../lib/api/portfolio.service';
import { Lock, Upload, ShoppingCart, Info, TrendingUp, Search } from 'lucide-react';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { authService } from '../../lib/api/auth.service';

const BorrowPage = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  // Modal state
  const [showUnifiedBorrowModal, setShowUnifiedBorrowModal] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Portfolio data for collateral options and gatekeeper check
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [hasTokens, setHasTokens] = useState<boolean | null>(null);
  const [isCheckingPortfolio, setIsCheckingPortfolio] = useState(false);

  // Fetch portfolio to check if user has tokens (for gatekeeper)
  useEffect(() => {
    if (address && isConnected) {
      setIsCheckingPortfolio(true);
      portfolioService.getPortfolio()
        .then(data => {
          setPortfolio(data.portfolio);
          setHasTokens(data.portfolio.length > 0);
          setIsCheckingPortfolio(false);
        })
        .catch(err => {
          console.error("Failed to fetch portfolio:", err);
          setHasTokens(false);
          setIsCheckingPortfolio(false);
        });
    }
  }, [address, isConnected]);

  const handleLogout = () => {
    authService.logout();
    disconnect();
    navigate('/');
  };

  const handleNavigate = () => {
    navigate('/');
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#ffffff] overflow-x-hidden">
      {/* Top Navigation Bar - Exactly matching Portfolio */}
      <header className="bg-transparent z-40 relative flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-6">
              <div className="top-0 left-0">
                <div className="w-32 h-16 bg-foreground rounded-full top-0 left-0">
                  <span className="text-white font-bold text-lg top-0 left-0">
                    <img 
                      src="./ALogo-removebg-preview.svg" 
                      alt="Logo" 
                      onClick={handleNavigate} 
                      className='cursor-pointer' 
                    />
                  </span>
                </div>
              </div>

              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets, bids, or positions"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg font-gellix text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="font-geist border border-gray-200 text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
              >
                Marketplace
              </button>
              <div className='relative group'>
                <button
                  className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-gray-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl cursor-not-allowed"
                >
                  Trade
                </button>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                  Coming Soon
                </div>
              </div>
              
              <button
                onClick={() => navigate('/portfolio')}
                className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-gray-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
              >
                Portfolio
              </button>
            </nav>

            {/* Right: Wallet Display */}
            <div className="flex items-center gap-3">
              {address && (
                <>
                  <NotificationBell role="INVESTOR" />
                  <div className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm font-medium text-foreground">
                    {truncateAddress(address)}
                  </div>
                  <div className="bottom-0 flex items-start sticky justify-start bg-transparent z-80">
                    <button 
                      className='ml-2 px-4 py-2 bg-black text-white rounded-lg font-gellix text-sm font-medium hover:bg-black/80 transition-colors' 
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-16 z-40 relative">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#111111] tracking-tight mb-3">
            Borrow USDC
          </h1>
          <p className="text-[#6B7280] text-lg">
            Use your RWA tokens as collateral to borrow USDC
          </p>
        </div>

        {/* Loading State */}
        {isCheckingPortfolio ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
          </div>
        ) : !isConnected || !address ? (
          /* Unauthorized State */
          <div className="max-w-2xl mx-auto bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
            <h2 className="text-2xl font-semibold text-[#111111] mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-[#6B7280]">
              Please connect your wallet to access borrowing features
            </p>
          </div>
        ) : hasTokens === false ? (
          /* Gatekeeper: No Tokens */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="max-w-2xl mx-auto text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-blue-600" />
                </div>

                {/* Heading */}
                <h2 className="text-2xl font-bold text-[#111111] mb-3 tracking-tight">
                  Get Started with Borrowing
                </h2>
                <p className="text-[#6B7280] mb-8">
                  To borrow USDC, you'll need tokens to use as collateral. Choose one of the options below to get started:
                </p>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Option 1: Deposit Assets */}
                  <div
                    className="bg-[#F9FAFB] rounded-[16px] p-6 text-left hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                    onClick={() => navigate('/issuers')}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#10B981] flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#111111] mb-2">
                      Deposit Private Assets
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      Tokenize and deposit your real-world assets to use as collateral
                    </p>
                  </div>

                  {/* Option 2: Buy from Marketplace */}
                  <div
                    className="bg-[#F9FAFB] rounded-[16px] p-6 text-left hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                    onClick={() => navigate('/marketplace')}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#3B82F6] flex items-center justify-center mb-4">
                      <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#111111] mb-2">
                      Buy Tokens from Marketplace
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      Purchase tokenized assets from other users on the secondary marketplace
                    </p>
                  </div>
                </div>

                {/* Help Text */}
                <div className="flex items-start gap-2 text-left bg-blue-50 rounded-lg p-4">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <strong>How it works:</strong> Once you have RWA tokens in your portfolio, you can deposit them as collateral and borrow up to 70% of their value in USDC.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* User has tokens - Show CTA to start borrowing */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="text-center mb-8">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                  <TrendingUp className="w-10 h-10 text-emerald-600" />
                </div>

                {/* Heading */}
                <h2 className="text-3xl font-bold text-[#111111] mb-3 tracking-tight">
                  Ready to Borrow?
                </h2>
                <p className="text-[#6B7280] text-lg mb-8">
                  Use your RWA tokens as collateral and borrow up to 70% of their value in USDC
                </p>

                {/* CTA Button */}
                <button
                  onClick={() => setShowUnifiedBorrowModal(true)}
                  className="px-12 py-4 bg-[#111111] hover:bg-[#1a1a1a] text-white rounded-[16px] font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Borrowing
                </button>
              </div>

              {/* Features/Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#111111] mb-1">70%</div>
                  <div className="text-sm text-[#6B7280]">Loan-to-Value Ratio</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#111111] mb-1">2-Step</div>
                  <div className="text-sm text-[#6B7280]">Simple Process</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#111111] mb-1">0 Fees</div>
                  <div className="text-sm text-[#6B7280]">No Hidden Charges</div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-8 flex items-start gap-3 bg-blue-50 rounded-lg p-4">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>How it works:</strong> Deposit your RWA tokens as collateral, specify how much USDC you want to borrow, and the funds will be immediately available in your wallet.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unified Borrow Modal */}
      <UnifiedBorrowModal
        isOpen={showUnifiedBorrowModal}
        onClose={() => setShowUnifiedBorrowModal(false)}
        portfolioAssets={portfolio}
        onSuccess={() => {
          // Refresh page or navigate to portfolio loans tab
          navigate('/portfolio?tab=loans');
        }}
      />
    </div>
  );
};

export default BorrowPage;
