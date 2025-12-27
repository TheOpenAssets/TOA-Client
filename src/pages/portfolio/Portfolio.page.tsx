// src/pages/portfolio/Portfolio.page.tsx
import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolio.store';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Search, TrendingUp } from 'lucide-react';
import type { BidStatus } from '../../types/marketplace.types';
import { useSettleBid } from '../../hooks/useAuctionContracts';
import HeroBackground from '../landing/HeroBackground';

const PortfolioPage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { portfolio, isLoading, error, fetchPortfolio } = usePortfolioStore();
  const { userBids, isLoadingBids, fetchUserBids } = useMarketplaceStore();

  // Contract interaction for settling bids (investor-settle.sh verified)
  const { settleBid, notifyBackend, status: settleStatus, isLoading: isSettling, isSuccess, txHash } = useSettleBid();
  const [settlingBidId, setSettlingBidId] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolio();
    fetchUserBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle successful settlement
  useEffect(() => {
    if (isSuccess && txHash && settlingBidId) {
      const bid = userBids.find((b) => b.bidId === settlingBidId);
      if (bid) {
        notifyBackend(
          {
            assetId: bid.assetId || bid.auctionId,
            bidIndex: bid.bidIndex !== undefined ? bid.bidIndex : 0,
          },
          txHash,
          0
        ).then(() => {
          fetchUserBids();
          setSettlingBidId(null);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash, settlingBidId]);

  // Helper functions
  const formatCurrency = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const getBidStatusStyle = (status: BidStatus) => {
    switch (status) {
      case 'SUCCESSFUL':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Successful' };
      case 'FAILED':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' };
      case 'PARTIALLY_FILLED':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Partial' };
      case 'PENDING':
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' };
    }
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-antic text-lg text-foreground">Loading Portfolio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-antic text-lg text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchPortfolio()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio || !portfolio.portfolio || portfolio.portfolio.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-antic text-lg text-foreground mb-4">No assets in your portfolio yet.</div>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Explore Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Calculate total values
  const totalAssetValue = portfolio.portfolio.reduce(
    (sum, asset) => sum + formatUSDCAmount(asset.totalInvested),
    0
  );

  return (
    <div className="h-screen flex flex-col bg-[#f6fbff] overflow-hidden">
      <HeroBackground />

      {/* Top Navigation Bar - Fixed Height */}
      <header className="bg-transparent border-b border-gray-200 z-40 relative flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-6">
               <div className="  top-0 left-0">
                <div className="w-16 h-8 bg-foreground rounded-full  top-0 left-0">
                  <span className="text-white font-bold text-lg top-0 left-0"><img src="src/assets/ALogo-removebg-preview.png" alt="Logo" /></span>
                </div>
              </div>

              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg font-antic text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-8">
              <button
                onClick={() => navigate('/marketplace')}
                className="font-antic text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors"
              >
                Market
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="font-antic text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors"
              >
                Trade
              </button>
              <button
                onClick={() => navigate('/portfolio')}
                className="font-antic text-sm font-medium text-foreground hover:text-blue-600 transition-colors"
              >
                Portfolio
              </button>
            </nav>

            {/* Right: Wallet Display */}
            <div className="flex items-center gap-3">
              {address && (
                <div className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm font-medium text-foreground">
                  {truncateAddress(address)}
                </div>
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
                <h3 className="font-antic text-xs font-medium text-gray-500 mb-2">
                  Total Asset Value
                </h3>
                <p className="font-antic text-3xl font-semibold text-foreground">
                  ${formatCurrency(totalAssetValue)}
                </p>
                <div className="flex items-center gap-1 text-green-600 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-antic text-xs">+0.00%</span>
                </div>
              </div>

              {/* Total Value Spent Card - flex-1 to take equal space */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col " style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}>
                <h3 className="font-antic text-xs font-medium text-gray-500 mb-2">
                  Total Value Spent on Assets
                </h3>
                <p className="font-antic text-3xl font-semibold text-foreground">
                  ${formatCurrency(totalAssetValue)}
                </p>
                <p className="font-antic text-xs text-gray-500 mt-2">
                  {portfolio.totalPurchases} purchase{portfolio.totalPurchases !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Loan Taken/Pending Card - flex-1 to take equal space */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col " style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}>
                <h3 className="font-antic text-xs font-medium text-gray-500 mb-2">
                  Loan Taken/Pending
                </h3>
                <p className="font-antic text-3xl font-semibold text-foreground">
                  $0.00
                </p>
                <p className="font-antic text-xs text-gray-500 mt-2">
                  No active loans
                </p>
              </div>
            </div>

            {/* Right Main Area - 3/4 width, full height with two equal sections */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full">
              {/* Owned Assets Table - Takes 50% height with internal scroll */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="font-antic text-xl font-semibold text-foreground">My Assets</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-200 text-black">
                        <th className="px-6 py-3 text-left font-antic text-xs font-medium text-black-500 uppercase tracking-wider">
                          Asset ID
                        </th>
                        <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tokens Owned
                        </th>
                        <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount Invested
                        </th>
                        <th className="px-6 py-3 text-center font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yield Earned
                        </th>
                        <th className="px-6 py-3 text-center font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Tier
                        </th>
                        <th className="px-6 py-3 text-center font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.portfolio.map((asset, index) => (
                        <tr
                          key={asset.assetId}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50/50'
                          }`}
                        >
                          {/* Asset ID */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                                {getCategoryIcon(asset.metadata?.industry || 'Technology')}
                              </div>
                              <div>
                                <div className="font-antic text-sm font-semibold text-foreground">
                                  {asset.metadata?.assetName || asset.assetId.slice(0, 8)}
                                </div>
                                <div className="font-antic text-xs text-gray-500">
                                  {asset.metadata?.industry || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Tokens Owned */}
                          <td className="px-6 py-4 text-right">
                            <div className="font-antic text-sm font-semibold text-foreground">
                              {formatTokenAmount(asset.totalAmount)}
                            </div>
                          </td>

                          {/* Amount Invested */}
                          <td className="px-6 py-4 text-right">
                            <div className="font-antic text-sm font-semibold text-foreground">
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
                            <div className="font-antic text-sm font-semibold text-green-600">
                              $0.00
                            </div>
                          </td>

                          {/* Risk Tier */}
                          <td className="px-6 py-4 text-center">
                            <span className="font-antic text-sm text-foreground">
                              {asset.metadata?.riskTier || 'N/A'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => navigate(`/marketplace/asset/${asset.assetId}`)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg font-antic text-xs font-medium hover:bg-blue-700 transition-colors"
                              >
                                View
                              </button>
                              <button
                                className="px-3 py-1 bg-green-600 text-white rounded-lg font-antic text-xs font-medium hover:bg-green-700 transition-colors"
                              >
                                Claim 
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Auction Bids Section - Takes 50% height with internal scroll */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="font-antic text-xl font-semibold text-foreground">Pending Auction Bids</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {isLoadingBids ? (
                    <div className="text-center text-gray-500 font-antic text-sm py-8">
                      Loading bids...
                    </div>
                  ) : userBids.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="font-antic text-sm text-gray-500 mb-4">No auction bids yet</p>
                      <button
                        onClick={() => navigate('/marketplace')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors"
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
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <p className="font-antic text-sm font-semibold text-foreground">
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
                                      <p className="font-antic text-xs text-gray-500 mb-1">Tokens Requested</p>
                                      <p className="font-antic text-sm font-semibold text-foreground">
                                        {(parseFloat(bid.tokenAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </p>
                                    </div>
                                  )}

                                  {/* Price per Token - from price (USDC 6 decimals) */}
                                  {bid.price && (
                                    <div>
                                      <p className="font-antic text-xs text-gray-500 mb-1">Price per Token</p>
                                      <p className="font-antic text-sm font-semibold text-foreground">
                                        ${(parseFloat(bid.price) / 1e6).toFixed(2)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Total Bid Amount - from usdcDeposited (USDC 6 decimals) */}
                                  {bid.usdcDeposited && (
                                    <div>
                                      <p className="font-antic text-xs text-gray-500 mb-1">Total Bid Amount</p>
                                      <p className="font-antic text-sm font-semibold text-blue-600">
                                        ${(parseFloat(bid.usdcDeposited) / 1e6).toFixed(2)} USDC
                                      </p>
                                    </div>
                                  )}

                                  {/* Bid Date */}
                                  {bid.bidDate && (
                                    <div>
                                      <p className="font-antic text-xs text-gray-500 mb-1">Bid Date</p>
                                      <p className="font-antic text-sm font-semibold text-foreground">
                                        {new Date(bid.bidDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                  )}

                                  {/* Transaction Hash */}
                                  {bid.txHash && (
                                    <div>
                                      <p className="font-antic text-xs text-gray-500 mb-1">Transaction</p>
                                      <a
                                        href={`https://sepolia.mantlescan.xyz/tx/${bid.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-antic text-xs font-medium text-blue-600 hover:text-blue-800 underline"
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
                                      <p className="font-antic text-xs text-gray-500 mb-1">Tokens Won</p>
                                      <p className="font-antic text-sm font-semibold text-green-600">
                                        {bid.tokensWon.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-antic text-xs text-gray-500 mb-1">Clearing Price</p>
                                      <p className="font-antic text-sm font-semibold text-foreground">
                                        ${bid.actualPrice.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              {bid.status === 'SUCCESSFUL' && !bid.settledAt && (
                                <div className="ml-4">
                                  <button
                                    onClick={() => {
                                      setSettlingBidId(bid.bidId);
                                      settleBid({
                                        assetId: bid.assetId || bid.auctionId,
                                        bidIndex: bid.bidIndex !== undefined ? bid.bidIndex : 0,
                                      });
                                    }}
                                    disabled={isSettling && settlingBidId === bid.bidId}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isSettling && settlingBidId === bid.bidId
                                      ? settleStatus
                                      : 'Claim Tokens'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
