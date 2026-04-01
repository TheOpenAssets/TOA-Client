// src/pages/marketplace/asset/AssetDetails.page.tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { parseTokenAmount } from '../../../lib/utils/formatters';
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
import { LEVERAGE_CONTRACTS, stARB_ABI } from '../../../lib/blockchain/leverage.contract';
import { PageLoader } from '../../../components/ui/page-loader';
import { useAuthStrategy } from '../../../lib/auth/AuthStrategyContext';
import { useNetwork } from '../../../lib/network/NetworkContext';
import { ComingSoon } from '../../../components/common/ComingSoon';
import { stellarService } from '../../../lib/api/stellar.service';
import { trustlineService } from '../../../lib/api/trustline.service';

// USDC Contract Address
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || '0x38113dFC4958CEF3aa53d057A562635bCE022F61') as `0x${string}`;

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

const COLLATERAL_SYMBOL = 'ankrBNB';

const AssetDetailsPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const { address } = useAuthStrategy();
  const { networkType, networkPath, network } = useNetwork();
  const isEvm = network.walletType === 'evm';
  // Only pass address to wagmi hooks if on EVM network
  const evmAddress = (isEvm && address) ? address as `0x${string}` : undefined;

  const navigate = useNavigate();
  const { currentAsset: asset, isLoadingAsset, error, fetchAssetDetails } = useMarketplaceStore();
  const { stARBPrice, fetchstARBPrice, isLoading: isLeverageLoading } = useLeverageStore();

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

  // Stellar Trustline State
  const [needsTrustline, setNeedsTrustline] = useState(false);
  const [trustlineStatus, setTrustlineStatus] = useState<'APPROVED' | 'PENDING' | 'NOT_REQUESTED' | 'checking'>('checking');
  const [isCheckingTrust, setIsCheckingTrust] = useState(false);
  const [isAddingTrust, setIsAddingTrust] = useState(false);
  const [trustlineError, setTrustlineError] = useState<string | null>(null);

  // Calculate required ankrBNB based on token input
  // Formula: Required ankrBNB = (Tokens * TokenPrice * 1.5) / stARBPrice
  // 1.5 (150%) is the required collateralization ratio (backend validation)
  const calculatedstARBAmount = (() => {
    if (!leverageTokenInput || !asset?.tokenParams?.pricePerToken) return 0;
    const tokens = parseFloat(leverageTokenInput);
    if (tokens <= 0) return 0;

    // Backend sends canonical 4-decimal values (e.g. "0.8500")
    const tokenPrice = parseFloat(asset.tokenParams.pricePerToken);
    const stARBPriceVal = stARBPrice;

    console.log(`DEBUG ${COLLATERAL_SYMBOL} calc:`, { tokens, tokenPrice, stARBPriceVal, leverageTokenInput });

    if (!stARBPriceVal || stARBPriceVal <= 0) return 0;

    // Required ankrBNB = (Tokens * TokenPrice * 1.5) / stARBPrice
    const stARB = (tokens * tokenPrice * 1.5) / stARBPriceVal;

    // Add 1 USDC buffer to prevent "insufficient collateral" due to micro-rounding errors
    const buffer = 1.0 / stARBPriceVal;

    return stARB + buffer;
  })();

  const calculatedstARBString = calculatedstARBAmount > 0 ? calculatedstARBAmount.toFixed(6) : '';

  // Stellar USDC Balance State
  const [stellarUsdcBalance, setStellarUsdcBalance] = useState('0');

  // Fetch Stellar USDC Balance
  const fetchStellarBalance = useCallback(async () => {
    // Only fetch if on Stellar network and address is available
    if (networkType === 'stellar' && address) {
      try {
        const stellarUsdcIssuer = import.meta.env.VITE_STELLAR_USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
        const bal = await stellarService.getAccountBalance(address, 'USDC', stellarUsdcIssuer);
        setStellarUsdcBalance(bal);
      } catch (error) {
        console.error('Failed to fetch Stellar USDC balance:', error);
      }
    }
  }, [networkType, address]);

  useEffect(() => {
    fetchStellarBalance();
  }, [fetchStellarBalance]);

  // Read USDC Balance directly using Wagmi (EVM)
  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: evmAddress ? [evmAddress] : undefined,
    query: {
      enabled: !!evmAddress, // Only run when address exists and is EVM
    }
  });

  // Calculate generic USDC balance based on network
  const usdcBalance = networkType === 'stellar'
    ? stellarUsdcBalance
    : (usdcBalanceRaw ? formatUnits(usdcBalanceRaw, 6) : '0');

  // Wagmi Hooks for collateral balance and approval
  const { data: stARBBalanceRaw, refetch: refetchstARBBalance } = useReadContract({
    address: LEVERAGE_CONTRACTS.CollateralToken,
    abi: stARB_ABI,
    functionName: 'balanceOf',
    args: evmAddress ? [evmAddress] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: LEVERAGE_CONTRACTS.CollateralToken,
    abi: stARB_ABI,
    functionName: 'allowance',
    args: evmAddress ? [evmAddress, LEVERAGE_CONTRACTS.LeverageVault] : undefined,
  });

  const { writeContractAsync: approvestARB } = useWriteContract();
  const publicClient = usePublicClient();

  // Format collateral balance (18 decimals)
  const stARBBalance = stARBBalanceRaw ? formatUnits(stARBBalanceRaw, 18) : '0';

  const getLeverageGasOverrides = useCallback(async () => {
    if (!publicClient) return {};

    const chainId = publicClient.chain?.id;

    // BNB chains prefer legacy gas pricing and may reject malformed EIP-1559 fields.
    if (chainId === 97 || chainId === 56) {
      const gasPrice = await publicClient.getGasPrice();
      return { gasPrice: (gasPrice * 12n) / 10n };
    }

    const fees = await publicClient.estimateFeesPerGas();
    if (fees.maxFeePerGas && fees.maxPriorityFeePerGas) {
      const safePriority = fees.maxPriorityFeePerGas;
      const safeMaxFee = fees.maxFeePerGas >= safePriority ? fees.maxFeePerGas : safePriority;
      return {
        maxFeePerGas: (safeMaxFee * 12n) / 10n,
        maxPriorityFeePerGas: safePriority,
      };
    }

    const gasPrice = await publicClient.getGasPrice();
    return { gasPrice: (gasPrice * 12n) / 10n };
  }, [publicClient]);

  // Load wallet data (refetch balances and allowances)
  const loadWalletData = useCallback(async () => {
    if (!address) return;
    try {
      refetchUsdcBalance();
      refetchstARBBalance();
      refetchAllowance();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  }, [address, refetchUsdcBalance, refetchstARBBalance, refetchAllowance]);

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails(assetId);
    }

    if (activeTab === 'leverage') {
      fetchstARBPrice();
    }

    // Load wallet data if already connected and on EVM
    if (evmAddress) {
      loadWalletData();
    }

    // Auto-refresh stARB price every 30 seconds ONLY if active tab is leverage
    let interval: NodeJS.Timeout;
    if (activeTab === 'leverage') {
      interval = setInterval(() => {
        fetchstARBPrice();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assetId, address, fetchAssetDetails, fetchstARBPrice, loadWalletData, activeTab, purchaseStatus,]);

  useEffect(() => {
    if (evmAddress) {
      loadWalletData();
    }
  }, [evmAddress, loadWalletData]);

  // Check Stellar Trustline
  const checkStellarTrustline = useCallback(async () => {
    if (isEvm || !address || !asset?.assetId) return;

    try {
      setIsCheckingTrust(true);
      setTrustlineError(null);

      console.log(`Checking trustline eligibility for asset ${asset.assetId}...`);
      const response = await trustlineService.checkAbilityToBuy(asset.assetId);
      console.log('Trustline capability response:', response);

      setTrustlineStatus(response.trustlineStatus);
      // If NOT_REQUESTED or PENDING, we need trustline (or approval)
      // If APPROVED, we don't need trustline action
      setNeedsTrustline(!response.canBuy);

      if (!response.canBuy && response.reason) {
        console.log('Cannot buy reason:', response.reason);
      }

    } catch (err) {
      console.error('Error checking trustline:', err);
      // Fallback: check on-chain directly if backend fails? 
      // For now, let's stick to backend as source of truth for "permission"
    } finally {
      setIsCheckingTrust(false);
    }
  }, [isEvm, address, asset]);

  useEffect(() => {
    checkStellarTrustline();
  }, [checkStellarTrustline]);

  const handleAddTrustline = async () => {
    if (!address || !asset?.token?.address || !asset?.assetId) return;

    try {
      setIsAddingTrust(true);
      setTrustlineError(null);
      const [code, issuer] = asset.token.address.split(':');

      if (!code || !issuer) {
        throw new Error('Invalid token address format');
      }

      console.log(`Adding trustline on-chain for ${code}...`);
      // 1. Execute on-chain transaction
      const txHash = await stellarService.addTrustline(address, code, issuer);
      console.log('Trustline added on-chain. Hash:', txHash);

      // 2. Notify backend
      console.log('Notifying backend...');
      await trustlineService.notifyTrustlineAdded({
        txHash: txHash,
        assetId: asset.assetId,
        network: 'stellar',
      });

      // 3. Re-check status
      await checkStellarTrustline();

    } catch (err: any) {
      console.error('Failed to add trustline:', err);
      setTrustlineError(err.message || 'Failed to add trustline');
    } finally {
      setIsAddingTrust(false);
    }
  };

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
    const blocks: Map<number, { timestamp: number; tokensPurchased: number; count: number; purchaseMethod?: string }> = new Map();

    // Aggregate purchases into time blocks
    chartData.forEach(purchase => {
      const purchaseTime = new Date(purchase.timestamp).getTime();
      const blockTime = Math.floor(purchaseTime / intervalMs) * intervalMs;

      const block = blocks.get(blockTime);
      if (block) {
        // Parse tokens purchased (18 decimals)
        const tokensPurchased = parseFloat(purchase.tokensPurchased);
        block.tokensPurchased += tokensPurchased;
        block.count += 1;
        // Keep the method of the most recent purchase in the block
        if (purchase.purchaseMethod) {
          block.purchaseMethod = purchase.purchaseMethod;
        }
      } else {
        // Create new block for this time interval
        const tokensPurchased = parseFloat(purchase.tokensPurchased);
        blocks.set(blockTime, {
          timestamp: blockTime,
          tokensPurchased: tokensPurchased,
          count: 1,
          purchaseMethod: purchase.purchaseMethod
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
        purchaseMethod: block.purchaseMethod,
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
  * 1. Check ankrBNB balance (redirect to faucet if insufficient)
  * 2. Approve ankrBNB spending
   * 3. Initiate leveraged purchase via backend API
   * 4. Monitor position health
   */
  const handleOpenLeveragePosition = async () => {
    if (!evmAddress || !asset || !leverageTokenInput || calculatedstARBAmount <= 0) return;

    console.log('\n🚀 ===== STARTING LEVERAGED PURCHASE FLOW =====');
    console.log('Asset ID:', asset.assetId);
    console.log('Token Amount:', leverageTokenInput);
    console.log('Token Address:', asset.token?.address || 'N/A');
    console.log('Buyer Address:', evmAddress);
    console.log('==============================================\n');
    setIsPurchasing(true);
    setLeveragePurchaseStatus(null);

    try {
      // ============================================================
      // STEP 1: Fetch latest ankrBNB price
      // ============================================================
      console.log(`📊 Step 1: Fetching latest ${COLLATERAL_SYMBOL} price...`);
      await fetchstARBPrice();
      console.log(`✅ Current ${COLLATERAL_SYMBOL} price: $${stARBPrice.toFixed(2)}`);

      // ============================================================
      // STEP 2: Calculate required ankrBNB collateral (150% LTV)
      // ============================================================
      console.log(`\n💰 Step 2: Calculating required ${COLLATERAL_SYMBOL} collateral...`);
      const stARBCollateral = parseUnits(calculatedstARBString, 18);
      const pricePerToken = asset.tokenParams.pricePerToken || '0';

      console.log(`  Token Amount: ${leverageTokenInput} tokens`);
      console.log(`  Price per Token: ${pricePerToken} USDC`);
      console.log(`  Required ${COLLATERAL_SYMBOL} Collateral: ${calculatedstARBString} ${COLLATERAL_SYMBOL}`);
      console.log(`  Total Cost: ${(parseFloat(leverageTokenInput) * parseFloat(pricePerToken)).toFixed(4)} USDC`);

      // ============================================================
      // STEP 3: Check ankrBNB Balance
      // ============================================================
      console.log(`\n💼 Step 3: Checking ${COLLATERAL_SYMBOL} balance...`);
      await refetchstARBBalance();
      const currentstARBBalance = parseFloat(stARBBalance);
      const requiredstARB = parseFloat(calculatedstARBString);

      console.log(`  Current ${COLLATERAL_SYMBOL} Balance: ${currentstARBBalance.toFixed(6)} ${COLLATERAL_SYMBOL}`);
      console.log(`  Required ${COLLATERAL_SYMBOL}: ${requiredstARB.toFixed(6)} ${COLLATERAL_SYMBOL}`);

      if (currentstARBBalance < requiredstARB) {
        const shortfall = requiredstARB - currentstARBBalance;
        console.error(`❌ Insufficient ${COLLATERAL_SYMBOL} balance. Need ${shortfall.toFixed(6)} more ${COLLATERAL_SYMBOL}`);
        setLeveragePurchaseStatus(`Insufficient ${COLLATERAL_SYMBOL} balance. Need ${shortfall.toFixed(6)} more ${COLLATERAL_SYMBOL}. Redirecting to faucet...`);

        // Redirect to faucet page after 2 seconds
        setTimeout(() => {
          navigate(networkPath('/faucet'));
        }, 2000);
        return;
      }
      console.log(`✅ Sufficient ${COLLATERAL_SYMBOL} balance`);

      // ============================================================
      // STEP 4: Check Allowance and Approve ankrBNB Spending
      // ============================================================
      console.log(`\n🔐 Step 4: Checking ${COLLATERAL_SYMBOL} allowance...`);
      await refetchAllowance();
      const currentAllowance = allowance || BigInt(0);

      console.log(`  Current Allowance: ${formatUnits(currentAllowance, 18)} ${COLLATERAL_SYMBOL}`);
      console.log(`  Required Allowance: ${calculatedstARBString} ${COLLATERAL_SYMBOL}`);

      if (currentAllowance < stARBCollateral) {
        setIsApproving(true);
        setLeveragePurchaseStatus(`Approving ${COLLATERAL_SYMBOL} usage...`);
        console.log(`⏳ Approving ${calculatedstARBString} ${COLLATERAL_SYMBOL} for LeverageVault...`);

        try {
          let gasOverrides = {};
          try {
            gasOverrides = await getLeverageGasOverrides();
          } catch (e) {
            console.warn('Failed to get gas overrides, proceeding without:', e);
          }

          const txHash = await approvestARB({
            address: LEVERAGE_CONTRACTS.CollateralToken,
            abi: stARB_ABI,
            functionName: 'approve',
            args: [LEVERAGE_CONTRACTS.LeverageVault, stARBCollateral],
            ...gasOverrides,
          });
          console.log(`✅ Approval transaction submitted: ${txHash}`);
          setLeveragePurchaseStatus('Approval submitted! Waiting for confirmation...');

          // Wait for transaction confirmation (3 seconds)
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Refetch allowance to verify
          const { data: newAllowance } = await refetchAllowance();
          console.log(`✅ ${COLLATERAL_SYMBOL} approved successfully`);
          console.log(`  New Allowance: ${newAllowance ? formatUnits(newAllowance, 18) : '0'} ${COLLATERAL_SYMBOL}`);

          setLeveragePurchaseStatus('Approval confirmed! Proceeding to open position...');
          setIsApproving(false);

          // Don't return - continue to next step automatically
          console.log('✅ Continuing to position creation...');
        } catch (err: any) {
          console.error('❌ Approval failed:', err);
          setLeveragePurchaseStatus(`Approval failed`);
          setIsApproving(false);
          // Reset form and reload wallet data
          setLeverageTokenInput('');
          setIsPurchasing(false);
          await loadWalletData();

          // Briefly show success then reset button state
          setTimeout(() => {
            setLeveragePurchaseStatus(null);
            setIsPurchasing(false);
          }, 2500);
          console.log('\n===== LEVERAGED PURCHASE FLOW FAILED =====\n');
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
        tokenAmount: parseFloat(leverageTokenInput).toFixed(4),
        pricePerToken: parseFloat(pricePerToken).toFixed(4),
        stARBCollateral: parseFloat(calculatedstARBString).toFixed(4),
      };

      console.log('📤 Purchase Data:');
      console.log(JSON.stringify(purchaseData, null, 2));

      let result;
      try {
        result = await leverageService.initiatePosition(purchaseData);
      } catch (apiError: any) {
        // Backend might return error but transaction could succeed due to nonce issues
        console.warn('⚠️ API returned error, checking if transaction succeeded anyway...', apiError.message);

        // Wait a bit for transaction to be indexed
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Try to fetch user positions to see if it was created
        try {
          const positions = await leverageService.getMyPositions();
          const recentPosition = positions[0]; // Most recent position

          if (recentPosition) {
            // Check if most recent position matches our attempt (within last 15 seconds)
            const positionTime = new Date(recentPosition.createdAt).getTime();
            const now = Date.now();

            if (now - positionTime < 15000) {
              console.log('✅ Found recently created position despite API error!');
              result = {
                positionId: recentPosition.positionId,
                transactionHash: 'Check portfolio for details',
              };
            } else {
              // No recent position found, this is a real error
              throw apiError;
            }
          } else {
            throw apiError;
          }
        } catch (fetchError) {
          // Could not verify, re-throw original error
          throw apiError;
        }
      }

      console.log('✅ Position created successfully!');
      console.log(`  Position ID: ${result.positionId}`);
      console.log(`  Transaction Hash: ${result.transactionHash}`);
      console.log(`  Explorer: https://explorer.sepolia.arbitrum.xyz/tx/${result.transactionHash}`);

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
        console.log(`  ${COLLATERAL_SYMBOL} Collateral: ${positionDetails.stARBCollateral} ${COLLATERAL_SYMBOL}`);
        console.log(`  USDC Borrowed: ${positionDetails.usdcBorrowed} USDC`);

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

      // Briefly show success then reset button state
      setTimeout(() => {
        setLeveragePurchaseStatus(null);
        setIsPurchasing(false);
      }, 2500);

      console.log('\n✨ ===== LEVERAGED PURCHASE COMPLETED =====\n');

    } catch (error: any) {
      console.error('❌ Leveraged purchase failed:', error);
      setLeveragePurchaseStatus(`Failed to create position`);
      // Reset status after showing failure briefly
      setTimeout(() => {
        setLeveragePurchaseStatus(null);
        setIsPurchasing(false);
      }, 3000);
      console.log('\n===== LEVERAGED PURCHASE FLOW FAILED =====\n');
    }
  };

  if (!isEvm && activeTab === 'leverage') {
    // Switch to standard tab if on Stellar and leverage is selected (or hide leverage tab)
    // For now, we will just conditionally render the content below
  }

  const needsApproval = allowance && calculatedstARBAmount > 0
    ? allowance < parseUnits(calculatedstARBString, 18)
    : true;

  if (isLoadingAsset) {
    return <div className="flex items-center justify-center h-screen">
      <PageLoader text='' />
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen">Error: {error}</div>;
  }

  if (!asset) {
    return <div className="flex items-center justify-center h-screen">Asset not found</div>;
  }

  // Calculate token availability and limits
  const totalSupply = parseTokenAmount(asset.tokenParams.totalSupply, 18);
  const soldTokens = parseTokenAmount(asset.listing?.sold || '0', 18);
  const availableTokens = totalSupply - soldTokens;
  const minInvestment = parseTokenAmount(asset.tokenParams.minInvestment, 18);


  // Calculate estimated total price
  // Backend sends pricePerToken in canonical 4-decimal format (e.g. "0.8500")
  const pricePerToken = parseFloat(asset.tokenParams.pricePerToken || '0');
  const estimatedTotalPrice = tokensToBuy && pricePerToken
    ? (parseFloat(tokensToBuy) * pricePerToken).toFixed(4)
    : '0.0000';


  const handleBuyTokens = async () => {
    if (!address) {
      setPurchaseStatus('Please connect your wallet first');
      return;
    }

    if (!tokensToBuy || parseFloat(tokensToBuy) <= 0) {
      setPurchaseStatus('Please enter a valid token amount');
      return;
    }

    // Validate Stellar specific requirements
    if (!isEvm) {
      if (!asset.token?.address) {
        setPurchaseStatus('Asset token address not found');
        return;
      }
    }

    // New balance check
    const currentUsdcBalance = parseFloat(usdcBalance);
    const estimatedUsdcNeeded = parseFloat(estimatedTotalPrice);

    console.log('DEBUG: Balance Check Values:');
    console.log(`  - State usdcBalance: ${usdcBalance}`);
    console.log(`  - Parsed currentUsdcBalance: ${currentUsdcBalance}`);
    console.log(`  - State estimatedTotalPrice: ${estimatedTotalPrice}`);
    console.log(`  - Parsed estimatedUsdcNeeded: ${estimatedUsdcNeeded}`);
    console.log(`  - Asset Price Per Token (raw): ${asset.tokenParams.pricePerToken}`);

    if (currentUsdcBalance < estimatedUsdcNeeded) {
      console.log('DEBUG: Insufficient balance detected.');
      setPurchaseStatus(`Insufficient USDC balance. You need ${estimatedUsdcNeeded.toFixed(2)} USDC but have ${currentUsdcBalance.toFixed(2)} USDC.`);
      return;
    }

    const minInvestment = parseFloat(asset.tokenParams.minInvestment);
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
    console.log('Network:', networkType);
    console.log('=====================================\n');

    try {
      let result;

      if (isEvm) {
        // EVM Purchase
        result = await contractService.completePurchase(
          {
            assetId: asset.assetId,
            tokenAmount: tokensToBuy,
          },
          asset.token?.address || ''
        );
      } else {
        // Stellar Purchase
        const [code] = asset.token?.address.split(':') || [];
        if (!code) throw new Error('Invalid asset code format');

        // Pass 7 decimals for standard Stellar assets
        // TODO: potential dynamic decimal support if using verified Soroban tokens
        const txHash = await stellarService.buyTokens(address, code, tokensToBuy, 7);

        // Mocking the result structure expected by the UI/backend handler
        result = {
          success: true,
          purchaseTxHash: txHash,
          blockNumber: 0,
        };
      }

      if (result.success || (!isEvm && result.purchaseTxHash)) { // Accommodate Stellar result
        console.log('\n✅ Purchase transaction successful!');
        console.log('Transaction Hash:', result.purchaseTxHash);

        setPurchaseStatus('Purchase successful! 🎉');

        // Notify backend about the purchase
        try {
          const notifyPayload = {
            txHash: result.purchaseTxHash!,
            assetId: asset.assetId,
            // Send canonical 4-decimal string based on backend validation
            amount: parseFloat(tokensToBuy).toFixed(4),
            blockNumber: result.blockNumber ? result.blockNumber.toString() : '0',
            network: isEvm ? 'arbitrum' : 'stellar'
          };

          console.log('\n📤 Notifying backend...');
          await marketplaceService.notifyPurchase(notifyPayload);

          setPurchaseStatus('Purchase and notification successful! 🎉');
        } catch (notifyError: any) {
          console.error('❌ Failed to notify backend:', notifyError);
          setPurchaseStatus('Purchase successful! (Backend notification failed)');
        }

        setTokensToBuy('');
        // Reload wallet data
        if (isEvm) await loadWalletData();
        // TODO: reload Stellar data
      } else {
        console.error('❌ Purchase failed:', result.error);
        setPurchaseStatus(`Purchase failed`);
        setTokensToBuy('');
        if (isEvm) await loadWalletData();
        setTimeout(() => {
          setPurchaseStatus(null);
        }, 2500);
      }
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      setPurchaseStatus(`Error: ${error.message}`);
      setTokensToBuy('');
      if (isEvm) await loadWalletData();
      setTimeout(() => {
        setPurchaseStatus(null);
      }, 2500);
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
                <button onClick={() => navigate(networkPath('/marketplace'))} className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </button>
                <h1 className="text-3xl font-medium text-[#111111]">
                  Invoice {asset.metadata.invoiceNumber}
                </h1>
                <div className='flex flex-row gap-3'>
                  <Button className="font-geist border border-gray-300  text-lg font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-lg" onClick={() => navigate(networkPath(`/trade/asset/${asset.assetId}`))}>
                    Trade
                  </Button>
                  <Button className="font-geist border border-gray-300  text-lg font-medium text-foreground/70 hover:text-blue-600 pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-lg" onClick={() => navigate(networkPath(`/portfolio`))}>
                    Portfolio
                  </Button>
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
                    ${(purchaseHistory?.purchases && purchaseHistory.purchases.length > 0) ? parseFloat(purchaseHistory.purchases[0].price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (asset.tokenParams.pricePerToken ? parseFloat(asset.tokenParams.pricePerToken).toFixed(2) : 'N/A')}
                  </p>
                  <p className="text-green-800 text-sm mt-1">Token Price (USDC)</p>
                </div>

                {/* New Activity Stats */}
                <div className="flex gap-6 text-right">
                  <div className=" flex flex-row items-center gap-1 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Activity</p>
                    <p className="text-xl font-medium text-[#111111]">{purchaseHistory?.totalTransactions || 0}</p>
                  </div>
                  <div className=" flex flex-row items-center gap-1 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Direct Buys</p>
                    <p className="text-xl font-medium text-[#111111]">{purchaseHistory?.metadata?.directPurchases || 0}</p>
                  </div>
                  <div className=" flex flex-row items-center gap-1 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Leveraged</p>
                    <p className="text-xl font-medium text-[#111111]">{purchaseHistory?.metadata?.leveragePurchases || 0}</p>
                  </div>
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
                          // Format large numbers with K, M suffix
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

                                  Method: <span className={props.payload.purchaseMethod === 'LEVERAGE' ? 'text-blue-600 font-medium' : 'text-green-600 font-medium'}>
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
                    {parseFloat(asset.tokenParams.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#6B7280]">Minimum Investment</p>
                  <p className="font-medium text-[#111111]">
                    {parseFloat(asset.tokenParams.minInvestment).toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#6B7280]">Sold Tokens</p>
                  <p className="font-medium text-[#111111]">
                    {parseFloat(asset.listing?.sold || '0').toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
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
                    <h2 className="text-2xl font-semibold text-[#111111]">Deposit into Firm Vault</h2>
                    <TabsList className="bg-gray-100 p-1 rounded-lg">
                      <TabsTrigger value="standard" className="text-xs">Direct Deposit</TabsTrigger>
                      {isEvm && <TabsTrigger value="leverage" className="text-xs">LST Leverage</TabsTrigger>}
                    </TabsList>
                  </div>

                  <TabsContent value="standard">
                    <div className="space-y-6">
                      <div className="bg-[#F3F4F6] rounded-2xl p-4">
                        <label htmlFor="tokens-to-buy" className="text-xs text-[#6B7280]">
                          Vault units to deposit
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
                            const getCanonical = (val: string) => parseFloat(val);
                            const totalSupply = getCanonical(asset.tokenParams.totalSupply);
                            const soldTokens = getCanonical(asset.listing?.sold || '0');
                            const availableTokens = totalSupply - soldTokens;
                            const minInvestment = getCanonical(asset.tokenParams.minInvestment);
                            return availableTokens < minInvestment ? availableTokens : minInvestment;
                          })()}
                          className=" border-none text-2xl font-medium text-[#111111] p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <p className="text-xs text-[#6B7280] mt-2">
                          Available: {(() => {
                            const getCanonical = (val: string) => parseFloat(val);
                            const totalSupply = getCanonical(asset.tokenParams.totalSupply);
                            const soldTokens = getCanonical(asset.listing?.sold || '0');
                            return (totalSupply - soldTokens).toLocaleString(undefined, { maximumFractionDigits: 4 });
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
                            {(
                              () => {
                                return parseFloat(asset.tokenParams.minInvestment).toLocaleString(undefined, { maximumFractionDigits: 4 });
                              }
                            )()} tokens
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
                      {!isEvm && needsTrustline ? (
                        <div className="space-y-3">
                          {trustlineError && (
                            <div className="text-sm p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">
                              {trustlineError}
                            </div>
                          )}

                          {trustlineStatus === 'PENDING' ? (
                            <div className="w-full bg-yellow-50 text-yellow-800 rounded-xl p-4 border border-yellow-200 text-center">
                              <p className="font-medium">Trustline Approval Pending</p>
                              <p className="text-sm mt-1">Your request is being reviewed by an admin.</p>
                            </div>
                          ) : (
                            <>
                              <Button
                                onClick={handleAddTrustline}
                                disabled={isAddingTrust || isCheckingTrust}
                                className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                              >
                                {isAddingTrust ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
                                    <span>Adding Trustline...</span>
                                  </span>
                                ) : 'Request Trustline'}
                              </Button>
                              <p className="text-xs text-center text-gray-500">
                                You must establish a trustline for this asset before purchasing.
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleBuyTokens}
                          disabled={(() => {
                            const getCanonical = (val: string) => parseFloat(val);
                            const totalSupply = getCanonical(asset.tokenParams.totalSupply);
                            const soldTokens = getCanonical(asset.listing?.sold || '0');
                            const availableTokens = totalSupply - soldTokens;
                            const minInvestment = getCanonical(asset.tokenParams.minInvestment);
                            const enteredAmount = parseFloat(tokensToBuy || '0');

                            return isPurchasing || !address || availableTokens <= 0 || parseFloat(usdcBalance) < parseFloat(estimatedTotalPrice) || (availableTokens >= minInvestment && enteredAmount < minInvestment && enteredAmount > 0) || enteredAmount > availableTokens;
                          })()}
                          className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {(() => {
                            const getCanonical = (val: string) => parseFloat(val);
                            const totalSupply = getCanonical(asset.tokenParams.totalSupply);
                            const soldTokens = getCanonical(asset.listing?.sold || '0');
                            const availableTokens = totalSupply - soldTokens;
                            const minInvestment = getCanonical(asset.tokenParams.minInvestment);
                            const enteredAmount = parseFloat(tokensToBuy || '0');

                            if (availableTokens <= 0) return 'Vault Fully Subscribed';
                            if (isPurchasing) return 'Processing...';
                            if (!address) return 'Connect Wallet';
                            if (parseFloat(usdcBalance) < parseFloat(estimatedTotalPrice)) return 'Insufficient USDC';
                            if (enteredAmount > availableTokens) return `Max Available: ${availableTokens.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
                            if (availableTokens >= minInvestment && enteredAmount < minInvestment && enteredAmount > 0) return `Min Investment: ${minInvestment.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
                            return 'Deposit Now';
                          })()}
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="leverage">
                    {!isEvm ? (
                      <ComingSoon
                        title="Leverage Coming Soon"
                        description="Leveraged trading is currently under development for the Stellar network. Check back soon!"
                        className="h-full min-h-[300px]"
                      />
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-[#F3F4F6] rounded-2xl p-4">
                          <label className="text-xs text-[#6B7280]">
                            Vault units to deposit
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
                                src="/stARB-crystal.svg"
                                alt={COLLATERAL_SYMBOL}
                                className="w-6 h-6 rounded-full"
                              />
                              <p className="text-2xl font-medium text-[#111111]">
                                {calculatedstARBString || '0.00'} {COLLATERAL_SYMBOL}
                              </p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#6B7280]">Buying Power</span>
                              <span className="text-sm font-medium text-[#111111]">
                                {(() => {
                                  if (!calculatedstARBAmount) return '$0.00 USDC';
                                  const bp = (calculatedstARBAmount * stARBPrice) / 1.5;
                                  return `$${bp.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-[#6B7280]">{COLLATERAL_SYMBOL} Price</span>
                              <span className="text-sm font-medium text-[#111111]">
                                ${stARBPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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

                        {leveragePurchaseStatus && (() => {
                          const statusLower = leveragePurchaseStatus.toLowerCase();
                          const isSuccess = statusLower.includes('success');
                          const isError = statusLower.includes('fail') || statusLower.includes('error');
                          const tone = isSuccess
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : isError
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200';
                          return (
                            <div className={`text-sm p-3 rounded-lg ${tone}`}>
                              {leveragePurchaseStatus}
                            </div>
                          );
                        })()}

                        <Button
                          onClick={handleOpenLeveragePosition}
                          disabled={isPurchasing || isLeverageLoading || !leverageTokenInput || !address || isApproving || calculatedstARBAmount <= 0 || (availableTokens >= minInvestment && parseFloat(leverageTokenInput || '0') < minInvestment) || parseFloat(leverageTokenInput || '0') > availableTokens}
                          className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                        >
                          {(() => {
                            const enteredAmount = parseFloat(leverageTokenInput || '0');
                            if (enteredAmount > availableTokens) return `Max Available: ${availableTokens.toLocaleString()}`;
                            if (availableTokens >= minInvestment && enteredAmount < minInvestment) return `Min Investment: ${minInvestment.toLocaleString()}`;

                            const statusLower = (leveragePurchaseStatus || '').toLowerCase();
                            const isWaiting = statusLower.includes('submitted') || statusLower.includes('waiting');
                            const isOpening = statusLower.includes('creating') || statusLower.includes('position');
                            const showLoader = isApproving || isLeverageLoading || isWaiting || isOpening;

                            const label = (() => {
                              if (isApproving) return `Approving ${COLLATERAL_SYMBOL}...`;
                              if (isWaiting) return 'Waiting for confirmation...';
                              if (isOpening) return 'Opening position...';
                              if (isLeverageLoading) return leveragePurchaseStatus || 'Processing...';
                              return needsApproval ? `Approve ${COLLATERAL_SYMBOL}` : 'Open Leveraged Position';
                            })();

                            return (
                              <span className="flex items-center justify-center gap-2 w-full">
                                {showLoader && (
                                  <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
                                )}
                                <span>{label}</span>
                              </span>
                            );
                          })()}
                        </Button>
                      </div>
                    )}
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
