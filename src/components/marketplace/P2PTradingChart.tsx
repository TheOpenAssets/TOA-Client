import { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { marketplaceService } from '../../lib/api/marketplace.service';
import { PageLoader } from '../ui/page-loader';
import { format } from 'date-fns';

interface P2PTradingChartProps {
    assetId: string;
}

export const P2PTradingChart = ({ assetId }: P2PTradingChartProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const hasRenderedOnce = useRef(false);

    const sentimentRef = useRef<HTMLDivElement>(null);
    const tradeRef = useRef<HTMLDivElement>(null);

    const sentimentChart = useRef<echarts.ECharts | null>(null);
    const tradeChart = useRef<echarts.ECharts | null>(null);

    /* ----------------------------- INITIALIZATION ----------------------------- */
    const initCharts = useCallback(() => {
        if (sentimentRef.current && !sentimentChart.current) {
            sentimentChart.current = echarts.init(sentimentRef.current);
        }
        if (tradeRef.current && !tradeChart.current) {
            tradeChart.current = echarts.init(tradeRef.current);
        }
        if (sentimentChart.current && tradeChart.current) {
            echarts.connect([sentimentChart.current, tradeChart.current]);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            sentimentChart.current?.resize();
            tradeChart.current?.resize();
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            sentimentChart.current?.dispose();
            tradeChart.current?.dispose();
            sentimentChart.current = null;
            tradeChart.current = null;
        };
    }, []);

    /* ----------------------------- DATA PROCESSING ----------------------------- */
    const formatEChartsData = (candles: any[]) => {
        return (candles || []).map((c) => ({
            // ECharts format: [Open, Close, Low, High]
            value: [c.open, c.close, c.low, c.high],
            time: c.time * 1000,
            volume: c.volume || 0
        }));
    };

    /* ----------------------------- CHART OPTIONS ----------------------------- */
    const getChartOption = (data: any[], isSentiment: boolean): echarts.EChartsOption => {
        // Calculate dynamic scaling for the Y-axis
        const allPrices = data.flatMap(d => d.value);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const range = maxPrice - minPrice;

        // Apply a 10% vertical buffer to make candles look "proper" in height
        const buffer = range * 0.1 || 0.1;
        const yMin = Math.max(0, minPrice - buffer);
        const yMax = maxPrice + buffer;

        return {
            backgroundColor: 'transparent',
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross', label: { backgroundColor: '#111827' } },
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 0,
                shadowBlur: 20,
                shadowColor: 'rgba(0, 0, 0, 0.08)',
                formatter: (params: any) => {
                    const candle = params.find((p: any) => p.seriesType === 'candlestick');
                    if (!candle) return '';
                    const d = candle.data;
                    return `
                        <div style="font-weight: 800; margin-bottom: 8px; color: #94a3b8; font-size: 10px; text-transform: uppercase;">
                          ${format(new Date(d.time), 'MMM dd, HH:mm')}
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 30px; margin-bottom: 4px; font-size: 12px;"><span>Open</span> <b>$${d.value[0].toFixed(2)}</b></div>
                        <div style="display: flex; justify-content: space-between; gap: 30px; margin-bottom: 4px; font-size: 12px;"><span>High</span> <b style="color: #26a69a">$${d.value[3].toFixed(2)}</b></div>
                        <div style="display: flex; justify-content: space-between; gap: 30px; margin-bottom: 4px; font-size: 12px;"><span>Low</span> <b style="color: #ef5350">$${d.value[2].toFixed(2)}</b></div>
                        <div style="display: flex; justify-content: space-between; gap: 30px; font-size: 12px;"><span>Close</span> <b>$${d.value[1].toFixed(2)}</b></div>
                    `;
                }
            },
            grid: { top: 30, bottom: isSentiment ? 20 : 60, left: 10, right: 70, containLabel: true },
            xAxis: {
                type: 'category',
                data: data.map((_, i) => i),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    show: !isSentiment,
                    color: '#94a3b8',
                    fontSize: 10,
                    fontWeight: 'bold',
                    formatter: (value: any) => {
                        const idx = Number(value);
                        return data[idx] ? format(new Date(data[idx].time), 'HH:mm') : '';
                    }
                }
            },
            yAxis: {
                type: 'value',
                position: 'right',
                scale: true,
                min: yMin,
                max: yMax,
                axisLine: { show: false },
                axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', formatter: (val: number) => `$${val.toFixed(2)}` },
                splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
            },
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    startValue: Math.max(0, data.length - 35), // Default view: last 35 candles
                    endValue: data.length - 1,
                    zoomLock: false // Enabled zooming for user exploration
                },
                {
                    type: 'slider',
                    show: !isSentiment,
                    xAxisIndex: [0],
                    height: 20,
                    bottom: 10,
                    borderColor: 'transparent',
                    backgroundColor: '#f8fafc',
                    fillerColor: 'rgba(51, 65, 85, 0.1)',
                    handleStyle: { color: '#cbd5e1' }
                }
            ],
            series: [
                {
                    name: 'Candles',
                    type: 'candlestick',
                    data: data,
                    itemStyle: {
                        color: '#26a69a',
                        color0: '#ef5350',
                        borderColor: '#26a69a',
                        borderColor0: '#ef5350',
                        borderWidth: 2
                    }
                },
                {
                    name: 'High Line',
                    type: 'line',
                    data: data.map(d => d.value[3]),
                    symbol: 'none',
                    lineStyle: { color: '#26a69a', width: 1, type: 'dashed', opacity: 0.4 },
                    smooth: true
                },
                {
                    name: 'Low Line',
                    type: 'line',
                    data: data.map(d => d.value[2]),
                    symbol: 'none',
                    lineStyle: { color: '#ef5350', width: 1, type: 'dashed', opacity: 0.4 },
                    smooth: true
                }
            ]
        };
    };

    /* ----------------------------- FETCH & SYNC ----------------------------- */
    const fetchData = useCallback(async () => {
        if (!assetId) return;
        const isFirstLoad = !hasRenderedOnce.current;
        if (isFirstLoad) setIsLoading(true);

        try {
            const res = await marketplaceService.getSecondaryMarketChartData(assetId, '5m');
            const sData = formatEChartsData(res.orderBookCandles);
            const tData = formatEChartsData(res.tradeCandles);

            initCharts();

            sentimentChart.current?.setOption(getChartOption(sData, true), true);
            tradeChart.current?.setOption(getChartOption(tData, false), true);

            hasRenderedOnce.current = true;
        } catch (error) {
            console.error('P2P Chart Sync Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [assetId, initCharts]);

    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 30000);
        return () => clearInterval(poll);
    }, [fetchData]);

    return (
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-neutral-100 space-y-8 select-none relative min-h-[750px]">
            {/* Unified Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Market Intelligence</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">5m Continuous Streaming</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <div className="w-2 h-2 rounded bg-[#0071C5]" /> INTENT
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <div className="w-2 h-2 rounded bg-[#26a69a]" /> PRICE
                    </div>
                </div>
            </div>

            {isLoading && !hasRenderedOnce.current && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-[32px]">
                    <PageLoader text="Syncing Market Flow..." />
                </div>
            )}

            <div className="space-y-6">
                <div className="relative group">
                    <div className="absolute top-3 left-4 z-10 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 px-2 py-1 rounded border border-slate-100">Market Sentiment</div>
                    <div ref={sentimentRef} style={{ height: '300px', width: '100%' }} className="bg-slate-50/20 rounded-3xl border border-slate-100 transition-all hover:border-slate-300" />
                </div>

                <div className="relative group">
                    <div className="absolute top-3 left-4 z-10 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 px-2 py-1 rounded border border-slate-100">Trade Executions</div>
                    <div ref={tradeRef} style={{ height: '340px', width: '100%' }} className="bg-slate-50/20 rounded-3xl border border-slate-100 transition-all hover:border-slate-300" />
                </div>

                <div className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    Drag chart or use slider to explore historical trends
                </div>
            </div>
        </div>
    );
};