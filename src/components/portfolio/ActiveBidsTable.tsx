// src/components/portfolio/ActiveBidsTable.tsx
import { useNavigate } from 'react-router-dom';
import type { Bid, BidStatus } from '../../types/marketplace.types';

interface ActiveBidsTableProps {
  bids: Bid[];
  isLoading: boolean;
  onSettleBid: (assetId: string, bidIndex: number, bidId: string) => void;
  isSettling: boolean;
  settlingBidId: string | null;
  settleStatus: string;
}

export const ActiveBidsTable = ({
  bids,
  isLoading,
  onSettleBid,
  isSettling,
  settlingBidId,
  settleStatus,
}: ActiveBidsTableProps) => {
  const navigate = useNavigate();

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

  const handleAuctionDetailsNavigate = (assetId: string | undefined) => {
    if (assetId) navigate(`/marketplace/auction/${assetId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500">Loading bids...</p>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500 mb-4">No auction bids yet</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-normal hover:bg-blue-700 transition-colors"
          >
            Browse Auctions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-200 text-black">
            <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Asset ID
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Tokens Requested
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Price per Token
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Total Bid
            </th>
            <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Status
            </th>
           
            <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Action
            </th>
             <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Transaction
          </th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid, index) => {
            const statusStyle = getBidStatusStyle(bid.status);
            return (
              <tr
                key={bid.bidId}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-gray-10' : 'bg-gray-50/50'
                }`}
                onClick={() => handleAuctionDetailsNavigate(bid.assetId)}
              >
                {/* Asset ID */}
                <td className="px-6 py-4">
                  <div>
                    <div className="font-gellix text-sm font-normal text-foreground">
                      {bid.assetId || bid.auctionId ? (bid.assetId || bid.auctionId).slice(0, 12) : 'Unknown'}
                    </div>
                    {bid.bidDate && (
                      <div className="font-gellix text-xs text-gray-400">
                        {new Date(bid.bidDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </td>

                {/* Tokens Requested */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    {bid.tokenAmount
                      ? (parseFloat(bid.tokenAmount) / 1e18).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : 'N/A'}
                  </div>
                </td>

                {/* Price per Token */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    {bid.price ? `$${(parseFloat(bid.price) / 1e6).toFixed(2)}` : 'N/A'}
                  </div>
                </td>

                {/* Total Bid Amount */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    {bid.usdcDeposited ? `$${(parseFloat(bid.usdcDeposited) / 1e6).toFixed(2)}` : 'N/A'}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-normal ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-center">
                  {bid.settledAt ? (
                    <span className="font-gellix text-xs text-gray-400">Settled</span>
                  ) : bid.status === 'WON' || bid.status === 'LOST' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSettleBid(
                          bid.assetId || bid.auctionId,
                          bid.bidIndex !== undefined ? bid.bidIndex : 0,
                          bid.bidId
                        );
                      }}
                      disabled={isSettling && settlingBidId === bid.bidId}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-gellix text-xs font-normal hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bid.status === 'WON' &&
                        (isSettling && settlingBidId === bid.bidId ? settleStatus : 'Claim')}
                      {bid.status === 'LOST' &&
                        (isSettling && settlingBidId === bid.bidId ? settleStatus : 'Refund')}
                    </button>
                  ) : (
                    <span className="font-gellix text-xs text-gray-400">-</span>
                  )}
                </td>
                {/* Transaction */}
                <td className="px-6 py-4 text-center">
                  {bid.txHash ? (
                    <a
                      href={`https://sepolia.mantlescan.xyz/tx/${bid.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline font-gellix text-xs font-normal"
                    >
                      View Tx
                    </a>
                  ) : (
                    <span className="font-gellix text-xs text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
