/**
 * Borrow Page - Solvency Vault
 * Shows user's credit summary and available protocols for borrowing
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Navbar from '../../components/common/Navbar';
import HeroBackground from '../../pages/landing/HeroBackground';
import { CreditSummaryCard } from './components/CreditSummaryCard';
import { ProtocolGrid } from './components/ProtocolGrid';
import { HealthMonitorBanner } from './components/HealthMonitorBanner';
import { BorrowModal } from './components/BorrowModal';
import { DepositCollateralModal } from './components/DepositCollateralModal';
import { useCreditData } from './hooks/useCreditData';
import { useProtocols } from './hooks/useProtocols';
import { useHealthMonitor } from './hooks/useHealthMonitor';
import type { Protocol } from '../../types/solvency.types';
import { type BorrowPageState } from '../../types/solvency.types';

const BorrowPage = () => {
  const { address, isConnected } = useAccount();
  const [pageState, setPageState] = useState<BorrowPageState>('initial');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  // Fetch credit data
  const {
    creditData,
    isLoading: isCreditLoading,
    error: creditError,
    refetch: refetchCredit,
  } = useCreditData(address);

  // Fetch protocols
  const {
    protocols,
    isLoading: isProtocolsLoading,
    error: protocolsError,
  } = useProtocols();

  // Monitor health factor
  const { healthStatus, healthFactor } = useHealthMonitor(creditData);

  // Determine page state
  useEffect(() => {
    if (!isConnected || !address) {
      setPageState('unauthorized');
      return;
    }

    if (isCreditLoading || isProtocolsLoading) {
      setPageState('loading');
      return;
    }

    if (creditError || protocolsError) {
      setPageState('error');
      return;
    }

    if (creditData) {
      setPageState('success_with_credit');
    } else {
      setPageState('success_no_credit');
    }
  }, [isConnected, address, isCreditLoading, isProtocolsLoading, creditError, protocolsError, creditData]);

  // Handle protocol borrow click
  const handleProtocolBorrow = (protocol: Protocol) => {
    if (!creditData) {
      // User needs to deposit collateral first
      setShowDepositModal(true);
      return;
    }

    // Open borrow modal
    setSelectedProtocol(protocol);
    setShowBorrowModal(true);
  };

  // Handle successful deposit
  const handleDepositSuccess = () => {
    setShowDepositModal(false);
    refetchCredit();
  };

  // Handle successful borrow
  const handleBorrowSuccess = () => {
    setShowBorrowModal(false);
    setSelectedProtocol(null);
    refetchCredit();
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] overflow-x-hidden">
      <HeroBackground />

      {/* Navbar */}
      <div className="relative z-50 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <Navbar />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-8 z-40 relative">

        {/* Health Warning Banner */}
        {creditData && healthStatus !== 'healthy' && healthStatus !== 'unknown' && (
          <div className="mb-6">
            <HealthMonitorBanner
              healthStatus={healthStatus}
              healthFactor={healthFactor}
            />
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">
            Borrow & Invest
          </h1>
          <p className="text-[#6B7280] mt-2">
            Use your RWA tokens as collateral to borrow USDC and invest in high-yield protocols
          </p>
        </div>

        {/* Loading State */}
        {pageState === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111]"></div>
          </div>
        )}

        {/* Unauthorized State */}
        {pageState === 'unauthorized' && (
          <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
            <h2 className="text-2xl font-semibold text-[#111111] mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-[#6B7280]">
              Please connect your wallet to access borrowing features
            </p>
          </div>
        )}

        {/* Error State */}
        {pageState === 'error' && (
          <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
            <h2 className="text-2xl font-semibold text-[#111111] mb-4">
              Unable to Load Data
            </h2>
            <p className="text-[#6B7280] mb-6">
              {creditError || protocolsError || 'An error occurred while fetching data'}
            </p>
            <button
              onClick={() => {
                refetchCredit();
                window.location.reload();
              }}
              className="px-6 py-3 bg-[#111111] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success - No Credit Line */}
        {pageState === 'success_no_credit' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[20px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
              <h2 className="text-2xl font-semibold text-[#111111] mb-4">
                Get Started with Borrowing
              </h2>
              <p className="text-[#6B7280] mb-8">
                Deposit your RWA tokens as collateral to create a credit line and start borrowing USDC
              </p>
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-8 py-4 bg-[#111111] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors text-lg"
              >
                Deposit Collateral
              </button>
            </div>
          </div>
        )}

        {/* Success - With Credit Line */}
        {pageState === 'success_with_credit' && creditData && (
          <div className="space-y-8">
            {/* Credit Summary */}
            <CreditSummaryCard creditData={creditData} />

            {/* Protocols Grid */}
            <div>
              <h2 className="text-2xl font-semibold text-[#111111] mb-6 tracking-tight">
                Available Protocols
              </h2>
              <ProtocolGrid
                protocols={protocols}
                onBorrow={handleProtocolBorrow}
                disabled={healthStatus === 'critical'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDepositModal && (
        <DepositCollateralModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={handleDepositSuccess}
        />
      )}

      {showBorrowModal && selectedProtocol && creditData && (
        <BorrowModal
          isOpen={showBorrowModal}
          onClose={() => {
            setShowBorrowModal(false);
            setSelectedProtocol(null);
          }}
          protocol={selectedProtocol}
          creditData={creditData}
          onSuccess={handleBorrowSuccess}
        />
      )}
    </div>
  );
};

export default BorrowPage;
