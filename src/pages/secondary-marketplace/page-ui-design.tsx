import { useState } from 'react';
import { AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';

const TradingEnginePage = () => {
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [payAmount, setPayAmount] = useState('');
    const [receiveAmount, setReceiveAmount] = useState('');
    const [timeRange, setTimeRange] = useState('1D');
    const [payToken, setPayToken] = useState<'USDC' | 'INTCon'>('USDC');
    const [receiveToken, setReceiveToken] = useState<'USDC' | 'INTCon'>('INTCon');

    // Mock chart data
    const chartData = [
        { time: '01/02 08:30', price: 37.05 },
        { time: '01/02 11:30', price: 37.18 },
        { time: '01/02 14:30', price: 37.25 },
        { time: '01/02 17:30', price: 37.15 },
        { time: '01/02 20:30', price: 37.50 },
        { time: '01/02 23:30', price: 39.20 },
        { time: '01/03 02:30', price: 39.45 },
        { time: '01/03 05:30', price: 39.48 },
    ];

    const handleSwapTokens = () => {
        setPayToken(receiveToken);
        setReceiveToken(payToken);
        setPayAmount(receiveAmount);
        setReceiveAmount(payAmount);
    };

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {/* Main Container */}
            <div className="max-w-[1400px] mx-auto px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN - Scrollable */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#0071C5] rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">intel</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
                                    Intel <span className="font-normal text-[#6B7280]">INTCon</span>
                                </h1>
                            </div>
                        </div>

                        {/* Chart Card */}
                        <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            {/* Price Display */}
                            <div className="mb-6">
                                <h2 className="text-[56px] font-bold text-[#111111] leading-none tracking-tight">
                                    $39.48
                                </h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1 text-[#10B981]">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 3.33334V12.6667M8 3.33334L12 7.33334M8 3.33334L4 7.33334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span className="text-sm font-medium">$2.43 (6.5699%)</span>
                                    </div>
                                    <span className="text-sm text-[#6B7280]">24H</span>
                                </div>
                            </div>

                            {/* Time Range Selector */}
                            <div className="flex gap-2 mb-6">
                                {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === range
                                                ? 'bg-[#F3F4F6] text-[#111111]'
                                                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>

                            {/* Chart */}
                            <div className="h-[320px] -mx-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            orientation="right"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                            domain={[37, 40.5]}
                                            ticks={[37.00, 37.50, 38.00, 38.50, 39.00, 39.50, 40.00, 40.50]}
                                            tickFormatter={(value) => value.toFixed(2)}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#111111',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                            }}
                                            labelStyle={{ color: '#9CA3AF', fontSize: 11 }}
                                            itemStyle={{ color: '#FFFFFF', fontSize: 13, fontWeight: 500 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            fill="url(#priceGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <h3 className="text-xl font-semibold text-[#111111] mb-4">About</h3>
                            <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
                                Intel Corporation engages in the design, manufacture, and sale of computer products and technologies worldwide. The company operates through CCG, DCG, IOTG, Mobileye, NSG, PSG, and All Other segments. It offers platform products, such as central processing units...{' '}
                                <button className="text-[#111111] font-medium underline decoration-[#6B7280] underline-offset-2">Show More</button>
                            </p>

                            {/* Supporting Chains */}
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-sm text-[#6B7280]">Supporting Chains</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#627EEA] flex items-center justify-center">
                                            <svg width="12" height="20" viewBox="0 0 12 20" fill="white">
                                                <path d="M6 0L0 10.25L6 13.875L12 10.25L6 0Z" />
                                                <path d="M0 11.5L6 20L12 11.5L6 15.125L0 11.5Z" opacity="0.6" />
                                            </svg>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-[#2775CA] flex items-center justify-center text-white text-[10px] font-bold">OP</div>
                                        <span className="text-sm text-[#111111] font-medium">Underlying Asset Name</span>
                                    </div>
                                    <span className="ml-auto text-sm text-[#111111] font-medium">Intel Corporation Common Stock</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-[#6B7280]">Underlying Address</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
                                        <span className="text-sm text-[#627EEA] font-mono">0x4a41...2c37</span>
                                    </div>
                                    <span className="ml-auto text-sm text-[#111111] font-medium">Underlying Asset Ticker</span>
                                    <span className="text-sm font-semibold text-[#111111]">INTC</span>
                                </div>
                            </div>

                            {/* Category */}
                            <div className="mb-6">
                                <span className="text-sm text-[#6B7280] mr-3">Category</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-xs font-medium mr-2">
                                    Equities
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E0E7FF] text-[#4F46E5] text-xs font-medium">
                                    Stock
                                </span>
                                <span className="ml-4 text-sm text-[#6B7280]">Shares Per Token</span>
                                <span className="ml-2 text-sm font-semibold text-[#111111]">1 INTCon = 1.00 INTC</span>
                            </div>

                            {/* Statistics */}
                            <div>
                                <h4 className="text-base font-semibold text-[#111111] mb-4">Statistics</h4>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                    {/* Token Price 24H */}
                                    <div>
                                        <p className="text-sm text-[#6B7280] mb-3 flex items-center gap-1">
                                            Token Price <span className="text-xs">24H</span>
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-[#6B7280]">Open</span>
                                                <span className="text-[#111111] font-medium">$37.04</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#6B7280]">High</span>
                                                <span className="text-[#111111] font-medium">$39.66</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#6B7280]">Low</span>
                                                <span className="text-[#111111] font-medium">$37.02</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Underlying Asset Price 24H */}
                                    <div>
                                        <p className="text-sm text-[#6B7280] mb-3 flex items-center gap-1">
                                            Underlying Asset Price <span className="text-xs">24H</span>
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-[#6B7280]">Open</span>
                                                <span className="text-[#111111] font-medium">$37.04</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#6B7280]">High</span>
                                                <span className="text-[#111111] font-medium">$39.66</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#6B7280]">Low</span>
                                                <span className="text-[#111111] font-medium">$37.02</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Market Stats */}
                                <div className="mt-6 space-y-3">
                                    <div>
                                        <p className="text-sm text-[#6B7280] mb-1 flex items-center gap-1">
                                            Underlying Asset Statistics
                                        </p>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#6B7280]">Total Market Cap</span>
                                        <span className="text-[#111111] font-medium">$287.84B</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#6B7280]">24h Volume</span>
                                        <span className="text-[#111111] font-medium">95,334,394</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#6B7280]">Average Volume</span>
                                        <span className="text-[#111111] font-medium">100,045,490</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Also Available On */}
                        <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center justify-between">
                                <h4 className="text-base font-semibold text-[#111111]">Also Available On</h4>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#8247E5] flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 0L0 8L8 16L16 8L8 0Z" />
                                        </svg>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
                                    <span className="text-sm font-medium text-[#111111]">2 more</span>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#6B7280]">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Sticky Trading Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <div className="bg-[#F3F4F6] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                                {/* Header with Buy/Sell Toggle and Network Badge */}
                                <div className="flex items-center justify-between mb-6">
                                    {/* Buy/Sell Toggle */}
                                    <div className="flex items-center bg-white rounded-lg p-1">
                                        <button
                                            onClick={() => setActiveTab('buy')}
                                            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'buy'
                                                    ? 'bg-transparent text-[#111111] shadow-none'
                                                    : 'text-[#6B7280] hover:text-[#111111]'
                                                }`}
                                        >
                                            Buy
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('sell')}
                                            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'sell'
                                                    ? 'bg-transparent text-[#111111] shadow-none'
                                                    : 'text-[#6B7280] hover:text-[#111111]'
                                                }`}
                                        >
                                            Sell
                                        </button>
                                    </div>

                                    {/* Network Badge */}
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                            <svg width="12" height="20" viewBox="0 0 12 20" fill="white" opacity="0.9">
                                                <path d="M6 0L0 10.25L6 13.875L12 10.25L6 0Z" />
                                                <path d="M0 11.5L6 20L12 11.5L6 15.125L0 11.5Z" opacity="0.6" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-[#111111]">Ethereum</span>
                                    </div>
                                </div>

                                {/* Trading Card */}
                                <div className="bg-white rounded-[16px] p-6 mb-6">
                                    {/* Pay Section */}
                                    <div className="mb-4">
                                        <label className="text-sm text-[#6B7280] block mb-2">Pay</label>
                                        <div className="flex items-center justify-between">
                                            <input
                                                type="text"
                                                placeholder="0"
                                                value={payAmount}
                                                onChange={(e) => setPayAmount(e.target.value)}
                                                className="text-[36px] font-medium text-[#111111] bg-transparent border-none outline-none w-full placeholder:text-[#D1D5DB] tracking-tight"
                                            />
                                            <button className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors px-3 py-2 rounded-lg">
                                                {payToken === 'USDC' ? (
                                                    <>
                                                        <div className="w-6 h-6 rounded-full bg-[#2775CA] flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold">$</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-[#111111]">{payToken}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-6 h-6 bg-[#0071C5] rounded-full flex items-center justify-center">
                                                            <span className="text-white font-bold text-[10px]">i</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-[#111111]">{payToken}</span>
                                                    </>
                                                )}
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#6B7280]">
                                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Swap Arrow */}
                                    <div className="flex justify-center my-4">
                                        <button
                                            onClick={handleSwapTokens}
                                            className="w-10 h-10 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-all flex items-center justify-center group"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#6B7280] group-hover:text-[#111111] transition-colors">
                                                <path d="M6 13L6 4M6 13L3 10M6 13L9 10M14 7L14 16M14 7L11 10M14 7L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Receive Section */}
                                    <div>
                                        <label className="text-sm text-[#6B7280] block mb-2">Receive</label>
                                        <div className="flex items-center justify-between">
                                            <input
                                                type="text"
                                                placeholder="0"
                                                value={receiveAmount}
                                                onChange={(e) => setReceiveAmount(e.target.value)}
                                                className="text-[36px] font-medium text-[#111111] bg-transparent border-none outline-none w-full placeholder:text-[#D1D5DB] tracking-tight"
                                            />
                                            <button className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors px-3 py-2 rounded-lg">
                                                {receiveToken === 'INTCon' ? (
                                                    <>
                                                        <div className="w-6 h-6 bg-[#0071C5] rounded-full flex items-center justify-center">
                                                            <span className="text-white font-bold text-[10px]">i</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-[#111111]">{receiveToken}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-6 h-6 rounded-full bg-[#2775CA] flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold">$</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-[#111111]">{receiveToken}</span>
                                                    </>
                                                )}
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#6B7280]">
                                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Rate Information */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#6B7280]">Rate</span>
                                        <span className="text-[#111111] font-medium">1 INTCon = 39 USDC ($39.48)</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[#6B7280]">Shares Per Token</span>
                                            <div className="w-3.5 h-3.5 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] text-[10px] font-medium">?</div>
                                        </div>
                                        <span className="text-[#111111] font-medium">1 INTCon = 1.00 INTC</span>
                                    </div>
                                </div>

                                {/* Sign In Button */}
                                <button className="w-full bg-[#000000] hover:bg-[#1a1a1a] text-white font-medium py-4 rounded-[12px] transition-all text-[15px]">
                                    Sign In to Continue
                                </button>

                                {/* Disclaimer */}
                                <div className="mt-6 space-y-3 text-[11px] text-[#6B7280] leading-relaxed">
                                    <p>
                                        Join the waitlist after signing up to be among the first to experience the platform.
                                    </p>
                                    <p>
                                        Global Markets tokens have not been registered under the US Securities Act of 1933, as amended, or the securities or other laws of any other jurisdiction, and may not be offered or sold in the US or to US persons unless registered under the Act or an exemption from the Act is available. The tokens are offered and sold in the EEA and UK solely to qualified investors, and in Switzerland solely to professional clients. Other prohibitions and restrictions apply. See additional information below.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradingEnginePage;