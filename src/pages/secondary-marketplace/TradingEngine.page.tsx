// src/pages/marketplace/asset/AssetDetails.page.tsx
import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';

const TradeEnginePage = () => {


    // Mock data for UI
    const mockAsset = {
        assetId: 'ASSET-001',
        metadata: {
            invoiceNumber: 'INV-2024-001',
            faceValue: '50000',
            currency: 'USD',
            issueDate: '2024-01-01',
            dueDate: '2024-12-31',
            buyerName: 'Acme Corporation',
            riskTier: 'medium',
        },
        tokenParams: {
            totalSupply: '1000000000000000000000', // 1000 tokens (18 decimals)
            pricePerToken: '50000000', // $50 USDC (6 decimals)
            minInvestment: '10000000000000000000', // 10 tokens (18 decimals)
        },
        listing: {
            sold: '250000000000000000000', // 250 tokens sold
        },
        status: 'LISTED',
        token: {
            address: '0x1234567890123456789012345678901234567890',
        },
        attestation: {
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        },
        registry: {
            blockNumber: 12345678,
        },
    };

    const mockChartData = [
        { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, tokensPurchased: 50 },
        { timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, tokensPurchased: 75 },
        { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, tokensPurchased: 120 },
        { timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, tokensPurchased: 90 },
        { timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, tokensPurchased: 150 },
        { timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, tokensPurchased: 200 },
        { timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, tokensPurchased: 180 },
    ];

    const [tokensToBuy, setTokensToBuy] = useState('');
    const [tokensToSell, setTokensToSell] = useState('');

    // Mock balances
    const usdcBalance = '1000.00';

    const methPrice = 2500000000; // $2500 (6 decimals)

    const asset = mockAsset;
    const formattedChartData = mockChartData;

    // Calculate token availability and limits
    const totalSupply = parseFloat(asset.tokenParams.totalSupply) / 1e18;
    const soldTokens = parseFloat(asset.listing?.sold || '0') / 1e18;
    const availableTokens = totalSupply - soldTokens;
    const minInvestment = parseFloat(asset.tokenParams.minInvestment) / 1e18;

    // Calculate estimated total price
    const estimatedTotalPrice = tokensToBuy && asset.tokenParams.pricePerToken
        ? ((parseFloat(tokensToBuy) * parseFloat(asset.tokenParams.pricePerToken)) / 1e6).toFixed(2)
        : '0.00';

    // Calculate required mETH
    const calculatedMethAmount = (() => {
        if (!tokensToSell || !asset?.tokenParams?.pricePerToken || !methPrice) return 0;
        const tokens = parseFloat(tokensToSell);
        const tokenPrice = parseFloat(asset.tokenParams.pricePerToken);
        const methPriceVal = methPrice;
        const meth = (tokens * tokenPrice * 1.5) / methPriceVal;
        return meth;
    })();

    const calculatedMethString = calculatedMethAmount > 0 ? calculatedMethAmount.toFixed(6) : '';

    const handletokensell = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTokensToSell(e.target.value);
    };

    const handleBuyTokens = async () => {
        console.log('Buy tokens clicked:', tokensToBuy);
    };

    const handleOpenSellPosition = async () => {
        console.log('Open Sell position clicked:', tokensToSell);
    };


    return (
        <div className="min-h-screen bg-white/5 max-w-[90vw] mx-auto p-10">
            <div className="">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header */}
                        <div className='flex flex-row  items-center justify-between'>
                            <div className='flex flex-row gap-4'>
                                <a href="/marketplace" className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                </a>
                                <h1 className="text-3xl font-medium text-[#111111]">
                                    Invoice {asset.metadata.invoiceNumber}
                                </h1>
                                <div>
                                </div>
                            </div>
                            <p className="text-sm text-[#4f5258]">
                                Status: <span className="font-medium">{asset.status}</span>
                            </p>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-[#EBF0E8] rounded-3xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-5xl font-semibold text-[#111111]">
                                        ${(parseFloat(asset.tokenParams.pricePerToken) / 1e6).toFixed(2)}
                                    </p>
                                    <p className="text-green-800 text-sm mt-1">Token Price (USDC)</p>
                                </div>
                            </div>
                            {formattedChartData.length > 0 ? (
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={formattedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="timestamp"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                tickFormatter={(timestamp) => {
                                                    const date = new Date(timestamp);
                                                    return date.toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                }}
                                            />
                                            <YAxis
                                                orientation="right"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                tickFormatter={(tokens) => {
                                                    // Format large numbers with K, M suffix
                                                    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
                                                    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
                                                    return tokens.toFixed(0);
                                                }}
                                                label={{ value: 'Tokens Purchased', angle: -90, position: 'insideRight', style: { fill: '#6B7280', fontSize: 12 } }}
                                            />
                                            <Tooltip
                                                formatter={(value: any) => {
                                                    if (typeof value === 'number') {
                                                        return [`${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens`, ''];
                                                    }
                                                    return ['', ''];
                                                }}
                                                labelFormatter={(timestamp) => {
                                                    const date = new Date(timestamp);
                                                    return date.toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="tokensPurchased"
                                                stroke="#3B82F6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorTokens)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[400px] flex items-center justify-center">
                                    <p>No purchase activity yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Invoice Details */}
                        <div className="bg-white rounded-3xl p-6">
                            <h2 className="text-2xl font-semibold text-[#111111] mb-4">Invoice Details</h2>
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Face Value</p>
                                    <p className="font-medium text-[#111111]">
                                        {asset.metadata.currency} {parseFloat(asset.metadata.faceValue).toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Issue Date</p>
                                    <p className="font-medium text-[#111111]">
                                        {new Date(asset.metadata.issueDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Due Date</p>
                                    <p className="font-medium text-[#111111]">
                                        {new Date(asset.metadata.dueDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Total Supply</p>
                                    <p className="font-medium text-[#111111]">
                                        {(parseFloat(asset.tokenParams.totalSupply) / 1e18).toLocaleString()} tokens
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Minimum Investment</p>
                                    <p className="font-medium text-[#111111]">
                                        {(parseFloat(asset.tokenParams.minInvestment) / 1e18).toLocaleString()} tokens
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Sold Tokens</p>
                                    <p className="font-medium text-[#111111]">
                                        {(parseFloat(asset.listing?.sold || '0') / 1e18).toLocaleString()} tokens
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Buyer</p>
                                    <p className="font-medium text-[#111111]">{asset.metadata.buyerName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Risk & Blockchain Data */}
                        <div className="bg-white rounded-3xl p-6">
                            <h2 className="text-2xl font-semibold text-[#111111] mb-4">Risk & Blockchain Data</h2>
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Risk Tier</p>
                                    <p className="font-medium text-[#111111] capitalize">{asset.metadata.riskTier}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Token Address</p>
                                    <p className="font-medium text-[#111111] font-mono text-xs break-all">
                                        {asset.token?.address || 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Attestation Hash</p>
                                    <p className="font-medium text-[#111111] font-mono text-xs break-all">
                                        {asset.attestation?.hash || 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#6B7280]">Registry Block</p>
                                    <p className="font-medium text-[#111111]">{asset.registry?.blockNumber || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Right Column - Sticky Buy Panel */}
                    <div className="relative">
                        <div className="sticky top-30">
                            <div className="bg-transparent rounded-3xl p-6 shadow-md border border-gray-100">
                                <Tabs defaultValue="standard" className="w-full">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-semibold text-[#111111]">Buy Tokens</h2>
                                        <TabsList className="bg-gray-100 p-1 rounded-lg">
                                            <TabsTrigger value="standard" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">USDC</TabsTrigger>
                                            <TabsTrigger value="Sell" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Sell</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="standard">
                                        <div className="space-y-6">
                                            <div className="bg-[#F3F4F6] rounded-2xl p-4">
                                                <label htmlFor="tokens-to-buy" className="text-xs text-[#6B7280]">
                                                    Tokens to buy
                                                </label>
                                                <Input
                                                    id="tokens-to-buy"
                                                    type="number"
                                                    placeholder="0"
                                                    value={tokensToBuy}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;
                                                        setTokensToBuy(inputValue);
                                                    }}
                                                    min={(() => {
                                                        const totalSupply = parseFloat(asset.tokenParams.totalSupply) / 1e18;
                                                        const soldTokens = parseFloat(asset.listing?.sold || '0') / 1e18;
                                                        const availableTokens = totalSupply - soldTokens;
                                                        const minInvestment = parseFloat(asset.tokenParams.minInvestment) / 1e18;
                                                        return availableTokens < minInvestment ? availableTokens : minInvestment;
                                                    })()}
                                                    className=" border-none text-2xl font-medium text-[#111111] p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                                />
                                                <p className="text-xs text-[#6B7280] mt-2">
                                                    Available: {(() => {
                                                        const totalSupply = parseFloat(asset.tokenParams.totalSupply) / 1e18;
                                                        const soldTokens = parseFloat(asset.listing?.sold || '0') / 1e18;
                                                        return (totalSupply - soldTokens).toLocaleString();
                                                    })()} tokens
                                                </p>
                                            </div>
                                            <div className="bg-[#F3F4F6] rounded-2xl p-4 gap-2">
                                                <label htmlFor="total-price" className="text-xs text-[#6B7280] ">
                                                    Estimated Total Price
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
                                                        alt="USDC"
                                                        className="w-6 h-6 rounded-full"
                                                    />
                                                    <p id="total-price" className="text-2xl font-medium text-[#111111]">
                                                        ${estimatedTotalPrice} USDC
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-[#6B7280] space-y-1">
                                                <div className="flex justify-between">
                                                    <span>Your USDC Balance</span>
                                                    <span className="font-medium text-[#111111]">
                                                        {parseFloat(usdcBalance).toFixed(2)} USDC
                                                    </span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span>Min Investment</span>
                                                    <span className="font-medium text-[#111111]">
                                                        {(parseFloat(asset.tokenParams.minInvestment) / 1e18).toLocaleString()} tokens
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleBuyTokens}
                                                disabled={availableTokens <= 0 || parseFloat(usdcBalance) < parseFloat(estimatedTotalPrice) || (availableTokens >= minInvestment && parseFloat(tokensToBuy || '0') < minInvestment) || parseFloat(tokensToBuy || '0') > availableTokens}
                                                className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {(() => {
                                                    const enteredAmount = parseFloat(tokensToBuy || '0');
                                                    if (availableTokens <= 0) return 'Sold Out';
                                                    if (parseFloat(usdcBalance) < parseFloat(estimatedTotalPrice)) return 'Insufficient USDC';
                                                    if (enteredAmount > availableTokens) return `Max Available: ${availableTokens.toLocaleString()}`;
                                                    if (availableTokens >= minInvestment && enteredAmount < minInvestment) return `Min Investment: ${minInvestment.toLocaleString()}`;
                                                    return 'Buy Tokens';
                                                })()}
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="Sell">
                                        <div className="space-y-6">
                                            <div className="bg-[#F3F4F6] rounded-2xl p-4">
                                                <label className="text-xs text-[#6B7280]">
                                                    Tokens to Sell
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={tokensToSell}
                                                        onChange={handletokensell}
                                                        className=" border-none text-2xl font-medium text-[#111111] p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    />
                                                </div>

                                            </div>

                                            <div className="bg-[#F3F4F6] rounded-2xl p-4 space-y-3">
                                                <div>
                                                    <p className="text-xs text-[#6B7280] mb-1">Required Collateral</p>
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src="/meth-crystal.svg"
                                                            alt="mETH"
                                                            className="w-6 h-6 rounded-full"
                                                        />
                                                        <p className="text-2xl font-medium text-[#111111]">
                                                            {calculatedMethString || '0.00'} mETH
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-3 border-t border-gray-200">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-[#6B7280]">Buying Power</span>
                                                        <span className="text-sm font-medium text-[#111111]">
                                                            {(() => {
                                                                if (!calculatedMethAmount) return '$0.00 USDC';
                                                                const bp = (calculatedMethAmount * methPrice) / (1.5 * 1e6);
                                                                return `$${bp.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-xs text-[#6B7280]">mETH Price</span>
                                                        <span className="text-sm font-medium text-[#111111]">
                                                            ${(methPrice / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-[#6B7280] space-y-1">
                                                <div className="flex justify-between">
                                                    <span>Health Factor</span>
                                                    <span className="font-medium text-green-600">1.50 (Initial)</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Liquidation Threshold</span>
                                                    <span className="font-medium text-red-500">1.10</span>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleOpenSellPosition}
                                                disabled={!tokensToSell || calculatedMethAmount <= 0 || (availableTokens >= minInvestment && parseFloat(tokensToSell || '0') < minInvestment) || parseFloat(tokensToSell || '0') > availableTokens}
                                                className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {(() => {
                                                    const enteredAmount = parseFloat(tokensToSell || '0');
                                                    if (enteredAmount > availableTokens) return `Max Available: ${availableTokens.toLocaleString()}`;
                                                    if (availableTokens >= minInvestment && enteredAmount < minInvestment) return `Min Investment: ${minInvestment.toLocaleString()}`;
                                                    return 'Open Selld Position';
                                                })()}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradeEnginePage;
