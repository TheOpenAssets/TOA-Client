// src/components/portfolio/MyAssetsTable.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface AssetMetadata {
  assetName?: string;
  industry?: string;
  riskTier?: string;
  positionType?: string;
}

interface YieldInfo {
  settlementDistributed?: boolean;
  claimableYield?: string;
  claimableYieldFormatted?: string;
  settlementDate?: string;
  settlementId?: string;
  yieldClaimTxHash?: string;
}

interface LeverageInfo {
  type: 'ACTIVE' | 'SETTLED';
  stARBCollateralFormatted: string;
  usdcBorrowedFormatted: string;
  healthFactorFormatted?: string;
  healthStatus?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  totalInterestPaidFormatted: string;
  claimableYield?: string;
  claimableYieldFormatted?: string;
  userYield?: string;
  userYieldFormatted?: string;
  stARBReturned?: string;
  stARBReturnedFormatted?: string;
  settlementTxHash?: string;
  settlementDate?: string;
}

interface TransactionHistory {
  date: string;
  type: 'PRIMARY_PURCHASE' | 'SECONDARY_BUY' | 'SECONDARY_SELL' | 'ORDER_LOCK' | 'ORDER_UNLOCK';
  amount: string;
  amountFormatted: string;
  price: string;
  priceFormatted: string;
  totalValue: string;
  totalValueFormatted: string;
  investmentDelta: string;
  investmentDeltaFormatted: string;
  runningTokenBalance: string;
  runningInvestment: string;
  avgCostPerToken: string;
  txHash?: string;
  source: string;
}

interface PortfolioAsset {
  purchaseType: 'STATIC' | 'LEVERAGE';
  assetId: string;
  positionId?: number;
  tokenAddress?: string;
  totalAmount: string;
  totalInvested?: string;
  status: string;
  purchaseCount?: number;
  firstPurchase?: string;
  lastPurchase?: string;
  createdAt?: string;
  metadata?: AssetMetadata;
  yieldInfo?: YieldInfo;
  transactionHistory?: TransactionHistory[];
  // Leverage-specific fields
  stARBCollateral?: string;
  usdcBorrowed?: string;
  healthFactor?: number;
  healthStatus?: string;
  totalInterestPaid?: string;
  lastHarvestTime?: string;
  settlementTxHash?: string;
  leverageInfo?: LeverageInfo;
}

interface MyAssetsTableProps {
  assets: PortfolioAsset[];
  onClaimYield: (assetId: string) => void;
  claimingAssetId: string | null;
  claimStatus: string;
}

export const MyAssetsTable = ({
  assets,
  onClaimYield,
  claimingAssetId,
  claimStatus,
}: MyAssetsTableProps) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED' | 'CONFIRMED' | 'CLAIMED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STATIC' | 'LEVERAGE'>('ALL');

  // Filter assets based on selected filters
  const filteredAssets = assets.filter(asset => {
    const statusMatch = statusFilter === 'ALL' || asset.status === statusFilter;
    const typeMatch = typeFilter === 'ALL' || asset.purchaseType === typeFilter;
    return statusMatch && typeMatch;
  });

  const statusOptions: Array<'ALL' | 'ACTIVE' | 'SETTLED' | 'CONFIRMED' | 'CLAIMED'> = [
    'ALL', 'ACTIVE', 'SETTLED', 'CONFIRMED', 'CLAIMED'
  ];

  const typeOptions: Array<'ALL' | 'STATIC' | 'LEVERAGE'> = ['ALL', 'STATIC', 'LEVERAGE'];

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

  const getRowKey = (asset: PortfolioAsset): string => {
    return asset.purchaseType === 'LEVERAGE' && asset.positionId
      ? `${asset.assetId}-${asset.positionId}`
      : asset.assetId;
  };

  const formatTokenAmount = (weiAmount: string): string => {
    // If it's already canonical (e.g. "100.0000" or small number), don't divide by 1e18
    const val = parseFloat(weiAmount);
    // Heuristic: if val < 1e12 and has decimals or is clearly not wei, use as is.
    // 1e18 wei = 1 token. A normal balance of 1,000,000 tokens is 1e24 wei.
    // So anything < 1e12 is definitely canonical.
    if (weiAmount.includes('.') || val < 1e12) {
      return val.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    const tokens = val / 1e18;
    return tokens.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const formatUSDCAmount = (amount: string): number => {
    // If it's already canonical (e.g. "85.0000" or small number), don't divide by 1e6
    const val = parseFloat(amount);
    // Heuristic: 1e6 wei = 1 USDC. 
    // If val < 1e5 (0.1 USDC in Wei) it's tiny, but if it's "100.00" it's 100 USDC.
    // A balance of 1000 USDC is 1e9 wei.
    // If the input is "100.00", parseFloat is 100.
    // If input is 100000000 (100 USDC), parseFloat is 1e8.

    // Better heuristic: if it has a dot '.', treat as canonical.
    if (amount.includes('.')) {
      return val;
    }
    // If it's an integer but small? "100" could be 100 USDC or 0.0001 USDC (wei).
    // Given the context of the app, let's assume integers > 10000 are Raw, unless proven otherwise.
    // But "100" USDC is plausible.
    // Safest bet: Check if it looks like Wei.
    // Let's stick to the convention: if it has a dot, it's canonical.
    // If it's huge, it's Wei.

    if (val > 1e10) { // > 10,000 USDC in wei
      return val / 1e6;
    }
    // If it's "100500000" (100.5 USDC), it has no dot.

    // NOTE: The backend seems to standardize on canonical strings now "100.0000".

    return val;
  };

  const formatCurrency = (value: number): string => {
    if (value < 0) {
      return `${formatCurrency(-value)}`;
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatLeverageBorrowedUSDC = (amount: string): string => {
    // Handles backend values like "189423000.00 USDC"
    const numericValue = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(numericValue)) return '0.00';

    const usdcValue = numericValue / 1e6;
    return usdcValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      SETTLED: 'bg-blue-100 text-blue-700',
      CONFIRMED: 'bg-purple-100 text-purple-700',
      CLAIMED: 'bg-gray-100 text-gray-700',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-600';
  };

  const getHealthStatusColor = (status?: string): string => {
    const healthColors: Record<string, string> = {
      HEALTHY: 'text-green-600',
      WARNING: 'text-yellow-600',
      CRITICAL: 'text-red-600',
    };
    return healthColors[status || ''] || 'text-gray-600';
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openTxHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://sepolia.arbitrumscan.xyz/tx/${hash}`, '_blank');
  };



  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500 mb-4">No assets in your portfolio yet</p>
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
    <div className="flex-1 overflow-y-auto">
      {/* Filter Bar */}
      <div className="sticky flex flex-row items-center justify-between top-0 z-20 bg-transparent backdrop-blur-sm border-b border-gray-300 px-6 py-3 ">
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
              ({filteredAssets.length} of {assets.length})
            </span>
          )}
        </div>
      </div>

      <table className="w-full">
        <thead className="sticky top-0 bg-transparent z-10">
          <tr className="border-b border-gray-300">
            <th className="px-4 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">

            </th>
            <th className="px-4 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Asset / Position
            </th>
            <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Tokens 
            </th>
            <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Invested 
            </th>
            <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Health
            </th>
            <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Yield / Interest
            </th>
            <th className="px-4 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredAssets.map((asset, index) => {
            const rowKey = getRowKey(asset);
            const isExpanded = expandedRows.has(rowKey);
            const isLeverage = asset.purchaseType === 'LEVERAGE';

            return (
              <>
                <tr
                  key={rowKey}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50'
                    }`}
                  onClick={(e) => toggleRowExpansion(rowKey, e)}
                >
                  {/* Expand Icon */}
                  <td className="px-4 py-4">
                    <button
                      onClick={(e) => toggleRowExpansion(rowKey, e)}
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
                      className={`px-2 py-1 rounded text-xs font-medium ${isLeverage
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {asset.purchaseType}
                    </span>
                  </td>

                  {/* Asset Name / Position */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1" >
                      <div className="font-gellix text-sm font-medium text-foreground hover:text-blue-500" onClick={() => { navigate(`/marketplace/asset/${asset.assetId}`) }}>
                        {asset.metadata?.assetName || asset.assetId.slice(0, 12) + '...'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{asset.metadata?.industry || 'N/A'}</span>
                        {isLeverage && asset.positionId && (
                          <>
                            <span>•</span>
                            <span className="font-medium">Position #{asset.positionId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        asset.status
                      )}`}
                    >
                      {asset.status}
                    </span>
                  </td>

                  {/* Tokens / Collateral */}
                  <td className="px-4 py-4 text-center">
                    <div className="font-gellix text-sm font-normal text-foreground">
                      {isLeverage && asset.leverageInfo ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">ankrBNB</span>
                          <span>{formatTokenAmount(asset.totalAmount)}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Tokens</span>
                          <span>{formatTokenAmount(asset.totalAmount)}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Invested / Borrowed */}
                  <td className="px-4 py-4 text-center">
                    <div className="font-gellix text-sm font-normal text-foreground">
                      {isLeverage && asset.leverageInfo ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Borrowed</span>
                          <span className="font-medium">
                            {formatLeverageBorrowedUSDC(asset.leverageInfo.usdcBorrowedFormatted)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500"> {(formatUSDCAmount(asset.totalInvested || '0') > 0) ?
                            (<span className=''>Capital Invested</span>)
                            : (<span>Capital Received</span>)
                          }</span>
                          <span className={`font-medium ${formatUSDCAmount(asset.totalInvested || '0') > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                            }`}>
                            ${formatCurrency(formatUSDCAmount(asset.totalInvested || '0'))}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Health Factor */}
                  <td className="px-4 py-4 text-center">
                    {isLeverage && asset.leverageInfo && asset.status === 'ACTIVE' ? (
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-sm font-medium ${getHealthStatusColor(
                            asset.leverageInfo.healthStatus
                          )}`}
                        >
                          {asset.leverageInfo.healthFactorFormatted}
                        </span>
                        <span className="text-xs text-gray-500">
                          {asset.leverageInfo.healthStatus}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>

                  {/* Yield / Interest */}
                  <td className="px-4 py-4 text-center">
                    {isLeverage ? (
                      <div className="flex flex-col">
                        {asset.leverageInfo?.type === 'SETTLED' ? (
                          <>
                            <span className="text-sm font-medium text-green-600">
                              {asset.leverageInfo.userYieldFormatted}
                            </span>
                            <span className="text-xs text-gray-500">Settled Yield</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-600">
                              {asset.leverageInfo?.totalInterestPaidFormatted || '0.00'}
                            </span>
                            <span className="text-xs text-gray-500">Interest Paid</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-medium ${parseFloat(asset.yieldInfo?.claimableYield || '0') > 0
                            ? 'text-green-600'
                            : 'text-gray-400'
                            }`}
                        >
                          {asset.yieldInfo?.claimableYieldFormatted || '$0.00'}
                        </span>
                        <span className="text-xs text-gray-500">Claimable</span>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col gap-2 items-center">
                      {!isLeverage &&
                        parseFloat(asset.yieldInfo?.claimableYield || '0') > 0 &&
                        asset.status !== 'CLAIMED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClaimYield(asset.assetId);
                            }}
                            disabled={claimingAssetId === asset.assetId}
                            className="px-3 py-1 bg-black text-white rounded-lg font-gellix text-xs font-normal hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {claimingAssetId === asset.assetId ? claimStatus : 'Claim Yield'}
                          </button>
                        )}

                      {/* Transaction Hash Links */}
                      {(asset.yieldInfo?.yieldClaimTxHash || asset.leverageInfo?.settlementTxHash) && (
                        <button
                          onClick={(e) =>
                            openTxHash(
                              asset.yieldInfo?.yieldClaimTxHash ||
                              asset.leverageInfo?.settlementTxHash ||
                              '',
                              e
                            )
                          }
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
                  <tr className="bg-transparent border-b border-gray-300">
                    <td colSpan={9} className="px-6 py-4">
                      {/* Basic Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mb-6">
                        {/* Token Address */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Token Address</div>
                          <div className="font-mono text-xs">
                            {asset.tokenAddress ? truncateAddress(asset.tokenAddress) : 'N/A'}
                          </div>
                        </div>

                        {/* Risk Tier */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Risk Tier</div>
                          <div className="font-medium">{asset.metadata?.riskTier || 'N/A'}</div>
                        </div>

                        {/* First Purchase / Created */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            {isLeverage ? 'Created At' : 'First Purchase'}
                          </div>
                          <div className="text-xs">
                            {asset.firstPurchase || asset.createdAt
                              ? new Date(
                                asset.firstPurchase || asset.createdAt || ''
                              ).toLocaleDateString()
                              : 'N/A'}
                          </div>
                        </div>

                        {/* Static: Purchase Count */}
                        {!isLeverage && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Purchase Count</div>
                            <div className="font-medium">{asset.purchaseCount || 0}</div>
                          </div>
                        )}

                        {/* Leverage: Last Harvest */}
                        {isLeverage && asset.lastHarvestTime && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Last Harvest</div>
                            <div className="text-xs">
                              {new Date(asset.lastHarvestTime).toLocaleDateString()}
                            </div>
                          </div>
                        )}

                        {/* Settlement Info */}
                        {(asset.yieldInfo?.settlementDate ||
                          asset.leverageInfo?.settlementDate) && (
                            <>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Settlement Date</div>
                                <div className="text-xs">
                                  {new Date(
                                    asset.yieldInfo?.settlementDate ||
                                    asset.leverageInfo?.settlementDate ||
                                    ''
                                  ).toLocaleDateString()}
                                </div>
                              </div>

                              {asset.yieldInfo?.settlementId && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Settlement ID</div>
                                  <div className="font-mono text-xs">
                                    {asset.yieldInfo.settlementId.slice(0, 12)}...
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                        {/* Leverage Settled: stARB Returned */}
                        {isLeverage &&
                          asset.leverageInfo?.type === 'SETTLED' &&
                          asset.leverageInfo.stARBReturnedFormatted && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">ankrBNB Returned</div>
                              <div className="font-medium">
                                {asset.leverageInfo.stARBReturnedFormatted}
                              </div>
                            </div>
                          )}

                        {/* Tokens Leveraged */}
                        {isLeverage &&

                          asset.totalAmount && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Tokens Leveraged</div>
                              <div className="font-medium">
                                {asset.totalAmount ? formatTokenAmount(asset.totalAmount) : '0'}
                              </div>
                            </div>
                          )}

                        {/* Full Transaction Hashes */}
                        {asset.yieldInfo?.yieldClaimTxHash && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Claim Transaction</div>
                            <div className="font-mono text-xs break-all">
                              {asset.yieldInfo.yieldClaimTxHash}
                            </div>
                          </div>
                        )}

                        {asset.leverageInfo?.settlementTxHash && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">
                              Settlement Transaction
                            </div>
                            <div className="font-mono text-xs break-all">
                              {asset.leverageInfo.settlementTxHash}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Transaction History */}
                      {asset.transactionHistory && asset.transactionHistory.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                            Transaction History
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-transparent border-b border-gray-300">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Price</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Total Value</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Investment Δ</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Token Balance</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Net Investment</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">Avg Cost</th>
                                  <th className="px-3 py-2 text-center font-medium text-gray-700">Tx</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-300">
                                {asset.transactionHistory.map((tx: any, txIndex: number) => (
                                  <tr key={txIndex} className="hover:bg-transparent transition-colors">
                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                      {new Date(tx.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'PRIMARY_PURCHASE'
                                          ? 'bg-blue-100 text-blue-700'
                                          : tx.type === 'SECONDARY_BUY'
                                            ? 'bg-green-100 text-green-700'
                                            : tx.type === 'SECONDARY_SELL'
                                              ? 'bg-orange-100 text-orange-700'
                                              : tx.type === 'ORDER_LOCK'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-gray-100 text-gray-700'
                                          }`}
                                      >
                                        {tx.type.replace(/_/g, ' ')}
                                      </span>
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${parseFloat(tx.amount) < 0 ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                      {tx.amountFormatted}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                      {tx.priceFormatted}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                                      {tx.totalValueFormatted}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${parseFloat(tx.investmentDelta) > 0
                                      ? 'text-red-600'
                                      : parseFloat(tx.investmentDelta) < 0
                                        ? 'text-green-600'
                                        : 'text-gray-600'
                                      }`}>
                                      {tx.investmentDeltaFormatted}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-900">
                                      {tx.runningTokenBalance}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${parseFloat(tx.runningInvestment) > 0
                                      ? 'text-red-600'
                                      : 'text-green-600'
                                      }`}>
                                      ${tx.runningInvestment}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                      ${tx.avgCostPerToken}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {tx.txHash ? (
                                        (() => {
                                          // Extract hash before dash if present
                                          const actualHash = tx.txHash.split('-')[0];
                                          const isRealTx = !actualHash.includes('-');

                                          return isRealTx ? (
                                            <button
                                              onClick={(e) => openTxHash(actualHash, e)}
                                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors font-mono text-xs"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                            </button>
                                          ) : (
                                            <span className="text-gray-400 text-xs">Internal</span>
                                          );
                                        })()
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
