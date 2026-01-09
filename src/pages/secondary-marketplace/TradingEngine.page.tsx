// src/pages/secondary-marketplace/TradingEngine.production.page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMarketplaceStore } from '../../stores/marketplace.store.ts';
import { useToast } from '../../hooks/useToast.tsx';
import { ToastContainer } from '../../components/ui/toast.tsx';
import { marketplaceService } from '../../lib/api/marketplace.service.ts';

// Contract addresses from environment
const SECONDARY_MARKET = (import.meta.env.VITE_SECONDARY_MARKETPLACE_ADDRESS || '0x69d2e2B05eDdB11774A132e2b61B9D10486bd33A') as `0x${string}`;
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238') as `0x${string}`;

// Minimal ERC20 ABI for balance and approval
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

interface OrderDetail {
    orderId: string;
    maker: string;
    amount: string;
    amountFormatted: string;
    priceFormatted: string;
    timestamp: string;
    txHash: string;
}

interface PriceLevel {
    price: string;
    priceFormatted: string;
    amount: string;
    amountFormatted: string;
    orderCount: number;
    orders: OrderDetail[];
}

const TradingEngineProductionPage = () => {
    const { assetId } = useParams<{ assetId: string }>();
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();
    const { toasts, success, error: showError, warning, removeToast } = useToast();

    // Fetch asset details, orderbook, trades, and balance
    const {
        currentAsset,
        isLoadingAsset,
        error: assetError,
        fetchAssetDetails,
        orderbook,
        isLoadingOrderbook,
        fetchOrderbook,
        tradeHistory,
        isLoadingTrades,
        fetchTradeHistory,
        myOrders,
        isLoadingMyOrders,
        fetchMyOrders,
        tradeableBalance,
        fetchTradeableBalance,
        p2pError,
        clearP2PError,
    } = useMarketplaceStore();

    // Wagmi hooks for contract interactions
    const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
    const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    // Trading state
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [transactionStep, setTransactionStep] = useState<'idle' | 'approving' | 'approved' | 'executing' | 'confirmed'>('idle');
    const [currentAction, setCurrentAction] = useState<'create' | 'fill' | 'cancel' | null>(null);

    // Read token balance and allowance
    const tokenAddress = currentAsset?.token?.address as `0x${string}` | undefined;

    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!tokenAddress && !!address },
    });

    const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, SECONDARY_MARKET] : undefined,
        query: { enabled: !!tokenAddress && !!address },
    });

    const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, SECONDARY_MARKET] : undefined,
        query: { enabled: !!address },
    });

    // Load all data on mount and when transaction confirms
    useEffect(() => {
        if (!assetId) return;
        fetchAssetDetails(assetId);
        fetchOrderbook(assetId);
        fetchTradeHistory(assetId);
        if (address) {
            fetchMyOrders(assetId);
            fetchTradeableBalance(assetId);
        }
    }, [assetId, address, fetchAssetDetails, fetchOrderbook, fetchTradeHistory, fetchMyOrders, fetchTradeableBalance]);

    // Refresh data after transaction confirms
    useEffect(() => {
        if (isTxConfirmed && assetId) {
            success('Transaction Confirmed', 'Your transaction has been successfully confirmed.');
            setTransactionStep('confirmed');
            setCurrentAction(null);
            setAmount('');
            setPrice('');
            setSelectedOrder(null);
            setIsOrderModalOpen(false);

            // Refresh all data
            setTimeout(() => {
                if (assetId) {
                    fetchOrderbook(assetId);
                    fetchTradeHistory(assetId);
                    fetchMyOrders(assetId);
                    fetchTradeableBalance(assetId);
                    refetchTokenBalance();
                    refetchTokenAllowance();
                    refetchUsdcBalance();
                    refetchUsdcAllowance();
                }
                setTransactionStep('idle');
            }, 2000);
        }
    }, [isTxConfirmed, assetId]);

    // Handle errors
    useEffect(() => {
        if (p2pError) {
            showError('P2P Error', p2pError);
            clearP2PError();
        }
    }, [p2pError]);

    // Check if asset is tradeable
    const isTradeable = currentAsset?.status === 'LISTED' || currentAsset?.status === 'ACTIVE' || currentAsset?.status !== 'PAYOUT_COMPLETE';

    // Calculate required approval amounts
    const getRequiredTokenApproval = useCallback(() => {
        if (!amount || orderType !== 'sell') return BigInt(0);
        try {
            return parseUnits(amount, 18);
        } catch {
            return BigInt(0);
        }
    }, [amount, orderType]);

    const getRequiredUsdcApproval = useCallback(() => {
        if (!amount || !price) return BigInt(0);
        try {
            const amountBigInt = parseUnits(amount, 18);
            const priceBigInt = parseUnits(price, 6);
            return (amountBigInt * priceBigInt) / parseUnits('1', 18);
        } catch {
            return BigInt(0);
        }
    }, [amount, price, orderType]);

    // Check approval status
    const needsTokenApproval = orderType === 'sell' && tokenAllowance !== undefined && getRequiredTokenApproval() > tokenAllowance;
    const needsUsdcApproval = orderType === 'buy' && usdcAllowance !== undefined && getRequiredUsdcApproval() > usdcAllowance;

    // Single-click order creation with automatic approval handling
    const handleCreateOrder = async (skipApprovalCheck = false) => {
        if (!address || !assetId || !amount || !price) {
            warning('Missing Information', 'Please fill in all fields and connect your wallet.');
            return;
        }

        if (!tokenAddress) {
            warning('Token Not Found', 'Asset token address is not available.');
            return;
        }

        if (!isTradeable) {
            warning('Asset Not Tradeable', 'This asset is not currently available for trading.');
            return;
        }

        // Only set action on initial call, not on retry after approval
        if (!skipApprovalCheck) {
            setCurrentAction('create');
            setTransactionStep('approving');
        }

        try {
            // Step 1: Check and execute approval if needed (only on initial call)
            if (!skipApprovalCheck) {
                if (orderType === 'sell' && needsTokenApproval) {
                    const approvalAmount = getRequiredTokenApproval();
                    writeContract({
                        address: tokenAddress,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [SECONDARY_MARKET, approvalAmount],
                    });
                    return; // Wait for approval to confirm, then useEffect will call again
                }

                if (orderType === 'buy' && needsUsdcApproval) {
                    const approvalAmount = getRequiredUsdcApproval();
                    writeContract({
                        address: USDC_ADDRESS,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [SECONDARY_MARKET, approvalAmount],
                    });
                    return; // Wait for approval to confirm, then useEffect will call again
                }
            }

            // Step 2: Approval is sufficient (or just completed), create order
            setTransactionStep('executing');
            const txData = await marketplaceService.getCreateOrderTxData({
                tokenAddress,
                amount: parseUnits(amount, 18).toString(),
                pricePerToken: parseUnits(price, 6).toString(),
                isBuy: orderType === 'buy',
            });

            writeContract({
                address: txData.to,
                abi: txData.abi,
                functionName: txData.functionName,
                args: txData.args,
            });
        } catch (error: any) {
            showError('Order Creation Failed', error.message || 'Failed to create order');
            setTransactionStep('idle');
            setCurrentAction(null);
        }
    };

    // Auto-proceed to order creation after approval confirms
    useEffect(() => {
        if (isTxConfirmed && transactionStep === 'approving' && currentAction === 'create') {
            setTransactionStep('approved');

            // Refetch allowances to get updated values
            const refetchPromises = [refetchTokenAllowance(), refetchUsdcAllowance()];

            // Wait for refetch to complete, then proceed with order creation
            Promise.all(refetchPromises).then(() => {
                // Small delay to ensure state updates propagate
                setTimeout(() => {
                    handleCreateOrder(true); // Skip approval check since we just approved
                }, 500);
            });
        }
    }, [isTxConfirmed, transactionStep, currentAction]);

    // Fill order from modal
    const handleFillOrder = async (order: OrderDetail, isBuyOrder: boolean, skipApprovalCheck = false) => {
        if (!address) {
            warning('Wallet Not Connected', 'Please connect your wallet to fill orders.');
            return;
        }

        if (!tokenAddress) {
            warning('Token Not Found', 'Asset token address is not available.');
            return;
        }

        // Only set action on initial call, not on retry after approval
        if (!skipApprovalCheck) {
            setCurrentAction('fill');
            setTransactionStep('approving');
        }

        try {
            // Step 1: Check and execute approval if needed (only on initial call)
            if (!skipApprovalCheck) {
                if (isBuyOrder) {
                    // Filling a buy order (we're selling tokens)
                    const requiredAmount = BigInt(order.amount);
                    if (!tokenAllowance || tokenAllowance < requiredAmount) {
                        writeContract({
                            address: tokenAddress,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [SECONDARY_MARKET, requiredAmount],
                        });
                        return; // Wait for approval to confirm, then useEffect will call again
                    }
                } else {
                    // Filling a sell order (we're buying tokens with USDC)
                    const pricePerToken = parseUnits(order.priceFormatted, 6);
                    const amountTokens = parseUnits(order.amountFormatted, 18);
                    const totalCost = (pricePerToken * amountTokens) / parseUnits('1', 18);

                    if (!usdcAllowance || usdcAllowance < totalCost) {
                        writeContract({
                            address: USDC_ADDRESS,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [SECONDARY_MARKET, totalCost],
                        });
                        return; // Wait for approval to confirm, then useEffect will call again
                    }
                }
            }

            // Step 2: Approval is sufficient (or just completed), fill order
            setTransactionStep('executing');
            const txData = await marketplaceService.getFillOrderTxData({
                orderId: order.orderId,
                amountToFill: order.amount,
            });

            writeContract({
                address: txData.to,
                abi: txData.abi,
                functionName: txData.functionName,
                args: txData.args,
            });
        } catch (error: any) {
            showError('Order Fill Failed', error.message || 'Failed to fill order');
            setTransactionStep('idle');
            setCurrentAction(null);
        }
    };

    // Auto-proceed to fill order after approval confirms
    useEffect(() => {
        if (isTxConfirmed && transactionStep === 'approving' && currentAction === 'fill' && selectedOrder) {
            setTransactionStep('approved');

            // Refetch allowances to get updated values
            const refetchPromises = [refetchTokenAllowance(), refetchUsdcAllowance()];

            // Wait for refetch to complete, then proceed with order fill
            Promise.all(refetchPromises).then(() => {
                // Small delay to ensure state updates propagate
                setTimeout(() => {
                    const isBuyOrder = orderbook?.bids?.some((level: PriceLevel) =>
                        level.orders.some(o => o.orderId === selectedOrder.orderId)
                    ) || false;
                    handleFillOrder(selectedOrder, isBuyOrder, true); // Skip approval check since we just approved
                }, 500);
            });
        }
    }, [isTxConfirmed, transactionStep, currentAction, selectedOrder]);

    // Cancel order
    const handleCancelOrder = async (orderId: string) => {
        if (!address) {
            warning('Wallet Not Connected', 'Please connect your wallet to cancel orders.');
            return;
        }

        setCurrentAction('cancel');
        setTransactionStep('executing');

        try {
            const txData = await marketplaceService.getCancelOrderTxData(orderId);
            writeContract({
                address: txData.to,
                abi: txData.abi,
                functionName: txData.functionName,
                args: txData.args,
            });
        } catch (error: any) {
            showError('Order Cancellation Failed', error.message || 'Failed to cancel order');
            setTransactionStep('idle');
            setCurrentAction(null);
        }
    };

    // Format chart data (from trade history)
    const chartData = tradeHistory
        ?.slice(-20)
        .map((trade: any) => ({
            time: new Date(trade.blockTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: parseFloat(formatUnits(BigInt(trade.pricePerToken), 6)),
        })) || [];

    const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].price :
        (orderbook?.summary?.bestAsk ? parseFloat(orderbook.summary.bestAsk) : 0);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-[#111111] mb-4">Connect Your Wallet</h1>
                    <p className="text-[#6B7280]">Please connect your wallet to access the trading engine.</p>
                </div>
            </div>
        );
    }

    if (isLoadingAsset) {
        return (
            <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#111111] mx-auto mb-4"></div>
                    <p className="text-[#6B7280]">Loading asset...</p>
                </div>
            </div>
        );
    }

    if (assetError || !currentAsset) {
        return (
            <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-[#111111] mb-4">Asset Not Found</h1>
                    <p className="text-[#6B7280] mb-6">{assetError || 'The requested asset could not be loaded.'}</p>
                    <button
                        onClick={() => navigate('/marketplace')}
                        className="px-6 py-3 bg-[#111111] text-white rounded-xl hover:bg-[#1a1a1a] transition-colors"
                    >
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <ToastContainer toasts={toasts} onClose={removeToast} />

            <div className="min-h-screen bg-[#F7F8FA]">
                <div className="max-w-[1400px] mx-auto px-8 py-8">
                    {/* Asset Banner */}
                    <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-[#0071C5] to-[#0052A3] rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                        {currentAsset.metadata?.buyerName?.substring(0, 2).toUpperCase() || 'RW'}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-[#111111] mb-1">
                                        {currentAsset.metadata?.invoiceNumber || 'Asset'}
                                    </h1>
                                    <p className="text-[#6B7280] text-sm">{currentAsset.metadata?.industry || 'Real World Asset'}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#F0FDF4] mb-2">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${isTradeable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span className={`text-sm font-medium ${isTradeable ? 'text-green-700' : 'text-gray-600'}`}>
                                        {isTradeable ? 'Trading Active' : 'Trading Inactive'}
                                    </span>
                                </div>
                                {!isTradeable && (
                                    <p className="text-xs text-[#6B7280]">Asset status: {currentAsset.status}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Chart and Orderbook */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Price Chart */}
                            <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <div className="mb-6">
                                    <h2 className="text-[48px] font-bold text-[#111111] leading-none tracking-tight">
                                        ${latestPrice.toFixed(2)}
                                    </h2>
                                    <p className="text-[#6B7280] text-sm mt-2">Last Trade Price</p>
                                </div>

                                <div className="h-[300px] -mx-4">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <XAxis dataKey="time" stroke="#6B7280" fontSize={12} />
                                                <YAxis stroke="#6B7280" fontSize={12} domain={['auto', 'auto']} />
                                                <Tooltip
                                                    contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                                                    labelStyle={{ color: '#111111', fontWeight: 600 }}
                                                />
                                                <Line type="monotone" dataKey="price" stroke="#0071C5" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-[#6B7280]">
                                            No trade history available
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Orderbook */}
                            <div className="bg-white rounded-[20px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <h2 className="text-xl font-semibold text-[#111111] mb-6">Order Book</h2>

                                {isLoadingOrderbook ? (
                                    <div className="text-center py-8 text-[#6B7280]">Loading orderbook...</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Buy Orders - Shows Asks (where you can buy tokens) */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-green-600 mb-3">Buy Orders</h3>
                                            {orderbook?.asks?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {orderbook.asks.slice(0, 5).map((level: PriceLevel, i: number) => (
                                                        <div key={i} className="bg-green-50 rounded-lg p-3">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-semibold text-green-700">${level.priceFormatted}</span>
                                                                <span className="text-xs text-green-600">{level.orderCount} orders</span>
                                                            </div>
                                                            <p className="text-sm text-[#6B7280]">{level.amountFormatted} tokens</p>
                                                            {level.orders.map((order) => (
                                                                <button
                                                                    key={order.orderId}
                                                                    onClick={() => {
                                                                        setSelectedOrder(order);
                                                                        setIsOrderModalOpen(true);
                                                                    }}
                                                                    className="mt-2 w-full text-xs py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                                >
                                                                    Buy Tokens
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-[#6B7280] py-4">No buy orders available</p>
                                            )}
                                        </div>

                                        {/* Sell Orders - Shows Bids (where you can sell tokens) */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-red-600 mb-3">Sell Orders</h3>
                                            {orderbook?.bids?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {orderbook.bids.slice(0, 5).map((level: PriceLevel, i: number) => (
                                                        <div key={i} className="bg-red-50 rounded-lg p-3">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-semibold text-red-700">${level.priceFormatted}</span>
                                                                <span className="text-xs text-red-600">{level.orderCount} orders</span>
                                                            </div>
                                                            <p className="text-sm text-[#6B7280]">{level.amountFormatted} tokens</p>
                                                            {level.orders.map((order) => (
                                                                <button
                                                                    key={order.orderId}
                                                                    onClick={() => {
                                                                        setSelectedOrder(order);
                                                                        setIsOrderModalOpen(true);
                                                                    }}
                                                                    className="mt-2 w-full text-xs py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                                                >
                                                                    Sell Tokens
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-[#6B7280] py-4">No sell orders available</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            </div>
                        </div>

                        {/* Right Column - Trading Panel */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-8">
                                <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                    <h2 className="text-xl font-semibold text-[#111111] mb-6">Place Order</h2>

                                    {/* Buy/Sell Toggle */}
                                    <div className="flex gap-2 mb-6">
                                        <button
                                            onClick={() => setOrderType('buy')}
                                            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${orderType === 'buy'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-[#F7F8FA] text-[#6B7280] hover:bg-[#E5E7EB]'
                                                }`}
                                        >
                                            Buy
                                        </button>
                                        <button
                                            onClick={() => setOrderType('sell')}
                                            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${orderType === 'sell'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-[#F7F8FA] text-[#6B7280] hover:bg-[#E5E7EB]'
                                                }`}
                                        >
                                            Sell
                                        </button>
                                    </div>

                                    {/* Balance Display */}
                                    <div className="mb-6 p-4 bg-[#F7F8FA] rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-[#6B7280]">Your Balance</span>
                                            <span className="text-sm font-medium text-[#111111]">
                                                {tokenBalance ? formatUnits(tokenBalance, 18) : '0'} tokens
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-[#6B7280]">Tradeable</span>
                                            <span className="text-sm font-semibold text-green-600">
                                                {tradeableBalance?.tradeableBalanceFormatted || '0'} tokens
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[#6B7280]">USDC Balance</span>
                                            <span className="text-sm font-medium text-[#111111]">
                                                ${usdcBalance ? formatUnits(usdcBalance, 6) : '0'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Approval Status */}
                                    {orderType === 'sell' && tokenAllowance !== undefined && (
                                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-yellow-700">Token Allowance</span>
                                                <span className="text-xs font-medium text-yellow-900">
                                                    {formatUnits(tokenAllowance, 18)} tokens
                                                </span>
                                            </div>
                                            {needsTokenApproval && (
                                                <p className="text-xs text-yellow-700">⚠️ Approval required before creating order</p>
                                            )}
                                        </div>
                                    )}

                                    {orderType === 'buy' && usdcAllowance !== undefined && (
                                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-yellow-700">USDC Allowance</span>
                                                <span className="text-xs font-medium text-yellow-900">
                                                    ${formatUnits(usdcAllowance, 6)}
                                                </span>
                                            </div>
                                            {needsUsdcApproval && (
                                                <p className="text-xs text-yellow-700">⚠️ Approval required before creating order</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Order Inputs */}
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-[#111111] mb-2">
                                                Amount (tokens)
                                            </label>
                                            <input
                                                type="text"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#0071C5] focus:outline-none"
                                                disabled={!isTradeable}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#111111] mb-2">
                                                Price (USDC per token)
                                            </label>
                                            <input
                                                type="text"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#0071C5] focus:outline-none"
                                                disabled={!isTradeable}
                                            />
                                        </div>
                                    </div>

                                    {/* Total Display */}
                                    {amount && price && (
                                        <div className="mb-6 p-4 bg-[#F7F8FA] rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-[#6B7280]">Total</span>
                                                <span className="text-lg font-semibold text-[#111111]">
                                                    ${(parseFloat(amount) * parseFloat(price)).toFixed(2)} USDC
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        onClick={() => handleCreateOrder()}
                                        disabled={!isTradeable || isTxPending || isTxConfirming || !amount || !price}
                                        className={`w-full py-4 rounded-xl font-semibold transition-colors ${orderType === 'buy'
                                            ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300'
                                            : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300'
                                            }`}
                                    >
                                        {isTxPending || isTxConfirming
                                            ? transactionStep === 'approving'
                                                ? 'Approving...'
                                                : transactionStep === 'executing'
                                                    ? 'Creating Order...'
                                                    : 'Processing...'
                                            : needsTokenApproval || needsUsdcApproval
                                                ? 'Approve & Create Order'
                                                : `Create ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`}
                                    </button>

                                    {!isTradeable && (
                                        <p className="mt-4 text-xs text-center text-[#6B7280]">
                                            Trading is currently disabled for this asset
                                        </p>
                                    )}

                                    {/* Transaction Status */}
                                    {(isTxPending || isTxConfirming) && txHash && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-xs text-blue-700 font-medium mb-1">Transaction in progress</p>
                                            <a
                                                href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline break-all"
                                            >
                                                View on Explorer →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Order Detail Modal */}
            {isOrderModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[20px] p-8 max-w-md w-full">
                        <h2 className="text-2xl font-semibold text-[#111111] mb-6">Order Details</h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#6B7280]">Order ID</span>
                                <span className="text-sm font-medium text-[#111111]">#{selectedOrder.orderId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#6B7280]">Amount</span>
                                <span className="text-sm font-semibold text-[#111111]">{selectedOrder.amountFormatted} tokens</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#6B7280]">Price</span>
                                <span className="text-sm font-semibold text-[#111111]">${selectedOrder.priceFormatted}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#6B7280]">Total</span>
                                <span className="text-lg font-bold text-[#111111]">
                                    ${(parseFloat(selectedOrder.amountFormatted) * parseFloat(selectedOrder.priceFormatted)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    // Check if order is a bid (where we sell tokens to fill it)
                                    const isBuyOrder = orderbook?.bids?.some((level: PriceLevel) =>
                                        level.orders.some(o => o.orderId === selectedOrder.orderId)
                                    ) || false;
                                    handleFillOrder(selectedOrder, isBuyOrder);
                                }}
                                disabled={isTxPending || isTxConfirming}
                                className="flex-1 py-3 bg-[#0071C5] text-white rounded-xl font-semibold hover:bg-[#0052A3] disabled:bg-gray-300 transition-colors"
                            >
                                {isTxPending || isTxConfirming ? 'Processing...' : 'Fill Order'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsOrderModalOpen(false);
                                    setSelectedOrder(null);
                                }}
                                className="flex-1 py-3 bg-[#F7F8FA] text-[#111111] rounded-xl font-semibold hover:bg-[#E5E7EB] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TradingEngineProductionPage;
