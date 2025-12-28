// src/pages/marketplace/auction/AuctionDetail.page.tsx
// 100% Script-Verified Bid Submission Flow (investor-bidding.sh)

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Clock, Users, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { useSubmitBid, useCheckKYC } from '../../../hooks/useAuctionContracts';

const AuctionDetailPage = () => {
  const { auctionId } = useParams<{ auctionId: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { currentAuction: auction, isLoadingAuctions, auctionError, fetchAuctionByAssetId } = useMarketplaceStore();

  // Contract hooks (SCRIPT-VERIFIED: investor-bidding.sh)
  const { submitBid, status, isLoading, isApproving, isSubmitting, isBidSuccess, bidHash } = useSubmitBid();
  const { isVerified: isKYCVerified } = useCheckKYC();

  const [tokenAmount, setTokenAmount] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bidParams, setBidParams] = useState<{assetId: string; tokenAmount: string; pricePerToken: string} | null>(null);
  const [isApprovingForBid, setIsApprovingForBid] = useState(false);

  // Fetch auction details
  useEffect(() => {
    if (auctionId) {
      fetchAuctionByAssetId(auctionId);
    }
  }, [auctionId, fetchAuctionByAssetId]);

  // Handle successful bid submission - redirect to portfolio
  useEffect(() => {
    if (isBidSuccess && bidHash) {
      // Redirect to portfolio after successful bid
      setTimeout(() => {
        navigate('/portfolio');
      }, 2000);
    }
  }, [isBidSuccess, bidHash, navigate]);

  // Auto-submit bid after approval is confirmed
  useEffect(() => {
    // If we were waiting for an approval to go through for the bid, and it's no longer approving,
    // it means the approval finished. Now we can submit the actual bid.
    if (isApprovingForBid && !isApproving && bidParams) {
      console.log('✅ Approval finished. Now submitting the actual bid...');
      setIsApprovingForBid(false); // Reset for next time
      submitBid(bidParams).catch((err) => {
        console.error('❌ Error submitting bid after approval:', err);
        alert(`Error submitting bid after approval: ${err.message}`);
      });
    }
  }, [isApprovingForBid, isApproving, bidParams, submitBid]);

  // Calculate time remaining
  const getTimeRemaining = (endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Auction Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Calculate estimated total cost
  const estimatedTotal = tokenAmount && maxPrice
    ? (parseFloat(tokenAmount) * parseFloat(maxPrice)).toFixed(2)
    : '0.00';

  // Handle bid submission (SCRIPT-VERIFIED: investor-bidding.sh)
  const handleSubmitBid = async () => {
    console.log('🔨 Place Bid button clicked!');
    console.log('📊 Current state:', {
      address,
      isKYCVerified,
      tokenAmount,
      maxPrice,
      reservePrice: auction?.reservePrice,
      auctionId,
    });

    // Validation with user feedback
    if (!address) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!isKYCVerified) {
      alert('You must complete KYC verification before bidding. Please contact an admin.');
      return;
    }

    if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
      alert('Please enter a valid token amount (greater than 0).');
      return;
    }

    if (!maxPrice || parseFloat(maxPrice) <= 0) {
      alert('Please enter a valid max price (greater than 0).');
      return;
    }

    if (parseFloat(maxPrice) < (auction?.reservePrice || 0)) {
      alert(`Your max price ($${maxPrice}) must be at least the reserve price ($${auction?.reservePrice.toFixed(2)})`);
      return;
    }

    if (!auctionId) {
      alert('Invalid auction ID. Please refresh the page.');
      return;
    }

    console.log('✅ All validations passed!');
    console.log('🔨 Submitting bid (investor-bidding.sh flow)');
    console.log('  → Asset ID:', auctionId);
    console.log('  → Token Amount:', tokenAmount);
    console.log('  → Max Price:', maxPrice);

    // Store bid params for backend notification after success
    const params = {
      assetId: auctionId,
      tokenAmount,
      pricePerToken: maxPrice,
    };
    setBidParams(params);

    try {
      // This will:
      // 1. Check USDC allowance
      // 2. Approve USDC if needed (investor-bidding.sh line 288)
      // 3. If approval is NOT needed, it submits the bid.
      console.log('📞 Calling submitBid...');
      const { requiresApproval } = await submitBid(params);
      console.log('✅ submitBid returned. Requires approval?', requiresApproval);
      
      if (requiresApproval) {
        console.log('⏳ Approval required. Waiting for approval transaction...');
        setIsApprovingForBid(true);
      }
    } catch (error: any) {
      console.error('❌ Bid submission error:', error);
      alert(`Error submitting bid: ${error.message || 'Unknown error'}`);
    }
  };

  if (isLoadingAuctions) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f6fbff]">
        <div className="text-center">
          <div className="text-lg font-antic text-foreground">Loading auction...</div>
        </div>
      </div>
    );
  }

  if (auctionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f6fbff]">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">Error: {auctionError}</div>
          <Button onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f6fbff]">
        <div className="text-center">
          <div className="text-lg text-foreground mb-4">Auction not found</div>
          <Button onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
        </div>
      </div>
    );
  }

  const isAuctionActive = auction.status === 'BIDDING';
  const timeRemaining = getTimeRemaining(auction.endTime);

  return (
    <div className="min-h-screen bg-[#f6fbff]">
      <div className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <button
                onClick={() => navigate('/marketplace')}
                className="font-antic text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                ← Back to Marketplace
              </button>
              <h1 className="text-4xl font-semibold text-[#111111] font-antic">
                Auction: {auction.assetId}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-antic font-medium ${
                    isAuctionActive
                      ? 'bg-green-100 text-green-700'
                      : auction.status === 'ENDED'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {auction.status}
                </span>
                {isAuctionActive && (
                  <span className="flex items-center gap-2 text-blue-600 font-antic text-sm">
                    <Clock className="w-4 h-4" />
                    {timeRemaining}
                  </span>
                )}
              </div>
            </div>

            {/* Auction Stats */}
            <div className="bg-[#EBF0E8] rounded-3xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-[#6B7280] font-antic mb-1">Reserve Price</p>
                  <p className="text-2xl font-semibold text-[#111111] font-antic">
                    ${auction.reservePrice.toFixed(2)}
                  </p>
                </div>
                {auction.clearingPrice && (
                  <div>
                    <p className="text-sm text-[#6B7280] font-antic mb-1">Clearing Price</p>
                    <p className="text-2xl font-semibold text-green-600 font-antic">
                      ${auction.clearingPrice.toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-[#6B7280] font-antic mb-1">Total Supply</p>
                  <p className="text-2xl font-semibold text-[#111111] font-antic">
                    {auction.totalSupply.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] font-antic mb-1">Total Bids</p>
                  <p className="text-2xl font-semibold text-[#111111] font-antic flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    {auction.totalBids}
                  </p>
                </div>
              </div>

              {/* Live Demand Indicator */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-antic text-sm text-[#6B7280]">Total Demand</span>
                  <span className="font-antic text-lg font-semibold text-[#111111]">
                    {auction.totalDemand.toLocaleString()} tokens
                  </span>
                </div>
                <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((auction.totalDemand / auction.totalSupply) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-antic text-xs text-[#6B7280]">
                    {((auction.totalDemand / auction.totalSupply) * 100).toFixed(0)}% of supply
                  </span>
                  {auction.totalDemand > auction.totalSupply && (
                    <span className="font-antic text-xs text-orange-600 font-medium">
                      Oversubscribed!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Details (if metadata available) */}
            {auction.metadata && (
              <div className="bg-white rounded-3xl p-6">
                <h2 className="text-2xl font-semibold text-[#111111] font-antic mb-4">
                  Asset Details
                </h2>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1">
                    <p className="text-[#6B7280] font-antic">Invoice Number</p>
                    <p className="font-medium text-[#111111] font-antic">
                      {auction.metadata.invoiceNumber}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#6B7280] font-antic">Face Value</p>
                    <p className="font-medium text-[#111111] font-antic">
                      {auction.metadata.currency} {parseFloat(auction.metadata.faceValue).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#6B7280] font-antic">Industry</p>
                    <p className="font-medium text-[#111111] font-antic">
                      {auction.metadata.industry}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#6B7280] font-antic">Risk Tier</p>
                    <p className="font-medium text-[#111111] font-antic capitalize">
                      {auction.metadata.riskTier}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#6B7280] font-antic">Due Date</p>
                    <p className="font-medium text-[#111111] font-antic">
                      {new Date(auction.metadata.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#6B7280] font-antic">Buyer</p>
                    <p className="font-medium text-[#111111] font-antic">
                      {auction.metadata.buyerName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auction Timeline */}
            <div className="bg-white rounded-3xl p-6">
              <h2 className="text-2xl font-semibold text-[#111111] font-antic mb-4">
                Auction Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-antic text-sm font-medium text-[#111111]">Auction Started</p>
                    <p className="font-antic text-xs text-[#6B7280]">
                      {new Date(auction.startTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${isAuctionActive ? 'bg-gray-300' : 'bg-yellow-500'}`} />
                  <div>
                    <p className="font-antic text-sm font-medium text-[#111111]">Auction Ends</p>
                    <p className="font-antic text-xs text-[#6B7280]">
                      {new Date(auction.endTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!isAuctionActive && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-antic text-sm font-medium text-[#111111]">Settlement Phase</p>
                      <p className="font-antic text-xs text-[#6B7280]">
                        Winners can claim tokens
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sticky Bid Panel */}
          <div className="relative">
            <div className="sticky top-12">
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-[#111111] font-antic mb-6">
                  {isAuctionActive ? 'Place Bid' : 'Auction Closed'}
                </h2>

                {!isAuctionActive ? (
                  <div className="text-center py-8">
                    <p className="font-antic text-[#6B7280] mb-4">
                      This auction has ended. Check your portfolio for bid results.
                    </p>
                    <Button
                      onClick={() => navigate('/portfolio')}
                      className="bg-black text-white rounded-xl h-12 px-6 font-antic"
                    >
                      View My Bids
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Token Amount Input */}
                    <div className="bg-[#F3F4F6] rounded-2xl p-4">
                      <label htmlFor="token-amount" className="text-xs text-[#6B7280] font-antic">
                        Tokens to buy
                      </label>
                      <Input
                        id="token-amount"
                        type="number"
                        placeholder="10000"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                        className="bg-transparent border-none text-2xl font-medium text-[#111111] font-antic p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    {/* Max Price Input */}
                    <div className="bg-[#F3F4F6] rounded-2xl p-4">
                      <label htmlFor="max-price" className="text-xs text-[#6B7280] font-antic">
                        Max price per token
                      </label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-[#6B7280]" />
                        <Input
                          id="max-price"
                          type="number"
                          step="0.01"
                          placeholder={auction.reservePrice.toFixed(2)}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="bg-transparent border-none text-2xl font-medium text-[#111111] font-antic p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      <p className="text-xs text-[#6B7280] font-antic mt-1">
                        Min: ${auction.reservePrice.toFixed(2)}
                      </p>
                    </div>

                    {/* Estimated Total */}
                    <div className="bg-[#F3F4F6] rounded-2xl p-4">
                      <label className="text-xs text-[#6B7280] font-antic">
                        Maximum cost (will lock USDC)
                      </label>
                      <p className="text-2xl font-medium text-[#111111] font-antic">
                        ${estimatedTotal} USDC
                      </p>
                      <p className="text-xs text-[#6B7280] font-antic mt-1">
                        Excess will be refunded after clearing
                      </p>
                    </div>

                    {/* KYC Status */}
                    {address && (
                      <div className="text-xs text-[#6B7280] font-antic">
                        <div className="flex items-center gap-2">
                          <span>KYC Status:</span>
                          {isKYCVerified ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <XCircle className="w-4 h-4" />
                              Not Verified (Contact Admin)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Message */}
                    {status && (
                      <div
                        className={`text-sm p-3 rounded-lg font-antic ${
                          status.includes('successfully')
                            ? 'bg-green-100 text-green-800'
                            : status.includes('Error') || status.includes('failed')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {status}
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitBid}
                      disabled={isLoading || !address || !isKYCVerified}
                      className="w-full bg-black text-white rounded-xl h-14 text-base font-medium font-antic disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApproving
                        ? 'Approving USDC...'
                        : isSubmitting
                        ? 'Submitting Bid...'
                        : !address
                        ? 'Connect Wallet'
                        : !isKYCVerified
                        ? 'KYC Required'
                        : 'Place Bid'}
                    </Button>

                    {/* Info Note */}
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 font-antic">
                      <p className="font-semibold mb-1">ℹ️ How bidding works:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Your USDC will be locked (not spent yet)</li>
                        <li>After auction ends, clearing price is set</li>
                        <li>If your bid wins, claim tokens at clearing price</li>
                        <li>Excess USDC is refunded automatically</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailPage;
