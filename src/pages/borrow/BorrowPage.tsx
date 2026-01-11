import { useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';
// import Navbar from '../../components/common/Navbar';
import { UnifiedBorrowModal } from './components/UnifiedBorrowModal';
import { useCreditData } from './hooks/useCreditData';
// import { formatUSD } from '../../utils/solvency/format-credit.util';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { authService } from '../../lib/api/auth.service';
import HeroBackground from '../landing/HeroBackground';

const BorrowPage = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  const { creditData, isLoading: isCreditLoading, refetch: refetchCredit } = useCreditData(address);

  const availableCredit = creditData?.availableCredit ?? 0;
  const handlelogout = () => {
      authService.logout();
      disconnect();
      navigate('/'); // Redirect to home or login page after logout
    };

  useEffect(() => {
    if (isConnected) {
      refetchCredit();
    }
  }, [isConnected, refetchCredit]);

  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };


  return (
    <div className="min-h-screen ">

      <HeroBackground />
      {/* Navbar */}
      <div className="relative z-50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <header className="w-full flex flex-row z-40 mt-2 mb-1">
                 {/* Logo */}
                 <img
                   src="./ALogo-removebg-preview.svg"
                   alt="Logo"
                   className="h-16 w-auto object-contain cursor-pointer"
                   onClick={() => navigate('/')}
                 />
                 <div className="flex flex-row items-center justify-end w-full gap-10 mr-10">
         
                   {/* Center: Navigation */}
                   <nav className="flex items-center gap-4">
                     <button
                       onClick={() => navigate('/portfolio')}
                       className="font-gellix border border-gray-200  text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
                     >
                       Portfolio
                     </button>
                     <div className='relative group'>
                       <button
                       className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-gray-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl cursor-not-allowed "
                       >
                       Trade
                       </button>
                       <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                       Coming Soon
                       </div>
                     </div>
                     <div className='relative group'>
                       <button
                         className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-gray-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl cursor-not-allowed"
                       >
                         Borrow
                       </button>
                       <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                         Coming Soon
                       </div>
                     </div>
                   </nav>
         
                   {/* Right: Auth / Wallet Display */}
                   <div className="flex items-center gap-3">
                     {isConnected && address && (
                       <NotificationBell role="INVESTOR" />
                     )}
                     {isConnected && address ? (
                       <>
                         <div className="px-6 py-2 bg-white rounded-lg font-mono text-sm font-medium text-foreground">
                           {truncateAddress(address)}
                         </div>
                         <div className="bottom-0 flex items-start sticky justify-start  bg-transparent z-40">
                           <button className='ml-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-gellix text-sm font-medium hover:bg-black transition-colors hover:scale-[1.02]' onClick={handlelogout}>
                             Logout
                           </button>
                         </div>
                       </>
         
         
                     ) : (
                       <button
                         onClick={() => navigate('/auth')}
                         className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-gellix text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
                       >
                         Sign Up / Log In
                       </button>
                     )}
                   </div>
                 </div>
         
               </header>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-16 z-50 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-gellix text-[#111111] tracking-tight mb-3">
           Borrow USDC
          </h1>
          <p className="text-lg text-[#6B7280] mb-8 font-beau">
            Borrow against your existing credit line.
          </p>

          {isCreditLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-[#111111]" />
            </div>
          ) : !isConnected || !address ? (
            <div className="bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <h2 className="text-2xl font-semibold text-[#111111]">Connect Your Wallet</h2>
              <p className="text-[#6B7280] mt-2">Please connect your wallet to view your borrowing options.</p>
            </div>
          ) : availableCredit > 0 ? (
            /* Show Borrow Interface Directly */
            <UnifiedBorrowModal
              isOpen={true}
              onClose={() => {}}
              onSuccess={() => {
                refetchCredit();
                navigate('/portfolio?tab=loans');
              }}
              creditData={creditData}
            />
          ) : (
            <div className="bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-semibold text-[#111111] mb-3">No Available Credit</h2>
                <p className="text-[#6B7280] mb-6">
                  You don't have any available credit to borrow. Increase your credit limit from Portfolio.
                </p>
                <Button
                  onClick={() => navigate('/portfolio')}
                  size="lg"
                  className="text-lg py-6 px-8 rounded-[16px] w-full mb-6"
                >
                  Go to Portfolio → Increase Credit
                </Button>
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">How to get credit:</p>
                  <ol className="text-left text-sm text-gray-600 space-y-2 list-decimal list-inside">
                    <li>Go to your Portfolio page</li>
                    <li>Click "Increase Credit" or "Deposit Collateral"</li>
                    <li>Deposit RWA or Private Asset tokens</li>
                    <li>Your credit limit will increase automatically</li>
                    <li>Return here to borrow against your credit</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BorrowPage;
