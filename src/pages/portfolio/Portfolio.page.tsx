// src/pages/portfolio/Portfolio.page.tsx
import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolio.store';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { Button } from '../../components/ui/button';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BidStatus } from '../../types/marketplace.types';
import { useSettleBid } from '../../hooks/useAuctionContracts';

const PortfolioPage = () => {
  const navigate = useNavigate();
  const { portfolio, isLoading, error, fetchPortfolio } = usePortfolioStore();
  const { userBids, isLoadingBids, fetchUserBids } = useMarketplaceStore();

  // Contract interaction for settling bids (investor-settle.sh verified)
  const { settleBid, notifyBackend, status: settleStatus, isLoading: isSettling, isSuccess, txHash } = useSettleBid();
  const [settlingBidId, setSettlingBidId] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolio();
    // Fetch ALL user's bids (authenticated via JWT token)
    // Backend endpoint: GET /marketplace/bids/my-bids (from investor-bidding.sh line 395)
    // Note: Pass assetId to filter bids for specific auction, or omit to get all bids
    fetchUserBids(); // Get all bids for authenticated user
  }, [fetchPortfolio, fetchUserBids]);

  // Handle successful settlement - notify backend (investor-settle.sh line 264)
  useEffect(() => {
    if (isSuccess && txHash && settlingBidId) {
      const bid = userBids.find((b) => b.bidId === settlingBidId);
      if (bid) {
        // Notify backend about settlement
        notifyBackend(
          {
            assetId: bid.auctionId,
            bidIndex: 0, // TODO: Get actual bid index from bid object
          },
          txHash,
          0 // TODO: Get block number from transaction receipt
        ).then(() => {
          // Refresh bids after settlement
          fetchUserBids();
          setSettlingBidId(null);
        });
      }
    }
  }, [isSuccess, txHash, settlingBidId, userBids, notifyBackend, fetchUserBids]);

  // Helper function to format currency
  const formatCurrency = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper function to format token amount (from wei to tokens)
  const formatTokenAmount = (weiAmount: string): string => {
    const tokens = parseFloat(weiAmount) / 1e18;
    return tokens.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Helper function to format USDC amount (from 6 decimals to USDC)
  const formatUSDCAmount = (amount: string): number => {
    return parseFloat(amount) / 1e6;
  };

  // Helper function to get category icon
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

  // Generate mock sparkline data (TODO: Replace with real data when available)
  const generateSparkline = () => {
    return Array.from({ length: 7 }, () => Math.random() * 100 + 50);
  };

  // Get bid status badge styling
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen  text-black">
        <div className="text-center">
          <div className="text-lg">Loading Portfolio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen  text-black">
        <div className="text-center">
          <div className="text-lg text-red-400 mb-4">Error: {error}</div>
          <Button onClick={() => fetchPortfolio()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!portfolio || !portfolio.portfolio || portfolio.portfolio.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen  text-black">
        <div className="text-center">
          <div className="text-lg mb-4">No assets in your portfolio yet.</div>
          <Button onClick={() => navigate('/marketplace')}>Explore Marketplace</Button>
        </div>
      </div>
    );
  }

  // Calculate total values from portfolio
  const totalAssetValue = portfolio.portfolio.reduce(
    (sum, asset) => sum + formatUSDCAmount(asset.totalInvested),
    0
  );

  return (
    <div className="min-h-screen text-black p-8 font-sans">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">My Portfolio</h1>
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => navigate('/marketplace')}
            >
              Market
            </Button>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => navigate('/marketplace')}
            >
              Trade
            </Button>
            <Button variant="ghost" className="text-black rounded-full">
              Portfolio
            </Button>
          </nav>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-screen">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1 space-y-8 min-h-screen">
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h3 className="text-gray-400 text-sm mb-2">Total Asset Value</h3>
              <p className="text-4xl font-semibold">${formatCurrency(totalAssetValue)}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h3 className="text-gray-400 text-sm mb-2">Total Assets Owned</h3>
              <p className="text-3xl font-semibold">{portfolio.totalAssets}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h3 className="text-gray-400 text-sm mb-2">Total Purchases</h3>
              <p className="text-3xl font-semibold">{portfolio.totalPurchases}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h3 className="text-gray-400 text-sm mb-2">Wallet Address</h3>
              <p className="text-xs font-mono text-gray-300 break-all">
                {portfolio.investorWallet}
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Owned Assets Section */}
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-6">Owned Assets</h2>
              <div className="space-y-4">
                {portfolio.portfolio.map((asset) => (
                  <div
                    key={asset.assetId}
                    className="bg-gray-900 rounded-2xl p-4 grid grid-cols-7 items-center gap-4 hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    {/* Asset Info */}
                    <div className="col-span-2 flex items-center gap-4">
                      <div className="text-2xl">
                        {getCategoryIcon(asset.metadata?.industry || 'Technology')}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {asset.metadata?.assetName || 'Asset'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {asset.metadata?.industry || 'N/A'} · Risk: {asset.metadata?.riskTier || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Tokens Owned */}
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Tokens</p>
                      <p className="font-medium">{formatTokenAmount(asset.totalAmount)}</p>
                    </div>

                    {/* Amount Invested */}
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Invested</p>
                      <p className="font-medium">
                        ${formatCurrency(formatUSDCAmount(asset.totalInvested))}
                      </p>
                    </div>

                    {/* Sparkline Chart */}
                    <div className="h-10 w-24">
                      <ResponsiveContainer>
                        <AreaChart data={generateSparkline().map((v) => ({ v }))}>
                          <defs>
                            <linearGradient
                              id={`sparkline-${asset.assetId}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke="#16A34A"
                            strokeWidth={2}
                            fill={`url(#sparkline-${asset.assetId})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Purchase Info */}
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Purchases</p>
                      <p className="font-medium">{asset.purchaseCount}</p>
                      <p className="text-xs text-gray-500">
                        Last: {new Date(asset.lastPurchase).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 hover:bg-gray-700"
                        onClick={() => navigate(`/marketplace/asset/${asset.assetId}`)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          // TODO: Implement sell functionality
                          console.log('Sell asset:', asset.assetId);
                        }}
                      >
                        Sell
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-gray-400 hover:bg-gray-700"
                      >
                        <MoreHorizontal size={20} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Bids Section (NEW) */}
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-6">My Auction Bids</h2>
              {isLoadingBids ? (
                <div className="text-center text-gray-400 py-8">Loading bids...</div>
              ) : userBids.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No auction bids yet</p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/marketplace')}
                  >
                    Browse Auctions
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBids.map((bid) => {
                    const statusStyle = getBidStatusStyle(bid.status);
                    return (
                      <div
                        key={bid.bidId}
                        className="bg-gray-900 rounded-2xl p-4 hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          {/* Bid Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-white">
                                Auction: {bid.auctionId}
                              </p>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                              >
                                {statusStyle.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Tokens Requested</p>
                                <p className="font-medium">{bid.tokensRequested.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Max Price</p>
                                <p className="font-medium">${bid.maxPrice.toFixed(2)}</p>
                              </div>
                              {bid.tokensWon !== undefined && (
                                <div>
                                  <p className="text-gray-400">Tokens Won</p>
                                  <p className="font-medium text-green-400">
                                    {bid.tokensWon.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {bid.actualPrice !== undefined && (
                                <div>
                                  <p className="text-gray-400">Actual Price</p>
                                  <p className="font-medium">${bid.actualPrice.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button - Claim Tokens (SCRIPT-VERIFIED: investor-settle.sh) */}
                          {bid.status === 'SUCCESSFUL' && !bid.settledAt && (
                            <div className="ml-4">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSettlingBidId(bid.bidId);
                                  settleBid({
                                    assetId: bid.auctionId,
                                    bidIndex: 0, // TODO: Get actual bid index
                                  });
                                }}
                                disabled={isSettling && settlingBidId === bid.bidId}
                              >
                                {isSettling && settlingBidId === bid.bidId
                                  ? settleStatus
                                  : 'Claim Tokens'}
                              </Button>
                              {isSettling && settlingBidId === bid.bidId && (
                                <p className="text-xs text-gray-400 mt-1">{settleStatus}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
