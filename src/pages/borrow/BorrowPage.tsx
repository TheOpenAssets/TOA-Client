import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { UnifiedBorrowModal } from './components/UnifiedBorrowModal';
import { useCreditData } from './hooks/useCreditData';
import { formatUSD } from '../../utils/solvency/format-credit.util';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';

const BorrowPage = () => {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  const [showBorrowModal, setShowBorrowModal] = useState(false);

  const { creditData, isLoading: isCreditLoading, refetch: refetchCredit } = useCreditData(address);

  const availableCredit = creditData?.availableCredit ?? 0;

  useEffect(() => {
    if (isConnected) {
      refetchCredit();
    }
  }, [isConnected, refetchCredit]);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Navbar */}
      <div className="relative z-50 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <Navbar />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-[#111111] tracking-tight mb-3">
            Borrow USDC
          </h1>
          <p className="text-lg text-[#6B7280] mb-8">
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
            <div className="bg-white rounded-[24px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <p className="text-sm text-[#6B7280]">Available to Borrow</p>
              <p className="text-6xl font-bold text-[#111111] my-4">{formatUSD(availableCredit)}</p>
              <Button
                onClick={() => setShowBorrowModal(true)}
                size="lg"
                className="text-lg py-7 px-8 rounded-[16px]"
              >
                Borrow Now
              </Button>
            </div>
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

      <UnifiedBorrowModal
        isOpen={showBorrowModal}
        onClose={() => setShowBorrowModal(false)}
        onSuccess={() => {
          setShowBorrowModal(false);
          refetchCredit();
          navigate('/portfolio?tab=loans');
        }}
        creditData={creditData}
      />
    </div>
  );
};

export default BorrowPage;
