// src/pages/portfolio/Portfolio.page.tsx
import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolio.store';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import { Search } from 'lucide-react';
import { useSettleBid } from '../../hooks/useAuctionContracts';
import { contractService } from '../../lib/api/contract.service';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/toast';
import HeroBackground from '../landing/HeroBackground';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { authService } from '../../lib/api/auth.service';
import { PositionsTable } from '../../components/leverage/PositionsTable';
import { useLeverageStore } from '../../stores/leverage.store';
import { PortfolioStats } from '../../components/portfolio/PortfolioStats';
import { MyAssetsTable } from '../../components/portfolio/MyAssetsTable';
import { ActiveBidsTable } from '../../components/portfolio/ActiveBidsTable';


const PortfolioPage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { portfolio, isLoading, error, fetchPortfolio } = usePortfolioStore();
  const { userBids, isLoadingBids, fetchUserBids } = useMarketplaceStore();
  const { positions, fetchMyPositions, isLoading: isLoadingPositions } = useLeverageStore();
  const { toasts, success, error: showError, warning, removeToast } = useToast();
  const { disconnect } = useDisconnect();

  // Tab state for portfolio sections
  type PortfolioTab = 'assets' | 'bids' | 'positions';
  const [activeTab, setActiveTab] = useState<PortfolioTab>('assets');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered data based on search term
  const filteredAssets = portfolio?.portfolio?.filter(asset =>
    asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.metadata?.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  ) || [];

  const filteredBids = userBids.filter(bid =>
    bid.assetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bid.auctionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  ) || [];

  const filteredPositions = positions.filter(position =>
    position.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.assetSymbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  ) || [];

  // Contract interaction for settling bids (investor-settle.sh verified)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  useEffect(() => {
    fetchPortfolio();
    fetchUserBids();
    fetchMyPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Helper functions
  const formatUSDCAmount = (amount: string): number => {
    return parseFloat(amount) / 1e6;
  };

  const handlelogout = () => {
    authService.logout();
    disconnect();
    navigate('/'); // Redirect to home or login page after logout
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
    const asset = portfolio?.portfolio?.find(a => a.assetId === assetId);
    if (!asset || !asset.tokenAddress) {
      showError('Asset Not Found', 'Could not find token address for this asset');
      return;
    }

    setClaimingAssetId(assetId);
    setClaimStatus('Checking...');

    try {
      // Step 1: Check settlement info and token balance (matching script)
      console.log('🔍 Step 1: Checking Settlement Info & Token Balance');
      console.log('Asset ID:', assetId);
      console.log('Token Address:', asset.tokenAddress);

      const settlementResult = await contractService.getSettlementInfo(asset.tokenAddress, address);

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


  const handlenavigate=()=>{
  navigate('/')
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
      const burnAmountWei = investorBalance;
      const burnAmountFormatted = (parseFloat(investorBalance) / 1e18).toFixed(2);

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

        const approvalResult = await contractService.approveYieldVault(
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

      const claimResult = await contractService.claimYield(tokenAddress, burnAmountWei);

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

      success(
        'Yield Claimed Successfully! 🎉',
        `Tokens Burned: ${tokensBurned} ${tokenSymbol} 🔥\nUSDC Received: ${usdcReceived} USDC\nTX: ${claimResult.transactionHash?.slice(0, 10)}...\n\nYour USDC has been transferred to your wallet!\n\nView on explorer: https://explorer.sepolia.mantle.xyz/tx/${claimResult.transactionHash}`,
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
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-gellix text-lg text-foreground">Loading Portfolio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-gellix text-lg text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchPortfolio()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if ((!portfolio || !portfolio?.portfolio || !portfolio?.portfolio.length) && !userBids.length) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-gellix text-lg text-foreground mb-4">No assets in your portfolio yet.</div>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Explore Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Calculate total values
  const totalAssetValue = portfolio?.portfolio?.reduce(
    (sum, asset) => sum + formatUSDCAmount(asset.totalInvested),
    0
  ) || 0;

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="h-screen flex flex-col bg-[#ffffff] overflow-hidden">

      {/* Top Navigation Bar - Fixed Height */}
      <header className="bg-transparent  z-40 relative flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-6">
               <div className="  top-0 left-0">
                <div className="w-32 h-16 bg-foreground rounded-full  top-0 left-0">
                  <span className="text-white font-bold text-lg top-0 left-0 "><img src="./ALogo-removebg-preview.svg" alt="Logo" onClick={handlenavigate} className='cursor-pointer' /></span>
                </div>
              </div>

              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets"
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
              className="font-geist border border-gray-200  text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
            >
              Marketplace
            </button>
            <button
              onClick={() => navigate('/')}
              className="font-geist border border-gray-200 text-sm font-medium text-foreground hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
            >
              Trade
            </button>
            <button className="font-geist border border-gray-200 text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl">
              Borrow
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
        <div className="max-w-[1600px] mx-auto px-6 py-6 h-full z-40 relative">
          <div className="grid grid-cols-5 lg:grid-cols-4 gap-6 h-full">
            {/* Left Sidebar - 1/4 width, stats cards */}
            <div className="lg:col-span-1 h-full">
              <PortfolioStats
                totalAssetValue={totalAssetValue}
                portfolioAssets={filteredAssets}
              />
            </div>

            {/* Right Main Area - 3/4 width, tabbed content */}
            <div className="lg:col-span-3 h-full flex flex-col">
              {/* Single Table Container with Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full flex flex-col" style={{
          boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
        }}>
                {/* Tab Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('assets')}
                      className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${
                        activeTab === 'assets'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      My Assets
                    </button>
                    <button
                      onClick={() => setActiveTab('bids')}
                      className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${
                        activeTab === 'bids'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      My Bids
                    </button>
                    <button
                      onClick={() => setActiveTab('positions')}
                      className={`px-4 py-2 rounded-lg font-gellix text-sm font-medium transition-all duration-200 ${
                        activeTab === 'positions'
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Leveraged Positions
                    </button>
                  </div>
                </div>

                {/* Tab Content - Smooth transition */}
                <div className="flex-1 overflow-hidden relative">
                  {/* My Assets Tab */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                      activeTab === 'assets'
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
                        assets={filteredAssets}
                        onClaimYield={handleClaimYield}
                        claimingAssetId={claimingAssetId}
                        claimStatus={claimStatus}
                      />
                    </div>
                  </div>

                  {/* Active Bids Tab */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                      activeTab === 'bids'
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

                  {/* Leveraged Positions Tab */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                      activeTab === 'positions'
                        ? 'opacity-100 translate-x-0 z-10'
                        : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                    }`}
                  >
                    <div className="h-full flex flex-col overflow-y-auto p-6">
                      <PositionsTable positions={filteredPositions} isLoading={isLoadingPositions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yield Claim Confirmation Modal - Burn-to-Claim Model */}
      {showClaimModal && selectedAssetForClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-md w-full"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔥</span>
              </div>

              <h2 className="font-gellix text-2xl font-semibold text-foreground mb-2">
                Burn Tokens to Claim Yield
              </h2>

              <p className="font-inter text-sm text-foreground/70 mb-6">
                This will permanently burn your RWA tokens to claim your pro-rata share of settlement USDC.
              </p>

              <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200">
                <div className="mb-4">
                  <p className="font-inter text-xs text-gray-500 mb-2">Tokens to Burn</p>
                  <p className="font-gellix text-2xl font-semibold text-orange-600">
                    {(parseFloat(selectedAssetForClaim.investorBalance) / 1e18).toFixed(2)} {selectedAssetForClaim.tokenSymbol}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-inter text-xs text-gray-500 mb-2">Expected USDC</p>
                  <p className="font-gellix text-3xl font-semibold text-green-600">
                    ${parseFloat(selectedAssetForClaim.expectedUsdc).toFixed(2)}
                  </p>
                  <p className="font-inter text-sm text-gray-500 mt-1">USDC</p>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-3 mb-6 border border-orange-200">
                <p className="font-inter text-xs text-orange-800">
                  ⚠️ <strong>Warning:</strong> This action is irreversible. Your tokens will be burned permanently.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowClaimModal(false);
                    setSelectedAssetForClaim(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-foreground rounded-xl font-inter font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeClaimYield}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-inter font-medium transition-colors"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                    boxShadow: '0 4px 14px 0 rgba(22, 163, 74, 0.25)',
                  }}
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



