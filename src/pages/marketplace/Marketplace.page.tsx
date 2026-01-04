// src/pages/marketplace/Marketplace.page.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

import {
  Search,
  TrendingUp,
  Grid3x3,
  List,
  Clock,
} from 'lucide-react';
import { formatCurrency, getCategoryIcon } from '../../lib/data/marketplace-mock-data';
import type { FilterCategory, SortOption, MarketplaceAsset } from '../../types/marketplace.types';
import { authService } from '../../lib/api/auth.service';
import { marketplaceService } from '../../lib/api/marketplace.service';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { PageLoader } from '../../components/ui/page-loader';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [searchQuery, setSearchQuery] = useState('');

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('most-popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Chart data cache for grid view
  const [assetChartData, setAssetChartData] = useState<Record<string, any[]>>({});
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  // Fetch real marketplace data
  const {
    listings,
    isLoading,
    fetchListings,
    auctions, // AUCTION_LIVE only
    scheduledAuctions, // AUCTION_SCHEDULED only
    auctionResults, // AUCTION_RESULTS_DECLARED only
    endedAuctions, // AUCTION_ENDED only
    isLoadingAuctions,
    fetchActiveAuctions,
    marketplaceInfo,
    isLoadingInfo,
    fetchMarketplaceInfo,
    trendingAssets,
    isLoadingTrending,
    fetchTrendingAssets,
  } = useMarketplaceStore();

  // Fetch listings and auctions on mount
  useEffect(() => {
    console.log('🚀 Marketplace: Fetching data from APIs...');
    fetchListings();
    console.log('  → GET /marketplace/listings');
    fetchActiveAuctions(); // Fetch using announcements + assets (100% script-verified)
    console.log('  → GET /announcements?type=AUCTION_LIVE&status=ACTIVE');
    fetchMarketplaceInfo(); // NEW: Platform metrics
    console.log('  → GET /marketplace/info');
    fetchTrendingAssets(3); // NEW: Top 3 trending assets
    console.log('  → GET /marketplace/top-grossing?limit=3');
  }, [fetchListings, fetchActiveAuctions, fetchMarketplaceInfo, fetchTrendingAssets]);

  // Prefetch chart data for all assets (for grid view)
  useEffect(() => {
    const prefetchChartData = async () => {
      if (listings.length === 0) return;

      setIsLoadingCharts(true);
      const chartDataMap: Record<string, any[]> = {};

      // Fetch chart data for all assets in parallel
      const chartPromises = listings.map(async (listing) => {
        try {
          const history = await marketplaceService.getPurchaseHistory(listing.assetId);
          if (history.chartData && history.chartData.length > 0) {
            // Aggregate into 5-minute time blocks (same as AssetDetails)
            const aggregated = aggregateIntoTimeBlocks(history.chartData, 0.05);
            chartDataMap[listing.assetId] = aggregated;
          } else {
            chartDataMap[listing.assetId] = [];
          }
        } catch (error) {
          console.error(`Failed to fetch chart data for ${listing.assetId}:`, error);
          chartDataMap[listing.assetId] = [];
        }
      });

      await Promise.all(chartPromises);
      setAssetChartData(chartDataMap);
      setIsLoadingCharts(false);
      console.log('✅ Chart data prefetched for grid view');
    };

    if (viewMode === 'grid') {
      prefetchChartData();
    }
  }, [listings, viewMode]);

  // Helper function to aggregate purchase data into time blocks (from AssetDetails)
  const aggregateIntoTimeBlocks = (chartData: any[], intervalMinutes: number = 5) => {
    if (!chartData || chartData.length === 0) return [];

    // Convert interval to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;

    // Create time blocks map
    const blocks: Map<number, { timestamp: number; tokensPurchased: number; count: number }> = new Map();

    // Aggregate purchases into time blocks
    chartData.forEach(purchase => {
      const purchaseTime = new Date(purchase.timestamp).getTime();
      const blockTime = Math.floor(purchaseTime / intervalMs) * intervalMs;

      const block = blocks.get(blockTime);
      if (block) {
        // Parse tokens purchased (18 decimals)
        const tokensPurchased = parseFloat(purchase.tokensPurchased) / 1e18;
        block.tokensPurchased += tokensPurchased;
        block.count += 1;
      } else {
        // Create new block for this time interval
        const tokensPurchased = parseFloat(purchase.tokensPurchased) / 1e18;
        blocks.set(blockTime, {
          timestamp: blockTime,
          tokensPurchased: tokensPurchased,
          count: 1
        });
      }
    });

    // Convert map to sorted array - ONLY including blocks with purchases (non-zero)
    return Array.from(blocks.values())
      .filter(block => block.tokensPurchased > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  // Convert backend listings to frontend format for display
  // Using REAL API data with sold percentage for progress bars
  const displayAssets: MarketplaceAsset[] = listings.length > 0
    ? (() => {
      console.log('✅ Marketplace: Using REAL data from API', { count: listings.length });
      return listings.map((listing) => {
        // Calculate maturity days from dueDate (from metadata)
        // @ts-ignore
        const dueDateStr = listing.metadata?.dueDate || listing.dueDate;
        const dueDate = new Date(dueDateStr || 0);
        const today = new Date();
        const calculatedMaturityDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Validate the date and maturity calculation
        const isValidDate = !isNaN(dueDate.getTime());
        const maturityDays = isValidDate && calculatedMaturityDays > 0 ? calculatedMaturityDays : "Matured";

        // Debug log for maturity calculation
        if (!isValidDate || calculatedMaturityDays <= 0) {
          console.log(`⚠️ Maturity fallback for ${listing.assetId}:`, {
            dueDateStr,
            isValidDate,
            calculatedMaturityDays,
            fallbackTo: "Matured",
          });
        }

        // Parse sold and totalSupply from wei (18 decimals)
        // @ts-ignore
        const soldWei = BigInt(listing.sold || '0');
        // @ts-ignore
        const totalSupplyWei = BigInt(listing.totalSupply || '0');
        const sold = Number(soldWei) / 1e18;
        const totalSupply = Number(totalSupplyWei) / 1e18;

        // Calculate funding progress (sold percentage)
        const fundingProgress = totalSupply > 0 ? (sold / totalSupply) * 100 : 0;

        // Parse price per token (USDC 6 decimals)
        // @ts-ignore
        const pricePerTokenWei = BigInt(listing.pricePerToken || '0');
        const pricePerToken = Number(pricePerTokenWei) / 1e6;

        // Calculate total raised (sold * price per token)
        const totalRaised = sold * pricePerToken;

        // Target amount is face value
        // @ts-ignore
        const targetAmount = parseFloat(listing.metadata?.faceValue || listing.faceValue || '0');

        return {
          id: listing.assetId,
          assetId: listing.name || listing.assetId, // Use name as display ID (e.g., "INV-2025-637514 - Tech Solutions Inc")
          name: listing.industry || 'Invoice', // Use industry as category name
          description: `${listing.industry || 'Invoice'} · Invoice · ${listing.riskTier || 'Standard'} Risk`,
          category: 'invoice' as const,
          icon: '📄',
          tokenPrice: pricePerToken,
          yieldAPY: 8, // TODO: Backend needs to provide this - using default
          maturityDays: maturityDays || "Matured", // Already validated with fallback to "Matured" above
          totalRaised: totalRaised,
          targetAmount: targetAmount,
          fundingProgress: fundingProgress,
          status: listing.status,
          verified: listing.status === 'TOKENIZED',
          listedDate: listing.listedAt || new Date().toISOString(),
          listingType: listing.listingType,
          totalSupply: totalSupply, // Add total supply for chart scaling
        } as MarketplaceAsset & { totalSupply: number };
      });
    })()
    : (() => {
      console.log('ℹ️ Marketplace: No live data returned; leaving empty.');
      return [] as MarketplaceAsset[];
    })(); // No fallback to mock data; keep empty state


  const handlenavigate = (asset: any) => {
    if (asset.listingType == "STATIC")
      navigate(`/marketplace/asset/${asset.assetId}`);
    else
      navigate(`/marketplace/auction/${asset.assetId}`);
  }
  const handleTableNavigate = (asset: MarketplaceAsset) => {
    if (asset.listingType === 'STATIC') {
      navigate(`/marketplace/trade/${asset.id}`);
    } else {
      navigate(`/marketplace/auction/${asset.id}`);
    }
  };

  // Truncate wallet address for display
  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Logout handler
  const handlelogout = () => {
    authService.logout();
    disconnect();
    navigate('/'); // Redirect to home or login page after logout
  };

  // Filter assets based on active filter and search
  const filteredAssets = displayAssets
    .filter((asset) => {
      // Search filter
      const matchesSearch =
        asset.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // PAYOUT_COMPLETE assets: only show if matured
      if (asset.status === 'PAYOUT_COMPLETE') {
        const isMatured = asset.maturityDays === "Matured" ||
          (typeof asset.maturityDays === 'number' && asset.maturityDays <= 0);
        if (!isMatured) return false;
      }

      // Category filter
      if (activeFilter === 'all') return true;
      if (activeFilter === 'invoices') return asset.category === 'invoice';

      if (activeFilter === 'high-yield') return asset.yieldAPY >= 10;
      if (activeFilter === 'verified') return asset.verified;

      return true;
    })
    .sort((a, b) => {
      // Apply sorting based on sortBy value
      switch (sortBy) {
        case 'highest-yield':
          return b.yieldAPY - a.yieldAPY;

        case 'newest':
          const dateA = new Date(a.listedDate).getTime();
          const dateB = new Date(b.listedDate).getTime();
          return dateB - dateA;

        case 'lowest-price':
          return a.tokenPrice - b.tokenPrice;

        case 'ending-soon':
          // Convert maturity days to numbers for comparison
          const maturityA = typeof a.maturityDays === 'number' ? a.maturityDays : Infinity;
          const maturityB = typeof b.maturityDays === 'number' ? b.maturityDays : Infinity;
          return maturityA - maturityB;

        case 'most-popular':
        default:
          // Sort by funding progress (highest first)
          return b.fundingProgress - a.fundingProgress;
      }
    });

  const filters: { value: FilterCategory; label: string }[] = [
    { value: 'all', label: 'All Assets' },
    { value: 'invoices', label: 'Invoices' },

    { value: 'high-yield', label: 'High Yield (>10%)' },
    { value: 'short-term', label: 'Short Term (<6mo)' },
    { value: 'verified', label: 'Verified' },
  ];



  const formatMaturity = (days: number | string): string => {
    const numDays = typeof days === 'string' ? parseFloat(days) : days;
    if (numDays < 30) return `${numDays} days`;
    if (numDays < 365) return `${Math.floor(numDays / 30)} months`;
    return `Matured`;
  };

  // Calculate time remaining for auction
  const getAuctionTimeRemaining = (endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  const formatLargeNumber = (num: number | null | undefined): string => {
    if (!num) return '0.00';
    if (num < 1000) return num.toFixed(2);
    if (num < 1_000_000) return `${(num / 1_000).toFixed(0)}k`;
    if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  };

  // Generate consistent color for each asset based on ID
  const getAssetColor = (assetId: string): { main: string; gradient: string } => {
    // Soft, professional color palette
    const colors = [
      { main: '#0B7285', gradient: 'rgba(11, 114, 133, 0.24)' }, // Teal
      { main: '#7048E8', gradient: 'rgba(112, 72, 232, 0.24)' }, // Purple
      { main: '#E8590C', gradient: 'rgba(232, 89, 12, 0.24)' }, // Orange
      { main: '#0B7C3E', gradient: 'rgba(11, 124, 62, 0.24)' }, // Green
      { main: '#1971C2', gradient: 'rgba(25, 113, 194, 0.24)' }, // Blue
      { main: '#C92A2A', gradient: 'rgba(201, 42, 42, 0.24)' }, // Red
      { main: '#0F5257', gradient: 'rgba(15, 82, 87, 0.24)' }, // Dark Teal
      { main: '#5F3DC4', gradient: 'rgba(95, 61, 196, 0.24)' }, // Indigo
    ];

    // Use asset ID to consistently assign a color
    const hash = assetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Asset Chart Component (adapted from AssetDetails.page.tsx)
  const AssetChart = ({ data, color }: { data: any[]; color: { main: string; gradient: string } }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
          No purchase activity yet
        </div>
      );
    }

    // Calculate the maximum value from the data points
    const maxDataValue = Math.max(...data.map(d => d.tokensPurchased || 0));
    // Set Y-axis max to double the maximum value
    const yAxisMax = maxDataValue * 2;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${color.main.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color.main} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color.main} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, yAxisMax]} hide />
          <Area
            type="monotone"
            dataKey="tokensPurchased"
            stroke={color.main}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#gradient-${color.main.replace('#', '')})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // Show loading state
  if (isLoading && listings.length === 0) {
    return (
      <div className='w-screen h-screen flex items-center justify-center'>
        <PageLoader text="" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-[85vw] mx-auto">
      {/* Top Navigation Bar */}
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
            <button
              onClick={() => navigate('/trade')}
              className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
            >
              Trade
            </button>
            <button
              onClick={() => navigate('/borrow')}
              className="font-gellix border border-gray-200 text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl">
              Borrow
            </button>
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

      {/* Auction Announcements Ticker - Ondo Finance Style */}
      <div className="w-full bg-transparent relative z-40 overflow-hidden h-12 flex items-center">
        <style>{`
    @keyframes scroll-left {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .carousel-track {
      display: flex;
      width: max-content; /* Ensure track is as wide as content */
      animation: scroll-left 60s linear infinite; /* Slower, smoother speed */
    }
    .carousel-track:hover {
      animation-play-state: paused;
    }
  `}</style>

        {/* We combine all items into one list and render it TWICE 
     to create a seamless infinite loop without gaps.
  */}
        <div className="carousel-track items-center">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6">

              {/* SCHEDULED AUCTIONS */}
              {scheduledAuctions.map((auction) => (
                <div
                  key={`scheduled-${i}-${auction.auctionId}`}
                  className="flex items-center gap-3 cursor-pointer group whitespace-nowrap"
                  onClick={() => navigate(`/marketplace/auction/${auction.auctionId}`)}
                >
                  <span className="font-gellix text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    {auction.metadata?.invoiceNumber || auction.assetId}
                  </span>
                  <span className="font-gellix text-sm font-bold text-gray-900">
                    ${formatLargeNumber(auction.reservePrice)}
                  </span>
                  <span className="font-gellix text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    ▲ SCHEDULED
                  </span>
                </div>
              ))}

              {/* RESULTS AUCTIONS */}
              {auctionResults.map((auction) => (
                <div
                  key={`results-${i}-${auction.auctionId}`}
                  className="flex items-center gap-3 cursor-pointer group whitespace-nowrap"
                  onClick={() => navigate(`/marketplace/auction/${auction.auctionId}`)}
                >
                  <span className="font-gellix text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    {auction.metadata?.invoiceNumber || auction.assetId}
                  </span>
                  <span className="font-gellix text-sm font-bold text-gray-900">
                    ${formatLargeNumber(auction.clearingPrice || 0)}
                  </span>
                  <span className="font-gellix text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    ▲ CLEARED
                  </span>
                </div>
              ))}

              {/* ENDED AUCTIONS */}
              {endedAuctions.map((auction) => (
                <div
                  key={`ended-${i}-${auction.auctionId}`}
                  className="flex items-center gap-3 cursor-pointer group whitespace-nowrap"
                  onClick={() => navigate(`/marketplace/auction/${auction.auctionId}`)}
                >
                  <span className="font-gellix text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    {auction.metadata?.invoiceNumber || auction.assetId}
                  </span>
                  <span className="font-gellix text-sm font-bold text-gray-900">
                    ${formatLargeNumber(auction.clearingPrice || 0)}
                  </span>
                  <span className="font-gellix text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    ▼ ENDED
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Platform Metrics Strip - Real Data from GET /marketplace/info */}
      <div className="bg-transparent relative z-40 flex items-center m-2">
        <div className="mx-auto w-[80%]">
          {isLoadingInfo ? (
            <div className="flex items-center justify-center py-2">
              <span className="font-gellix text-xs text-gray-900">Loading metrics...</span>
            </div>
          ) : marketplaceInfo ? (
            <div className="flex flex-row items-center justify-evenly">
              {/* Metric 1: Total Assets */}
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="font-gellix text-sm text-gray-900">Total Assets </span>
                <span className="font-gellix text-sm  text-foreground">
                  {marketplaceInfo.totalAssets} Assets
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-gellix text-xs">Live</span>
                </span>
              </div>

              {/* Metric 2: Total Value Tokenized */}
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="font-gellix text-sm text-gray-900">Total Value Tokenized</span>
                <span className="font-gellix text-sm text-foreground">
                  ${formatLargeNumber(marketplaceInfo.totalValueTokenized)}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-gellix text-xs">USD</span>
                </span>
              </div>

              {/* Metric 3: Active Users */}
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="font-gellix text-sm text-gray-900">Active Users</span>
                <span className="font-gellix text-sm text-foreground">
                  {marketplaceInfo.activeUsers.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-gellix text-xs">Investors</span>
                </span>
              </div>

              {/* Metric 4: Settlements Completed */}
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="font-gellix text-sm text-gray-900">Total Settlements</span>
                <span className="font-gellix text-sm text-foreground">
                  {marketplaceInfo.totalSettlements.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-gellix text-xs">Completed</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <span className="font-gellix text-xs text-gray-500">Unable to load metrics</span>
            </div>
          )}
        </div>
      </div>



      {/* Main Content */}
      <div className="w-full mx-auto z-4 mt-10" >
        {/* Three Feature Sections */}
        <div className="grid grid-cols-3 gap-8 rounded-2xl "  >
          {/* Section 1: Active Auctions (Replaced Featured Issuances) */}
          <div className="bg-transparent flex flex-col gap-3">
            <h2 className="font-gellix text-2xl text-foreground">
              Active Auctions
            </h2>
            <div className="w-full h-full border-t border-gray-100 justify-center flex flex-col">
              {isLoadingAuctions ? (
                <div className="text-center text-gray-400 font-gellix text-lg">
                  Loading auctions...
                </div>
              ) : auctions.length === 0 ? (
                <div className="text-center text-gray-400 font-gellix text-lg">
                  No active auctions
                </div>
              ) : (
                auctions.slice(0, 3).map((auction, index) => (
                  <div key={auction.auctionId}>
                    <div
                      className=" hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/marketplace/auction/${auction.auctionId}`)}
                    >
                      <div className="flex items-center justify-between p-3">
                        {/* Left: Auction Info */}
                        <div className="flex flex-row items-center justify-evenly p-1">
                          <div>
                            <div className="font-gellix text-lg text-foreground">
                              {auction.metadata?.invoiceNumber || auction.assetId}
                            </div>
                            <div className="font-gellix text-sm text-gray-400">
                              {auction.totalSupply.toLocaleString()} tokens
                            </div>
                          </div>
                        </div>

                        {/* Right: Price Range + Time */}
                        <div className="text-right">
                          <div className="font-gellix text-lg text-foreground">
                            ${auction.metadata?.priceRange?.minPrice ? (Number(auction.metadata.priceRange.minPrice) / 1e6).toFixed(2) : '0.00'} - ${auction.metadata?.priceRange?.maxPrice ? (Number(auction.metadata.priceRange.maxPrice) / 1e6).toFixed(2) : '0.00'}
                          </div>
                          <div className="flex items-center justify-end gap-1 text-blue-600">
                            <Clock className="w-3 h-3" />
                            <span className="font-gellix text-sm font-medium">
                              {getAuctionTimeRemaining(auction.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < Math.min(auctions.length, 3) - 1 && (
                      <div className="border-t border-gray-200"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Trending Assets (Highest Sold %) - Real Data from GET /marketplace/top-grossing */}
          <div className="bg-transparent flex flex-col gap-3">
            <h2 className="font-gellix text-2xl  text-foreground">
              Trending Assets
            </h2>

            <div className="w-full h-full border-t border-gray-100 justify-center flex flex-col">
              {isLoadingTrending ? (
                <div className="text-center text-gray-400 font-gellix text-lg">
                  Loading trending assets...
                </div>
              ) : trendingAssets.length === 0 ? (
                <div className="text-center text-gray-400 font-gellix text-lg">
                  No trending assets
                </div>
              ) : (
                trendingAssets.map((asset, index) => (
                  <div key={asset.assetId}>
                    <div
                      className=" hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handlenavigate(asset)}
                    >
                      <div className="flex items-center justify-between p-3">
                        {/* Left: Icon + Asset Info */}
                        <div className="flex flex-row items-center justify-evenly p-1">
                          <div>
                            <div className="font-gellix text-lg text-foreground">
                              {asset.name || asset.assetId}
                            </div>
                            <div className="font-gellix text-sm text-gray-400">
                              {asset.industry} · {asset.activityMetrics?.totalActivity || 0} activities
                            </div>
                          </div>
                        </div>

                        {/* Right: Sold % + Activity */}
                        <div className="text-right">
                          <div className="font-gellix text-lg text-green-600">
                            {asset.percentageSold?.toFixed(1) || 0}% Sold
                          </div>
                          <div className="flex items-center justify-end gap-1 text-gray-600">
                            <span className="font-gellix text-sm">
                              {asset.activityMetrics?.purchaseCount || 0} purchases
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < trendingAssets.length - 1 && (
                      <div className="border-t border-gray-200"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: Recently Verified Assets - Real Data from GET /marketplace/listings (Top 3, sorted by newest) */}
          <div className="bg-transparent flex flex-col gap-3">
            <h2 className="font-gellix text-2xl text-foreground">
              Recently Verified
            </h2>
            <div className="w-full h-full border-t border-gray-100 justify-center flex flex-col">
              {isLoading ? (
                <div className="text-center text-gray-400 font-gellix text-lg">
                  Loading recent assets...
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center text-gray-400 font-gellix text-lg">
                  No verified assets
                </div>
              ) : (
                listings.slice(0, 3).map((listing, index) => (
                  <div key={listing.assetId}>
                    <div
                      className=" hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/marketplace/asset/${listing.assetId}`)}
                    >
                      <div className="flex items-center justify-between p-3">
                        {/* Left: Asset Info */}
                        <div className="flex flex-row items-center justify-evenly p-1">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-gellix text-lg text-foreground">
                                {/* @ts-ignore */}
                                {listing.name || listing.assetId}
                              </span>

                            </div>
                            <div className="font-gellix text-sm text-gray-400">
                              {/* @ts-ignore */}
                              {listing.industry} · {listing.listingType}
                            </div>
                          </div>
                        </div>

                        {/* Right: Price */}
                        <div className="text-right">
                          <div className="font-gellix text-lg text-foreground">
                            {/* @ts-ignore */}
                            ${formatLargeNumber(parseFloat(listing.pricePerToken || '0') / 1e6)}
                          </div>
                          <div className="font-gellix text-sm text-gray-600">
                            per token
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < Math.min(listings.length, 3) - 1 && (
                      <div className="border-t border-gray-200"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Assets Table */}
        <div>
          <div className="flex flex-col gap-6 mb-12 mt-10 rounded-2xl">
            <h2 className="font-gellix text-2xl text-foreground">Explore Assets</h2>
            <div className='flex flex-row gap-2'>
              {/* Search Bar */}
              <div className="flex flex-row items-center relative w-[40%] rounded-4xl bg-gray-100">
                <Search className=" absolute w-5 h-5 text-gray-400 ml-1 " />
                <input
                  type="text"
                  placeholder="Search for assets"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full pl-10 pr-4 border-none rounded-4xl font-gellix text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              {/* Filter Tabs */}
              <div className="flex justify-evenly gap-2 overflow-x-auto w-[60%]">
                <div className="flex justify-evenly gap-2 overflow-x-auto">

                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      className={`px-4 py-2 rounded-3xl font-gellix text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === filter.value
                        ? 'bg-gray-100 text-black'
                        : ' text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                      }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                      }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-gellix text-sm font-medium text-foreground cursor-pointer focus:outline-none"
                >
                  <option value="most-popular">Most Popular</option>
                  <option value="highest-yield">Highest Yield</option>
                  <option value="newest">Newest</option>
                  <option value="lowest-price">Lowest Price</option>
                  <option value="ending-soon">Ending Soon</option>
                </select>
              </div>
            </div>

            {/* Grid/List Content */}
            {viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoadingCharts && filteredAssets.length > 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    Loading charts...
                  </div>
                ) : (
                  filteredAssets.map((asset) => {
                    const chartData = assetChartData[asset.id] || [];
                    const assetColor = getAssetColor(asset.id);
                    const isAuction = asset.listingType === 'AUCTION';

                    return (
                      <div
                        key={asset.id}
                        onClick={() => handleTableNavigate(asset)}
                        className="group relative bg-white rounded-3xl border border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl"
                      >
                        {/* Header Section */}
                        <div className="flex flex-col gap-3">
                          {/* Asset Info - No Icon */}
                          <div className='flex flex-row justify-between items-start p-4'>
                            <div className="">
                              <div className="font-gellix text-lg font-medium text-[#383c48] mb-1">
                                {asset.assetId.split(' - ')[0]}on
                              </div>
                              <div className="font-gellix text-sm text-[#7b7d86]">
                                {asset.name}
                              </div>
                            </div>

                            {/* Price Section */}
                            <div className="">
                              <div className="font-gellix text-md font-medium text-[#383c48]">
                                ${asset.tokenPrice.toFixed(2)}
                              </div>
                              <div className="font-gellix text-xs text-[#7b7d86] mt-1">
                                per token
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className='w-full p-4'>
                          <div className='w-full h-48 rounded-xl overflow-hidden' style={{
                            backgroundColor: `${assetColor.main}08`,
                          }}>

                            {/* Chart Section or Auction Info */}
                            {isAuction ? (
                              /* Auction Card - No Chart */
                              <div className="w-full h-full flex items-center justify-center p-3">
                                <div className=" w-[90%] bg-transparent rounded-2xl p-4 border border-blue-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span className="font-gellix text-sm font-semibold text-blue-900">Live Auction</span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="font-gellix text-xs text-[#7b7d86]">Maturity</span>
                                      <span className="font-gellix text-sm font-medium text-[#383c48]">
                                        {formatMaturity(asset.maturityDays)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="font-gellix text-xs text-[#7b7d86]">Yield</span>
                                      <span className="font-gellix text-sm font-medium text-[#383c48]">
                                        {asset.yieldAPY}% APY
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Static Asset - Chart with background color */
                              <AssetChart data={chartData} color={assetColor} />
                            )}
                          </div>
                        </div>
                        {/* Funding Progress Indicator */}
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between text-xs text-[#7b7d86] mb-2">
                            <span className="font-gellix">Funding Progress</span>
                            <span className="font-gellix font-semibold text-[#383c48]">{asset.fundingProgress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#eeeef1] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${asset.fundingProgress}%`,
                                backgroundColor: assetColor.main
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* List View */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-t border-gray-200">
                      <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset Name
                      </th>
                      <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Token Price
                      </th>
                      <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yield
                      </th>
                      <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Maturity
                      </th>
                      <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Raised
                      </th>
                      <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Funding Progress
                      </th>
                      <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset, index) => (
                      <tr
                        key={asset.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        onClick={() => handleTableNavigate(asset)}
                      >
                        {/* Row Number */}
                        <td className="px-6 py-4 font-gellix text-sm text-gray-500">{index + 1}</td>

                        {/* Asset Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                              {getCategoryIcon(asset.category)}
                            </div>
                            <div>
                              <div className="font-gellix text-sm font-medium text-foreground">
                                {asset.assetId}
                              </div>
                              <div className="font-gellix text-xs text-gray-500">{asset.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* Token Price */}
                        <td className="px-6 py-4 text-right">
                          <div className="font-gellix text-sm font-semibold text-foreground">
                            ${asset.tokenPrice.toFixed(2)}
                          </div>
                        </td>

                        {/* Yield */}
                        <td className="px-6 py-4 text-right">
                          <div className="font-gellix text-sm text-foreground">
                            {asset.yieldAPY}% APY
                          </div>
                        </td>

                        {/* Maturity */}
                        <td className="px-6 py-4 text-right">
                          <div className="font-gellix text-sm text-gray-600">
                            {formatMaturity(asset.maturityDays)}
                          </div>
                        </td>

                        {/* Total Raised */}
                        <td className="px-6 py-4 text-right">
                          <div className="font-gellix text-sm text-foreground">
                            {formatCurrency(asset.totalRaised)} / {formatCurrency(asset.targetAmount)}
                          </div>
                          <div className="font-gellix text-xs text-gray-500">
                            ({asset.fundingProgress.toFixed(2)}% funded)
                          </div>
                        </td>

                        {/* Funding Progress Bar */}
                        <td className="px-6 py-4">
                          <div className="relative w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                              style={{ width: `${asset.fundingProgress}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <span className="font-gellix text-sm font-medium text-white">
                                {asset.fundingProgress.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              // Check if asset is matured
                              const isMatured = asset.maturityDays === "Matured" ||
                                (typeof asset.maturityDays === 'number' && asset.maturityDays <= 0) ||
                                asset.fundingProgress === 100;

                              return isMatured ? (
                                <button
                                  onClick={() => handleTableNavigate(asset)}
                                  className="px-4 py-2 text-blue-600 rounded-lg font-inter text-sm font-medium hover:text-blue-700 hover:scale-[1.07] transition-colors"
                                >
                                  View Details
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTableNavigate(asset)}
                                  className="px-4 py-2 text-blue-600 rounded-lg font-inter text-sm font-medium hover:text-blue-700 hover:scale-[1.07] transition-colors"
                                >
                                  Buy
                                </button>
                              );
                            })()}
                            <span className="text-gray-400">|</span>
                            <button
                              onClick={() => handleTableNavigate(asset)}
                              className="px-4 py-2 text-green-600 rounded-lg font-inter text-sm font-medium hover:text-green-700 hover:scale-[1.07] transition-colors"
                            >
                              Trade
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;

