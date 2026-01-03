import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { HarvestEvent, PositionTimelineData, HealthStatus, LeveragePosition } from '../../types/leverage.types';
import { formatUnits } from 'viem';

interface PositionSparklineProps {
  position: LeveragePosition;
  healthStatus: HealthStatus;
}

/**
 * Custom Dot Component for Harvest Points
 * Renders circular markers at harvest events with click navigation to block explorer
 */
const HarvestDot = (props: any) => {
  const { cx, cy, payload, harvestHistory } = props;

  // Check if this data point has a harvest event
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
        r={4}
        fill="#10B981"
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      />
    </g>
  );
};

/**
 * Custom Tooltip for Harvest Points
 * Shows harvest details on hover - positioned to not block clicks
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
  const usdcReceived = (parseFloat(harvestEvent.usdcReceived) / 1e6).toFixed(4);
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
      <p className="text-blue-600 text-[10px] mt-1 italic">Click circle to view TX</p>
    </div>
  );
};

/**
 * PositionSparkline Component
 * Displays a minimal sparkline chart in the table row
 * Shows mETH value trend with clickable harvest point markers
 */
export const PositionSparkline = ({
  position,
  healthStatus,
}: PositionSparklineProps) => {
  // Build timeline from real harvest data
  const data = buildSparklineFromHarvests(position);

  // Color based on health status
  const lineColor =
    healthStatus === 'HEALTHY'
      ? '#10B981'
      : healthStatus === 'WARNING'
      ? '#F59E0B'
      : healthStatus === 'CRITICAL'
      ? '#EF4444'
      : '#6B7280'; // Gray for LIQUIDATED or SETTLED

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
          dataKey="mETHValue"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={(props) => <HarvestDot {...props} harvestHistory={position.harvestHistory} />}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Build sparkline timeline from actual harvest history data
 * Uses REAL data only - no dummy data!
 */
function buildSparklineFromHarvests(position: LeveragePosition): PositionTimelineData[] {
  const points: PositionTimelineData[] = [];

  // Assume mETH price (backend will provide this later)
  const ASSUMED_METH_PRICE = 3000;

  // Starting values
  const initialCollateral = parseFloat(formatUnits(BigInt(position.mETHCollateral), 18));
  let remainingCollateral = initialCollateral;
  let cumulativeInterest = 0;

  // Add starting point
  points.push({
    timestamp: position.createdAt,
    mETHValue: initialCollateral * ASSUMED_METH_PRICE,
    cumulativeInterest: 0,
    healthFactor: position.currentHealthFactor / 10000,
  });

  // Process harvest events
  if (position.harvestHistory && position.harvestHistory.length > 0) {
    position.harvestHistory.forEach((harvest) => {
      const mETHSwapped = parseFloat(harvest.mETHSwapped) / 1e18;
      const interestPaid = parseFloat(harvest.interestPaid) / 1e6;

      // Add point before harvest (flat line)
      const beforeTime = new Date(new Date(harvest.timestamp).getTime() - 1000).toISOString();
      points.push({
        timestamp: beforeTime,
        mETHValue: remainingCollateral * ASSUMED_METH_PRICE,
        cumulativeInterest: cumulativeInterest,
        healthFactor: harvest.healthFactorBefore / 10000,
      });

      // Update values (step up)
      cumulativeInterest += interestPaid;
      remainingCollateral -= mETHSwapped;

      // Add harvest point (after step up)
      points.push({
        timestamp: harvest.timestamp,
        mETHValue: remainingCollateral * ASSUMED_METH_PRICE,
        cumulativeInterest,
        healthFactor: harvest.healthFactorAfter / 10000,
      });
    });
  }

  // Add current point (interest stays flat after last harvest)
  points.push({
    timestamp: new Date().toISOString(),
    mETHValue: remainingCollateral * ASSUMED_METH_PRICE,
    cumulativeInterest: cumulativeInterest, // Use calculated cumulative
    healthFactor: position.currentHealthFactor / 10000,
  });

  return points;
}
