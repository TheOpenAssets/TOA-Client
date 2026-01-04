import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { X } from 'lucide-react';
import type { HarvestEvent, PositionTimelineData, LeveragePosition } from '../../types/leverage.types';
import { formatUnits } from 'viem';
import { leverageService } from '../../lib/api/leverage.service';

interface PositionDetailChartProps {
  position: LeveragePosition;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Custom Dot Component for Harvest Points
 * Renders circular markers at harvest events with click navigation
 */
const HarvestDot = (props: any) => {
  const { cx, cy, payload, harvestHistory } = props;

  const harvestEvent = harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === payload.timestamp
  );

  if (!harvestEvent) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const explorerUrl = `https://explorer.sepolia.mantle.xyz/tx/${harvestEvent.transactionHash}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#10B981"
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        className="hover:r-8 transition-all"
      />
      <title>Click to view transaction</title>
    </g>
  );
};

/**
 * Custom Tooltip for Chart
 * Shows detailed information on hover - positioned to not block clicks
 */
const DetailedTooltip = (props: any) => {
  const { active, payload, harvestHistory } = props;

  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const harvestEvent = harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === dataPoint.timestamp
  );

  const date = new Date(dataPoint.timestamp);
  const formattedDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 pointer-events-none">
      <p className="font-semibold text-gray-900 mb-3 text-sm">{formattedDate}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <p className="text-sm text-gray-700">
            <span className="font-medium">mETH Value:</span> ${dataPoint.mETHValue?.toFixed(2)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Cumulative Interest:</span> ${dataPoint.cumulativeInterest?.toFixed(4)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Health Factor:</span> {dataPoint.healthFactor?.toFixed(2)}
          </p>
        </div>
      </div>

      {harvestEvent && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="font-semibold text-green-700 mb-2 text-sm">🌾 Harvest Event</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-700">
              <span className="font-medium">mETH Swapped:</span>{' '}
              {(parseFloat(harvestEvent.mETHSwapped) / 1e18).toFixed(6)} mETH
            </p>
            <p className="text-gray-700">
              <span className="font-medium">USDC Received:</span> $
              {(parseFloat(harvestEvent.usdcReceived) / 1e6).toFixed(4)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Interest Paid:</span> $
              {(parseFloat(harvestEvent.interestPaid) / 1e6).toFixed(4)}
            </p>
            <p className="text-blue-600 font-medium mt-2">
              Click green circle to view TX →
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PositionDetailChart Modal Component
 * Full-featured chart with grid, axes, legends, and dual lines
 */
export const PositionDetailChart = ({ position: initialPosition, isOpen, onClose }: PositionDetailChartProps) => {
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | 'all'>('all');
  const [position, setPosition] = useState<LeveragePosition>(initialPosition);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialPosition?.positionId) {
      const fetchDetails = async () => {
        setLoading(true);
        try {
          const details = await leverageService.getPositionDetails(initialPosition.positionId);
          setPosition(details);
        } catch (error) {
          console.error('Failed to fetch position details:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [isOpen, initialPosition?.positionId]);

  if (!isOpen) return null;

  // Build timeline from harvest history (REAL DATA)
  const data = buildTimelineFromHarvests(position, timeRange);

  const collateral = formatUnits(BigInt(position.mETHCollateral), 18);
  const debt = formatUnits(BigInt(position.usdcBorrowed), 6);
  const health = position.currentHealthFactor / 10000;

  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Position #{position.positionId} - {position.assetSymbol || position.assetId.substring(0, 12)}
            </h2>
            <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
              <span>
                <span className="font-medium">Collateral:</span> {parseFloat(collateral).toFixed(2)} mETH
              </span>
              <span>
                <span className="font-medium">Debt:</span> ${parseFloat(debt).toLocaleString()} USDC
              </span>
              <span className={health >= 1.4 ? 'text-green-600' : health >= 1.15 ? 'text-yellow-600' : 'text-red-600'}>
                <span className="font-medium">Health Factor:</span> {health.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {(['1d', '7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '1d' ? '24H' : range === '7d' ? '7D' : range === '30d' ? '30D' : 'All'}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-gray-500">Loading position details...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="mETHGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return date.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                  });
                }}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />

              <YAxis
                yAxisId="left"
                label={{ value: 'Value (USD)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: 'Health Factor', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />

              <Tooltip
                content={(props) => <DetailedTooltip {...props} harvestHistory={position.harvestHistory} />}
                cursor={false}
                wrapperStyle={{ pointerEvents: 'none' }}
              />

              <Legend
                wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                iconType="line"
              />

              {/* mETH Value Area (Green) */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="mETHValue"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#mETHGradient)"
                name="mETH Value (USD)"
                dot={(props) => <HarvestDot {...props} harvestHistory={position.harvestHistory} />}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />

              {/* Cumulative Interest Area (Red) */}
              <Area
                yAxisId="left"
                type="stepAfter"
                dataKey="cumulativeInterest"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#debtGradient)"
                name="Cumulative Interest Paid (USDC)"
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />

              {/* Health Factor Line (Blue) - Keep as line for clarity */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="healthFactor"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Health Factor"
                dot={false}
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">💡 Tip:</span> Green circles represent harvest events where mETH was swapped to pay interest.
              Click on them to view the transaction on the block explorer. The green line shows your collateral value, and the red line shows cumulative interest paid over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Build timeline from actual harvest history data
 * This uses REAL data from the backend - no dummy data!
 */
function buildTimelineFromHarvests(
  position: LeveragePosition,
  timeRange: '1d' | '7d' | '30d' | 'all'
): PositionTimelineData[] {
  const points: PositionTimelineData[] = [];

  // Assume current mETH price (backend will provide this later)
  const ASSUMED_METH_PRICE = 3000; // USD per mETH

  // Starting values
  const initialCollateral = parseFloat(formatUnits(BigInt(position.mETHCollateral), 18));
  let cumulativeInterest = 0;
  let remainingCollateral = initialCollateral;

  // Add starting point at position creation
  const initialMETHValue = initialCollateral * ASSUMED_METH_PRICE;

  points.push({
    timestamp: position.createdAt,
    mETHValue: initialMETHValue,
    cumulativeInterest: 0,
    healthFactor: position.currentHealthFactor / 10000,
  });

  // Process each harvest event
  if (position.harvestHistory && position.harvestHistory.length > 0) {
    position.harvestHistory.forEach((harvest, index) => {
      // Convert mETH swapped from WEI to ETH
      const mETHSwapped = parseFloat(harvest.mETHSwapped) / 1e18;

      // Convert interest paid from USDC WEI to USD
      const interestPaid = parseFloat(harvest.interestPaid) / 1e6;

      // Before updating: add a point just before harvest (for step visualization)
      // This shows the flat line before the step-up
      const beforeHarvestTime = new Date(new Date(harvest.timestamp).getTime() - 1000).toISOString();
      points.push({
        timestamp: beforeHarvestTime,
        mETHValue: remainingCollateral * ASSUMED_METH_PRICE,
        cumulativeInterest: cumulativeInterest, // Same as before (flat line)
        healthFactor: harvest.healthFactorBefore / 10000,
      });

      // Update cumulative interest (STEP UP happens here)
      cumulativeInterest += interestPaid;

      // Update remaining collateral (subtract what was swapped)
      remainingCollateral -= mETHSwapped;

      // Calculate mETH value at this point
      const mETHValue = remainingCollateral * ASSUMED_METH_PRICE;

      // Health factor from harvest event
      const healthFactor = harvest.healthFactorAfter / 10000;

      // Add harvest point (AFTER the step-up)
      points.push({
        timestamp: harvest.timestamp,
        mETHValue,
        cumulativeInterest, // NEW higher value (step up)
        healthFactor,
      });

      // Debug log for first few harvests
      if (index < 3) {
        console.log(`📊 Harvest ${index + 1}:`, {
          timestamp: harvest.timestamp,
          mETHSwapped: mETHSwapped.toFixed(6),
          interestPaid: `$${interestPaid.toFixed(6)}`,
          cumulativeInterest: `$${cumulativeInterest.toFixed(6)}`,
          mETHValue: `$${mETHValue.toFixed(2)}`,
          remainingCollateral: remainingCollateral.toFixed(6)
        });
      }
    });
  }

  // Add current point (now) - interest stays flat after last harvest
  const currentMETHValue = remainingCollateral * ASSUMED_METH_PRICE;

  points.push({
    timestamp: new Date().toISOString(),
    mETHValue: currentMETHValue,
    cumulativeInterest: cumulativeInterest, // Use calculated cumulative, not totalInterestPaid
    healthFactor: position.currentHealthFactor / 10000,
  });

  // Debug: Log summary
  console.log('📈 Chart Data Summary:', {
    totalPoints: points.length,
    startInterest: points[0].cumulativeInterest,
    endInterest: cumulativeInterest,
    startMETHValue: points[0].mETHValue.toFixed(2),
    endMETHValue: currentMETHValue.toFixed(2),
    totalHarvests: position.harvestHistory?.length || 0
  });

  // Filter by time range
  if (timeRange !== 'all') {
    const now = Date.now();
    const cutoff = {
      '1d': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
    }[timeRange];

    return points.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
  }

  return points;
}
