// src/pages/portfolio/Portfolio.page.tsx
import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolio.store';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import { Search, TrendingUp } from 'lucide-react';
import type { BidStatus } from '../../types/marketplace.types';
import { useSettleBid } from '../../hooks/useAuctionContracts';
import { contractService } from '../../lib/api/contract.service';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/toast';
import HeroBackground from '../landing/HeroBackground';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { authService } from '../../lib/api/auth.service';
import { PositionsTable } from '../../components/leverage/PositionsTable';
import { useLeverageStore } from '../../stores/leverage.store';


const PortfolioPage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { portfolio, isLoading, error, fetchPortfolio } = usePortfolioStore();
  const { userBids, isLoadingBids, fetchUserBids } = useMarketplaceStore();
  const { fetchMyPositions } = useLeverageStore();
  const { toasts, success, error: showError, warning, removeToast } = useToast();
  const { disconnect } = useDisconnect();

  // Contract interaction for settling bids (investor-settle.sh verified)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { settleBid, status: settleStatus, error: settleError, isLoading: isSettling, isSuccess } = useSettleBid();
  const [settlingBidId, setSettlingBidId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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
  const formatCurrency = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };



    const handlelogout = () => {
      authService.logout();
      disconnect();
      navigate('/'); // Redirect to home or login page after logout
    };



  const formatTokenAmount = (weiAmount: string): string => {
    const tokens = parseFloat(weiAmount) / 1e18;
    return tokens.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatUSDCAmount = (amount: string): number => {
    return parseFloat(amount) / 1e6;
  };

  const getCategoryIcon = (industry: string): string => {
    const icons: Record<string, string> = {
      'Technology': '💻',
      'Healthcare': '🏥',
      'Real Estate': '🏢',
      'Manufacturing': '🏭',
      'Retail': '🛒',
      'Finance': '💰',
    };
    return icons[industry] || '📄';
  };


  const handleauctiondetailsnavigate = (assetId: string | undefined) => {
    navigate(`/marketplace/auction/${assetId}`);
  };

  const getBidStatusStyle = (status: BidStatus) => {
    switch (status) {
      case 'WON':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Won' };
      case 'LOST':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' };
      case 'SETTLED':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Settled' };
      case 'REFUNDED':
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Refunded' };
      case 'PENDING':
      default:
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
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
          <div className="font-geist text-lg text-foreground">Loading Portfolio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-geist text-lg text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchPortfolio()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-blue-700 transition-colors"
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
          <div className="font-geist text-lg text-foreground mb-4">No assets in your portfolio yet.</div>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-blue-700 transition-colors"
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

      <div className="min-h-[100vh] flex flex-col bg-[#f6fbff] overflow-hidden">
        <HeroBackground />

      {/* Top Navigation Bar - Fixed Height */}
      <header className="bg-transparent border-b border-gray-200 z-40 relative flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-6">
               <div className="  top-0 left-0">
                <div className="w-16 h-8 bg-foreground rounded-full  top-0 left-0">
                  <span className="text-white font-bold text-lg top-0 left-0"><img src="./ALogo-removebg-preview.svg" alt="Logo" /></span>
                </div>
              </div>

              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-8">
              <button
                onClick={() => navigate('/marketplace')}
                className="font-geist text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors"
              >
                Market
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="font-geist text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors"
              >
                Trade
              </button>
              <button
                onClick={() => navigate('/portfolio')}
                className="font-geist text-sm font-medium text-foreground hover:text-blue-600 transition-colors"
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
                 <div className="bottom-0 flex items-start sticky justify-start  bg-transparent z-80">
        <button className='ml-2 px-4 py-2 bg-black text-white rounded-lg font-geist text-sm font-medium hover:bg-black/80 transition-colors' onClick={handlelogout}>
        
          Logout
        </button>
      </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 py-6 h-full z-40 relative">
          <div className="grid grid-cols-5 lg:grid-cols-4 gap-3 h-full">
            {/* Left Sidebar - 1/4 width, full height with internal flex layout */}
            <div className="lg:col-span-1 flex flex-col gap-4 h-full">
              {/* Total Asset Value Card - flex-1 to take equal space */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col " style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}>
                <h3 className="font-geist text-xs font-medium text-gray-500 mb-2">
                  Total Asset Value
                </h3>
                <p className="font-geist text-3xl font-semibold text-foreground">
                  ${formatCurrency(totalAssetValue)}
                </p>
                <div className="flex items-center gap-1 text-green-600 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-geist text-xs">+0.00%</span>
                </div>
              </div>

              {/* Total Value Spent Card - flex-1 to take equal space */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col " style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}>
                <h3 className="font-geist text-xs font-medium text-gray-500 mb-2">
                  Total Value Spent on Assets
                </h3>
                <p className="font-geist text-3xl font-semibold text-foreground">
                  ${formatCurrency(totalAssetValue)}
                </p>
                <p className="font-geist text-xs text-gray-500 mt-2">
                  {portfolio?.totalPurchases} purchase{portfolio?.totalPurchases !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Loan Taken/Pending Card - flex-1 to take equal space */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col " style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}>
                <h3 className="font-geist text-xs font-medium text-gray-500 mb-2">
                  Loan Taken/Pending
                </h3>
                <p className="font-geist text-3xl font-semibold text-foreground">
                  $0.00
                </p>
                <p className="font-geist text-xs text-gray-500 mt-2">
                  No active loans
                </p>
              </div>
            </div>

            {/* Right Main Area - 3/4 width, full height with two equal sections */}
            <div className="lg:col-span-3 flex flex-col gap-6 max-h-[1200px]">
              {/* Owned Assets Table - Takes 50% height with internal scroll */}
              {(!portfolio || !portfolio?.portfolio || portfolio?.portfolio.length)!=0 && <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="font-geist text-xl font-semibold text-foreground">My Assets</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                 <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-200 text-black">
                        <th className="px-6 py-3 text-left font-geist text-xs font-medium text-black-500 uppercase tracking-wider">
                          Asset ID
                        </th>
                        <th className="px-6 py-3 text-right font-geist text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tokens Owned
                        </th>
                        <th className="px-6 py-3 text-right font-geist text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount Invested
                        </th>
                        <th className="px-6 py-3 text-center font-geist text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right font-geist text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yield Earned
                        </th>
                        <th className="px-6 py-3 text-center font-geist text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Tier
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio?.portfolio.map((asset, index) => (
                        <>
                          <tr
                            key={asset.assetId}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                              index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50/50'
                            }`}
                            onMouseEnter={() => setHoveredRow(asset.assetId)}
                            onMouseLeave={() => setHoveredRow(null)}
                            onClick={() => navigate(`/marketplace/asset/${asset.assetId}`)}
                          >
                            {/* Asset ID */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                                  {getCategoryIcon(asset.metadata?.industry || 'Technology')}
                                </div>
                                <div>
                                  <div className="font-geist text-sm font-semibold text-foreground">
                                    {asset.metadata?.assetName || asset.assetId.slice(0, 8)}
                                  </div>
                                  <div className="font-geist text-xs text-gray-500">
                                    {asset.metadata?.industry || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Tokens Owned */}
                            <td className="px-6 py-4 text-right">
                              <div className="font-geist text-sm font-semibold text-foreground">
                                {formatTokenAmount(asset.totalAmount)}
                              </div>
                            </td>

                            {/* Amount Invested */}
                            <td className="px-6 py-4 text-right">
                              <div className="font-geist text-sm font-semibold text-foreground">
                                ${formatCurrency(formatUSDCAmount(asset.totalInvested))}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                Active
                              </span>
                            </td>

                            {/* Yield Earned */}
                            <td className="px-6 py-4 text-right">
                              <div className={`font-geist text-sm font-semibold ${
                                asset.yieldInfo?.settlementDistributed && parseFloat(asset.yieldInfo?.claimableYield || '0') > 0
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                              }`}>
                                {asset.yieldInfo?.claimableYieldFormatted || '$0.00'}
                              </div>
                            </td>

                            {/* Risk Tier */}
                            <td className="px-6 py-4 text-center">
                              <span className="font-geist text-sm text-foreground">
                                {asset.metadata?.riskTier || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          {hoveredRow === asset.assetId &&
                           asset.yieldInfo?.settlementDistributed === true &&
                           parseFloat(asset.yieldInfo?.claimableYield || '0') > 0 && (
                            <tr className={`bg-black-50 transition-all ${
                              index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50/50'
                            }`}>
                              <td colSpan={7} className="px-6 py-2 text-center" onMouseEnter={() => setHoveredRow(asset.assetId)}
                             onMouseLeave={() => setHoveredRow(null)}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClaimYield(asset.assetId);
                                  }}
                                  disabled={claimingAssetId === asset.assetId}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {claimingAssetId === asset.assetId ? claimStatus : `Claim Yield (${asset.yieldInfo?.claimableYieldFormatted || '$0.00'})`}
                                </button>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>}

              {/* Pending Auction Bids Section - Takes 50% height with internal scroll */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="font-geist text-xl font-semibold text-foreground">Active Bids</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-6">
                    {isLoadingBids ? (
                      <div className="text-center text-gray-500 font-geist text-sm py-8">
                        Loading bids...
                      </div>
                    ) : userBids.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="font-geist text-sm text-gray-500 mb-4">No auction bids yet</p>
                        <button
                          onClick={() => navigate('/marketplace')}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Browse Auctions
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userBids.map((bid) => {
                          const statusStyle = getBidStatusStyle(bid.status);
                          return (
                            <div
                              key={bid.bidId}
                              className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                              onClick={() => handleauctiondetailsnavigate(bid.assetId)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <p className="font-geist text-sm font-semibold text-foreground">
                                      Asset: {bid.assetId || bid.auctionId ? (bid.assetId || bid.auctionId).slice(0, 8) : 'Unknown'}...
                                    </p>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                    >
                                      {statusStyle.label}
                                    </span>
                                  </div>

                                  {/* Bid Details Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {/* Tokens Requested - from tokenAmount (wei) */}
                                    {bid.tokenAmount && (
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Tokens Requested</p>
                                        <p className="font-geist text-sm font-semibold text-foreground">
                                          {(parseFloat(bid.tokenAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </p>
                                      </div>
                                    )}

                                    {/* Price per Token - from price (USDC 6 decimals) */}
                                    {bid.price && (
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Price per Token</p>
                                        <p className="font-geist text-sm font-semibold text-foreground">
                                          ${(parseFloat(bid.price) / 1e6).toFixed(2)}
                                        </p>
                                      </div>
                                    )}

                                    {/* Total Bid Amount - from usdcDeposited (USDC 6 decimals) */}
                                    {bid.usdcDeposited && (
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Total Bid Amount</p>
                                        <p className="font-geist text-sm font-semibold text-blue-600">
                                          ${(parseFloat(bid.usdcDeposited) / 1e6).toFixed(2)} USDC
                                        </p>
                                      </div>
                                    )}

                                    {/* Bid Date */}
                                    {bid.bidDate && (
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Bid Date</p>
                                        <p className="font-geist text-sm font-semibold text-foreground">
                                          {new Date(bid.bidDate).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}

                                    {/* Transaction Hash */}
                                    {bid.txHash && (
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Transaction</p>
                                        <a
                                          href={`https://sepolia.mantlescan.xyz/tx/${bid.txHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-geist text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {bid.txHash.slice(0, 6)}...{bid.txHash.slice(-4)}
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                  {/* Show Tokens Won and Clearing Price if successful */}
                                  {bid.tokensWon !== undefined && bid.actualPrice !== undefined && (
                                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Tokens Won</p>
                                        <p className="font-geist text-sm font-semibold text-green-600">
                                          {bid.tokensWon.toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="font-geist text-xs text-gray-500 mb-1">Clearing Price</p>
                                        <p className="font-geist text-sm font-semibold text-foreground">
                                          ${bid.actualPrice.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Action Button */}
                                {bid.settledAt ? (
                                  <div className="ml-4">
                                    <span className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg font-geist text-sm font-medium">
                                      Settled
                                    </span>
                                  </div>
                                ) : (bid.status === 'WON' || bid.status === 'LOST') ? (
                                  <div className="ml-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSettlingBidId(bid.bidId);
                                        settleBid({
                                          assetId: bid.assetId || bid.auctionId,
                                          bidIndex: bid.bidIndex !== undefined ? bid.bidIndex : 0,
                                        });
                                      }}
                                      disabled={isSettling && settlingBidId === bid.bidId}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {bid.status === 'WON' && (isSettling && settlingBidId === bid.bidId
                                        ? settleStatus
                                        : 'Claim Tokens')}
                                      {bid.status === 'LOST' && (isSettling && settlingBidId === bid.bidId
                                        ? settleStatus
                                        : 'Refund USDC')}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leveraged Positions Section */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="font-geist text-xl font-semibold text-foreground">Leveraged Positions</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6">
                    <PositionsTable />
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

              <h2 className="font-geist text-2xl font-semibold text-foreground mb-2">
                Burn Tokens to Claim Yield
              </h2>

              <p className="font-inter text-sm text-foreground/70 mb-6">
                This will permanently burn your RWA tokens to claim your pro-rata share of settlement USDC.
              </p>

              <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200">
                <div className="mb-4">
                  <p className="font-inter text-xs text-gray-500 mb-2">Tokens to Burn</p>
                  <p className="font-geist text-2xl font-semibold text-orange-600">
                    {(parseFloat(selectedAssetForClaim.investorBalance) / 1e18).toFixed(2)} {selectedAssetForClaim.tokenSymbol}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-inter text-xs text-gray-500 mb-2">Expected USDC</p>
                  <p className="font-geist text-3xl font-semibold text-green-600">
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



