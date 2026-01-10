import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronDown, ChevronUp, Filter, XCircle } from 'lucide-react';
import type { SecondaryOrder } from '../../types/marketplace.types';
import type { PortfolioAsset } from '@/lib/api/portfolio.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface TradesTableProps {
  orders: SecondaryOrder[];
  assets: PortfolioAsset[];
  isLoading: boolean;
  onCancelOrder: (orderId: string) => void;
  isCancellingId: string | null;
}

export const TradesTable = ({
  orders,
  assets,
  isLoading,
  onCancelOrder,
  isCancellingId,
}: TradesTableProps) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'FILLED' | 'CANCELLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  // const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Filter orders based on selected filters
  const filteredOrders = orders.filter(order => {
    const statusMatch = statusFilter === 'ALL' || order.status === statusFilter;
    const typeMatch = typeFilter === 'ALL' || (typeFilter === 'BUY' ? order.isBuy : !order.isBuy);
    return statusMatch && typeMatch;
  });

  const statusOptions: Array<'ALL' | 'OPEN' | 'FILLED' | 'CANCELLED'> = ['ALL', 'OPEN', 'FILLED', 'CANCELLED'];
  const typeOptions: Array<'ALL' | 'BUY' | 'SELL'> = ['ALL', 'BUY', 'SELL'];

  const getRowKey = (order: SecondaryOrder): string => {
    return order._id;
      
  };

  const toggleRowExpansion = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleConfirmCancel = () => {
    if (orderToCancel) {
      onCancelOrder(orderToCancel);
      setOrderToCancel(null);
    }
  };

  const formatTokenAmount = (weiAmount: string): string => {
    const tokens = parseFloat(weiAmount) / 1e18;
    return tokens.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const formatUSDCAmount = (amount: string): string => {
    // Price per token is in USDC (6 decimals)
    const price = parseFloat(amount) / 1e6;
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openTxHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://sepolia.mantlescan.xyz/tx/${hash}`, '_blank');
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      OPEN: 'bg-green-100 text-green-700',
      FILLED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500 mb-4">No active trades found</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-normal hover:bg-blue-700 transition-colors"
          >
            Explore Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Filter Bar */}
        <div className="sticky top-0 z-20 bg-transparent border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          {/* Type Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Type:</span>
            <div className="flex gap-2">
              {typeOptions.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${typeFilter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Status:</span>
            <div className="flex gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
            {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <span className="text-xs text-gray-500 ml-2">
                ({filteredOrders.length} of {orders.length})
              </span>
            )}
          </div>
        </div>

        <table className="w-full">
          <thead className="sticky top-[57px] bg-transparent z-10">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider w-10">
                
              </th>
              <th className="px-4 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Asset ID / Order ID
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Amount (Tokens)
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Price (USDC)
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => {
              const rowKey = getRowKey(order);
              const isExpanded = expandedRows.has(order._id);
              const totalValue = (parseFloat(order.initialAmount) / 1e18) * (parseFloat(order.pricePerToken) / 1e6);
              

              return (
                <>
                  <tr
                    key={order._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50'
                      }`}
                    onClick={(e) => toggleRowExpansion(rowKey, e)}
                  >
                    {/* Expand Icon */}
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => toggleRowExpansion(order._id, e)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${order.isBuy
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {order.isBuy ? 'BUY' : 'SELL'}
                      </span>
                    </td>

                    {/* Asset ID / Order ID */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-gellix text-sm font-medium text-foreground flex flex-col" >
                          {assets.find(a => a.assetId === order.assetId) && (
                            <span className='hover:text-blue-500' onClick={() => { navigate(`/marketplace/asset/${order.assetId}`) }}>
                              {assets.find(a => a.assetId === order.assetId)?.metadata?.assetName || 'Unknown Asset'}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {order.assetId.slice(0, 8)}...{order.assetId.slice(-4)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500  hover:text-blue-500" onClick={() => { navigate(`/trade/asset/${order.assetId}`) }}>
                          <span>Order #{order.orderId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-gellix text-sm font-normal text-foreground">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Initial: {formatTokenAmount(order.initialAmount)}</span>
                          <span>Remaining: {formatTokenAmount(order.remainingAmount)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-gellix text-sm font-normal text-foreground">
                        ${formatUSDCAmount(order.pricePerToken)}
                      </div>
                    </td>

                    {/* Total Value */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-gellix text-sm font-normal text-foreground">
                        ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-gellix text-sm font-normal text-foreground text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col gap-2 items-center">
                        {order.status === 'OPEN' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToCancel(order.orderId);
                            }}
                            disabled={isCancellingId === order.orderId}
                            className="flex items-center gap-1 px-3 py-1 bg-transparent border border-red-200 text-red-600 rounded-lg font-gellix text-xs font-medium hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {isCancellingId === order.orderId ? (
                              <div className="animate-spin h-3 w-3 border-b-2 border-red-600 rounded-full"></div>
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Cancel
                          </button>
                        )}

                        {/* Transaction Hash Links */}
                        {order.txHash && (
                          <button
                            onClick={(e) => openTxHash(order.txHash, e)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Tx</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {isExpanded && (
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <td colSpan={9} className="px-6 py-4">
                        {/* Basic Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                          {/* Token Address */}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Token Address</div>
                            <div className="font-mono text-xs">
                              {order.tokenAddress ? truncateAddress(order.tokenAddress) : 'N/A'}
                            </div>
                          </div>

                          {/* Maker Address */}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Maker Address</div>
                            <div className="font-mono text-xs">
                              {order.maker ? truncateAddress(order.maker) : 'N/A'}
                            </div>
                          </div>

                          {/* Created At */}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Created At</div>
                            <div className="text-xs">
                              {new Date(order.createdAt).toLocaleString()}
                            </div>
                          </div>

                          {/* Updated At */}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Updated At</div>
                            <div className="text-xs">
                              {new Date(order.updatedAt).toLocaleString()}
                            </div>
                          </div>
                          
                          {/* Transaction Hash */}
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
                            <div className="font-mono text-xs break-all text-gray-700">
                              {order.txHash}
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Order Cancellation</DialogTitle>
            <DialogDescription>
              This will cancel the trade order and make the remaining tokens available in your portfolio. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button className='bg-gray-200 rounded-xl text-gray-800 border border-gray-300 hover:bg-gray-300' variant="outline" onClick={() => setOrderToCancel(null)}>
              Avoid
            </Button>
            <Button className='bg-red-700 text-white border border-red-300 hover:bg-red-600 rounded-xl' variant="destructive" onClick={handleConfirmCancel}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
)}