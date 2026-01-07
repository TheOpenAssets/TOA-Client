import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import type { LeveragePosition } from '../../types/leverage.types';
import { PositionSparkline } from './PositionSparkline';

interface PositionsTableProps {
  positions: LeveragePosition[];
  isLoading: boolean;
  onSelectPosition: (position: LeveragePosition) => void;
}

export const PositionsTable = ({ positions, isLoading, onSelectPosition }: PositionsTableProps) => {
  const navigate = useNavigate();

  const getHealthColor = (health: number) => {
    if (health >= 1.4) return 'text-green-600';
    if (health >= 1.15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Healthy' };
      case 'WARNING':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Warning' };
      case 'CRITICAL':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' };
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
        <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-200 text-black">
            <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Asset
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Collateral
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Debt
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Health Factor
            </th>
            <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
              Swap Chart
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, index) => {
            const health = pos.currentHealthFactor / 10000;
            const collateral = formatUnits(BigInt(pos.mETHCollateral), 18);
            const debt = formatUnits(BigInt(pos.usdcBorrowed), 6);
            const statusStyle = getStatusStyle(pos.status);

            return (
              <tr
                key={pos.positionId}
                onClick={() => onSelectPosition(pos)}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-gray-10' : 'bg-gray-50/50'
                }`}
              >
                {/* Asset */}
                <td className="px-6 py-4">
                  <div>
                    <div className="font-gellix text-sm font-normal text-foreground">
                      {pos.assetSymbol || pos.assetId.substring(0, 12)}
                    </div>
                    <div className="font-gellix text-xs text-gray-400">
                      Position #{pos.positionId}
                    </div>
                  </div>
                </td>

                {/* Collateral */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    {parseFloat(collateral).toFixed(2)} mETH
                  </div>
                </td>

                {/* Debt */}
                <td className="px-6 py-4 text-right">
                  <div className="font-gellix text-sm font-normal text-foreground">
                    ${parseFloat(debt).toLocaleString()} USDC
                  </div>
                </td>

                {/* Health Factor */}
                <td className="px-6 py-4 text-right">
                  <div className={`font-gellix text-sm font-normal ${getHealthColor(health)}`}>
                    {health.toFixed(2)}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-normal ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </td>

                {/* Chart - Sparkline */}
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="w-full max-w-[200px] ml-auto">
                    <PositionSparkline
                      position={pos}
                      healthStatus={pos.healthStatus}
                    />
                  </div>
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
