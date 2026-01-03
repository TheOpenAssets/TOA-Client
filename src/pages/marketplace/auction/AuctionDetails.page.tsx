// src/pages/marketplace/auction/AuctionDetails.page.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Clock } from 'lucide-react';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { useSubmitBid } from '../../../hooks/useAuctionContracts';
import { contractService } from '../../../lib/api/contract.service';
import { marketplaceService } from '../../../lib/api/marketplace.service';
import { Button } from '../../../components/ui/button';

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

  // Get time remaining in milliseconds
  const getTimeRemainingMs = (endTime: string): number => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    return end - now;
  };

  // Get clock color based on time remaining
  const getClockColor = (endTime: string): { bg: string; text: string; icon: string } => {
    const msRemaining = getTimeRemainingMs(endTime);
    const hoursRemaining = msRemaining / (1000 * 60 * 60);
    const minutesRemaining = msRemaining / (1000 * 60);

    if (minutesRemaining < 30) {
      // Less than 30 minutes - red
      return { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-600' };
    } else if (hoursRemaining < 2) {
      // Less than 2 hours - yellow
      return { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-600' };
    } else {
      // More than 2 hours - green
      return { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-600' };
    }
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
          <div className="font-geist text-lg text-foreground">Loading auction...</div>
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
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f6fbff]">
        <div className="text-center">
          <div className="text-lg text-foreground mb-4">Auction not found</div>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const isAuctionAnnounced = asset?.listing?.type === 'AUCTION' &&
    asset?.listing?.clearingPrice !== undefined &&
    asset?.listing?.clearingPrice !== null;

  return (
    <div className="min-h-screen bg-white/5 max-w-[85vw] mx-auto">
      {/* Top Navigation Bar - Clean Marketplace Design */}
      <header className="w-full flex flex-row z-40 mt-5 mb-10">
        {/* Logo */}
        <img
          src="/ALogo-removebg-preview.svg"
          alt="Logo"
          className="h-16 w-auto object-contain cursor-pointer"
          onClick={() => navigate('/')}
        />
        <div className="flex flex-row items-center justify-end w-full gap-10 mr-10">
          {/* Center: Navigation */}
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate('/portfolio')}
              className="font-geist border border-gray-200 text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
            >
              Portfolio
            </button>
            <button
              onClick={() => navigate('/marketplace')}
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
            {address ? (
              <div className="px-6 py-2 bg-white rounded-lg font-mono text-sm font-medium text-foreground">
                {truncateAddress(address)}
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-geist text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
              >
                Sign Up / Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full mx-auto z-40 mt-10 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: Auction Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-8 bg-transparent rounded-3xl p-6 shadow-md border border-gray-100">
            {/* Auction Header */}
            <div className="bg-white rounded-3xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="font-geist text-3xl font-medium text-[#111111] mb-2">
                    Invoice {asset.metadata?.invoiceNumber || asset.assetId}
                  </h1>
                  <p className="font-geist text-sm text-[#6B7280]">
                    {asset.metadata?.industry} · {asset.metadata?.buyerName}
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isAuctionAnnounced ? 'bg-red-50' : asset.listing?.scheduledEndTime ? getClockColor(asset.listing.scheduledEndTime).bg : 'bg-gray-100'}`}>
                  <Clock className={`w-4 h-4 ${isAuctionAnnounced ? 'text-red-600' : asset.listing?.scheduledEndTime ? getClockColor(asset.listing.scheduledEndTime).icon : 'text-gray-600'}`} />
                  <span className={`font-geist text-sm font-medium ${isAuctionAnnounced ? 'text-red-600' : asset.listing?.scheduledEndTime ? getClockColor(asset.listing.scheduledEndTime).text : 'text-[#111111]'}`}>
                    {isAuctionAnnounced ? 'Ended' : `${asset.listing?.scheduledEndTime ? getTimeRemaining(asset.listing.scheduledEndTime) : 'N/A'}${asset.listing?.scheduledEndTime && getTimeRemaining(asset.listing.scheduledEndTime) !== 'Ended' ? ' left' : ''}`}
                  </span>
                </div>
              </div>

              {/* Auction Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">Total Supply</p>
                  <p className="font-geist text-lg font-medium text-[#111111]">
                    {asset.tokenParams.totalSupply ? ((Number(asset.tokenParams.totalSupply) / 1e18).toLocaleString()) : '0'} tokens
                  </p>
                </div>
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">{isAuctionAnnounced ? 'Clearing Price' : 'Reserve Price'}</p>
                  <p className={`font-geist text-lg font-medium ${isAuctionAnnounced ? 'text-green-600' : 'text-[#111111]'}`}>
                    ${isAuctionAnnounced && asset.listing?.clearingPrice
                      ? (Number(asset.listing.clearingPrice) / 1e6).toFixed(2)
                      : asset.listing?.reservePrice
                        ? (Number(asset.listing.reservePrice) / 1e6).toFixed(2)
                        : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">Bid Range</p>
                  <p className="font-geist text-lg font-medium text-[#111111]">
                    ${asset.listing?.priceRange?.min ? (Number(asset.listing.priceRange.min) / 1e6).toFixed(2) : '0.00'} - ${asset.listing?.priceRange?.max ? (Number(asset.listing.priceRange.max) / 1e6).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Auction Ended Banner */}
              {isAuctionAnnounced && (
                <div className="mt-6 p-4 bg-red-50 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-geist text-sm font-medium text-red-800 mb-1">Auction Has Ended</p>
                      <p className="font-geist text-xs text-red-600">
                        This auction concluded on {asset.listing?.endedAt ? new Date(asset.listing.endedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}.
                        {asset.listing?.clearingPrice && Number(asset.listing.clearingPrice) > 0
                          ? ` Final clearing price: $${(Number(asset.listing.clearingPrice) / 1e6).toFixed(2)} per token.`
                          : ' No tokens were sold.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Asset Information */}
            <div className="bg-white rounded-3xl p-6">
              <h2 className="font-geist text-2xl font-medium text-[#111111] mb-6">Asset Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Industry</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.industry || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Buyer</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.buyerName || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Risk Tier</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.riskTier || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-geist text-xs text-[#6B7280]">Invoice Number</p>
                  <p className="font-geist text-sm font-medium text-[#111111]">
                    {asset.metadata?.invoiceNumber || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* How Auction Works */}
            <div className="bg-white rounded-3xl p-6">
              <h2 className="font-geist text-2xl font-medium text-[#111111] mb-4">How This Auction Works</h2>
              <div className="space-y-3 font-geist text-sm text-[#6B7280]">
                <p>
                  <strong className="text-[#111111]">1. Submit Your Bid:</strong> Enter the number of tokens you want and your maximum price per token.
                </p>
                <p>
                  <strong className="text-[#111111]">2. Uniform-Price Auction:</strong> All winning bids pay the same clearing price (the lowest winning bid price).
                </p>
                <p>
                  <strong className="text-[#111111]">3. Settlement:</strong> After the auction ends, winners can claim their tokens at the clearing price.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Bid Form (1/3 width) */}
          <div className="lg:col-span-1 ">
            <div className=" sticky top-8 bg-transparent rounded-3xl p-6 shadow-md border border-gray-100">
              <h2 className="font-geist text-2xl font-medium text-[#111111] mb-6">
                {isAuctionAnnounced ? 'Auction Ended' : 'Place a Bid'}
              </h2>

              <div className="space-y-4">
                {/* Bid Amount Input */}
                <div className="bg-[#F3F4F6] rounded-2xl p-4">
                  <label className="block font-geist text-xs text-[#6B7280] mb-2">
                    Amount of Tokens
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    disabled={isAuctionAnnounced || !!(asset.listing?.scheduledEndTime && new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime())}
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
                    className="w-full border-none text-2xl font-medium text-[#111111] p-0 h-auto bg-transparent focus:outline-none focus:ring-0"
                  />
                  <p className="font-geist text-xs text-[#6B7280] mt-2">
                    Min: {asset.tokenParams?.minInvestment && asset.tokenParams?.totalSupply
                      ? Math.min(Number(asset.tokenParams.minInvestment) / 1e18, Number(asset.tokenParams.totalSupply) / 1e18).toFixed(2)
                      : '0.00'} · Available: {asset.tokenParams?.totalSupply ? (Number(asset.tokenParams.totalSupply) / 1e18).toFixed(2) : '0.00'}
                  </p>
                </div>

                {/* Price Per Token Input */}
                <div className="bg-[#F3F4F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" 
                      alt="USDC"
                      className="w-4 h-4 rounded-full"
                    />
                    <label className="block font-geist text-xs text-[#6B7280]">
                      Price per Token (USDC)
                    </label>
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={pricePerToken}
                    disabled={isAuctionAnnounced || !!(asset.listing?.scheduledEndTime && new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime())}
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
                    className="w-full border-none text-2xl font-medium text-[#111111] p-0 h-auto bg-transparent focus:outline-none focus:ring-0"
                  />
                  <p className="font-geist text-xs text-[#6B7280] mt-2">
                    Range: ${asset.listing?.priceRange?.min ? (Number(asset.listing.priceRange.min) / 1e6).toFixed(2) : '0.00'} - ${asset.listing?.priceRange?.max ? (Number(asset.listing.priceRange.max) / 1e6).toFixed(2) : '0.00'}
                  </p>
                </div>

                {/* Error Message */}
                {bidError && (
                  <div className="p-3 bg-red-50 rounded-2xl relative">
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
                        <p className="font-geist text-sm font-medium text-red-800 mb-1">Transaction Failed</p>
                        <p className="font-geist text-xs text-red-600">{bidError}</p>

                      </div>
                    </div>
                  </div>
                )}

                {/* Status/Success Message */}
                {status && !bidError && (
                  <div className={`p-3 rounded-2xl ${status.includes('success') || status.includes('🎉')
                    ? 'bg-green-50'
                    : 'bg-blue-50'
                    }`}>
                    <div className="flex items-center gap-2">
                      {status.includes('success') || status.includes('🎉') ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                      )}
                      <p className={`font-geist text-sm ${status.includes('success') || status.includes('🎉')
                        ? 'text-green-800 font-medium'
                        : 'text-gray-800'
                        }`}>
                        {status}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bid Summary */}
                {bidAmount && pricePerToken && (
                  <div className="pt-4 border-t border-gray-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-geist text-xs text-[#6B7280]">Total Cost</span>
                      <span className="font-geist text-sm font-medium text-[#111111]">
                        ${(parseFloat(bidAmount) * parseFloat(pricePerToken)).toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-geist text-xs text-[#6B7280]">Your Balance</span>
                      <span className="font-geist text-sm font-medium text-[#111111]">
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
                    className="w-full bg-black text-white rounded-xl h-14 text-base font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Try Again</span>
                  </button>
                ) : (
                  <Button
                    onClick={handlePlaceBid}
                    disabled={
                      isLoading ||
                      !address ||
                      hasAlreadyBidded ||
                      isAuctionAnnounced || // Disable if auction is announced
                      !!(
                        asset.listing?.scheduledEndTime &&
                        new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime()
                      ) ||
                      (parseFloat(bidAmount || '0') * parseFloat(pricePerToken || '0') > parseFloat(usdcBalance) &&
                        parseFloat(bidAmount || '0') > 0 &&
                        parseFloat(pricePerToken || '0') > 0)
                    }
                    className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? 'Processing...'
                      : !address
                        ? 'Connect Wallet'
                        : isAuctionAnnounced // Display 'Auction Ended' if announced (check this FIRST)
                          ? 'Auction Ended'
                          : asset.listing?.scheduledEndTime &&
                            new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime()
                            ? 'Auction Ended'
                            : hasAlreadyBidded // Display 'Already Bidded' if true (check this AFTER auction ended)
                              ? 'Already Bidded'
                              : bidAmount &&
                                pricePerToken &&
                                parseFloat(bidAmount) * parseFloat(pricePerToken) > parseFloat(usdcBalance)
                                ? 'Insufficient Balance'
                                : 'Place Bid'}
                  </Button>
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
