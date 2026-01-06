import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { PositionSparkline } from './PositionSparkline';
import type { LeveragePosition } from '../../types/leverage.types';
import { Filter } from 'lucide-react';

// Portfolio API types
interface PortfolioLeveragePosition {
  purchaseType: 'LEVERAGE';
  positionId: number;
  assetId: string;
  tokenAddress: string;
  totalAmount: string;
  status: 'ACTIVE' | 'SETTLED';
  createdAt: string;
  firstPurchase: string;
  metadata: {
    assetName?: string;
    industry?: string;
    riskTier?: string;
    positionType: 'Leveraged Position';
  };
  mETHCollateral: string;
  usdcBorrowed: string;
  healthFactor?: number;
  healthStatus?: string;
  totalInterestPaid?: string;
  lastHarvestTime?: string;
  settlementTxHash?: string;
  leverageInfo: {
    type: 'ACTIVE' | 'SETTLED';
    mETHCollateralFormatted: string;
    usdcBorrowedFormatted: string;
    healthFactorFormatted?: string;
    healthStatus?: string;
    totalInterestPaidFormatted: string;
    claimableYield: string;
    claimableYieldFormatted: string;
    userYield?: string;
    userYieldFormatted?: string;
    mETHReturned?: string;
    mETHReturnedFormatted?: string;
    settlementTxHash?: string;
    settlementDate?: string;
  };
}

// Union type to support both API structures
type Position = LeveragePosition | PortfolioLeveragePosition;

interface PositionsTableProps {
  positions: Position[];
  isLoading: boolean;
  onSelectPosition: (position: any) => void;
}

export const PositionsTable = ({ positions, isLoading, onSelectPosition }: PositionsTableProps) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED' | 'LIQUIDATABLE'>('ALL');

  // Filter positions based on selected status
  const filteredPositions = statusFilter === 'ALL'
    ? positions
    : positions.filter(pos => getStatus(pos) === statusFilter);

  const statusOptions: Array<'ALL' | 'ACTIVE' | 'SETTLED' | 'LIQUIDATABLE'> = ['ALL', 'ACTIVE', 'SETTLED', 'LIQUIDATABLE'];

  // Type guard to check if position is from Portfolio API
  const isPortfolioPosition = (pos: Position): pos is PortfolioLeveragePosition => {
    return 'purchaseType' in pos && pos.purchaseType === 'LEVERAGE';
  };

  // Helper to get asset name from either type
  const getAssetName = (pos: Position): string => {
    if (isPortfolioPosition(pos)) {
      return pos.metadata?.assetName || pos.assetId.substring(0, 12);
    }
    return pos.assetSymbol || pos.assetId.substring(0, 12);
  };

  // Helper to get industry/additional info
  const getIndustry = (pos: Position): string => {
    if (isPortfolioPosition(pos)) {
      return pos.metadata?.industry || 'N/A';
    }
    return 'N/A';
  };

  // Helper to get status
  const getStatus = (pos: Position): string => {
    return pos.status;
  };

  // Helper to get health factor
  const getHealthFactor = (pos: Position): number => {
    if (isPortfolioPosition(pos)) {
      return pos.healthFactor || 0;
    }
    return pos.currentHealthFactor || 0;
  };

  // Helper to get settlement tx hash
  const getSettlementTxHash = (pos: Position): string | undefined => {
    if (isPortfolioPosition(pos)) {
      return pos.settlementTxHash || pos.leverageInfo?.settlementTxHash;
    }
    return pos.settlementTxHash;
  };

  // Helper to get user yield
  const getUserYield = (pos: Position): string | undefined => {
    if (isPortfolioPosition(pos)) {
      return pos.leverageInfo?.userYieldFormatted;
    }
    return pos.userYieldDistributed ? formatUSDC(pos.userYieldDistributed) : undefined;
  };

  const formatUSDC = (weiAmount: string): string => {
    const usdc = parseFloat(weiAmount) / 1e6;
    return usdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMETH = (weiAmount: string): string => {
    return formatUnits(BigInt(weiAmount), 18);
  };

  const getHealthColor = (health: number) => {
    if (health >= 14000) return 'text-green-600';
    if (health >= 13000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPositionStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' };
      case 'SETTLED':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Settled' };
      case 'LIQUIDATABLE':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Liquidatable' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500">Loading positions...</p>
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-8">
          <p className="font-gellix text-sm text-gray-500 mb-4">No active leverage positions found</p>
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
        <div className="sticky top-0 z-20 border-b border-gray-200 px-1 pb-2 bg-white">
          <div className="flex items-center justify-end gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Filter by Status:</span>
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
            {statusFilter !== 'ALL' && (
              <span className="text-xs text-gray-500 ml-2">
                ({filteredPositions.length} of {positions.length})
              </span>
            )}
          </div>
        </div>

        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200 text-black">
              <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Amount Invested
              </th>
              <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Collateral
              </th>
              <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Health Factor
              </th>
              <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Position Status
              </th>
              <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
                Chart / Transaction
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions.map((pos, index) => {
              const health = getHealthFactor(pos);
              const collateral = formatMETH(pos.mETHCollateral);
              const invested = formatUSDC(pos.usdcBorrowed);
              const status = getStatus(pos);
              const positionStatusStyle = getPositionStatusStyle(status);
              const isActivePosition = status === 'ACTIVE';
              const settlementTx = getSettlementTxHash(pos);
              const userYield = getUserYield(pos);

              return (
                <tr
                  key={pos.positionId}
                  onClick={() => onSelectPosition(pos)}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-gray-10' : 'bg-gray-50/50'
                    }`}
                >
                  {/* Asset */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-gellix text-sm font-normal text-foreground">
                        {getAssetName(pos)}
                      </div>
                      <div className="font-gellix text-xs text-gray-400">
                        Position #{pos.positionId} • {getIndustry(pos)}
                      </div>
                    </div>
                  </td>

                  {/* Amount Invested (USDC Borrowed) */}
                  <td className="px-6 py-4 text-right">
                    <div className="font-gellix text-sm font-normal text-foreground">
                      ${invested} USDC
                    </div>
                  </td>

                  {/* Collateral */}
                  <td className="px-6 py-4 text-right">
                    <div className="font-gellix text-sm font-normal text-foreground">
                      {parseFloat(collateral).toFixed(4)} mETH
                    </div>
                  </td>

                  {/* Health Factor */}
                  <td className="px-6 py-4 text-right">
                    <div className={`font-gellix text-sm font-normal ${getHealthColor(health*100)}`}>
                      {health > 0 ? (health / 100).toFixed(2) + '%' : 'N/A'}
                    </div>
                  </td>

                  {/* Position Status */}
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-normal ${positionStatusStyle.bg} ${positionStatusStyle.text}`}>
                      {positionStatusStyle.label}
                    </span>
                  </td>

                  {/* Chart / Transaction */}
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {isActivePosition ? (
                      <div className="w-full max-w-50 ml-auto">
                        <PositionSparkline
                          position={pos as any}
                          healthStatus={(pos.healthStatus as any) || 'HEALTHY'}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {settlementTx ? (
                          <a
                            href={`https://explorer.sepolia.mantle.xyz/tx/${settlementTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-gellix text-xs font-normal block"
                          >
                            Settlement Tx
                          </a>
                        ) : (
                          <span className="font-gellix text-xs text-gray-400">No Tx</span>
                        )}
                        {status === 'SETTLED' && userYield && (
                          <div className="font-gellix text-xs text-gray-500">
                            Yield: ${userYield}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
