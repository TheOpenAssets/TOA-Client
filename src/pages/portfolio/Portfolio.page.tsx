// src/pages/portfolio/Portfolio.page.tsx
import { useEffect, useState, useCallback } from 'react';
import { usePortfolioStore } from '../../stores/portfolio.store';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import { useAccount, useDisconnect } from 'wagmi'; // Removed
import { Search } from 'lucide-react';
import { useAuthStrategy } from '../../lib/auth/AuthStrategyContext';
import { useNetwork } from '../../lib/network/NetworkContext';
import { useSettleBid } from '../../hooks/useAuctionContracts';
// import { contractService } from '../../lib/api/contract.service';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/toast';
import { NotificationBell } from '../../components/notifications/NotificationBell';
// import { authService } from '../../lib/api/auth.service';
import { marketplaceService } from '../../lib/api/marketplace.service';
import { getYieldService } from '../../lib/api/yield.service.factory';
import { parseTokenAmount } from '../../lib/utils/formatters';
import { solvencyService } from '../../lib/api/solvency.service';
import { PositionsTable } from '../../components/leverage/PositionsTable';
import { PortfolioStats } from '../../components/portfolio/PortfolioStats';
import { MyAssetsTable } from '../../components/portfolio/MyAssetsTable';
import { ActiveBidsTable } from '../../components/portfolio/ActiveBidsTable';
import { TradesTable } from '../../components/portfolio/TradesTable';
import { useCancelOrder } from '../../hooks/useSecondaryMarket';
import { MyLoansTable } from '../../components/portfolio/MyLoansTable';
import { CreditScoreDashboard } from '../../components/creditcoin/CreditScoreDashboard';
import { USCProofModal } from '../../components/creditcoin/USCProofModal';
import { PositionDetailChart } from '../../components/leverage/PositionDetailChart';
import type { LeveragePosition } from '../../types/leverage.types';
import type { Position as SolvencyPosition } from '../../types/solvency.types';
import { PageLoader } from '../../components/ui/page-loader';
import { Button } from '../../components/ui/button';
import { ShaderAnimation } from '../../components/ui/shimmer-lines';
import { useCreditData } from '../borrow/hooks/useCreditData';
import { useCreditScore } from '../borrow/hooks/useCreditScore';
import { DepositCollateralModal } from '../borrow/components/DepositCollateralModal';
import { NoAssetsModal } from '../../components/portfolio/NoAssetsModal';
// import { Wavy } from '../../components/ui/wavy';
import HeroBackground from '../landing/HeroBackground';

/**
 * Isolated wrapper that owns the useCreditScore hook so the refetch callback
 * can be passed directly into USCProofModal.onProofSubmitted.
 * Without this wrapper the "Refreshing your score..." flow in USCProofModal
 * would fire the callback but nothing would actually re-fetch the score.
 */
interface CreditScoreTabContentProps {
  address: string;
  showUSCModal: boolean;
  onVerifyClick: () => void;
  onUSCModalClose: () => void;
}

const CreditScoreTabContent = ({
  address,
  showUSCModal,
  onVerifyClick,
  onUSCModalClose,
}: CreditScoreTabContentProps) => {
  const { refetch: refetchScore } = useCreditScore(address);

  return (
    <>
      <CreditScoreDashboard
        walletAddress={address}
        onVerifyClick={onVerifyClick}
      />
      <USCProofModal
        isOpen={showUSCModal}
        onClose={onUSCModalClose}
        walletAddress={address}
        onProofSubmitted={() => {
          onUSCModalClose();
          // Force-refresh the score after the 5-second delay built into USCProofModal
          refetchScore(true);
        }}
      />
    </>
  );
};

const PortfolioPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, logout } = useAuthStrategy();
  const { networkType, networkPath } = useNetwork();
  const isEvm = networkType !== 'stellar';

  const { portfolio, isLoading, error, fetchPortfolio } = usePortfolioStore();
  const { userBids, isLoadingBids, fetchUserBids, myOrders, isLoadingMyOrders, fetchMyOrders } = useMarketplaceStore();
  const { toasts, success, error: showError, warning, removeToast } = useToast();
  // const { disconnect } = useDisconnect(); // handled by logout
  const { creditData, refetch: refetchCredit } = useCreditData(isEvm ? address : undefined);


  // Cancel order hook
  const { cancelOrder, isSuccess: isCancelSuccess, reset: resetCancel } = useCancelOrder();
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Tab state for portfolio sections
  type PortfolioTab = 'assets' | 'bids' | 'positions' | 'trades' | 'loans' | 'credit';

  const initialTab = searchParams.get('tab') as PortfolioTab | null;
  const [activeTab, setActiveTab] = useState<PortfolioTab>(initialTab || 'assets');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showNoAssetsModal, setShowNoAssetsModal] = useState(false);
  const [showUSCModal, setShowUSCModal] = useState(false);

  // Leverage position detail chart state
  const [selectedPosition, setSelectedPosition] = useState<LeveragePosition | null>(null);


  // Solvency loans state
  const [myLoans, setMyLoans] = useState<SolvencyPosition[]>([]);
  const [isLoadingMyLoans, setIsLoadingMyLoans] = useState(true);
  const { settleBid, status: settleStatus, error: settleError, isLoading: isSettling, isSuccess } = useSettleBid();
  const [settlingBidId, setSettlingBidId] = useState<string | null>(null);

  // Yield claiming state (investor-claim-yield.sh burn-to-claim model)
  const [claimingAssetId, setClaimingAssetId] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string>('');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedAssetForClaim, setSelectedAssetForClaim] = useState<{
    assetId: string;
    tokenAddress: string;
    tokenSymbol: string;
    investorBalance: string;
    expectedUsdc: string;
    allowance: string;
  } | null>(null);
  // Fetch solvency loans

  const fetchMyLoans = useCallback(async () => {
    if (!address) return;
    setIsLoadingMyLoans(true);
    try {
      const response = await solvencyService.getMyPositions();
      console.log("loans find", response);
      setMyLoans(response.positions);
    } catch (err) {
      console.error("Error fetching solvency loans:", err);
      showError("Failed to fetch loans", "Could not retrieve your loan positions.");
    } finally {
      setIsLoadingMyLoans(false);
    }
  }, []);


  // Filtered data based on search term
  // Get all portfolio items (both STATIC and LEVERAGE)
  const allPortfolioItems = portfolio?.portfolio || [];
  const staticAssets = allPortfolioItems.filter((item: any) => item.purchaseType === 'STATIC');
  const leveragePositions = allPortfolioItems.filter((item: any) => item.purchaseType === 'LEVERAGE');

  // Filter ALL assets for My Assets table (both STATIC and LEVERAGE)
  const filteredAssets = allPortfolioItems.filter((asset: any) =>
    asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.metadata?.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  );

  const filteredBids = userBids.filter(bid =>
    bid.assetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.auctionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  ) || [];

  const filteredPositions = leveragePositions.filter((position: any) =>
    position.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.metadata?.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  );

  const filteredOrders = myOrders.filter(order =>
    (filteredAssets.find((asset: any) => asset.assetId === order.assetId)?.metadata?.assetName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  );

  const filteredLoans = myLoans.filter(loan =>
    loan.positionId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  );


  // Calculate total asset value (STATIC purchases only)
  const totalAssetValue = staticAssets.reduce(
    (sum: number, asset: any) => sum + parseTokenAmount(asset.totalInvested || '0', 6),
    0
  );


  useEffect(() => {
    fetchPortfolio();
    fetchUserBids();
    fetchMyOrders();
    fetchMyLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-switch tab if only specific content exists
  useEffect(() => {
    const hasAssets = allPortfolioItems && allPortfolioItems.length > 0;
    const hasBids = userBids && userBids.length > 0;
    const hasPositions = leveragePositions && leveragePositions.length > 0;

    if (!hasAssets && !hasBids && hasPositions) {
      setActiveTab('positions');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio, userBids]);

  // Handle successful settlement
  useEffect(() => {
    if (isSuccess && settlingBidId) {
      // Backend notification is handled by the `useSettleBid` hook.
      // We just need to refresh the bids list.
      fetchUserBids();
      setSettlingBidId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, settlingBidId]);

  // Handle settlement errors - don't auto-clear, let user dismiss or retry
  useEffect(() => {
    if (settleError) {
      console.error('Settlement error:', settleError);
    }
  }, [settleError]);

  // Handle cancel order success
  useEffect(() => {
    if (isCancelSuccess) {
      success('Order Cancelled', 'Your order has been cancelled successfully.');
      setCancellingOrderId(null);
      resetCancel();
      fetchMyOrders(); // Refresh orders
    }
  }, [isCancelSuccess]);

  const handleIncreaseCreditLimit = () => {
    const validAssets = staticAssets.filter((asset: any) => asset.yieldInfo?.settlementDistributed === false);
    if (validAssets.length > 0) {
      setShowDepositModal(true);
    } else {
      setShowNoAssetsModal(true);
    }
  };

  // Refresh credit data after successful operations
  const handleRefreshCredit = useCallback(() => {
    refetchCredit(true); // Force refresh
  }, [refetchCredit]);

  // Helper functions
  const handlelogout = () => {
    // authService.logout();
    logout();
    navigate('/'); // Redirect to home or login page after logout
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await cancelOrder(orderId);
    } catch (e) {
      console.error("Cancel failed", e);
      // We don't nullify cancellingOrderId here immediately to show loading state if retrying, 
      // but usually we should if it failed. 
      setCancellingOrderId(null);
    }
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Handle yield claim for an asset (investor-claim-yield.sh flow)
   * Step 1: Check settlement info, token balance, and allowance
   */
  const handleClaimYield = async (assetId: string) => {
    if (!address) {
      warning('Wallet Not Connected', 'Please connect your wallet to claim yield.');
      return;
    }

    // Find the asset in portfolio to get tokenAddress
    const asset = portfolio?.portfolio?.find((a: any) => a.assetId === assetId);
    if (!asset || !asset.tokenAddress) {
      showError('Asset Not Found', 'Could not find token address for this asset');
      return;
    }

    if (!isEvm && networkType !== 'stellar') {
      warning('Not Supported', 'Yield claiming is currently only supported on arbitrum & Stellar Networks.');
      return;
    }

    setClaimingAssetId(assetId);
    setClaimStatus('Checking...');

    try {
      // Step 1: Check settlement info and token balance (matching script)
      console.log('🔍 Step 1: Checking Settlement Info & Token Balance');
      console.log('Asset ID:', assetId);
      console.log('Token Address:', asset.tokenAddress);

      const yieldService = getYieldService(networkType);
      const settlementResult = await yieldService.getSettlementInfo(asset.tokenAddress, address);

      console.log('Settlement Info:', settlementResult);

      if (!settlementResult.success) {
        throw new Error(settlementResult.error || 'Failed to check settlement info');
      }

      // Validation checks (matching script)
      if (settlementResult.totalSettlement === '0') {
        warning(
          'No Settlement Available',
          'No settlement deposited for this token yet!\n\nWait for admin to deposit settlement to YieldVault.',
          8000
        );
        setClaimingAssetId(null);
        setClaimStatus('');
        return;
      }

      if (settlementResult.investorBalance === '0') {
        warning(
          'No Tokens Owned',
          'You don\'t own any tokens for this asset!',
          5000
        );
        setClaimingAssetId(null);
        setClaimStatus('');
        return;
      }

      const expectedUsdc = parseFloat(settlementResult.expectedUsdcForAllTokens || '0');

      if (expectedUsdc === 0) {
        warning(
          'No Yield Available',
          'No yield available to claim for this asset.',
          5000
        );
        setClaimingAssetId(null);
        setClaimStatus('');
        return;
      }

      // Show confirmation modal with settlement details
      setSelectedAssetForClaim({
        assetId,
        tokenAddress: asset.tokenAddress,
        tokenSymbol: settlementResult.tokenSymbol || 'tokens',
        investorBalance: settlementResult.investorBalance || '0',
        expectedUsdc: settlementResult.expectedUsdcForAllTokens || '0',
        allowance: settlementResult.allowance || '0',
      });
      setShowClaimModal(true);
      setClaimingAssetId(null);
      setClaimStatus('');

    } catch (error: any) {
      console.error('❌ Error checking settlement info:', error);
      showError('Check Failed', error.message || 'Failed to check settlement info');
      setClaimingAssetId(null);
      setClaimStatus('');
    }
  };


  const handlenavigate = () => {
    navigate(networkPath('/'))
  }

  /**
   * Execute yield claim after user confirms
   * Step 2: Approve YieldVault (if needed)
   * Step 3: Burn tokens and claim USDC
   *
   * This strictly follows investor-claim-yield.sh
   */
  const executeClaimYield = async () => {
    if (!selectedAssetForClaim) return;

    const { assetId, tokenAddress, tokenSymbol, investorBalance, expectedUsdc, allowance } = selectedAssetForClaim;

    setShowClaimModal(false);
    setClaimingAssetId(assetId);
    setClaimStatus('Approving...');

    try {
      // Burn ALL tokens (matching script default behavior)
      // Burn ALL tokens (amount from backend is Canonical string e.g "100.0000")
      let burnAmountWei = investorBalance;

      // Stellar uses 7 decimals (10^7)
      // Backend returns "100.0000", we need "1000000000" (i64)
      if (networkType === 'stellar') {
        const amount = parseFloat(investorBalance);
        burnAmountWei = Math.round(amount * 10_000_000).toString();
      } else {
        // If EVM or others still use Wei strings, handle logic here or assume standardized
        // For now, if string has dot, it's canonical
        if (investorBalance.includes('.')) {
          // It's canonical "100.0" -> "100000..." (18 decimals for EVM)
          const amount = parseFloat(investorBalance);
          // Use BigInt for precision if needed, but for now simple math
          burnAmountWei = BigInt(Math.round(amount * 1e18)).toString();
        }
      }

      const burnAmountFormatted = parseFloat(investorBalance).toFixed(2); // Balance is already canonical

      console.log('='.repeat(50));
      console.log('🔥 Burn-to-Claim Yield (v2)');
      console.log('='.repeat(50));
      console.log('Token Address:', tokenAddress);
      console.log('Burn Amount:', burnAmountFormatted, tokenSymbol);
      console.log('Expected USDC:', expectedUsdc);
      console.log();

      // Step 2: Approve YieldVault (if needed)
      const needsApproval = BigInt(allowance) < BigInt(burnAmountWei);

      if (needsApproval) {
        console.log('✅ Step 2: Approving YieldVault to burn tokens...');
        setClaimStatus('Approving...');

        const yieldService = getYieldService(networkType);

        const approvalResult = await yieldService.approveYieldVault(
          tokenAddress,
          burnAmountWei,
          allowance
        );

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || 'Failed to approve YieldVault');
        }

        if (!approvalResult.skipped) {
          console.log('✅ Approval successful! TX:', approvalResult.transactionHash);
        }
      } else {
        console.log('✅ Tokens already approved - skipping approval step');
      }

      // Step 3: Burn tokens and claim USDC
      console.log('🔥 Step 3: Burning tokens and claiming USDC...');
      setClaimStatus('Burning & Claiming...');

      const yieldService = getYieldService(networkType);
      const claimResult = await yieldService.claimYield(tokenAddress, burnAmountWei);

      if (!claimResult.success) {
        throw new Error(claimResult.error || 'Failed to claim yield');
      }

      // Success!
      const tokensBurned = claimResult.tokensBurnedFormatted || '0';
      const usdcReceived = claimResult.usdcReceivedFormatted || '0';

      console.log('='.repeat(50));
      console.log('🎉 Claim Successful!');
      console.log('='.repeat(50));
      console.log('Tokens Burned:', tokensBurned, tokenSymbol, '🔥');
      console.log('USDC Received:', usdcReceived, 'USDC');
      console.log('TX Hash:', claimResult.transactionHash);
      console.log();

      // Notify backend
      if (claimResult.transactionHash) {
        try {
          await marketplaceService.notifyYieldClaim({
            txHash: claimResult.transactionHash,
            assetId: assetId,
            tokensBurned: claimResult.tokensBurned || '0',
            usdcReceived: claimResult.usdcReceived || '0',
          });
          console.log('✅ Successfully notified backend of yield claim');
        } catch (apiError) {
          console.error('Failed to notify backend of yield claim:', apiError);
          // Non-fatal, so we don't need to show an error to the user
        }
      }

      success(
        'Yield Claimed Successfully! 🎉',
        `Tokens Burned: ${tokensBurned} ${tokenSymbol} 🔥\nUSDC Received: ${usdcReceived} USDC\nTX: ${claimResult.transactionHash?.slice(0, 10)}...\n\nYour USDC has been transferred to your wallet!\n\nView on explorer: https://sepolia.arbiscan.io/tx/${claimResult.transactionHash}`,
        12000
      );

      // Refresh portfolio to update balances
      fetchPortfolio();

    } catch (error: any) {
      console.error('❌ Error claiming yield:', error);
      showError('Claim Failed', error.message || 'Failed to claim yield');
    } finally {
      setClaimingAssetId(null);
      setClaimStatus('');
      setSelectedAssetForClaim(null);
    }
  };

  if (isLoading) {
    return (
      <div className='w-screen h-screen flex items-center justify-center'>
        <PageLoader text="" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-black">
        {/* Background Animation */}
        <div className="absolute inset-0 z-0">
          <ShaderAnimation />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center px-4">
          <p className="text-2xl md:text-4xl text-white mb-10 font-bold tracking-[0.2em] uppercase">
            Looks like we had an error !
          </p>

          <Button
            onClick={fetchPortfolio}
            variant="outline"
            size="lg"
            className="bg-black/20 border-white/30 text-white hover:bg-transparent hover:text-black transition-all duration-300 backdrop-blur-md min-w-[200px]"
          >
            Let's try again !
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* <Wavy colors={["#FFFFFF", "#F9FBFF", "#F1F8FF", "#F4FFF9", "#FFFBEA", "#EFFFF7"]} />
       */}
      {/* <Wavy colors={["#F5F9FF", "#EEF3FF", "#F3EEFF", "#EDE7FF", "#F2F2F2", "#E6E6E6"]} />
       */}
      <HeroBackground />

      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="h-screen absolute top-0 left-0 flex flex-col bg-transparent overflow-hidden">
        {/* Top Navigation Bar - Fixed Height */}
        <header className="bg-transparent  z-40 relative flex-shrink-0">
          <div className="max-w-[90vw] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Logo + Search */}
              <div className="flex items-center gap-6">
                <div className="  top-0 left-0">
                  <div className="w-32 h-16 bg-foreground rounded-full  top-0 left-0">
                    <span className="text-white font-bold text-lg top-0 left-0 "><img src="/ALogo-removebg-preview.svg" alt="Logo" onClick={handlenavigate} className='cursor-pointer' /></span>
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


              {/* Right: Wallet Display */}
              <div className="flex items-center gap-3">
                {/* Center: Navigation */}
                <nav className="flex items-center gap-4">
                  <button
                    onClick={() => navigate(networkPath('/marketplace'))}
                    className="font-geist border border-gray-300  text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
                  >
                    Marketplace
                  </button>
                  <button
                    onClick={() => navigate(networkPath('/borrow'))}
                    className="font-geist border border-gray-300 text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl">
                    Borrow
                  </button>
                </nav>
                {address && (
                  <>
                    <NotificationBell role="INVESTOR" />
                    <div className="px-6 py-2 bg-transparent border border-gray-300 rounded-lg font-mono text-sm font-medium text-foreground">
                      {truncateAddress(address)}
                    </div>
                    <div className="bottom-0 flex items-start sticky justify-start  bg-transparent z-80">
                      <button className='ml-2 px-4 py-2 bg-black text-white rounded-lg font-gellix text-sm font-medium hover:bg-black/80 transition-colors' onClick={handlelogout}>

                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Fills remaining height to make 100vh */}
        <div className="flex-1 overflow-hidden">
          <div className="w-[100vw] mx-auto p-10 h-full z-40 relative">
            <div className="grid grid-cols-5 lg:grid-cols-9 gap-6 h-full">
              {/* Left Sidebar - 1/4 width, stats cards */}
              <div className="lg:col-span-2 h-full">
                <PortfolioStats
                  totalAssetValue={totalAssetValue}
                  portfolioAssets={filteredAssets}
                  creditData={creditData}
                  onIncreaseLimit={handleIncreaseCreditLimit}
                />
              </div>

              {/* Right Main Area - 3/4 width, tabbed content */}
              <div className="lg:col-span-7 h-full flex flex-col">
                {/* Single Table Container with Tabs */}
                <div className="bg-transparent rounded-2xl border border-gray-300 overflow-hidden h-full flex flex-col" style={{
                  boxShadow: `
                            4px 4px 12px rgba(243, 244, 245, 0.08),
                            8px 8px 24px rgba(150, 151, 151, 0.06),
                            12px 12px 36px rgba(92, 92, 93, 0.04),
                            16px 16px 48px rgba(45, 46, 47, 0.02)
             `,
                }}>
                  {/* Tab Header */}
                  <div className="px-6 py-4 border-b border-gray-300 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('assets')}
                        className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${activeTab === 'assets'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        My Assets
                      </button>
                      <button
                        onClick={() => setActiveTab('bids')}
                        className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${activeTab === 'bids'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        My Bids
                      </button>
                      <button
                        onClick={() => setActiveTab('loans')}
                        className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${activeTab === 'loans'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        My Loans
                      </button>
                      <button
                        onClick={() => setActiveTab('positions')}
                        className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${activeTab === 'positions'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Leveraged Positions
                      </button>
                      <button
                        onClick={() => setActiveTab('trades')}
                        className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${activeTab === 'trades'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Trades
                      </button>
                      {isEvm && (
                        <button
                          onClick={() => setActiveTab('credit')}
                          className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${activeTab === 'credit'
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          Credit Score
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tab Content - Smooth transition */}
                  <div className="flex-1 overflow-hidden relative">
                    {/* My Assets Tab */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'assets'
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                        }`}

                      style={{
                        boxShadow: `
                        4px 4px 12px rgba(243, 244, 245, 0.08),
                        8px 8px 24px rgba(173, 173, 173, 0.06),
                        12px 12px 36px rgba(123, 123, 123, 0.04),
                        16px 16px 48px rgba(57, 57, 57, 0.02)
          `,
                      }}>
                      <div className="h-full flex flex-col"  >
                        <MyAssetsTable
                          assets={filteredAssets as any}
                          onClaimYield={handleClaimYield}
                          claimingAssetId={claimingAssetId}
                          claimStatus={claimStatus}
                        />
                      </div>
                    </div>

                    {/* Active Bids Tab */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'bids'
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                        }`}
                    >
                      <div className="h-full flex flex-col">
                        <ActiveBidsTable
                          bids={filteredBids}
                          isLoading={isLoadingBids}
                          onSettleBid={(assetId, bidIndex, bidId) => {
                            setSettlingBidId(bidId);
                            settleBid({ assetId, bidIndex });
                          }}
                          isSettling={isSettling}
                          settlingBidId={settlingBidId}
                          settleStatus={settleStatus}
                        />
                      </div>
                    </div>

                    {/* My Loans Tab */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'loans'
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                        }`}
                    >
                      <div className="h-full flex flex-col overflow-y-auto">
                        <MyLoansTable
                          positions={filteredLoans}
                          isLoading={isLoadingMyLoans}
                          onRefresh={fetchMyLoans}
                        />
                      </div>
                    </div>

                    {/* Leveraged Positions Tab */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'positions'
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                        }`}
                    >
                      <div className="h-full flex flex-col overflow-y-auto p-6">
                        <PositionsTable
                          positions={filteredPositions as any}
                          isLoading={isLoading}
                          onSelectPosition={setSelectedPosition}
                        />
                      </div>
                    </div>

                    {/* Trades Tab */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'trades'
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                        }`}
                    >
                      <div className="h-full flex flex-col">
                        <TradesTable
                          assets={filteredAssets as any}
                          orders={filteredOrders}
                          isLoading={isLoadingMyOrders}
                          onCancelOrder={handleCancelOrder}
                          isCancellingId={cancellingOrderId}
                        />
                      </div>
                    </div>

                    {/* Credit Score Tab */}
                    {activeTab === 'credit' && isEvm && address && (
                      <CreditScoreTabContent
                        address={address}
                        showUSCModal={showUSCModal}
                        onVerifyClick={() => setShowUSCModal(true)}
                        onUSCModalClose={() => setShowUSCModal(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leverage Position Detail Chart Modal */}
        {selectedPosition && (
          <PositionDetailChart
            position={selectedPosition}
            isOpen={!!selectedPosition}
            onClose={() => setSelectedPosition(null)}
          />
        )}

        <DepositCollateralModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => {
            setShowDepositModal(false);
            fetchPortfolio();
            fetchMyLoans();
            handleRefreshCredit();
          }}
        />

        <NoAssetsModal
          isOpen={showNoAssetsModal}
          onClose={() => setShowNoAssetsModal(false)}
        />

        {/* Yield Claim Confirmation Modal - Burn-to-Claim Model */}
        {
          showClaimModal && selectedAssetForClaim && (
            <div className="fixed inset-0 bg-transparent backdrop-blur-sm border flex items-center justify-center z-50 p-4">
              <div
                className="rounded-2xl p-8 max-w-md w-full bg-gray-50 border-neutral-200 border shadow-lg"
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-neutral-200/50 shadow-lg rounded-full flex items-center justify-center mx-auto mb-5">
                    <span className="text-2xl">🔥</span>
                  </div>

                  <h2 className="font-gellix text-xl font-semibold text-foreground mb-2">
                    Burn Tokens to Claim Yield
                  </h2>

                  <p className="font-inter text-sm text-gray-600 mb-8">
                    This will permanently burn your RWA tokens to claim your pro-rata share of settlement USDC.
                  </p>

                  <div className="bg-gray-100/50 border border-neutral-200 shadow-lg rounded-xl p-5 mb-6 space-y-5">
                    <div>
                      <p className="font-inter text-xs text-gray-500 mb-1.5">Tokens to Burn</p>
                      <p className="font-gellix text-xl font-semibold text-foreground">
                        {parseFloat(selectedAssetForClaim.investorBalance).toFixed(2)} {selectedAssetForClaim.tokenSymbol}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-300">
                      <p className="font-inter text-xs text-gray-500 mb-1.5">Expected USDC</p>
                      <p className="font-gellix text-2xl font-semibold text-foreground">
                        ${parseFloat(selectedAssetForClaim.expectedUsdc).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-100/90 border border-neutral-200 shadow-lg rounded-xl p-4 mb-6">
                    <p className="font-inter text-xs text-gray-700 text-left">
                      <span className="text-gray-500">⚠️</span> <strong>Warning:</strong> This action is irreversible. Your tokens will be burned permanently.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowClaimModal(false);
                        setSelectedAssetForClaim(null);
                      }}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200/50 border border-gray-200 text-foreground rounded-xl shadow-lg font-inter font-medium transition-all hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeClaimYield}
                      className="flex-1 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-inter font-medium transition-all shadow-lg hover:scale-105"
                    >
                      Claim Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

      </div>
    </>
  );
};

export default PortfolioPage;



