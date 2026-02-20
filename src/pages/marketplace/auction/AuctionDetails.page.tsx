// src/pages/marketplace/auction/AuctionDetails.page.tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parseTokenAmount } from '../../../lib/utils/formatters';
// import { useAccount } from 'wagmi'; // Removed
import { Clock } from 'lucide-react';
import { useAuthStrategy } from '../../../lib/auth/AuthStrategyContext';
import { useNetwork } from '../../../lib/network/NetworkContext';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { useSubmitBid } from '../../../hooks/useAuctionContracts';
import { contractService } from '../../../lib/api/contract.service';
import { marketplaceService } from '../../../lib/api/marketplace.service';
import { trustlineService } from '../../../lib/api/trustline.service';
import { stellarService } from '../../../lib/api/stellar.service';
import { Button } from '../../../components/ui/button';
import { ShaderAnimation } from '../../../components/ui/shimmer-lines';
import { PageLoader } from '../../../components/ui/page-loader';

const AuctionDetailsPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { address } = useAuthStrategy();
  const { networkType, networkPath } = useNetwork();
  const isEvm = networkType === 'mantle';
  const { currentAsset: asset, isLoadingAsset, error, fetchAssetDetails } = useMarketplaceStore();

  const [bidAmount, setBidAmount] = useState('');
  const [pricePerToken, setPricePerToken] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [hasAlreadyBidded, setHasAlreadyBidded] = useState(false);

  // Trustline State
  const [isCheckingTrust, setIsCheckingTrust] = useState(false);
  const [needsTrustline, setNeedsTrustline] = useState(false);
  const [isAddingTrust, setIsAddingTrust] = useState(false);
  const [trustlineError, setTrustlineError] = useState<string | null>(null);
  const [trustlineStatus, setTrustlineStatus] = useState<'APPROVED' | 'PENDING' | 'NOT_REQUESTED' | 'checking' | null>(null);

  // Stellar Bidding State
  const [isStellarSubmitting, setIsStellarSubmitting] = useState(false);
  const [stellarStatus, setStellarStatus] = useState<string | null>(null);
  const [stellarError, setStellarError] = useState<string | null>(null);

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
        if (!isEvm) return; // Only fetch USDC balance on EVM
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

  // Check Stellar Trustline
  const checkStellarTrustline = useCallback(async () => {
    if (isEvm || !address || !asset?.assetId) return;

    try {
      setIsCheckingTrust(true);
      setTrustlineError(null);

      console.log(`Checking trustline eligibility for asset ${asset.assetId}...`);
      const response = await trustlineService.checkAbilityToBuy(asset.assetId);
      console.log('Trustline capability response:', response);

      setTrustlineStatus(response.trustlineStatus);
      // If NOT_REQUESTED or PENDING, we need trustline (or approval)
      // If APPROVED, we don't need trustline action
      setNeedsTrustline(!response.canBuy);

      if (!response.canBuy && response.reason) {
        console.log('Cannot buy reason:', response.reason);
      }

    } catch (err) {
      console.error('Error checking trustline:', err);
      // Fallback: check on-chain directly if backend fails? 
      // For now, let's stick to backend as source of truth for "permission"
    } finally {
      setIsCheckingTrust(false);
    }
  }, [isEvm, address, asset]);

  useEffect(() => {
    checkStellarTrustline();
  }, [checkStellarTrustline]);

  const handleAddTrustline = async () => {
    if (!address || !asset?.token?.address || !asset?.assetId) return;

    try {
      setIsAddingTrust(true);
      setTrustlineError(null);
      const [code, issuer] = asset.token.address.split(':');

      if (!code || !issuer) {
        throw new Error('Invalid token address format');
      }

      console.log(`Adding trustline on-chain for ${code}...`);
      // 1. Execute on-chain transaction
      const txHash = await stellarService.addTrustline(address, code, issuer);
      console.log('Trustline added on-chain. Hash:', txHash);

      // 2. Notify backend
      console.log('Notifying backend...');
      await trustlineService.notifyTrustlineAdded({
        txHash: txHash,
        assetId: asset.assetId,
        network: 'stellar',
      });

      // 3. Re-check status
      await checkStellarTrustline();

    } catch (err: any) {
      console.error('Failed to add trustline:', err);
      setTrustlineError(err.message || 'Failed to add trustline');
    } finally {
      setIsAddingTrust(false);
    }
  };

  // Check for existing bids
  useEffect(() => {
    if (address && assetId) {
      const checkForExistingBids = async () => {
        try {
          const myBids = await marketplaceService.getUserBids();
          // Check for any active bid (PENDING, PLACED, or FINALIZED) for this asset
          const hasBid = myBids.some(bid =>
            bid.assetId === assetId &&
            (bid.status === 'PENDING' || bid.status === 'PLACED' || bid.status === 'FINALIZED')
          );

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

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'PENDING':
        return 'Trustline Pending...';
      case 'NOT_REQUESTED':
      default:
        return 'Add Trustline';
    }
  };

  const submitStellarBid = async (params: { assetId: string, tokenAmount: string, pricePerToken: string }) => {
    if (!address || !asset?.token?.address) {
      setStellarError("Wallet not connected or asset token unavailable");
      return;
    }

    try {
      setIsStellarSubmitting(true);
      setStellarStatus('Submitting bid to Stellar network...');
      setStellarError(null);

      const [code] = asset.token.address.split(':');

      // 1. Submit on-chain
      const result = await stellarService.submitBid(
        address,
        code,
        params.tokenAmount,
        params.pricePerToken
      );

      setStellarStatus('Bid submitted! Waiting for confirmation (6s)...');
      console.log('Stellar bid tx:', result.txHash);

      const tokenAmountFormatted = parseFloat(params.tokenAmount).toFixed(4);
      const priceFormatted = parseFloat(params.pricePerToken).toFixed(4);

      // Wait 6 seconds for propagation
      await new Promise(r => setTimeout(r, 6000));

      setStellarStatus('Notifying backend...');

      await marketplaceService.notifyBidPlaced({
        txHash: result.txHash,
        assetId: params.assetId,
        tokenAmount: tokenAmountFormatted,
        price: priceFormatted,
        network: 'stellar'
      });

      setStellarStatus('Bid placed successfully! 🎉');

      // Refresh after delay
      setTimeout(() => {
        navigate(networkPath('/portfolio'));
      }, 2000);

    } catch (err: any) {
      console.error('Stellar bid error:', err);
      setStellarError(err.message || 'Failed to place Stellar bid');
      setStellarStatus(null);
    } finally {
      setIsStellarSubmitting(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!assetId || !bidAmount || !pricePerToken) {
      alert('Please fill in all bid fields');
      return;
    }

    if (!isEvm) {
      await submitStellarBid({
        assetId,
        tokenAmount: bidAmount,
        pricePerToken: pricePerToken
      });
      return;
    }

    // EVM Flow
    await submitBid({
      assetId: assetId,
      tokenAmount: bidAmount,
      pricePerToken: pricePerToken,
    });
  };

  if (isLoadingAsset) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageLoader text='' />
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
            onClick={() => navigate(networkPath('/marketplace'))}
            variant="outline"
            size="lg"
            className="bg-black/20 border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-md min-w-[200px]"
          >
            Let's try again !
          </Button>
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
            onClick={() => navigate(networkPath('/marketplace'))}
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
          onClick={() => navigate(networkPath('/'))}
        />
        <div className="flex flex-row items-center justify-end w-full gap-10 mr-10">
          {/* Center: Navigation */}
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate(networkPath('/portfolio'))}
              className="font-geist border border-gray-200 text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
            >
              Portfolio
            </button>
            <div className='relative group'>
              <button
                className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-gray-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl cursor-not-allowed "
              >
                Trade
              </button>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                Coming Soon
              </div>
            </div>
            <div className='relative group'>
              <button
                className="font-gellix border border-gray-200 text-sm font-medium text-foreground hover:text-gray-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl cursor-not-allowed"
              >
                Borrow
              </button>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                Coming Soon
              </div>
            </div>
          </nav>

          {/* Right: Wallet Display */}
          <div className="flex items-center gap-3">
            {address ? (
              <div className="px-6 py-2 bg-white rounded-lg font-mono text-sm font-medium text-foreground">
                {truncateAddress(address)}
              </div>
            ) : (
              <button
                onClick={() => navigate(networkPath('/auth'))}
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
                    {asset.tokenParams.totalSupply ? parseTokenAmount(asset.tokenParams.totalSupply, 18).toLocaleString() : '0'} tokens
                  </p>
                </div>
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">{isAuctionAnnounced ? 'Clearing Price' : 'Reserve Price'}</p>
                  <p className={`font-geist text-lg font-medium ${isAuctionAnnounced ? 'text-green-600' : 'text-[#111111]'}`}>
                    ${isAuctionAnnounced && asset.listing?.clearingPrice
                      ? parseTokenAmount(asset.listing.clearingPrice, 6).toFixed(2)
                      : asset.listing?.reservePrice
                        ? parseTokenAmount(asset.listing.reservePrice, 6).toFixed(2)
                        : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="font-geist text-xs text-[#6B7280] mb-1">Bid Range</p>
                  <p className="font-geist text-lg font-medium text-[#111111]">
                    ${asset.listing?.priceRange?.min ? parseTokenAmount(asset.listing.priceRange.min, 6).toFixed(2) : '0.00'} - ${asset.listing?.priceRange?.max ? parseTokenAmount(asset.listing.priceRange.max, 6).toFixed(2) : '0.00'}
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
                          ? ` Final clearing price: $${parseTokenAmount(asset.listing.clearingPrice, 6).toFixed(2)} per token.`
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
                    min={asset.tokenParams?.minInvestment ? parseTokenAmount(asset.tokenParams.minInvestment, 18).toString() : '0'}
                    max={asset.tokenParams?.totalSupply ? parseTokenAmount(asset.tokenParams.totalSupply, 18).toString() : '0'}
                    step="0.1"
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
                        const available = parseTokenAmount(asset.tokenParams?.totalSupply, 18);
                        const minBid = parseTokenAmount(asset.tokenParams?.minInvestment, 18);
                        const effectiveMin = Math.min(minBid, available);

                        if (numValue < effectiveMin) {
                          setBidAmount(effectiveMin.toString());
                        } else if (numValue > available) {
                          setBidAmount(available.toString());
                        }
                      }
                    }}
                    className="w-full border-none text-2xl font-medium text-[#111111] p-0 h-auto bg-transparent focus:outline-none focus:ring-0"
                  />
                  <p className="font-geist text-xs text-[#6B7280] mt-2">
                    Min: {asset.tokenParams?.minInvestment && asset.tokenParams?.totalSupply
                      ? Math.min(parseTokenAmount(asset.tokenParams.minInvestment, 18), parseTokenAmount(asset.tokenParams.totalSupply, 18)).toFixed(2)
                      : '0.00'} · Available: {asset.tokenParams?.totalSupply ? parseTokenAmount(asset.tokenParams.totalSupply, 18).toFixed(2) : '0.00'}
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
                    placeholder="0.0000"
                    value={pricePerToken}
                    disabled={isAuctionAnnounced || !!(asset.listing?.scheduledEndTime && new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime())}
                    min={(() => {
                      const val = parseTokenAmount(asset.listing?.priceRange?.min || '0', 6);
                      return val.toString();
                    })()}
                    max={(() => {
                      const val = parseTokenAmount(asset.listing?.priceRange?.max || '0', 6);
                      return val.toString();
                    })()}
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
                        const minPrice = parseTokenAmount(asset.listing?.priceRange?.min || '0', 6);
                        const maxPrice = parseTokenAmount(asset.listing?.priceRange?.max || '0', 6) || Infinity;

                        if (numValue < minPrice) {
                          setPricePerToken(minPrice.toString());
                        } else if (numValue > maxPrice) {
                          setPricePerToken(maxPrice.toString());
                        }
                      }
                    }}
                    className="w-full border-none text-2xl font-medium text-[#111111] p-0 h-auto bg-transparent focus:outline-none focus:ring-0"
                  />
                  <p className="font-geist text-xs text-[#6B7280] mt-2">
                    Range: ${(() => {
                      const val = parseTokenAmount(asset.listing?.priceRange?.min || '0', 6);
                      return val.toFixed(4);
                    })()} - ${(() => {
                      const val = parseTokenAmount(asset.listing?.priceRange?.max || '0', 6);
                      return val.toFixed(4);
                    })()}
                  </p>
                </div>

                {/* Error Message */}
                {(bidError || trustlineError || stellarError) && (
                  <div className="p-3 bg-red-50 rounded-2xl relative">
                    <button
                      onClick={() => { reset(); setTrustlineError(null); setStellarError(null); }}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                    <div className="flex items-start gap-2 pr-6">
                      <span className="text-red-500 text-lg mt-0.5">⚠️</span>
                      <div>
                        <p className="font-geist text-sm font-medium text-red-800 mb-1">Transaction Failed</p>
                        <p className="font-geist text-xs text-red-600">{bidError || trustlineError || stellarError}</p>

                      </div>
                    </div>
                  </div>
                )}

                {/* Status/Success Message */}
                {(status || stellarStatus) && !(bidError || stellarError) && (
                  <div className={`p-3 rounded-2xl ${(status && (status.includes('success') || status.includes('🎉'))) ||
                    (stellarStatus && (stellarStatus.includes('success') || stellarStatus.includes('🎉')))
                    ? 'bg-green-50'
                    : 'bg-blue-50'
                    }`}>
                    <div className="flex items-center gap-2">
                      {
                        (status && (status.includes('success') || status.includes('🎉'))) ||
                          (stellarStatus && (stellarStatus.includes('success') || stellarStatus.includes('🎉'))) ? (
                          <span className="text-green-600 text-sm">✓</span>
                        ) : (
                          <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                        )}
                      <p className={`font-geist text-sm ${(status && (status.includes('success') || status.includes('🎉'))) ||
                        (stellarStatus && (stellarStatus.includes('success') || stellarStatus.includes('🎉')))
                        ? 'text-green-800 font-medium'
                        : 'text-gray-800'
                        }`}>
                        {status || stellarStatus}
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
                    {!isEvm ? null : (
                      <div className="flex items-center justify-between">
                        <span className="font-geist text-xs text-[#6B7280]">Your Balance</span>
                        <span className="font-geist text-sm font-medium text-[#111111]">
                          ${parseFloat(usdcBalance).toFixed(2)} USDC
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Place Bid / Retry Button / Add Trustline */}
                {bidError || stellarError ? (
                  <button
                    onClick={() => {
                      reset();
                      setStellarError(null);
                      setStellarStatus(null);
                      handlePlaceBid();
                    }}
                    className="w-full bg-black text-white rounded-xl h-14 text-base font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Try Again</span>
                  </button>
                ) : !isEvm && isCheckingTrust ? (
                  <Button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      <span>Checking Trustline...</span>
                    </span>
                  </Button>
                ) : !isEvm && needsTrustline ? (
                  <div className="space-y-3">
                    {trustlineStatus === 'PENDING' ? (
                      <div className="w-full bg-yellow-50 text-yellow-800 rounded-xl p-4 border border-yellow-200 text-center">
                        <p className="font-medium">Trustline Approval Pending</p>
                        <p className="text-sm mt-1">Your request is being reviewed by an admin.</p>
                      </div>
                    ) : (
                      <>
                        <Button
                          onClick={handleAddTrustline}
                          disabled={isAddingTrust || isCheckingTrust}
                          className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
                        >
                          {isAddingTrust ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full"></div>
                              <span>Adding Trustline...</span>
                            </span>
                          ) : (
                            getStatusLabel(trustlineStatus)
                          )}
                        </Button>
                        <p className="text-xs text-center text-gray-500">
                          You must establish a trustline for this asset before bidding.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={handlePlaceBid}
                    disabled={
                      isLoading || isStellarSubmitting ||
                      (!isEvm && !address) || // Allow Stellar if trustline OK
                      (isEvm && (!address || hasAlreadyBidded ||
                        parseFloat(bidAmount || '0') * parseFloat(pricePerToken || '0') > parseFloat(usdcBalance))) ||
                      isAuctionAnnounced || // Disable if auction is announced
                      !!(
                        asset.listing?.scheduledEndTime &&
                        new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime()
                      )
                    }
                    className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading || isStellarSubmitting
                      ? 'Processing...'
                      : !address
                        ? 'Connect Wallet'
                        : isAuctionAnnounced
                          ? 'Auction Ended'
                          : asset.listing?.scheduledEndTime &&
                            new Date(asset.listing.scheduledEndTime).getTime() <= new Date().getTime()
                            ? 'Auction Ended'
                            : hasAlreadyBidded
                              ? 'Already Bidded'
                              : isEvm && bidAmount &&
                                pricePerToken &&
                                parseFloat(bidAmount) * parseFloat(pricePerToken) > parseFloat(usdcBalance)
                                ? 'Insufficient Balance'
                                : !isEvm
                                  ? 'Place Bid (Stellar)'
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
