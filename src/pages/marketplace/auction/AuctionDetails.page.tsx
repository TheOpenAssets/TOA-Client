// src/pages/marketplace/auction/AuctionDetails.page.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Search, Clock } from 'lucide-react';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { useSubmitBid } from '../../../hooks/useAuctionContracts';
import { contractService } from '../../../lib/api/contract.service';
import HeroBackground from '../../landing/HeroBackground';
import { marketplaceService } from '../../../lib/api/marketplace.service';

const AuctionDetailsPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { currentAsset: asset, isLoadingAsset, error, fetchAssetDetails } = useMarketplaceStore();

  const [bidAmount, setBidAmount] = useState('');
  const [pricePerToken, setPricePerToken] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [hasAlreadyBidded, setHasAlreadyBidded] = useState(false);

  const { submitBid, status, error: bidError, isLoading, reset } = useSubmitBid();

  // Auto-clear error after 8 seconds
  useEffect(() => {
    if (bidError) {
      const timer = setTimeout(() => {
        reset();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [bidError, reset]);

  useEffect(() => {
    if (assetId && fetchAssetDetails) {
      fetchAssetDetails(assetId);
    }
    if (address) {
      const fetchBalance = async () => {
        try {
          const balance = await contractService.checkUSDCBalance(address);
          setUsdcBalance(balance);
        } catch (error) {
          console.error('Failed to fetch USDC balance:', error);
          setUsdcBalance('0');
        }
      };
      fetchBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, address]);

  // Check for existing bids
  useEffect(() => {
    if (address && assetId) {
      const checkForExistingBids = async () => {
        try {
          const myBids = await marketplaceService.getUserBids();
          const hasBid = myBids.some(bid => bid.assetId === assetId && bid.status === 'PENDING');
          setHasAlreadyBidded(hasBid);
        } catch (error) {
          console.error('Failed to check for existing bids:', error);
        }
      };
      checkForExistingBids();
    }
  }, [address, assetId]);

  // Truncate wallet address
  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate time remaining
  const getTimeRemaining = (endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    if (parts.length > 0) return parts.join(' ');

    return 'Less than a minute';
  };

  const handlePlaceBid = async () => {
    if (!assetId || !bidAmount || !pricePerToken) {
      alert('Please fill in all bid fields');
      return;
    }

    await submitBid({
      assetId: assetId,
      tokenAmount: bidAmount,
      pricePerToken: pricePerToken,
    });
  };

  if (isLoadingAsset) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-antic text-lg text-foreground">Loading auction...</div>
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
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <div className="font-antic text-lg text-foreground mb-4">Auction not found</div>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fbff]">
      <HeroBackground />

      {/* Top Navigation Bar - Matches Marketplace */}
      <header className="bg-transparent border-b border-gray-200 z-40 relative">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <img
                  src="/ALogo-removebg-preview.svg"
                  alt="Logo"
                  className="h-16 w-auto object-contain cursor-pointer"
                  onClick={() => navigate('/')}
                />
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
                onClick={() => navigate('/portfolio')}
                className="font-antic text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors"
              >
                Portfolio
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="font-antic text-sm font-medium text-foreground hover:text-blue-600 transition-colors"
              >
                Trade
              </button>
              <button className="font-antic text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors">
                Borrow
              </button>
            </nav>

            {/* Right: Wallet Display */}
            <div className="flex items-center gap-3">
              {address ? (
                <div className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm font-medium text-foreground">
                  {truncateAddress(address)}
                </div>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-antic text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
                >
                  Sign Up / Log In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 z-40 bg-transparent relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Auction Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-antic text-2xl font-semibold text-foreground mb-2">
                    Invoice #{asset.metadata?.invoiceNumber || asset.assetId}
                  </h1>
                  <p className="font-antic text-sm text-gray-500">
                    {asset.metadata?.industry} · {asset.metadata?.buyerName}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-lg">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-antic text-sm font-medium text-orange-600">
                    {asset.listing?.scheduledEndTime ? getTimeRemaining(asset.listing.scheduledEndTime) : 'N/A'} left
                  </span>
                </div>
              </div>

              {/* Auction Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <p className="font-antic text-xs text-gray-500 mb-1">Total Supply</p>
                  <p className="font-antic text-lg font-semibold text-foreground">
                    {asset.tokenParams.totalSupply ? ((Number(asset.tokenParams.totalSupply) / 1e18).toLocaleString()) : '0'} tokens
                  </p>
                </div>
                <div>
                  <p className="font-antic text-xs text-gray-500 mb-1">Reserve Price</p>
                  <p className="font-antic text-lg font-semibold text-foreground">
                    ${asset.listing?.reservePrice ? (Number(asset.listing.reservePrice) / 1e6).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="font-antic text-xs text-gray-500 mb-1">Bid Range</p>
                  <p className="font-antic text-lg font-semibold text-green-600">
                    ${asset.listing?.priceRange?.min ? (Number(asset.listing.priceRange.min) / 1e6).toFixed(2) : '0.00'} - ${asset.listing?.priceRange?.max ? (Number(asset.listing.priceRange.max) / 1e6).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Asset Information */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-antic text-xl font-semibold text-foreground mb-4">Asset Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-antic text-xs text-gray-500 mb-1">Industry</p>
                  <p className="font-antic text-sm font-medium text-foreground">
                    {asset.metadata?.industry || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-antic text-xs text-gray-500 mb-1">Buyer</p>
                  <p className="font-antic text-sm font-medium text-foreground">
                    {asset.metadata?.buyerName || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-antic text-xs text-gray-500 mb-1">Risk Tier</p>
                  <p className="font-antic text-sm font-medium text-foreground">
                    {asset.metadata?.riskTier || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-antic text-xs text-gray-500 mb-1">Invoice Number</p>
                  <p className="font-antic text-sm font-medium text-foreground">
                    {asset.metadata?.invoiceNumber || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* How Auction Works */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-antic text-xl font-semibold text-foreground mb-4">Hw This Auction Works</h2>
              <div className="space-y-3 font-antic text-sm text-gray-600">
                <p>
                  <strong className="text-foreground">1. Submit Your Bid:</strong> Enter the number of tokens you want and your maximum price per token.
                </p>
                <p>
                  <strong className="text-foreground">2. Uniform-Price Auction:</strong> All winning bids pay the same clearing price (the lowest winning bid price).
                </p>
                <p>
                  <strong className="text-foreground">3. Settlement:</strong> After the auction ends, winners can claim their tokens at the clearing price.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Bid Form (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
              <h2 className="font-antic text-xl font-semibold text-foreground mb-6">Place a Bid</h2>

                <div className="space-y-4">
                  {/* Bid Amount Input */}
                  <div>
                    <label className="block font-antic text-xs font-medium text-gray-500 mb-2">
                      Amount of Tokens
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      disabled={!!(asset.listing?.scheduledEndTime && new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime())}
                      value={bidAmount}
                      min={asset.tokenParams?.minInvestment ? (Number(asset.tokenParams.minInvestment) / 1e18).toString() : '0'}
                      max={asset.tokenParams?.totalSupply ? (Number(asset.tokenParams.totalSupply) / 1e18).toString() : '0'}
                      step="0.01"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setBidAmount('');
                          return;
                        }
                        
                        const numValue = parseFloat(value);
                        
                        if (!isNaN(numValue)) {
                          if (numValue < 0) {
                            setBidAmount('0');
                          } else {
                            setBidAmount(value);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (bidAmount && parseFloat(bidAmount) > 0) {
                          const numValue = parseFloat(bidAmount);
                          const available = asset.tokenParams?.totalSupply ? Number(asset.tokenParams.totalSupply) / 1e18 : 0;
                          const minBid = asset.tokenParams?.minInvestment ? Number(asset.tokenParams.minInvestment) / 1e18 : 0;
                          const effectiveMin = Math.min(minBid, available);
                          
                          if (numValue < effectiveMin) {
                            setBidAmount(effectiveMin.toFixed(2));
                          } else if (numValue > available) {
                            setBidAmount(available.toFixed(2));
                          } else {
                            setBidAmount(numValue.toFixed(2));
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-antic text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="font-antic text-xs text-gray-500 mt-1">
                      Min: {asset.tokenParams?.minInvestment && asset.tokenParams?.totalSupply 
                        ? Math.min(Number(asset.tokenParams.minInvestment) / 1e18, Number(asset.tokenParams.totalSupply) / 1e18).toFixed(2)
                        : '0.00'} · Available: {asset.tokenParams?.totalSupply ? (Number(asset.tokenParams.totalSupply) / 1e18).toFixed(2) : '0.00'}
                    </p>
                  </div>

                  {/* Price Per Token Input */}
                  <div>
                    <label className="block font-antic text-xs font-medium text-gray-500 mb-2">
                      Price per Token (USDC)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={pricePerToken}
                      disabled={!!(asset.listing?.scheduledEndTime && new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime())}
                      min={asset.listing?.priceRange?.min ? (Number(asset.listing.priceRange.min) / 1e6).toString() : '0'}
                      max={asset.listing?.priceRange?.max ? (Number(asset.listing.priceRange.max) / 1e6).toString() : '0'}
                      step="0.01"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setPricePerToken('');
                          return;
                        }
                        
                        const numValue = parseFloat(value);
                        
                        if (!isNaN(numValue)) {
                          if (numValue < 0) {
                            setPricePerToken('0');
                          } else {
                            setPricePerToken(value);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (pricePerToken && parseFloat(pricePerToken) > 0) {
                          const numValue = parseFloat(pricePerToken);
                          const minPrice = asset.listing?.priceRange?.min ? Number(asset.listing.priceRange.min) / 1e6 : 0;
                          const maxPrice = asset.listing?.priceRange?.max ? Number(asset.listing.priceRange.max) / 1e6 : Infinity;
                          
                          if (numValue < minPrice) {
                            setPricePerToken(minPrice.toFixed(2));
                          } else if (numValue > maxPrice) {
                            setPricePerToken(maxPrice.toFixed(2));
                          } else {
                            setPricePerToken(numValue.toFixed(2));
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-antic text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="font-antic text-xs text-gray-500 mt-1">
                      Range: ${asset.listing?.priceRange?.min ? (Number(asset.listing.priceRange.min) / 1e6).toFixed(2) : '0.00'} - ${asset.listing?.priceRange?.max ? (Number(asset.listing.priceRange.max) / 1e6).toFixed(2) : '0.00'}
                    </p>
                  </div>

                {/* Error Message */}
                {bidError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg relative">
                    <button
                      onClick={reset}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                    <div className="flex items-start gap-2 pr-6">
                      <span className="text-red-500 text-lg mt-0.5">⚠️</span>
                      <div>
                        <p className="font-antic text-sm font-semibold text-red-800 mb-1">Transaction Failed</p>
                        <p className="font-antic text-xs text-red-700">{bidError}</p>
                        
                      </div>
                    </div>
                  </div>
                )}

                {/* Status/Success Message */}
                {status && !bidError && (
                  <div className={`p-3 border rounded-lg ${
                    status.includes('success') || status.includes('🎉')
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {status.includes('success') || status.includes('🎉') ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      )}
                      <p className={`font-antic text-xs ${
                        status.includes('success') || status.includes('🎉')
                          ? 'text-green-800 font-semibold'
                          : 'text-blue-800'
                      }`}>
                        {status}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bid Summary */}
                {bidAmount && pricePerToken && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-antic text-xs text-gray-500">Total Cost</span>
                      <span className="font-antic text-sm font-semibold text-foreground">
                        ${(parseFloat(bidAmount) * parseFloat(pricePerToken)).toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-antic text-xs text-gray-500">Your Balance</span>
                      <span className="font-antic text-sm font-semibold text-foreground">
                        ${parseFloat(usdcBalance).toFixed(2)} USDC
                      </span>
                    </div>
                  </div>
                )}

                {/* Place Bid / Retry Button */}
                {bidError ? (
                  <button
                    onClick={() => {
                      reset();
                      handlePlaceBid();
                    }}
                    className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Try Again</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePlaceBid}
                    disabled={
                      isLoading ||
                      !address ||
                      hasAlreadyBidded ||
                      !!(
                        asset.listing?.scheduledEndTime &&
                        new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime()
                      ) ||
                      (parseFloat(bidAmount || '0') * parseFloat(pricePerToken || '0') > parseFloat(usdcBalance) &&
                       parseFloat(bidAmount || '0') > 0 &&
                       parseFloat(pricePerToken || '0') > 0)
                    }
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? 'Processing...'
                      : !address
                      ? 'Connect Wallet'
                      : hasAlreadyBidded // Display 'Already Bidded' if true
                      ? 'Already Bidded'
                      : asset.listing?.scheduledEndTime &&
                        new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime()
                      ? 'Auction Ended'
                      : bidAmount &&
                        pricePerToken &&
                        parseFloat(bidAmount) * parseFloat(pricePerToken) > parseFloat(usdcBalance)
                      ? 'Insufficient Balance'
                      : 'Place Bid'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailsPage;
