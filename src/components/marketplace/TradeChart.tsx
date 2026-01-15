import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { format } from 'date-fns';
import { PageLoader } from '../ui/page-loader';

interface TradeChartProps {
    data: any[];
    isLoading?: boolean;
}

export const TradeChart = ({ data, isLoading }: TradeChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (chartRef.current && !chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
            chartInstance.current.group = 'trading-engine';
        }

        const handleResize = () => {
            chartInstance.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, []);

    useEffect(() => {
        if (chartInstance.current && data.length > 0) {
            const options = getChartOption(data);
            chartInstance.current.setOption(options, true);
        }
    }, [data]);

    const getChartOption = (data: any[]): echarts.EChartsOption => {
        const allPrices = data.flatMap(d => d.value);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const range = maxPrice - minPrice;

        /**
         * ADJUSTMENT 1: Dynamic Buffer
         * If the range is very small (less than 1 dollar), we use a very tight 5% buffer.
         * If the price is flat (range = 0), we default to a 0.05 cent span to ensure visibility.
         */
        const bufferPercentage = range < 1 ? 0.05 : 0.1;
        const padding = range === 0 ? 0.05 : range * bufferPercentage;

        const yMin = Math.max(0, minPrice - padding);
        const yMax = maxPrice + padding;


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
            grid: { top: 30, bottom: 60, left: 10, right: 70, containLabel: true },
            xAxis: {
                type: 'category',
                data: data.map((_, i) => i),
                axisLine: { show: true },
                axisTick: { show: true },
                axisLabel: {
                    show: true,
                    color: '#94a3b8',
                    fontSize: 10,
                    fontWeight: 'bold',
                    formatter: (value: any) => {
                        const idx = Number(value);
                        return data[idx] ? format(new Date(data[idx].time), 'HH:mm') : '';
                    }
                },
                splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
            },
            yAxis: {
                type: 'value',
                position: 'right',
                scale: true,
                min: yMin,
                max: yMax,
                minInterval: 0.01,
                splitNumber: 10,
                axisLine: { show: true },
                axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', formatter: (val: number) => `$${val.toFixed(2)}` },
                splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
            },
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    startValue: Math.max(0, data.length - 35),
                    endValue: data.length - 1,
                    zoomLock: false
                },
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

    return (
        <div className="bg-transparent p-8 space-y-4 select-none relative h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-medium font-gellix text-slate-900 tracking-tight">Trade Executions</h2>
                </div>
            </div>
            {isLoading && (
                <div className="absolute inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center">
                    <PageLoader text='' />
                </div>
            )}
            <div ref={chartRef} style={{ height: '600px', width: '100%' }} className="bg-transparet transition-all" />
        </div>
    );
};
