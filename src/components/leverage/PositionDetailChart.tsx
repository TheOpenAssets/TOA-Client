import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Area,
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
import { PageLoader } from '../ui/page-loader';

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
  const { cx, cy, payload, harvestHistory, fill = '#10B981' } = props;

  // Only show dots for actual harvest points (non-zero values)
  const isHarvestPoint = payload.stARBSwapped > 0 || payload.interestPaid > 0 || payload.usdcReceived > 0;

  if (!isHarvestPoint) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2}
        fill="#e5e7eb"
        stroke="#fff"
        strokeWidth={1}
      />
    );
  }

  const harvestEvent = harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === payload.timestamp
  );

  if (!harvestEvent) {
    console.warn('No harvest event found for payload:', payload);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill={fill}
        stroke="#fff"
        strokeWidth={1.5}
      />
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Clicking harvest point:', harvestEvent.transactionHash);
    const explorerUrl = `https://explorer.sepolia.arbitrum.xyz/tx/${harvestEvent.transactionHash}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <g style={{ cursor: 'pointer', pointerEvents: 'all' }} onClick={handleClick}>
      {/* Invisible larger circle for easier clicking */}
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill="transparent"
        style={{ cursor: 'pointer' }}
      />
      {/* Visible colored circle - smaller and cleaner */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fill}
        stroke="#fff"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      <title>Click to view transaction: {harvestEvent.transactionHash}</title>
    </g>
  );
};

/**
 * Custom Tooltip for stARB Chart
 */
const StARBTooltip = (props: any) => {
  const { active, payload, harvestHistory } = props;

  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const harvestEvent = harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === dataPoint.timestamp
  );

  if (!harvestEvent) return null;

  const date = new Date(dataPoint.timestamp);
  const formattedDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const stARBValue = parseFloat(harvestEvent.stARBSwapped) / 1e18;
  const formattedstARB = stARBValue < 0.000001 ? stARBValue.toExponential(4) : stARBValue.toFixed(6);

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-medium text-gray-700 mb-2 text-xs">{formattedDate}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <p className="text-xs text-gray-600">
          <span className="font-medium">stARB:</span> {formattedstARB}
        </p>
      </div>
    </div>
  );
};

/**
 * Custom Tooltip for Interest Chart
 */
const InterestTooltip = (props: any) => {
  const { active, payload, harvestHistory } = props;

  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const harvestEvent = harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === dataPoint.timestamp
  );

  if (!harvestEvent) return null;

  const date = new Date(dataPoint.timestamp);
  const formattedDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const interestValue = parseFloat(harvestEvent.interestPaid) / 1e6;
  const usdcValue = parseFloat(harvestEvent.usdcReceived) / 1e6;
  const formattedInterest = interestValue < 0.001 ? interestValue.toExponential(4) : interestValue.toFixed(4);
  const formattedUSDC = usdcValue < 0.001 ? usdcValue.toExponential(4) : usdcValue.toFixed(4);

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-medium text-gray-700 mb-2 text-xs">{formattedDate}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <p className="text-xs text-gray-600">
            <span className="font-medium">Interest:</span> ${formattedInterest}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <p className="text-xs text-gray-600">
            <span className="font-medium">USDC:</span> ${formattedUSDC}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Custom Tooltip for Health Factor Chart
 */
const HealthTooltip = (props: any) => {
  const { active, payload, harvestHistory } = props;

  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const harvestEvent = harvestHistory?.find(
    (h: HarvestEvent) => h.timestamp === dataPoint.timestamp
  );

  if (!harvestEvent) return null;

  const date = new Date(dataPoint.timestamp);
  const formattedDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-medium text-gray-700 mb-2 text-xs">{formattedDate}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <p className="text-xs text-gray-600">
            <span className="font-medium">After:</span> {(harvestEvent.healthFactorAfter / 10000).toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <p className="text-xs text-gray-600">
            <span className="font-medium">Before:</span> {(harvestEvent.healthFactorBefore / 10000).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * PositionDetailChart Modal Component
 * Three separate charts with tabs for different metrics
 */
export const PositionDetailChart = ({ position: initialPosition, isOpen, onClose }: PositionDetailChartProps) => {
  const [position, setPosition] = useState<LeveragePosition>(initialPosition);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<'stARB' | 'interest' | 'health'>('stARB');
  // Zoom/History Slider State
  // Value 0: Show all history (start from index 0)
  // Value 80: Show last 20% (start from index 80%)
  const [historyStartPct, setHistoryStartPct] = useState(80);
  // Professional chart interaction state
  const [timeOffset, setTimeOffset] = useState(0); // Time panning offset (moves the window)
  const chartRef = useRef<HTMLDivElement>(null);

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

  // Handle clicks on data points
  const handleChartClick = (data: any) => {
    if (!data || !data.activePayload || !data.activePayload.length) return;

    const clickedPoint = data.activePayload[0].payload;
    console.log('Chart clicked:', clickedPoint);

    // Find the harvest event for this point
    const harvestEvent = position.harvestHistory?.find(
      (h: HarvestEvent) => h.timestamp === clickedPoint.timestamp
    );

    if (harvestEvent) {
      console.log('Opening transaction:', harvestEvent.transactionHash);
      const explorerUrl = `https://explorer.sepolia.arbitrum.xyz/tx/${harvestEvent.transactionHash}`;
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Professional chart wheel handler (zoom + pan)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!chartRef.current?.contains(e.target as Node)) return;

    e.preventDefault();
    e.stopPropagation();

    // Vertical scroll = Control zoom slider (history percentage)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      setHistoryStartPct(prev => {
        const zoomDelta = e.deltaY * 0.02; // Smooth, slow, eased zoom adjustment
        const newPct = prev + zoomDelta;
        return Math.max(0, Math.min(95, newPct)); // Clamp to slider range
      });
    }
    // Horizontal scroll = Time panning (moves window position)
    else {
      setTimeOffset(prev => {
        const panDelta = e.deltaX * 0.08; // Smooth, slow, eased pan adjustment
        return prev + panDelta;
      });
    }
  }, []);

  // Attach wheel listener
  useEffect(() => {
    const chartEl = chartRef.current;
    if (!chartEl || !isOpen) return;

    chartEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => chartEl.removeEventListener('wheel', handleWheel);
  }, [isOpen, handleWheel]);

  // Reset time offset when switching charts or changing zoom level
  useEffect(() => {
    setTimeOffset(0);
  }, [activeChart, historyStartPct]);

  if (!isOpen) return null;

  // Build timeline from harvest history (REAL DATA)
  const fullData = buildTimelineFromHarvests(position);

  // Calculate visible data based on slider zoom + time offset
  const baseStartIndex = Math.floor((fullData.length * historyStartPct) / 100);
  const windowSize = fullData.length - baseStartIndex; // Size of the zoom window

  // Apply time offset (horizontal pan) while maintaining zoom window size
  const offsetIndex = Math.floor(timeOffset);

  // Calculate start and end with proper boundary handling
  let panAdjustedStart = baseStartIndex - offsetIndex;

  // Clamp to valid range: can't go before 0 or leave less than 2 points visible
  panAdjustedStart = Math.max(0, panAdjustedStart);
  panAdjustedStart = Math.min(panAdjustedStart, fullData.length - 2);

  // Calculate end maintaining consistent window size
  let panAdjustedEnd = panAdjustedStart + windowSize;

  // If we hit the right boundary, adjust start to maintain window size
  if (panAdjustedEnd > fullData.length) {
    panAdjustedEnd = fullData.length;
    panAdjustedStart = Math.max(0, panAdjustedEnd - windowSize);
  }

  const data = fullData.slice(panAdjustedStart, panAdjustedEnd);

  // Interest & USDC chart — visual-only Y-axis scaling
  const interestValues: number[] = data
    .flatMap(d => [d.interestPaid, d.usdcReceived])
    .filter((v): v is number => typeof v === 'number' && v > 0);

  const interestMin = interestValues.length ? Math.min(...interestValues) : 0;
  const interestMax = interestValues.length ? Math.max(...interestValues) : 0;

  // Standard padding for visual clarity
  const padding =
    interestMax > interestMin
      ? (interestMax - interestMin) * 0.15
      : interestMax * 0.85 || 1;

  const interestYAxisDomain: [number, number] = [
    Math.max(0, interestMin - padding),
    interestMax + padding,
  ];

  const collateral = formatUnits(BigInt(position.stARBCollateral), 18);
  const debt = formatUnits(BigInt(position.usdcBorrowed), 6);
  const health = position.currentHealthFactor / 10000;
  const totalstARB = (parseFloat(position.totalstARBHarvested || '0') / 1e18).toFixed(8);
  const totalInterest = (parseFloat(position.totalInterestPaid || '0') / 1e6).toFixed(4);
  const totalHarvests = position.harvestHistory?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <style>{`
        .position-detail-chart svg:focus,
        .position-detail-chart svg:focus-visible,
        .position-detail-chart *:focus,
        .position-detail-chart *:focus-visible {
          outline: none !important;
        }
        /* Custom Range Slider Styling */
        input[type=range] {
          -webkit-appearance: none; /* Hides the slider so that custom slider can be made */
          width: 100%; /* Specific width is required for Firefox. */
          background: transparent; /* Otherwise white in Chrome */
        }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
          margin-top: -6px; /* You need to specify a margin in Chrome, but in Firefox and IE it is automatic */
        }

        input[type=range]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
        }

        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #f3f4f6;
          border-radius: 2px;
        }

        input[type=range]:focus::-webkit-slider-runnable-track {
          background: #e5e7eb;
        }
      `}</style>
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 outline-none focus:outline-none position-detail-chart">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Position #{position.positionId} · {position.assetSymbol || position.assetId.substring(0, 12)}
            </h2>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>
                <span className="font-medium text-gray-700">Collateral:</span> {parseFloat(collateral).toFixed(4)} stARB
              </span>
              <span>
                <span className="font-medium text-gray-700">Debt:</span> ${parseFloat(debt).toLocaleString()} USDC
              </span>
              <span className={health >= 1.4 ? 'text-green-600' : health >= 1.15 ? 'text-yellow-600' : 'text-red-600'}>
                <span className="font-medium text-gray-700">Health:</span> {health.toFixed(2)}
              </span>
              {totalHarvests > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>
                    <span className="font-medium text-gray-700">Harvests:</span> {totalHarvests}
                  </span>
                  <span>
                    <span className="font-medium text-gray-700">stARB Swapped:</span> {totalstARB}
                  </span>
                  <span>
                    <span className="font-medium text-gray-700">Interest Paid:</span> ${totalInterest}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Chart Type Tabs & Zoom Controls */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveChart('stARB')}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeChart === 'stARB'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              stARB Swapped
            </button>
            <button
              onClick={() => setActiveChart('interest')}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeChart === 'interest'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Interest & USDC
            </button>
            <button
              onClick={() => setActiveChart('health')}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeChart === 'health'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Health Factor
            </button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3 pb-2 w-64">
            <span className="text-xs font-medium text-gray-400 whitespace-nowrap">Zoom</span>
            <input
              type="range"
              min="0"
              max="95"
              step="1"
              value={historyStartPct}
              onChange={(e) => setHistoryStartPct(Number(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Chart */}
        <div className="p-6" ref={chartRef}>
          {loading ? (
            <div className="flex items-center justify-center h-[450px]">
              <PageLoader text='' />
            </div>
          ) : (
            <>
              {position.harvestHistory && position.harvestHistory.length === 0 && (
                <div className="mb-4 bg-blue-50/50 border border-blue-200/50 rounded-lg p-3 text-sm text-blue-600">
                  <span className="font-medium">ℹ️ No harvests yet.</span> Harvest events will appear on the chart once interest is paid.
                </div>
              )}

              {/* stARB Swapped Chart */}
              {activeChart === 'stARB' && (
                <ResponsiveContainer width="100%" height={450}>
                  <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick} className="outline-none focus:outline-none">
                    <defs>
                      <linearGradient id="stARBGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
                      stroke="#e5e7eb"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      label={{ value: 'stARB', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#9ca3af' } }}
                      stroke="#e5e7eb"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<StARBTooltip harvestHistory={position.harvestHistory} />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="stARBSwapped"
                      name="stARB Swapped"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#stARBGradient)"
                      dot={(props) => <HarvestDot {...props} harvestHistory={position.harvestHistory} fill="#10b981" />}
                      connectNulls
                      isAnimationActive={false}
                      fillOpacity={1}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {/* Interest & USDC Chart */}
              {activeChart === 'interest' && (
                <ResponsiveContainer width="100%" height={450}>
                  <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick} className="outline-none focus:outline-none">
                    <defs>
                      <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="usdcGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
                      stroke="#e5e7eb"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      domain={interestYAxisDomain}
                      allowDataOverflow={false}
                      label={{ value: 'USDC ($)', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#9ca3af' } }}
                      stroke="#e5e7eb"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<InterestTooltip harvestHistory={position.harvestHistory} />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="usdcReceived"
                      name="USDC Received"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="url(#usdcGradient)"
                      dot={(props) => <HarvestDot {...props} harvestHistory={position.harvestHistory} fill="#f97316" />}
                      connectNulls
                      isAnimationActive={false}
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="interestPaid"
                      name="Interest Paid"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#interestGradient)"
                      dot={(props) => <HarvestDot {...props} harvestHistory={position.harvestHistory} fill="#ef4444" />}
                      connectNulls
                      isAnimationActive={false}
                      fillOpacity={1}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {/* Health Factor Chart */}
              {activeChart === 'health' && (
                <ResponsiveContainer width="100%" height={450}>
                  <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick} className="outline-none focus:outline-none">
                    <defs>
                      <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
                      stroke="#e5e7eb"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      label={{ value: 'Health Factor', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#9ca3af' } }}
                      stroke="#e5e7eb"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<HealthTooltip harvestHistory={position.harvestHistory} />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="healthFactor"
                      name="Health Factor"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#healthGradient)"
                      dot={(props) => <HarvestDot {...props} harvestHistory={position.harvestHistory} fill="#3b82f6" />}
                      connectNulls
                      isAnimationActive={false}
                      fillOpacity={1}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Build timeline from actual harvest history data
 * Creates data points for stARB swapped, interest paid, and health factor at each harvest
 */
function buildTimelineFromHarvests(position: LeveragePosition): PositionTimelineData[] {
  const points: PositionTimelineData[] = [];

  // Add starting point at position creation (no harvest yet)
  points.push({
    timestamp: position.createdAt,
    stARBSwapped: 0,
    interestPaid: 0,
    usdcReceived: 0,
    healthFactor: position.currentHealthFactor / 10000,
  });

  // Process each harvest event
  if (position.harvestHistory && position.harvestHistory.length > 0) {
    position.harvestHistory.forEach((harvest) => {
      // Convert stARB swapped from WEI to ETH
      const stARBSwapped = parseFloat(harvest.stARBSwapped) / 1e18;

      // Convert interest paid from USDC WEI to USD
      const interestPaid = parseFloat(harvest.interestPaid);

      // Convert USDC received from USDC WEI to USD
      const usdcReceived = parseFloat(harvest.usdcReceived);

      // Health factor from harvest event
      const healthFactor = harvest.healthFactorAfter / 10000;

      // Add harvest point
      points.push({
        timestamp: harvest.timestamp,
        stARBSwapped,
        interestPaid,
        usdcReceived,
        healthFactor,
      });
    });
  }

  // Add current point (now)
  // points.push({
  //   timestamp: new Date().toISOString(),
  //   stARBSwapped: 0, // No harvest at current time
  //   interestPaid: 0,
  //   usdcReceived: 0,
  //   healthFactor: position.currentHealthFactor / 10000,
  // });

  console.log('📈 Chart Data Points:', {
    totalPoints: points.length,
    totalHarvests: position.harvestHistory?.length || 0,
    points: points.map(p => ({
      timestamp: new Date(p.timestamp).toLocaleString(),
      stARBSwapped: p.stARBSwapped?.toFixed(6),
      interestPaid: p.interestPaid?.toFixed(4),
      usdcReceived: p.usdcReceived?.toFixed(4),
      healthFactor: p.healthFactor?.toFixed(2),
    }))
  });

  return points;
}
