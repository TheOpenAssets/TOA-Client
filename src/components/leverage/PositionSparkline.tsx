import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { HarvestEvent, PositionTimelineData, HealthStatus } from '../../types/leverage.types';

// Portfolio API structure (different from detailed LeveragePosition)
interface PortfolioPosition {
  positionId: number;
  createdAt: string;
  mETHCollateral: string;
  healthFactor?: number;
  lastHarvestTime?: string;
  harvestHistory?: HarvestEvent[];
}

interface PositionSparklineProps {
  position: PortfolioPosition;
  healthStatus: HealthStatus;
}

/**
 * Custom Tooltip for Harvest Points
 * Shows harvest details on hover
 */
const HarvestTooltip = (props: any) => {
  const { active, payload, position } = props;

  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const harvestEvent = position?.harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === dataPoint.timestamp
  );

  if (!harvestEvent) return null;

  const mETHSwapped = (parseFloat(harvestEvent.mETHSwapped) / 1e18).toFixed(6);
  const interestPaid = (parseFloat(harvestEvent.interestPaid) / 1e6).toFixed(4);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs pointer-events-none">
      <p className="font-semibold text-gray-900 mb-1 text-xs">🌾 Harvest</p>
      <div className="space-y-0.5">
        <p className="text-gray-700 text-xs">
          <span className="font-medium">mETH:</span> {mETHSwapped}
        </p>
        <p className="text-gray-700 text-xs">
          <span className="font-medium">Interest:</span> ${interestPaid}
        </p>
      </div>
    </div>
  );
};

/**
 * PositionSparkline Component
 * Displays a minimal sparkline chart in the table row
 * Shows mETH value trend with color-coded area fill
 * Green for upward trend, red for downward trend
 */
export const PositionSparkline = ({
  position,
  healthStatus: _healthStatus,
}: PositionSparklineProps) => {
  // Build timeline from real harvest data
  const data = buildSparklineFromHarvests(position);

  // Determine color based on trend (latest vs previous point)
  let lineColor = '#10B981'; // Default green

  if (data.length > 2) {
    const latestValue = data[data.length - 2].mETHSwapped || 0; // Second to last (last is current with 0)
    const previousValue = data[data.length - 3].mETHSwapped || 0;

    if (latestValue < previousValue) {
      lineColor = '#EF4444'; // Red for declining
    }
  }

  const gradientId = `sparkline-gradient-${position.positionId}`;

  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={(props) => <HarvestTooltip {...props} position={position} />}
          cursor={false}
          wrapperStyle={{ pointerEvents: 'none' }}
          allowEscapeViewBox={{ x: true, y: true }}
        />
        <Area
          type="monotone"
          dataKey="mETHSwapped"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Build sparkline timeline from actual harvest history data
 * Shows mETH swapped amounts at each harvest point
 * Limits to latest 5 harvests for cleaner visualization
 */
function buildSparklineFromHarvests(position: PortfolioPosition): PositionTimelineData[] {
  const points: PositionTimelineData[] = [];
  const healthFactorValue = position.healthFactor || 15000; // Default to 150% if not provided

  // If no harvest history, return minimal data
  if (!position.harvestHistory || position.harvestHistory.length === 0) {
    points.push({
      timestamp: position.createdAt,
      mETHSwapped: 0,
      healthFactor: healthFactorValue / 100,
    });
    points.push({
      timestamp: new Date().toISOString(),
      mETHSwapped: 0,
      healthFactor: healthFactorValue / 100,
    });
    return points;
  }

  // Get latest 5 harvests only
  const recentHarvests = position.harvestHistory.length > 5
    ? position.harvestHistory.slice(-5)
    : position.harvestHistory;

  // Use the timestamp of the first harvest we're showing as starting point
  const startTimestamp = recentHarvests[0].timestamp;

  // Add starting point at 0 for area fill
  points.push({
    timestamp: startTimestamp,
    mETHSwapped: 0,
    healthFactor: recentHarvests[0].healthFactorBefore / 10000,
  });

  // Add a point for each harvest showing the mETH swapped amount
  recentHarvests.forEach((harvest: HarvestEvent) => {
    const mETHSwapped = parseFloat(harvest.mETHSwapped) / 1e18;
    points.push({
      timestamp: harvest.timestamp,
      mETHSwapped: mETHSwapped,
      healthFactor: harvest.healthFactorAfter / 10000,
    });
  });

  // Add current point
  points.push({
    timestamp: new Date().toISOString(),
    mETHSwapped: 0,
    healthFactor: healthFactorValue / 100,
  });

  return points;
}
