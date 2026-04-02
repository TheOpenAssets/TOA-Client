import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAuthStrategy } from '../../lib/auth/AuthStrategyContext';
import { useNetwork } from '../../lib/network/NetworkContext';
import { parseUnits, formatUnits } from 'viem';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, X, ShieldCheck, Zap, ShoppingCart, Users } from 'lucide-react';
import { useMarketplaceStore } from '../../stores/marketplace.store';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/toast';
import { marketplaceService } from '../../lib/api/marketplace.service';
import type { PurchaseHistoryResponse } from '../../types/marketplace.types';
import { PageLoader } from '../../components/ui/page-loader';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import { SentimentChart } from '../../components/marketplace/SentimentChart';
import { TradeChart } from '../../components/marketplace/TradeChart';
import { NotificationBell } from '../../components/notifications/NotificationBell';
// import { authService } from '../../lib/api/auth.service';
import HeroBackground from '../landing/HeroBackground';
// import { Wavy } from '../../components/ui/wavy';

// Contract addresses from environment
const SECONDARY_MARKET = (import.meta.env.VITE_SECONDARY_MARKETPLACE_ADDRESS || '0x08BaC34bb8BfDe92BC2ceF30631fF026DE08bd6e') as `0x${string}`;
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || '0x38113dFC4958CEF3aa53d057A562635bCE022F61') as `0x${string}`;
const TX_GAS_CAP = BigInt(import.meta.env.VITE_TX_GAS_CAP || '16000000');
const CREATE_ORDER_GAS_LIMIT = BigInt(import.meta.env.VITE_CREATE_ORDER_GAS_LIMIT || '8000000');

// Minimal ERC20 ABI
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
    const { address, isAuthenticated } = useAuthStrategy();
    const { networkType, networkPath } = useNetwork();
    const isEvm = networkType !== 'stellar';
    // Only pass address to wagmi hooks if on EVM network
    const evmAddress = (isEvm && address) ? address as `0x${string}` : undefined;

    const { toasts, success, error: showError, warning, removeToast } = useToast();
    const navigate = useNavigate();
    const [polling, setPolling] = useState(false);

    // Store State
    const {
        currentAsset,
        isLoadingAsset,
        fetchAssetDetails,
        orderbook,
        fetchOrderbook,
        fetchTradeHistory,
        fetchMyOrders,
        fetchTradeableBalance,
        isLoadingOrderbook,
        p2pError,
        clearP2PError,
    } = useMarketplaceStore();

    // Wagmi
    const { writeContract, writeContractAsync, data: txHash, isPending: isTxPending } = useWriteContract();
    const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    // const { disconnect } = useDisconnect();
    // Local State
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [transactionStep, setTransactionStep] = useState<'idle' | 'approving' | 'approved' | 'executing' | 'confirmed'>('idle');
    const [currentAction, setCurrentAction] = useState<'create' | 'fill' | 'cancel' | null>(null);
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryResponse | null>(null);
    const [formattedChartData, setFormattedChartData] = useState<any[]>([]);

    // Chart State
    const [sentimentData, setSentimentData] = useState<any[]>([]);
    const [tradeData, setTradeData] = useState<any[]>([]);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const syncedTxHashesRef = useRef<Set<string>>(new Set());
    const syncingTxHashesRef = useRef<Set<string>>(new Set());
    const lastCreateTxHashRef = useRef<`0x${string}` | null>(null);

    const truncateAddress = (address: string): string => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Helper functions
    const handlelogout = () => {
        // authService.logout();
        // disconnect();
        // handled by strategy
        navigate(networkPath('/'));
    };

    const formatEChartsData = (candles: any[]) => {
        return (candles || []).map((c: any) => ({
            value: [c.open, c.close, c.low, c.high],
            time: c.time * 1000,
            volume: c.volume || 0
        }));
    };

    const fetchChartData = useCallback(async () => {
        if (!assetId) return;
        if (sentimentData.length === 0) setIsChartLoading(true);

        try {
            const res = await marketplaceService.getSecondaryMarketChartData(assetId, '1m');
            console.log('[Secondary Chart API] /marketplace/secondary/:assetId/chart', {
                assetId,
                orderBookCandles: res?.orderBookCandles?.length || 0,
                tradeCandles: res?.tradeCandles?.length || 0,
                firstOrderBookCandle: res?.orderBookCandles?.[0] || null,
                firstTradeCandle: res?.tradeCandles?.[0] || null,
            });
            setSentimentData(formatEChartsData(res.orderBookCandles));
            setTradeData(formatEChartsData(res.tradeCandles));
        } catch (error) {
            console.error('Chart Sync Error:', error);
        } finally {
            setIsChartLoading(false);
        }
    }, [assetId]);

    useEffect(() => {
        fetchChartData();
        const poll = setInterval(fetchChartData, 300000);
        echarts.connect('trading-engine');
        return () => clearInterval(poll);
    }, [fetchChartData]);

    // Asset Token Info
    const tokenAddress = currentAsset?.token?.address as `0x${string}` | undefined;

    // Balances & Allowances
    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: evmAddress ? [evmAddress] : undefined,
        query: { enabled: !!tokenAddress && !!evmAddress },
    });

    const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: evmAddress ? [evmAddress, SECONDARY_MARKET] : undefined,
        query: { enabled: !!tokenAddress && !!evmAddress },
    });

    const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: evmAddress ? [evmAddress] : undefined,
        query: { enabled: !!evmAddress },
    });

    const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: evmAddress ? [evmAddress, SECONDARY_MARKET] : undefined,
        query: { enabled: !!evmAddress },
    });

    // 1. Initial Fetch
    useEffect(() => {
        if (!assetId) return;
        fetchAssetDetails(assetId);
        fetchOrderbook(assetId);
        // fetchTradeHistory(assetId);
        if (address) {
            // fetchMyOrders(assetId);
            fetchTradeableBalance(assetId);
        }

        // Fetch purchase history for chart
        const fetchPurchaseData = async () => {
            try {
                const history = await marketplaceService.getPurchaseHistory(assetId);
                console.log('[Purchase History API] /assets/:assetId/purchase-history', {
                    assetId,
                    totalTransactions: history?.totalTransactions || 0,
                    chartDataLength: history?.chartData?.length || 0,
                    firstChartPoint: history?.chartData?.[0] || null,
                });
                setPurchaseHistory(history);

                if (history.chartData && history.chartData.length > 0) {
                    const aggregatedData = aggregateIntoTimeBlocks(history.chartData, 0.05);
                    console.log('[Purchase Activity Chart] aggregated points', {
                        assetId,
                        aggregatedLength: aggregatedData.length,
                        firstAggregatedPoint: aggregatedData[0] || null,
                    });
                    setFormattedChartData(aggregatedData);
                }
            } catch (err) {
                console.error('Failed to fetch purchase history:', err);
            }
        };
        fetchPurchaseData();
    }, [assetId, address, fetchAssetDetails, fetchOrderbook, fetchTradeHistory, fetchMyOrders, fetchTradeableBalance]);


    useEffect(() => {
        if (!assetId) return;
        fetchOrderbook(assetId);
        setPolling(true);
        const poll = setInterval(() => { fetchOrderbook(assetId); setPolling(true); }, 4000);
        return () => { clearInterval(poll); setPolling(false); };
    }, [fetchOrderbook]);

    // Aggregate purchase data into time blocks
    const aggregateIntoTimeBlocks = (chartData: any[], intervalMinutes: number = 0.05) => {
        if (!chartData || chartData.length === 0) return [];

        const normalizeTokenAmount = (value: any): number => {
            const raw = typeof value === 'string' || typeof value === 'number'
                ? Number(value)
                : Number(value ?? 0);

            if (!Number.isFinite(raw) || raw <= 0) return 0;

            // Backend now sends canonical token amounts for purchase history.
            // Keep compatibility with older wei-style payloads.
            return raw > 1e9 ? raw / 1e18 : raw;
        };

        const intervalMs = intervalMinutes * 60 * 1000;
        const blocks: Map<number, { timestamp: number; tokensPurchased: number; count: number; purchaseMethod?: string }> = new Map();

        chartData.forEach(purchase => {
            const purchaseTime = new Date(purchase.timestamp).getTime();
            const blockTime = Math.floor(purchaseTime / intervalMs) * intervalMs;

            const block = blocks.get(blockTime);
            const tokensPurchased = normalizeTokenAmount(purchase.tokensPurchased);

            if (block) {
                block.tokensPurchased += tokensPurchased;
                block.count += 1;
                // Keep the method of the most recent purchase in the block
                if (purchase.purchaseMethod) {
                    block.purchaseMethod = purchase.purchaseMethod;
                }
            } else {
                blocks.set(blockTime, {
                    timestamp: blockTime,
                    tokensPurchased: tokensPurchased,
                    count: 1,
                    purchaseMethod: purchase.purchaseMethod
                });
            }
        });

        return Array.from(blocks.values())
            .filter(block => block.tokensPurchased > 0)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(block => ({
                timestamp: block.timestamp,
                tokensPurchased: block.tokensPurchased,
                purchaseCount: block.count,
                purchaseMethod: block.purchaseMethod,
            }));
    };

    const syncOrderCreatedWithRetry = useCallback(async (hash: `0x${string}`) => {
        if (!assetId || syncedTxHashesRef.current.has(hash) || syncingTxHashesRef.current.has(hash)) return;
        syncingTxHashesRef.current.add(hash);

        const maxAttempts = 4;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const syncRes = await marketplaceService.syncSecondaryOrderCreated(hash);
                console.log('[P2P Direct Ingestion] sync result', { hash, attempt, syncRes });

                const createdOrders = Number(syncRes?.createdOrders || 0);
                const skippedOrders = Number(syncRes?.skippedOrders || 0);
                const didPersistOrExist = createdOrders > 0 || skippedOrders > 0;

                if (!didPersistOrExist) {
                    if (attempt === maxAttempts) {
                        syncingTxHashesRef.current.delete(hash);
                        console.warn('[P2P Direct Ingestion] empty sync result after retries', { hash, syncRes });
                        return;
                    }
                    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
                    continue;
                }

                syncedTxHashesRef.current.add(hash);
                syncingTxHashesRef.current.delete(hash);
                fetchOrderbook(assetId);
                fetchMyOrders(assetId);
                fetchTradeHistory(assetId);
                return;
            } catch (syncError) {
                if (attempt === maxAttempts) {
                    syncingTxHashesRef.current.delete(hash);
                    console.warn('[P2P Direct Ingestion] failed after retries, relying on poller', { hash, syncError });
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
            }
        }
    }, [assetId, fetchOrderbook, fetchMyOrders, fetchTradeHistory]);

    // 2. Transaction Success Handler
    useEffect(() => {
        if (!isTxConfirmed || !assetId) return;

        // Ignore approval confirmation here; dedicated effect below
        // auto-continues to actual create-order execution.
        if (transactionStep === 'approving' && currentAction === 'create') return;

        // Only finalize UX for actual action execution txs.
        if (transactionStep !== 'executing') return;

        // For create flow with prior approval, `isTxConfirmed` can still reflect
        // the approval tx momentarily. Ensure we only proceed when the create tx
        // itself is the confirmed hash.
        if (currentAction === 'create' && lastCreateTxHashRef.current && txHash !== lastCreateTxHashRef.current) {
            return;
        }

        const wasCreate = currentAction === 'create';
        const confirmedTxHash = (lastCreateTxHashRef.current || txHash) as `0x${string}` | undefined;

        if (wasCreate && confirmedTxHash) {
            syncOrderCreatedWithRetry(confirmedTxHash);
        }

            success('Transaction Confirmed', 'Your transaction has been successfully confirmed.');
            setTransactionStep('confirmed');
            setCurrentAction(null);
            setAmount('');
            setPrice('');
            setSelectedOrder(null);

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
    }, [isTxConfirmed, assetId, transactionStep, currentAction, txHash, syncOrderCreatedWithRetry]);

    // Direct ingestion fallback: submit tx hash to backend immediately after
    // create-order contract call is broadcast. Backend waits for confirmation,
    // decodes OrderCreated from receipt, and writes to DB.
    useEffect(() => {
        if (!assetId || !txHash) return;
        if (currentAction !== 'create' || transactionStep !== 'executing') return;
        syncOrderCreatedWithRetry(txHash);
    }, [txHash, currentAction, transactionStep, assetId, syncOrderCreatedWithRetry]);

    // 3. Error Handler
    useEffect(() => {
        if (p2pError) {
            showError('P2P Error', p2pError);
            clearP2PError();
        }
    }, [p2pError]);

    const isTradeable = currentAsset?.status === 'LISTED' || currentAsset?.status === 'ACTIVE' || false;

    // Calculation Helpers
    const getRequiredTokenApproval = useCallback(() => {
        if (!amount || orderType !== 'sell') return BigInt(0);
        try { return parseUnits(amount, 18); } catch { return BigInt(0); }
    }, [amount, orderType]);

    const getRequiredUsdcApproval = useCallback(() => {
        if (!amount || !price) return BigInt(0);
        try {
            const amountBigInt = parseUnits(amount, 18);
            const priceBigInt = parseUnits(price, 6);
            return (amountBigInt * priceBigInt) / parseUnits('1', 18);
        } catch { return BigInt(0); }
    }, [amount, price, orderType]);

    const needsTokenApproval = orderType === 'sell' && tokenAllowance !== undefined && getRequiredTokenApproval() > tokenAllowance;
    const needsUsdcApproval = orderType === 'buy' && usdcAllowance !== undefined && getRequiredUsdcApproval() > usdcAllowance;

    // --- ACTIONS ---

    const handleCreateOrder = async (skipApprovalCheck = false) => {
        if (!address || !assetId || !amount || !price) {
            warning('Missing Information', 'Please fill in all fields and connect your wallet.');
            return;
        }

        if (!isEvm) {
            warning('Not Supported', 'Trading is currently only supported on arbitrum Network.');
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

        // Ensure allowance reads are loaded before proceeding.
        // If allowance is undefined, approval checks can be skipped accidentally,
        // which may lead to wallet gas estimation failures ("network fee unavailable").
        if (!skipApprovalCheck) {
            if (orderType === 'sell' && tokenAllowance === undefined) {
                await refetchTokenAllowance();
                warning('Allowance Loading', 'Token allowance is still loading. Please try again.');
                return;
            }

            if (orderType === 'buy' && usdcAllowance === undefined) {
                await refetchUsdcAllowance();
                warning('Allowance Loading', 'USDC allowance is still loading. Please try again.');
                return;
            }
        }

        if (!skipApprovalCheck) {
            setCurrentAction('create');
            setTransactionStep('approving');
        }

        try {
            if (!skipApprovalCheck) {
                if (orderType === 'sell' && needsTokenApproval) {
                    writeContract({
                        address: tokenAddress,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [SECONDARY_MARKET, getRequiredTokenApproval()],
                    });
                    return;
                }
                if (orderType === 'buy' && needsUsdcApproval) {
                    writeContract({
                        address: USDC_ADDRESS,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [SECONDARY_MARKET, getRequiredUsdcApproval()],
                    });
                    return;
                }
            }

            setTransactionStep('executing');
            const txData = await marketplaceService.getCreateOrderTxData({
                tokenAddress,
                amount: parseUnits(amount, 18).toString(),
                // Backend expects pricePerToken as a 6-decimal integer string (micro-USDC)
                // e.g. 0.0850 USDC → "85000"
                pricePerToken: Math.round(parseFloat(price) * 1_000_000).toString(),
                isBuy: orderType === 'buy',
            });

            const submittedHash = await writeContractAsync({
                address: txData.to,
                abi: txData.abi,
                functionName: txData.functionName,
                args: txData.args,
                gas: CREATE_ORDER_GAS_LIMIT > TX_GAS_CAP ? TX_GAS_CAP : CREATE_ORDER_GAS_LIMIT,
            });
            lastCreateTxHashRef.current = submittedHash;

            // Immediate backend ingestion (faster than indexer polling).
            await syncOrderCreatedWithRetry(submittedHash);
        } catch (error: any) {
            const rawMessage = error?.message || 'Failed to create order';
            const friendlyMessage = rawMessage.includes('transaction gas limit too high')
                ? 'Order failed because wallet/provider proposed a gas limit above chain cap. Please retry; gas cap has been applied.'
                : rawMessage;
            showError('Order Creation Failed', friendlyMessage);
            setTransactionStep('idle');
            setCurrentAction(null);
        }
    };

    // Auto-proceed after approval (Create)
    useEffect(() => {
        if (isTxConfirmed && transactionStep === 'approving' && currentAction === 'create') {
            setTransactionStep('approved');
            Promise.all([refetchTokenAllowance(), refetchUsdcAllowance()]).then(() => {
                setTimeout(() => handleCreateOrder(true), 500);
            });
        }
    }, [isTxConfirmed, transactionStep, currentAction]);

    const handleFillOrder = async (order: OrderDetail, isBuyOrder: boolean, skipApprovalCheck = false) => {
        if (!address || !tokenAddress) return;

        if (!skipApprovalCheck) {
            setCurrentAction('fill');
            setTransactionStep('approving');
        }

        try {
            if (!skipApprovalCheck) {
                if (isBuyOrder) { // Filling a buy order -> We are Selling tokens
                    const requiredAmount = BigInt(order.amount);
                    if (!tokenAllowance || tokenAllowance < requiredAmount) {
                        writeContract({
                            address: tokenAddress,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [SECONDARY_MARKET, requiredAmount],
                        });
                        return;
                    }
                } else { // Filling a sell order -> We are Buying with USDC
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
                        return;
                    }
                }
            }

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

    // Auto-proceed after approval (Fill)
    useEffect(() => {
        if (isTxConfirmed && transactionStep === 'approving' && currentAction === 'fill' && selectedOrder) {
            setTransactionStep('approved');
            Promise.all([refetchTokenAllowance(), refetchUsdcAllowance()]).then(() => {
                setTimeout(() => {
                    const isBuyOrder = orderbook?.bids?.some((level: PriceLevel) =>
                        level.orders.some(o => o.orderId === selectedOrder.orderId)
                    ) || false;
                    handleFillOrder(selectedOrder, isBuyOrder, true);
                }, 500);
            });
        }
    }, [isTxConfirmed, transactionStep, currentAction, selectedOrder]);


    // Loading State
    if (isLoadingAsset && !currentAsset) {
        return (
            <div className="flex w-screen h-screen items-center justify-center">
                <PageLoader text="Loading" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-[#111111] mb-4">Connect Your Wallet</h1>
                    <p className="text-[#6B7280]">Please connect your wallet to access the trading engine.</p>
                </div>
            </div>
        );
    }

    return (<>
        <HeroBackground />
        <div className="min-h-screen max-w-screen bg-white absolute top-0 text-[#111111] font-gellix">
            <div className='w-screen mx-auto flex flex-col items-center justify-center'>
                <ToastContainer toasts={toasts} onClose={removeToast} />

                {/* Page Header */}
                <div className="w-[95vw] mx-auto py-5 px-10 border-b border-gray-50 shadow-sm rounded-xl mb-5 ">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-row items-center gap-4">
                            <h2 className="text-2xl font-medium text-[#111111] font-sans leading-none tracking-tight">
                                {currentAsset?.metadata?.invoiceNumber || 'Asset'}
                            </h2>
                            <span className="text-[#6B7280] text-lg font-medium font-gellix">
                                {currentAsset?.metadata?.buyerName || 'Real World Asset'}
                            </span>
                        </div>
                        <div className='flex flex-row justify-evenly items-center gap-2'>
                            {/* Center: Navigation */}
                            <nav className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate(networkPath('/marketplace'))}
                                    className="font-geist border border-gray-200  text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
                                >
                                    Marketplace
                                </button>
                                <button
                                    onClick={() => navigate(networkPath('/portfolio'))}
                                    className="font-geist border border-gray-200  text-sm font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl"
                                >
                                    Portfolio
                                </button>
                            </nav>

                            {/* Right: Wallet Display */}
                            <div className="flex items-center gap-3">
                                {address && (
                                    <>
                                        <NotificationBell role="INVESTOR" />
                                        <div className="px-6 py-2 bg-transparent border border-gray-300 rounded-lg font-mono text-sm font-medium text-foreground">
                                            {truncateAddress(address)}
                                        </div>
                                        <div className="bottom-0 flex items-start sticky justify-start  bg-transparent z-80">
                                            <button className='ml-2 px-4 py-2 bg-black text-white rounded-lg font-gellix text-sm font-medium hover:bg-black/80 transition-colors' onClick={handlelogout}>

                                                Logout
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className={`px-4 ml-1 py-2 rounded-full text-xs font-semibold font-gellix flex items-center gap-2 ${isTradeable
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${isTradeable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {isTradeable ? 'MARKET OPEN' : 'MARKET CLOSED'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content: 60/40 Split */}
                <div className="max-w-[95vw] mx-auto px-8 pb-8">
                    <div className="grid grid-cols-14 gap-6">
                        {/* === LEFT COLUMN (60%): Orderbook + Charts (Scrollable) === */}
                        <div className="col-span-10 space-y-6 scrollbar-hide order-1 pb-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                            {/* MARKET DEPTH (Orderbook) */}
                            <div className="border border-neutral-200 shadow-sm rounded-2xl h-[70vh] overflow-y-hidden scrollbar-hide">
                                {isLoadingOrderbook && !polling ? (
                                    <div className="flex items-center justify-center h-[450px]">
                                        <PageLoader text='' />
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                            <h3 className="text-2xl font-medium text-[#111111] font-gellix tracking-tight">Market Depth</h3>
                                            <div className="text-xs text-[#6B7280] font-medium font-gellix flex gap-4">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Buy Orders
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Sell Orders
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                            {/* BUY ORDERS (Bids) - Left Pane */}
                                            <div className="min-h-[300px] max-h-[400px] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                                <div className="sticky top-0 bg-transparent z-10 grid grid-cols-3 px-4 py-3 text-xs font-bold font-gellix text-[#6B7280] border-b border-gray-100 uppercase tracking-wide">
                                                    <span>Price</span>
                                                    <span className="text-right">Amount</span>
                                                    <span className="text-right">Total</span>
                                                </div>
                                                <div className="py-1">
                                                    {orderbook?.bids?.length > 0 ? orderbook.bids.map((level: PriceLevel, i: number) => {
                                                        const maxVolume = Math.max(...(orderbook.bids?.map((b: PriceLevel) => parseFloat(b.amountFormatted)) || [1]));
                                                        const width = (parseFloat(level.amountFormatted) / maxVolume) * 100;
                                                        return (
                                                            <div key={i} className="group relative">
                                                                {/* Depth Bar - positioned absolutely */}
                                                                <div
                                                                    className="absolute top-0 right-0 bottom-0 bg-[#10B981] transition-all duration-300 group-hover:opacity-20"
                                                                    style={{ width: `${width}%`, opacity: 0.08 }}
                                                                />

                                                                {level.orders.map((order) => {
                                                                    const isMyOrder = address && order.maker.toLowerCase() === address.toLowerCase();
                                                                    return (
                                                                        <div
                                                                            key={order.orderId}
                                                                            onClick={() => !isMyOrder && setSelectedOrder(order)}
                                                                            title={isMyOrder ? "Creator cannot fulfill its own orders" : undefined}
                                                                            className={`relative grid grid-cols-3 px-4 py-3 text-sm transition-colors ${isMyOrder
                                                                                ? 'cursor-not-allowed opacity-60'
                                                                                : 'cursor-pointer hover:bg-green-50/30'
                                                                                }`}
                                                                        >
                                                                            <span className="font-bold text-[#10B981] font-gellix">${(
                                                                                () => {
                                                                                    const raw = parseFloat(level.priceFormatted);
                                                                                    // Heuristic: if price > 1000, assume raw 6-decimal (1e6)
                                                                                    return (raw > 1000 ? raw / 1e6 : raw).toFixed(4);
                                                                                }
                                                                            )()}</span>
                                                                            <span className="text-right text-[#111111] font-gellix font-medium">{parseFloat(order.amountFormatted).toFixed(2)}</span>
                                                                            <span className="text-right text-[#6B7280] font-gellix">
                                                                                ${(parseFloat(level.priceFormatted) * parseFloat(order.amountFormatted)).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div className="p-12 text-center text-[#9CA3AF] text-sm font-medium font-gellix">No active buy orders</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* SELL ORDERS (Asks) - Right Pane */}
                                            <div className="min-h-[300px] max-h-[400px] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                                <div className="sticky top-0 bg-transparent z-10 grid grid-cols-3 px-4 py-3 text-xs font-bold font-gellix text-[#6B7280] border-b border-gray-100 uppercase tracking-wide">
                                                    <span>Price</span>
                                                    <span className="text-right">Amount</span>
                                                    <span className="text-right">Total</span>
                                                </div>
                                                <div className="py-1">
                                                    {orderbook?.asks?.length > 0 ? orderbook.asks.map((level: PriceLevel, i: number) => {
                                                        const maxVolume = Math.max(...(orderbook.asks?.map((a: PriceLevel) => parseFloat(a.amountFormatted)) || [1]));
                                                        const width = (parseFloat(level.amountFormatted) / maxVolume) * 100;
                                                        return (
                                                            <div key={i} className="group relative">
                                                                {/* Depth Bar */}
                                                                <div
                                                                    className="absolute top-0 right-0 bottom-0 bg-[#EF4444] transition-all duration-300 group-hover:opacity-20"
                                                                    style={{ width: `${width}%`, opacity: 0.08 }}
                                                                />
                                                                {level.orders.map((order) => {
                                                                    const isMyOrder = address && order.maker.toLowerCase() === address.toLowerCase();
                                                                    return (
                                                                        <div
                                                                            key={order.orderId}
                                                                            onClick={() => !isMyOrder && setSelectedOrder(order)}
                                                                            title={isMyOrder ? "Creator cannot fulfill its own orders" : undefined}
                                                                            className={`relative grid grid-cols-3 px-4 py-3 text-sm transition-colors ${isMyOrder
                                                                                ? 'cursor-not-allowed opacity-60'
                                                                                : 'cursor-pointer hover:bg-red-50/30'
                                                                                }`}
                                                                        >
                                                                            <span className="font-bold text-[#EF4444] font-gellix">${(
                                                                                () => {
                                                                                    const raw = parseFloat(level.priceFormatted);
                                                                                    // Heuristic: if price > 1000, assume raw 6-decimal (1e6)
                                                                                    return (raw > 1000 ? raw / 1e6 : raw).toFixed(4);
                                                                                }
                                                                            )()}</span>
                                                                            <span className="text-right text-[#111111] font-gellix font-medium">{parseFloat(order.amountFormatted).toFixed(2)}</span>
                                                                            <span className="text-right text-[#6B7280] font-gellix">
                                                                                ${(parseFloat(level.priceFormatted) * parseFloat(order.amountFormatted)).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div className="p-12 text-center text-[#9CA3AF] text-sm font-medium">No active sell orders</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* PURCHASE ACTIVITY CHART */}
                            <div className="border border-neutral-200 shadow-sm rounded-2xl p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-medium font-gellix text-[#111111] mb-2">Purchase Activity</h2>
                                        <p className="text-sm text-[#6B7280]">Token purchases over time</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2 bg-transparent/50 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                                            <ShoppingCart className="w-4 h-4 text-[#10B981]" />
                                            <div className="text-left">
                                                <p className="text-xs text-[#6B7280]">Total Activity</p>
                                                <p className="text-sm font-semibold  font-gellix text-[#111111]">
                                                    {purchaseHistory?.totalTransactions || 0}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-transparent/50 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                                            <Users className="w-4 h-4 text-[#0071C5]" />
                                            <div className="text-left">
                                                <p className="text-xs text-[#6B7280]">Direct Buys</p>
                                                <p className="text-sm font-semibold font-gellix text-[#111111]">
                                                    {purchaseHistory?.metadata?.directPurchases || 0}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-transparent/50 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                                            <Zap className="w-4 h-4 text-[#EF4444]" />
                                            <div className="text-left">
                                                <p className="text-xs text-[#6B7280]">Leveraged</p>
                                                <p className="text-sm font-semibold font-gellix text-[#111111]">
                                                    {purchaseHistory?.metadata?.leveragePurchases || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[400px]">
                                    {formattedChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={formattedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#b0d79aff" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#98b885ff" stopOpacity={0} />
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
                                                        if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
                                                        if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
                                                        return tokens.toFixed(0);
                                                    }}
                                                    label={{ value: 'Tokens Purchased', angle: -90, position: 'insideRight', style: { fill: '#6B7280', fontSize: 12 } }}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    formatter={(value: any, _name: any, props: any) => {
                                                        const tokens = typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
                                                        return [
                                                            <div key="tooltip-content" className="space-y-1">
                                                                <p className="font-bold text-[#111111]">{tokens} Tokens</p>
                                                                {props.payload.purchaseMethod && (
                                                                    <p className="text-xs text-gray-500">
                                                                        Method: <span className={props.payload.purchaseMethod === 'LEVERAGE' ? 'text-blue-600 font-medium font-gellix' : 'text-green-600 font-medium font-gellix'}>
                                                                            {props.payload.purchaseMethod}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-gray-400">{props.payload.purchaseCount} transaction(s)</p>
                                                            </div>,
                                                            ''
                                                        ];
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
                                                    stroke="#bbceb0ff"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorTokens)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-[#6B7280] gap-2">
                                            <ShoppingCart size={32} className="opacity-20" />
                                            <p className="text-sm">No purchase activity yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* === RIGHT COLUMN (40%): Buy/Sell Panel + Asset Details (Sticky) === */}
                        <div className="col-span-4 sticky top-6 self-start space-y-6 order-2 ">
                            {/* EXECUTION ZONE (Buy/Sell Panel) */}
                            <div className="bg-transparent rounded-3xl shadow-lg border-t border-gray-200 p-8">
                                {/* CONTEXTUAL PANEL: Order Review State */}
                                {selectedOrder ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                                            <h2 className="text-2xl font-gellix font-medium text-[#111111] tracking-tight">Order Review</h2>
                                            <button
                                                onClick={() => setSelectedOrder(null)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X size={20} className="text-[#6B7280]" />
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Settlement Summary */}
                                            <div className="bg-[#F9FAFB] rounded-2xl p-6 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium font-gellix text-[#6B7280]">Price per Token</span>
                                                    <span className=" font-gellix font-bold text-[#111111] text-lg">${selectedOrder.priceFormatted}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium font-gellix text-[#6B7280]">Amount</span>
                                                    <span className="font-gellix font-gellix font-bold text-[#111111] text-lg">
                                                        {selectedOrder.amountFormatted} <span className="text-sm font-normal font-gellixtext-[#9CA3AF]">Tokens</span>
                                                    </span>
                                                </div>
                                                <div className="h-px bg-gray-200 my-3"></div>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-sm font-bold text-[#111111]">Total Settlement</span>
                                                    <span className="text-3xl font-bold text-[#0071C5] tracking-tight">
                                                        ${(parseFloat(selectedOrder.amountFormatted) * parseFloat(selectedOrder.priceFormatted)).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Transaction Progress */}
                                            {/* {(isTxPending || isTxConfirming) && (
                                            <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3 border border-blue-100">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0071C5] border-t-transparent mt-0.5"></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-blue-900">Processing Transaction</p>
                                                    <p className="text-xs text-blue-700 mt-1">
                                                        {transactionStep === 'approving' ? 'Authorizing assets...' : 'Executing trade...'}
                                                    </p>
                                                </div>
                                            </div>
                                        )} */}

                                            {/* Execute Button */}
                                            <button
                                                onClick={() => {
                                                    const isBuyOrder = orderbook?.bids?.some((level: PriceLevel) =>
                                                        level.orders.some(o => o.orderId === selectedOrder.orderId)
                                                    ) || false;
                                                    handleFillOrder(selectedOrder, isBuyOrder);
                                                }}
                                                disabled={isTxPending || isTxConfirming || !isTradeable}
                                                className="w-full py-4 bg-[#111111] text-white rounded-2xl font-bold text-base hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isTxPending || isTxConfirming ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap size={18} /> Execute Fill
                                                    </>
                                                )}
                                            </button>

                                            <div className="flex items-center justify-center gap-2 text-xs text-[#9CA3AF] pt-2">
                                                <ShieldCheck size={14} /> Secured by BNB Network
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* CONTEXTUAL PANEL: Place Order State */
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-200">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-2xl font-medium font-gellix text-[#111111] tracking-tight">Place Order</h2>
                                            <div className="flex bg-[#F3F4F6] rounded-xl p-1">
                                                <button
                                                    onClick={() => setOrderType('buy')}
                                                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'buy'
                                                        ? 'bg-transparent shadow-sm text-[#10B981]'
                                                        : 'text-[#6B7280] hover:text-[#111111]'
                                                        }`}
                                                >
                                                    Buy
                                                </button>
                                                <button
                                                    onClick={() => setOrderType('sell')}
                                                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'sell'
                                                        ? 'bg-transparent shadow-sm text-[#EF4444]'
                                                        : 'text-[#6B7280] hover:text-[#111111]'
                                                        }`}
                                                >
                                                    Sell
                                                </button>
                                            </div>
                                        </div>

                                        {/* Input Fields */}
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Amount</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full h-16 pl-5 pr-20 bg-neutral-100/10 border border-gray-200 rounded-2xl font-gellix text-xl font-bold text-[#111111] focus:ring-2 focus:ring-[#0071C5] focus:border-transparent outline-none transition-all placeholder:text-[#D1D5DB]"
                                                        disabled={!isTradeable}
                                                    />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF] tracking-wider">
                                                        TOKENS
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Price per Token</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full h-16 pl-5 pr-20 bg-neutral-100/10 border border-gray-200 rounded-2xl font-gellix text-xl font-bold text-[#111111] focus:ring-2 focus:ring-[#0071C5] focus:border-transparent outline-none transition-all placeholder:text-[#D1D5DB]"
                                                        disabled={!isTradeable}
                                                    />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF] tracking-wider">
                                                        USDC
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Balances & Info */}
                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-[#6B7280] font-medium">Available {orderType === 'buy' ? 'USDC' : 'Tokens'}</span>
                                                <span className="font-gellix font-bold text-[#111111]">
                                                    {orderType === 'buy'
                                                        ? `$${usdcBalance ? parseFloat(formatUnits(usdcBalance, 6)).toFixed(2) : '0.00'}`
                                                        : `${tokenBalance ? parseFloat(formatUnits(tokenBalance, 18)).toFixed(2) : '0.00'}`
                                                    }
                                                </span>
                                            </div>

                                            {orderType === 'sell' && needsTokenApproval && (
                                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2 text-xs text-yellow-900">
                                                    <Info size={14} className="mt-0.5 shrink-0" />
                                                    <span className="font-medium">One-time approval required to trade this asset</span>
                                                </div>
                                            )}
                                            {orderType === 'buy' && needsUsdcApproval && (
                                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2 text-xs text-yellow-900">
                                                    <Info size={14} className="mt-0.5 shrink-0" />
                                                    <span className="font-medium">One-time approval required to spend USDC</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Order Summary */}
                                        {amount && price && (
                                            <div className="mb-6 p-5 bg-[#F9FAFB] rounded-2xl border border-gray-100">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-sm font-bold text-[#6B7280]">Estimated Total</span>
                                                    <div className="text-right">
                                                        <span className="text-2xl font-bold text-[#111111] tracking-tight">
                                                            ${(parseFloat(amount) * parseFloat(price)).toFixed(2)}
                                                        </span>
                                                        <span className="text-xs font-medium text-[#9CA3AF] ml-2">USDC</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Create Order Button */}
                                        <button
                                            onClick={() => handleCreateOrder()}
                                            disabled={!isTradeable || isTxPending || isTxConfirming || !amount || !price}
                                            className={`w-full py-4 rounded-2xl font-bold text-base text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${orderType === 'buy' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#111111] hover:bg-black'
                                                }`}
                                        >
                                            {isTxPending || isTxConfirming
                                                ? (transactionStep === 'approving' ? 'Authorizing Assets...' : 'Broadcasting Order...')
                                                : (needsTokenApproval || needsUsdcApproval
                                                    ? `Approve & Create ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`
                                                    : `Place ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`)
                                            }
                                        </button>

                                        {(isTxPending || isTxConfirming) && txHash && (
                                            <a
                                                href={`https://testnet.bscscan.com/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block mt-4 text-center text-xs text-[#0071C5] hover:underline font-medium"
                                            >
                                                View on Explorer →
                                            </a>
                                        )}

                                        <div className="flex items-center justify-center gap-2 text-xs text-[#9CA3AF] mt-6 pt-4 border-t border-gray-100">
                                            <ShieldCheck size={14} /> Secured by BNB Network
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ASSET DETAILS */}
                            <div className="bg-transparent rounded-3xl shadow-lg border-t border-gray-200  p-6">
                                {isLoadingAsset ? (
                                    <div className="flex items-center justify-center h-[450px]">
                                        <PageLoader text='' />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-medium text-[#111111] mb-6">Asset Details</h2>
                                        <div className="grid grid-cols-2 gap-6 text-sm">
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Face Value</p>
                                                <p className="font-bold text-[#111111] text-lg">
                                                    ${currentAsset?.metadata?.faceValue
                                                        ? (parseFloat(currentAsset.metadata.faceValue)).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                                        : '0.00'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Issue Date</p>
                                                <p className="font-semibold text-[#111111]">
                                                    {currentAsset?.metadata?.issueDate
                                                        ? new Date(currentAsset.metadata.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Due Date</p>
                                                <p className="font-semibold text-[#111111]">
                                                    {currentAsset?.metadata?.dueDate
                                                        ? new Date(currentAsset.metadata.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Total Supply</p>
                                                <p className="font-semibold text-[#111111]">
                                                    {currentAsset?.tokenParams?.totalSupply
                                                        ? (parseFloat(currentAsset.tokenParams.totalSupply) / 1e18).toLocaleString()
                                                        : '0'} tokens
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Buyer</p>
                                                <p className="font-semibold text-[#111111]">{currentAsset?.metadata?.buyerName || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Industry</p>
                                                <p className="font-semibold text-[#111111]">{currentAsset?.metadata?.industry || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Risk Tier</p>
                                                <p className="font-semibold text-[#111111]">{currentAsset?.metadata?.riskTier || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[#6B7280] font-medium">Token Address</p>
                                                <p className="font-gellix text-xs text-[#111111] truncate">
                                                    {currentAsset?.token?.address || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-10">
                    Drag chart or use slider to explore historical trends
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 border border-neutral-100 shadow-sm rounded-lg w-[90vw] mx-auto">
                    <SentimentChart data={sentimentData} isLoading={isChartLoading && sentimentData.length === 0} />
                    <TradeChart data={tradeData} isLoading={isChartLoading && tradeData.length === 0} />
                </div>
            </div>
        </div>
    </>

    );
};


export default TradingEngineProductionPage;