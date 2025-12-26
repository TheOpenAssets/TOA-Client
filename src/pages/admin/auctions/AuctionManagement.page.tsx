// src/pages/admin/auctions/AuctionManagement.page.tsx

import { useEffect, useState } from 'react';
import { Package, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { marketplaceService } from '../../../lib/api/marketplace.service';
import type { CreateAuctionPayload } from '../../../types/marketplace.types';

const AuctionManagementPage = () => {
  const { auctions, isLoadingAuctions, fetchActiveAuctions, fetchEndedAuctions } = useMarketplaceStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'ended'>('active');

  // Create auction form state
  const [createForm, setCreateForm] = useState<CreateAuctionPayload>({
    assetId: '',
    totalSupply: 0,
    reservePrice: 0,
    duration: 259200, // 72 hours in seconds
  });
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // End auction form state
  const [clearingPrice, setClearingPrice] = useState('');
  const [endStatus, setEndStatus] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    // Fetch auctions based on view mode (SCRIPT-VERIFIED)
    console.log('🔍 Admin: Fetching auctions...');
    console.log('  → GET /announcements?type=AUCTION_LIVE&status=ACTIVE');
    console.log('  → Then GET /assets/:assetId for each');
    if (viewMode === 'active') {
      fetchActiveAuctions();
    } else {
      fetchEndedAuctions();
    }
  }, [fetchActiveAuctions, fetchEndedAuctions, viewMode]);

  const handleCreateAuction = async () => {
    setCreateStatus('⚠️ AUCTION CREATION NOTE:');
    setCreateStatus(
      'Auctions are created via the admin-approve.sh workflow:\n' +
      '1. POST /admin/compliance/approve\n' +
      '2. POST /admin/assets/:assetId/register (on-chain)\n' +
      '3. POST /admin/assets/deploy-token (on-chain)\n' +
      '4. POST /admin/compliance/schedule-auction\n\n' +
      'Use the Compliance tab to approve assets for auction.'
    );

    // Note: createAuction() endpoint doesn't exist in scripts
    // Real flow is: approve → register → deploy → schedule
    return;
  };

  const handleEndAuction = async () => {
    if (!selectedAuction || !clearingPrice || parseFloat(clearingPrice) <= 0) {
      setEndStatus('Please enter a valid clearing price');
      return;
    }

    setIsEnding(true);
    setEndStatus('⚠️ This requires on-chain transaction first!');

    // Note: According to admin-endauction.sh, the correct flow is:
    // 1. Call PrimaryMarketplace.endAuction(assetIdBytes32, clearingPriceWei) on-chain
    // 2. Then POST /admin/compliance/end-auction with { assetId, clearingPrice (wei), txHash }

    setEndStatus(
      'Ending auction requires:\n' +
      '1. ON-CHAIN: PrimaryMarketplace.endAuction(assetId, clearingPrice)\n' +
      '2. POST /admin/compliance/end-auction (with tx hash)\n\n' +
      'Use admin-endauction.sh script or implement contract integration.'
    );

    setIsEnding(false);
    return;

    // TODO: Implement contract call integration
    // const clearingPriceWei = parseFloat(clearingPrice) * 1e6; // USDC has 6 decimals
    // 1. Call contract.endAuction()
    // 2. Wait for tx
    // 3. Call backend notification
    // await marketplaceService.endAuction(selectedAuction, clearingPriceWei.toString(), txHash);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'BIDDING':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'ENDED':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 'SETTLED':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'CANCELLED':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeRemaining = (endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-antic text-3xl font-normal text-foreground">
            Auction Management
          </h2>
          <p className="font-inter text-sm text-foreground/70 mt-1">
            Create and manage RWA token auctions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-foreground text-white rounded-xl font-inter text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Create New Auction
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">
              Active Auctions
            </p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {auctions.filter((a) => a.status === 'BIDDING').length}
          </p>
        </div>

        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">
              Ended Auctions
            </p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {auctions.filter((a) => a.status === 'ENDED').length}
          </p>
        </div>

        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">
              Total Auctions
            </p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {auctions.length}
          </p>
        </div>

        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">
              Total Bids
            </p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {auctions.reduce((sum, a) => sum + a.totalBids, 0)}
          </p>
        </div>
      </div>

      {/* Auctions List */}
      <div
        className="rounded-2xl p-8 shadow-lg"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
      >
        <h3 className="font-antic text-2xl font-normal text-foreground mb-6">All Auctions</h3>

        {isLoadingAuctions ? (
          <div className="text-center py-8 text-foreground/60">Loading auctions...</div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-8 text-foreground/60">
            No auctions created yet. Create your first auction above.
          </div>
        ) : (
          <div className="space-y-4">
            {auctions.map((auction) => {
              const statusStyle = getStatusStyle(auction.status);
              return (
                <div
                  key={auction.auctionId}
                  className="bg-white rounded-xl p-6 hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-antic text-lg font-medium text-foreground">
                          {auction.assetId}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {auction.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm mt-4">
                        <div>
                          <p className="font-inter text-foreground/60 mb-1">Total Supply</p>
                          <p className="font-inter font-medium text-foreground">
                            {auction.totalSupply.toLocaleString()} tokens
                          </p>
                        </div>
                        <div>
                          <p className="font-inter text-foreground/60 mb-1">Reserve Price</p>
                          <p className="font-inter font-medium text-foreground">
                            ${auction.reservePrice.toFixed(2)}
                          </p>
                        </div>
                        {auction.clearingPrice && (
                          <div>
                            <p className="font-inter text-foreground/60 mb-1">Clearing Price</p>
                            <p className="font-inter font-medium text-green-600">
                              ${auction.clearingPrice.toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="font-inter text-foreground/60 mb-1">Total Bids</p>
                          <p className="font-inter font-medium text-foreground">
                            {auction.totalBids}
                          </p>
                        </div>
                        <div>
                          <p className="font-inter text-foreground/60 mb-1">Total Demand</p>
                          <p className="font-inter font-medium text-foreground">
                            {auction.totalDemand.toLocaleString()} tokens
                          </p>
                        </div>
                        <div>
                          <p className="font-inter text-foreground/60 mb-1">Start Time</p>
                          <p className="font-inter font-medium text-foreground text-xs">
                            {formatTime(auction.startTime)}
                          </p>
                        </div>
                        <div>
                          <p className="font-inter text-foreground/60 mb-1">
                            {auction.status === 'BIDDING' ? 'Time Remaining' : 'End Time'}
                          </p>
                          <p className="font-inter font-medium text-foreground text-xs">
                            {auction.status === 'BIDDING'
                              ? getTimeRemaining(auction.endTime)
                              : formatTime(auction.endTime)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      {auction.status === 'BIDDING' && (
                        <button
                          onClick={() => {
                            setSelectedAuction(auction.auctionId);
                            setShowEndModal(true);
                          }}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-inter text-sm font-medium hover:bg-yellow-700 transition-colors"
                        >
                          End Auction
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Auction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="font-antic text-2xl font-semibold text-foreground mb-6">
              Create New Auction
            </h3>

            <div className="space-y-4">
              <div>
                <label className="font-inter text-sm text-foreground/70 mb-1 block">
                  Asset ID
                </label>
                <input
                  type="text"
                  placeholder="INV-001"
                  value={createForm.assetId}
                  onChange={(e) => setCreateForm({ ...createForm, assetId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-inter text-sm text-foreground/70 mb-1 block">
                  Total Supply (tokens)
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  value={createForm.totalSupply || ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, totalSupply: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-inter text-sm text-foreground/70 mb-1 block">
                  Reserve Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.88"
                  value={createForm.reservePrice || ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, reservePrice: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-inter text-sm text-foreground/70 mb-1 block">
                  Duration (hours)
                </label>
                <select
                  value={createForm.duration}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, duration: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={86400}>24 hours</option>
                  <option value={172800}>48 hours</option>
                  <option value={259200}>72 hours</option>
                  <option value={604800}>7 days</option>
                </select>
              </div>

              {createStatus && (
                <div
                  className={`text-sm p-3 rounded-lg font-inter ${
                    createStatus.includes('successfully')
                      ? 'bg-green-100 text-green-800'
                      : createStatus.includes('Error')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {createStatus}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateStatus(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAuction}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-foreground text-white rounded-lg font-inter text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Auction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Auction Modal */}
      {showEndModal && selectedAuction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="font-antic text-2xl font-semibold text-foreground mb-6">
              End Auction
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-inter text-sm text-foreground/70 mb-1">Auction ID</p>
                <p className="font-antic text-lg font-medium text-foreground">
                  {auctions.find((a) => a.auctionId === selectedAuction)?.assetId}
                </p>
              </div>

              <div>
                <label className="font-inter text-sm text-foreground/70 mb-1 block">
                  Clearing Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.90"
                  value={clearingPrice}
                  onChange={(e) => setClearingPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="font-inter text-xs text-foreground/60 mt-1">
                  Price at which tokens will be allocated to winners
                </p>
              </div>

              {endStatus && (
                <div
                  className={`text-sm p-3 rounded-lg font-inter ${
                    endStatus.includes('successfully')
                      ? 'bg-green-100 text-green-800'
                      : endStatus.includes('Error')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {endStatus}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEndModal(false);
                    setSelectedAuction(null);
                    setClearingPrice('');
                    setEndStatus(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-inter text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
                  disabled={isEnding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndAuction}
                  disabled={isEnding}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-inter text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  {isEnding ? 'Ending...' : 'End Auction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionManagementPage;
