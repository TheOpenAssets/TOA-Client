import { useState, useEffect } from 'react';
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from 'recharts';
import { marketplaceService } from '../../lib/api/marketplace.service';
import { PageLoader } from '../ui/page-loader';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface P2PTradingChartProps {
    assetId: string;
}

interface ChartDataPoint {
    index: number; // Sequential index for X-axis
    time: number; // Unix timestamp for display
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const INTERVALS = [
    { label: '2m', value: '2m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' },
];

const CandleStickShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;

    // Avoid division by zero or invalid data
    if (high === low || !high || !low || !open || !close) return null;

    const isGrowing = close >= open;
    const color = isGrowing ? '#26a69a' : '#ef5350';
    const wickColor = isGrowing ? '#26a69a' : '#ef5350';

    // Calculate scaling ratio based on the bar's rendered height and the value range
    const ratio = height / (high - low);

    // Calculate pixel positions relative to the top of the bar (y)
    const openOffset = (high - open) * ratio;
    const closeOffset = (high - close) * ratio;

    const yOpen = y + openOffset;
    const yClose = y + closeOffset;

    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(2, Math.abs(yOpen - yClose)); // Ensure at least 2px height for visibility

    // Calculate wick width (thinner than body)
    const wickWidth = 2;

    // Body width (use full bar width with some padding)
    const bodyWidth = Math.max(4, width - 4);
    const bodyX = x + (width - bodyWidth) / 2;

    return (
        <g>
            {/* Upper Wick (high to top of body) */}
            <line
                x1={x + width / 2}
                y1={y}
                x2={x + width / 2}
                y2={bodyTop}
                stroke={wickColor}
                strokeWidth={wickWidth}
            />
            {/* Lower Wick (bottom of body to low) */}
            <line
                x1={x + width / 2}
                y1={bodyBottom}
                x2={x + width / 2}
                y2={y + height}
                stroke={wickColor}
                strokeWidth={wickWidth}
            />
            {/* Body (Open to Close) */}
            <rect
                x={bodyX}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
                stroke={color}
                strokeWidth={1}
            />
        </g>
    );
};

export const P2PTradingChart = ({ assetId }: P2PTradingChartProps) => {
    const [timeInterval, setTimeInterval] = useState('2m');
    const [isLoading, setIsLoading] = useState(false);
    const [tradeData, setTradeData] = useState<ChartDataPoint[]>([]);
    const [sentimentData, setSentimentData] = useState<ChartDataPoint[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!assetId) return;
            setIsLoading(true);
            try {
                const data = await marketplaceService.getSecondaryMarketChartData(assetId, timeInterval);
                console.log('Fetched chart data:', data);

                // Process Trade Candles with sequential indexing
                const processedTrades = (data.tradeCandles || []).map((item: any, index: number) => ({
                    index, // Sequential index for X-axis positioning
                    time: item.time * 1000, // Convert seconds to ms for JS Date
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume,
                }));
                setTradeData(processedTrades);

                // Process Order Book Candles (Sentiment) with sequential indexing
                const processedSentiment = (data.orderBookCandles || []).map((item: any, index: number) => ({
                    index, // Sequential index for X-axis positioning
                    time: item.time * 1000,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume,
                }));
                setSentimentData(processedSentiment);

            } catch (error) {
                console.error('Failed to fetch chart data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        // Set up polling interval
        const poll = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(poll);
    }, [assetId, timeInterval]);

    const hasSentimentData = sentimentData.length > 0;
    const hasTradeData = tradeData.length > 0;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-xl text-xs font-gellix z-50">
                    <p className="text-gray-500 mb-2 font-medium">{format(new Date(data.time), 'MMM dd, HH:mm')}</p>
                    <div className="space-y-1">
                        <p className="flex justify-between gap-4"><span className="text-gray-500">O:</span> <span className="font-semibold">${data.open.toFixed(2)}</span></p>
                        <p className="flex justify-between gap-4"><span className="text-gray-500">H:</span> <span className="font-semibold text-green-600">${data.high.toFixed(2)}</span></p>
                        <p className="flex justify-between gap-4"><span className="text-gray-500">L:</span> <span className="font-semibold text-red-600">${data.low.toFixed(2)}</span></p>
                        <p className="flex justify-between gap-4"><span className="text-gray-500">C:</span> <span className="font-semibold text-[#0071C5]">${data.close.toFixed(2)}</span></p>
                        {data.volume !== undefined && (
                            <p className="flex justify-between gap-4 border-t border-gray-100 pt-1 mt-1">
                                <span className="text-gray-500">Vol:</span>
                                <span className="font-semibold">{data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 flex flex-col border border-neutral-200 space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-[#111111] font-gellix">Market Charts</h2>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-hide">
                    {INTERVALS.map((int) => (
                        <button
                            key={int.value}
                            onClick={() => setTimeInterval(int.value)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap font-gellix",
                                timeInterval === int.value
                                    ? "bg-[#111111] text-white"
                                    : "text-gray-500 hover:bg-gray-100"
                            )}
                        >
                            {int.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && !hasSentimentData && !hasTradeData ? (
                <div className="flex items-center justify-center h-[400px]">
                    <PageLoader text="Loading market data..." />
                </div>
            ) : (
                <>
                    {/* CHART 1: Market Depth (Order Book Sentiment) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-[#0071C5] font-gellix">Market Depth</h3>
                                <p className="text-xs text-gray-500">Order book activity & sentiment</p>
                            </div>
                            {hasSentimentData && (
                                <div className="text-xs text-gray-500">
                                    {sentimentData.length} candle{sentimentData.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        <div className="h-[350px] w-full">
                            {!hasSentimentData ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <p className="font-medium font-gellix">No Order Book Activity</p>
                                    <p className="text-xs mt-1">Orders will appear when placed</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={sentimentData}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="index"
                                            type="number"
                                            domain={[0, sentimentData.length - 1]}
                                            ticks={sentimentData.map((_, i) => i).filter((_, i) => i % Math.ceil(sentimentData.length / 8) === 0)}
                                            tickFormatter={(index) => {
                                                const candle = sentimentData[index];
                                                return candle ? format(new Date(candle.time), 'HH:mm') : '';
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                                            orientation="right"
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        {/* Candlesticks */}
                                        <Bar
                                            dataKey={(datum) => [datum.low, datum.high]}
                                            shape={<CandleStickShape />}
                                            isAnimationActive={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* CHART 2: Price Action (Trade Executions) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-[#26a69a] font-gellix">Price Action</h3>
                                <p className="text-xs text-gray-500">Executed trades & actual prices</p>
                            </div>
                            {hasTradeData && (
                                <div className="text-xs text-gray-500">
                                    {tradeData.length} candle{tradeData.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        <div className="h-[350px] w-full">
                            {!hasTradeData ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <p className="font-medium font-gellix">No Trading Activity</p>
                                    <p className="text-xs mt-1">Trades will appear when executed</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={tradeData}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="index"
                                            type="number"
                                            domain={[0, tradeData.length - 1]}
                                            ticks={tradeData.map((_, i) => i).filter((_, i) => i % Math.ceil(tradeData.length / 8) === 0)}
                                            tickFormatter={(index) => {
                                                const candle = tradeData[index];
                                                return candle ? format(new Date(candle.time), 'HH:mm') : '';
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                                            orientation="right"
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        {/* Candlesticks */}
                                        <Bar
                                            dataKey={(datum) => [datum.low, datum.high]}
                                            shape={<CandleStickShape />}
                                            isAnimationActive={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
