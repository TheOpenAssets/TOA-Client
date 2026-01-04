// src/pages/marketplace/asset/AssetDetails.page.tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ethers } from 'ethers';
import { formatUnits } from 'viem';
import type { PurchaseHistoryResponse } from '../../../types/marketplace.types';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { contractService } from '../../../lib/api/contract.service';
import { marketplaceService } from '../../../lib/api/marketplace.service';
import { leverageService } from '../../../lib/api/leverage.service';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { useLeverageStore } from '../../../stores/leverage.store';
import { parseUnits } from 'viem';
import { LEVERAGE_CONTRACTS, METH_ABI } from '../../../lib/blockchain/leverage.contract';

// USDC Contract Address
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || '0x9A54Bad93a00Bf1232D4e636f5e53055Dc0b8238') as `0x${string}`;

// Minimal USDC ABI - just what we need
const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const AssetDetailsPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const { address } = useAccount();
  const navigate = useNavigate();
  const { currentAsset: asset, isLoadingAsset, error, fetchAssetDetails } = useMarketplaceStore();
  const { methPrice, fetchMethPrice, isLoading: isLeverageLoading } = useLeverageStore();

  const [tokensToBuy, setTokensToBuy] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [formattedChartData, setFormattedChartData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('standard');

  // Leverage State
  const [leverageTokenInput, setLeverageTokenInput] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [leveragePurchaseStatus, setLeveragePurchaseStatus] = useState<string | null>(null);

  // Calculate required mETH based on token input
  // Formula: Required mETH = (Tokens * TokenPrice * 1.5) / mETHPrice
  // 1.5 (150%) is the required collateralization ratio (backend validation)
  const calculatedMethAmount = (() => {
    if (!leverageTokenInput || !asset?.tokenParams?.pricePerToken || !methPrice) return 0;
    const tokens = parseFloat(leverageTokenInput);
    const tokenPrice = parseFloat(asset.tokenParams.pricePerToken); // USDC Wei (6 decimals)
    const methPriceVal = methPrice; // USDC Wei (6 decimals)

    // Total Value in USDC Wei = Tokens * TokenPrice
    // Required Collateral Value = Total Value * 1.5
    // Required mETH = Required Collateral Value / mETHPrice

    const meth = (tokens * tokenPrice * 1.5) / methPriceVal;
    
    // Add 1 USDC buffer to prevent "insufficient collateral" due to micro-rounding errors
    // 1 USDC = 1e6 units
    const buffer = (1.0 * 1e6) / methPriceVal;
    
    return meth + buffer;
  })();

  const calculatedMethString = calculatedMethAmount > 0 ? calculatedMethAmount.toFixed(6) : '';

  // Read USDC Balance directly using Wagmi
  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address, // Only run when address exists
    }
  });

  // Format USDC balance (6 decimals)
  const usdcBalance = usdcBalanceRaw ? formatUnits(usdcBalanceRaw, 6) : '0';

  // Wagmi Hooks for mETH Balance and Approval
  const { data: methBalanceRaw, refetch: refetchMethBalance } = useReadContract({
    address: LEVERAGE_CONTRACTS.MockMETH,
    abi: METH_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: LEVERAGE_CONTRACTS.MockMETH,
    abi: METH_ABI,
    functionName: 'allowance',
    args: address ? [address, LEVERAGE_CONTRACTS.LeverageVault] : undefined,
  });

  const { writeContractAsync: approveMeth } = useWriteContract();

  // Format mETH balance (18 decimals)
  const methBalance = methBalanceRaw ? formatUnits(methBalanceRaw, 18) : '0';

  // Load wallet data (refetch balances and allowances)
  const loadWalletData = useCallback(async () => {
    if (!address) return;
    try {
      refetchUsdcBalance();
      refetchMethBalance();
      refetchAllowance();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  }, [address, refetchUsdcBalance, refetchMethBalance, refetchAllowance]);

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails(assetId);
    }

    if (activeTab === 'leverage') {
      fetchMethPrice();
    }

    // Load wallet data if already connected
    if (address) {
      loadWalletData();
    }

    // Auto-refresh mETH price every 30 seconds ONLY if active tab is leverage
    let interval: NodeJS.Timeout;
    if (activeTab === 'leverage') {
      interval = setInterval(() => {
        fetchMethPrice();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assetId, address, fetchAssetDetails, fetchMethPrice, loadWalletData, activeTab]);

  useEffect(() => {
    if (address) {
      loadWalletData();
    }
  }, [address, loadWalletData]);

  useEffect(() => {
    if (assetId) {
      const fetchPurchaseData = async () => {
        setIsLoadingHistory(true);
        setHistoryError(null);
        try {
          const history = await marketplaceService.getPurchaseHistory(assetId);
          setPurchaseHistory(history);

          if (history.chartData && history.chartData.length > 0) {
            // Aggregate purchases into 5-minute time blocks
            const aggregatedData = aggregateIntoTimeBlocks(history.chartData, 0.05);
            setFormattedChartData(aggregatedData);
          }

        } catch (err: any) {
          setHistoryError(err.message || 'Failed to fetch purchase history');
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchPurchaseData();
    }
  }, [assetId]);

  /**
   * Aggregate purchase data into time blocks
   * @param chartData - Raw purchase data from API
   * @param intervalMinutes - Time block interval in minutes (default 5)
   * @returns Aggregated data with tokens purchased per time block (only non-zero values)
   */
  const aggregateIntoTimeBlocks = (chartData: any[], intervalMinutes: number = 0.05) => {
    if (!chartData || chartData.length === 0) return [];

    // Convert interval to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;

    // Create time blocks map
    const blocks: Map<number, { timestamp: number; tokensPurchased: number; count: number }> = new Map();

    // Aggregate purchases into time blocks
    chartData.forEach(purchase => {
      const purchaseTime = new Date(purchase.timestamp).getTime();
      const blockTime = Math.floor(purchaseTime / intervalMs) * intervalMs;

      const block = blocks.get(blockTime);
      if (block) {
        // Parse tokens purchased (18 decimals)
        const tokensPurchased = parseFloat(purchase.tokensPurchased) / 1e18;
        block.tokensPurchased += tokensPurchased;
        block.count += 1;
      } else {
        // Create new block for this time interval
        const tokensPurchased = parseFloat(purchase.tokensPurchased) / 1e18;
        blocks.set(blockTime, {
          timestamp: blockTime,
          tokensPurchased: tokensPurchased,
          count: 1
        });
      }
    });

    // Convert map to sorted array - ONLY including blocks with purchases (non-zero)
    const result = Array.from(blocks.values())
      .filter(block => block.tokensPurchased > 0) // Only keep non-zero purchases
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(block => ({
        timestamp: block.timestamp,
        tokensPurchased: block.tokensPurchased,
        purchaseCount: block.count,
      }));

    console.log(`📊 Chart data aggregated into ${intervalMinutes}-minute blocks (non-zero only):`, result);
    return result;
  };

  const handleLeverageTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeverageTokenInput(e.target.value);
  };

  /**
   * Handle Leverage Token Purchase
   * Follows the script flow exactly:
   * 1. Check mETH balance (redirect to faucet if insufficient)
   * 2. Approve mETH spending
   * 3. Initiate leveraged purchase via backend API
   * 4. Monitor position health
   */
  const handleOpenLeveragePosition = async () => {
    if (!address || !asset || !leverageTokenInput || calculatedMethAmount <= 0) return;

    console.log('\n🚀 ===== STARTING LEVERAGED PURCHASE FLOW =====');
    console.log('Asset ID:', asset.assetId);
    console.log('Token Amount:', leverageTokenInput);
    console.log('Token Address:', asset.token?.address || 'N/A');
    console.log('Buyer Address:', address);
    console.log('==============================================\n');

    setLeveragePurchaseStatus(null);

    try {
      // ============================================================
      // STEP 1: Fetch latest mETH price
      // ============================================================
      console.log('📊 Step 1: Fetching latest mETH price...');
      await fetchMethPrice();
      const methPriceUSD = methPrice / 1e6;
      console.log(`✅ Current mETH price: $${methPriceUSD.toFixed(2)}`);

      // ============================================================
      // STEP 2: Calculate required mETH collateral (150% LTV)
      // ============================================================
      console.log('\n💰 Step 2: Calculating required mETH collateral...');
      const mETHCollateral = parseUnits(calculatedMethString, 18);
      const tokenAmount = parseUnits(leverageTokenInput, 18);
      const pricePerToken = asset.tokenParams.pricePerToken || '0';

      console.log(`  Token Amount: ${leverageTokenInput} tokens`);
      console.log(`  Price per Token: ${parseFloat(pricePerToken) / 1e6} USDC`);
      console.log(`  Required mETH Collateral: ${calculatedMethString} mETH`);
      console.log(`  Total Cost: ${(tokenAmount * BigInt(pricePerToken)) / parseUnits('1', 18) / BigInt(1e6)} USDC`);

      // ============================================================
      // STEP 3: Check mETH Balance
      // ============================================================
      console.log('\n💼 Step 3: Checking mETH balance...');
      await refetchMethBalance();
      const currentMethBalance = parseFloat(methBalance);
      const requiredMeth = parseFloat(calculatedMethString);

      console.log(`  Current mETH Balance: ${currentMethBalance.toFixed(6)} mETH`);
      console.log(`  Required mETH: ${requiredMeth.toFixed(6)} mETH`);

      if (currentMethBalance < requiredMeth) {
        const shortfall = requiredMeth - currentMethBalance;
        console.error(`❌ Insufficient mETH balance. Need ${shortfall.toFixed(6)} more mETH`);
        setLeveragePurchaseStatus(`Insufficient mETH balance. Need ${shortfall.toFixed(6)} more mETH. Redirecting to faucet...`);

        // Redirect to faucet page after 2 seconds
        setTimeout(() => {
          navigate('/faucet');
        }, 2000);
        return;
      }
      console.log('✅ Sufficient mETH balance');

      // ============================================================
      // STEP 4: Check Allowance and Approve mETH Spending
      // ============================================================
      console.log('\n🔐 Step 4: Checking mETH allowance...');
      await refetchAllowance();
      const currentAllowance = allowance || BigInt(0);

      console.log(`  Current Allowance: ${formatUnits(currentAllowance, 18)} mETH`);
      console.log(`  Required Allowance: ${calculatedMethString} mETH`);

      if (currentAllowance < mETHCollateral) {
        setIsApproving(true);
        setLeveragePurchaseStatus('Approving mETH usage...');
        console.log(`⏳ Approving ${calculatedMethString} mETH for LeverageVault...`);

        try {
          const txHash = await approveMeth({
            address: LEVERAGE_CONTRACTS.MockMETH,
            abi: METH_ABI,
            functionName: 'approve',
            args: [LEVERAGE_CONTRACTS.LeverageVault, mETHCollateral],
          });
          console.log(`✅ Approval transaction submitted: ${txHash}`);
          setLeveragePurchaseStatus('Approval submitted! Waiting for confirmation...');

          // Wait for transaction confirmation (3 seconds)
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Refetch allowance to verify
          await refetchAllowance();
          console.log('✅ mETH approved successfully');

          setLeveragePurchaseStatus('Approval confirmed! Click again to create position.');
          setIsApproving(false);
          return;
        } catch (err: any) {
          console.error('❌ Approval failed:', err);
          setLeveragePurchaseStatus(`Approval failed: ${err.message || 'Unknown error'}`);
          setIsApproving(false);
          return;
        }
      } else {
        console.log('✅ Sufficient allowance already granted');
      }

      // ============================================================
      // STEP 5: Initiate Leveraged Purchase via Backend API
      // ============================================================
      console.log('\n🏦 Step 5: Initiating leveraged purchase...');
      setLeveragePurchaseStatus('Creating leveraged position...');

      const purchaseData = {
        assetId: asset.assetId,
        tokenAddress: asset.token?.address || '',
        tokenAmount: tokenAmount.toString(),
        pricePerToken: pricePerToken,
        mETHCollateral: mETHCollateral.toString(),
      };

      console.log('📤 Purchase Data:');
      console.log(JSON.stringify(purchaseData, null, 2));

      const result = await leverageService.initiatePosition(purchaseData);

      console.log('✅ Position created successfully!');
      console.log(`  Position ID: ${result.positionId}`);
      console.log(`  Transaction Hash: ${result.transactionHash}`);
      console.log(`  Explorer: https://explorer.sepolia.mantle.xyz/tx/${result.transactionHash}`);

      // ============================================================
      // STEP 6: Monitor Position Health
      // ============================================================
      console.log('\n📊 Step 6: Monitoring position health...');
      setLeveragePurchaseStatus('Position created! Fetching position details...');

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        const positionDetails = await leverageService.getPositionDetails(result.positionId);
        console.log('📈 Position Details:');
        console.log(`  Position ID: ${positionDetails.positionId}`);
        console.log(`  Status: ${positionDetails.status}`);
        console.log(`  Health Factor: ${(positionDetails.currentHealthFactor / 100).toFixed(2)}%`);
        console.log(`  Health Status: ${positionDetails.healthStatus}`);
        console.log(`  mETH Collateral: ${formatUnits(BigInt(positionDetails.mETHCollateral), 18)} mETH`);
        console.log(`  USDC Borrowed: ${parseFloat(positionDetails.usdcBorrowed) / 1e6} USDC`);

        setLeveragePurchaseStatus(
          `Position created successfully! 🎉\n` +
          `Position ID: ${result.positionId}\n` +
          `Health Factor: ${(positionDetails.currentHealthFactor / 100).toFixed(2)}%\n` +
          `Status: ${positionDetails.healthStatus}`
        );
      } catch (monitorError) {
        console.warn('⚠️ Could not fetch position details:', monitorError);
        setLeveragePurchaseStatus(
          `Position created successfully! 🎉\n` +
          `Position ID: ${result.positionId}\n` +
          `View details in your portfolio.`
        );
      }

      // Reset form and reload wallet data
      setLeverageTokenInput('');
      await loadWalletData();

      console.log('\n✨ ===== LEVERAGED PURCHASE COMPLETED =====\n');

    } catch (error: any) {
      console.error('❌ Leveraged purchase failed:', error);
      setLeveragePurchaseStatus(`Failed to create position: ${error.message}`);
      console.log('\n===== LEVERAGED PURCHASE FLOW FAILED =====\n');
    }
  };

  const needsApproval = allowance && calculatedMethAmount > 0
    ? allowance < parseUnits(calculatedMethString, 18)
    : true;

  if (isLoadingAsset) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen">Error: {error}</div>;
  }

  if (!asset) {
    return <div className="flex items-center justify-center h-screen">Asset not found</div>;
  }

  // Calculate token availability and limits
  const totalSupply = parseFloat(asset.tokenParams.totalSupply) / 1e18;
  const soldTokens = parseFloat(asset.listing?.sold || '0') / 1e18;
  const availableTokens = totalSupply - soldTokens;
  const minInvestment = parseFloat(asset.tokenParams.minInvestment) / 1e18;


  // Calculate estimated total price (actual price will be fetched from contract during purchase)
  // Note: pricePerToken is in USDC (6 decimals), not wei (18 decimals)
  const estimatedTotalPrice = tokensToBuy && asset.tokenParams.pricePerToken
    ? ((parseFloat(tokensToBuy) * parseFloat(asset.tokenParams.pricePerToken)) / 1e6).toFixed(2)
    : '0.00';


  const handleBuyTokens = async () => {
    if (!address) {
      setPurchaseStatus('Please connect your wallet first');
      return;
    }

    if (!tokensToBuy || parseFloat(tokensToBuy) <= 0) {
      setPurchaseStatus('Please enter a valid token amount');
      return;
    }

    // New balance check
    const currentUsdcBalance = parseFloat(usdcBalance);
    const estimatedUsdcNeeded = parseFloat(estimatedTotalPrice);

    if (currentUsdcBalance < estimatedUsdcNeeded) {
      setPurchaseStatus(`Insufficient USDC balance. You need ${estimatedUsdcNeeded.toFixed(2)} USDC but have ${currentUsdcBalance.toFixed(2)} USDC.`);
      return;
    }

    const minInvestment = parseFloat(asset.tokenParams.minInvestment) / 1e18;
    const requestedAmount = parseFloat(tokensToBuy);

    if (requestedAmount < minInvestment) {
      setPurchaseStatus(`Minimum investment is ${minInvestment} tokens`);
      return;
    }

    setIsPurchasing(true);
    setPurchaseStatus('Initiating purchase...');

    console.log('\n🛒 ===== STARTING PURCHASE FLOW =====');
    console.log('Asset ID:', asset.assetId);
    console.log('Invoice Number:', asset.metadata.invoiceNumber);
    console.log('Token Address:', asset.token?.address || 'N/A');
    console.log('Token Amount:', tokensToBuy);
    console.log('Buyer Address:', address);
    console.log('=====================================\n');

    try {
      const result = await contractService.completePurchase(
        {
          assetId: asset.assetId,
          tokenAmount: tokensToBuy,
        },
        asset.token?.address || '' // Pass token address for debugging
      );

      if (result.success) {
        console.log('\n✅ Purchase transaction successful!');
        console.log('Transaction Hash:', result.purchaseTxHash);
        console.log('Block Number:', result.blockNumber);

        setPurchaseStatus('Purchase successful! 🎉');

        // Notify backend about the purchase (matching script output format)
        try {
          const notifyPayload = {
            txHash: result.purchaseTxHash!,
            assetId: asset.assetId,
            amount: ethers.parseUnits(tokensToBuy, 18).toString(),
            blockNumber: result.blockNumber!.toString(),
          };

          console.log('\n📝 Transaction details for backend notification:');
          console.log(JSON.stringify({
            txHash: result.purchaseTxHash,
            assetId: asset.assetId,
            buyer: address,
            amount: tokensToBuy,
            blockNumber: result.blockNumber
          }, null, 2));

          console.log('\n📤 Notifying backend at POST /marketplace/purchases/notify...');
          const backendResponse = await marketplaceService.notifyPurchase(notifyPayload);

          console.log('✅ Backend notification successful!');
          console.log('Backend response:', backendResponse);

          setPurchaseStatus('Purchase and notification successful! 🎉');
        } catch (notifyError: any) {
          console.error('❌ Failed to notify backend:', notifyError);
          setPurchaseStatus('Purchase successful! (Backend notification failed)');
        }

        setTokensToBuy('');
        // Reload wallet data
        await loadWalletData();
      } else {
        console.error('❌ Purchase failed:', result.error);
        setPurchaseStatus(`Purchase failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      setPurchaseStatus(`Error: ${error.message}`);
    } finally {
      setIsPurchasing(false);
      console.log('\n===== PURCHASE FLOW COMPLETED =====\n');
    }
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
                    ${(purchaseHistory?.purchases && purchaseHistory.purchases.length > 0) ? (parseFloat(purchaseHistory.purchases[0].price) / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (asset.tokenParams.pricePerToken ? (parseFloat(asset.tokenParams.pricePerToken) / 1e6).toFixed(2) : 'N/A')}
                  </p>
                  <p className="text-green-800 text-sm mt-1">Token Price (USDC)</p>
                </div>

              </div>
              {isLoadingHistory ? (
                <div className="h-[400px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : historyError ? (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-red-500">Error loading chart data: {historyError}</p>
                </div>
              ) : (formattedChartData.length > 0) ? (
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-[#111111]">Buy Tokens</h2>
                    <TabsList className="bg-gray-100 p-1 rounded-lg">
                      <TabsTrigger value="standard" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">USDC</TabsTrigger>
                      <TabsTrigger value="leverage" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Leverage</TabsTrigger>
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
                      {purchaseStatus && (
                        <div className={`text-sm p-3 rounded-lg ${purchaseStatus.includes('successful')
                          ? 'bg-green-100 text-green-800'
                          : purchaseStatus.includes('Error') || purchaseStatus.includes('failed')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                          {purchaseStatus}
                        </div>
                      )}
                      <Button
                        onClick={handleBuyTokens}
                        disabled={isPurchasing || !address || availableTokens <= 0 || parseFloat(usdcBalance) < parseFloat(estimatedTotalPrice) || (availableTokens >= minInvestment && parseFloat(tokensToBuy || '0') < minInvestment) || parseFloat(tokensToBuy || '0') > availableTokens}
                        className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {(() => {
                          const enteredAmount = parseFloat(tokensToBuy || '0');
                          if (availableTokens <= 0) return 'Sold Out';
                          if (isPurchasing) return 'Processing...';
                          if (!address) return 'Connect Wallet';
                          if (parseFloat(usdcBalance) < parseFloat(estimatedTotalPrice)) return 'Insufficient USDC';
                          if (enteredAmount > availableTokens) return `Max Available: ${availableTokens.toLocaleString()}`;
                          if (availableTokens >= minInvestment && enteredAmount < minInvestment) return `Min Investment: ${minInvestment.toLocaleString()}`;
                          return 'Buy Tokens';
                        })()}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="leverage">
                    <div className="space-y-6">
                      <div className="bg-[#F3F4F6] rounded-2xl p-4">
                        <label className="text-xs text-[#6B7280]">
                          Tokens to buy
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0"
                            value={leverageTokenInput}
                            onChange={handleLeverageTokenChange}
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

                      {leveragePurchaseStatus && (
                        <div className={`text-sm p-3 rounded-lg ${leveragePurchaseStatus.includes('successfully') || leveragePurchaseStatus.includes('submitted')
                          ? 'bg-green-100 text-green-800'
                          : leveragePurchaseStatus.includes('failed') || leveragePurchaseStatus.includes('Error')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                          {leveragePurchaseStatus}
                        </div>
                      )}

                      <Button
                        onClick={handleOpenLeveragePosition}
                        disabled={isLeverageLoading || !leverageTokenInput || !address || isApproving || calculatedMethAmount <= 0 || (availableTokens >= minInvestment && parseFloat(leverageTokenInput || '0') < minInvestment) || parseFloat(leverageTokenInput || '0') > availableTokens}
                        className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {(() => {
                          const enteredAmount = parseFloat(leverageTokenInput || '0');
                          if (enteredAmount > availableTokens) return `Max Available: ${availableTokens.toLocaleString()}`;
                          if (availableTokens >= minInvestment && enteredAmount < minInvestment) return `Min Investment: ${minInvestment.toLocaleString()}`;
                          return isApproving ? 'Approving mETH...' : isLeverageLoading ? 'Processing...' : needsApproval ? 'Approve mETH' : 'Open Leveraged Position';
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

export default AssetDetailsPage;
