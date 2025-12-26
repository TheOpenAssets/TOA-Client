// src/pages/marketplace/asset/AssetDetails.page.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useMarketplaceStore } from '../../../stores/marketplace.store';
import { contractService } from '../../../lib/api/contract.service';
import { marketplaceService } from '../../../lib/api/marketplace.service';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';

const AssetDetailsPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const { address } = useAccount();
  const { currentAsset: asset, isLoadingAsset, error, fetchAssetDetails } = useMarketplaceStore();

  const [timeRange, setTimeRange] = useState('1M');
  const [tokensToBuy, setTokensToBuy] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [usdcAllowance, setUsdcAllowance] = useState('0');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails(assetId);
    }
  }, [assetId, fetchAssetDetails]);

  useEffect(() => {
    if (address) {
      loadWalletData();
    }
  }, [address]);

  const loadWalletData = async () => {
    if (!address) return;
    try {
      const balance = await contractService.checkUSDCBalance(address);
      const allowance = await contractService.checkUSDCAllowance(address);
      setUsdcBalance(balance);
      setUsdcAllowance(allowance);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  if (isLoadingAsset) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen">Error: {error}</div>;
  }

  if (!asset) {
    return <div className="flex items-center justify-center h-screen">Asset not found</div>;
  }

  const chartData = [
    { name: 'Jan', value: 98.2 },
    { name: 'Feb', value: 98.5 },
    { name: 'Mar', value: 99.1 },
    { name: 'Apr', value: 99.3 },
    { name: 'May', value: 99.8 },
    { name: 'Jun', value: 100.0 },
  ];

  const timeFilters = ['1D', '1W', '1M', '1Y', 'ALL'];

  // Calculate estimated total price (actual price will be fetched from contract during purchase)
  const estimatedTotalPrice = tokensToBuy
    ? (parseFloat(tokensToBuy) * parseFloat(asset.tokenParams.pricePerToken)).toFixed(2)
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
    console.log('Token Address:', asset.token.address);
    console.log('Token Amount:', tokensToBuy);
    console.log('Buyer Address:', address);
    console.log('=====================================\n');

    try {
      const result = await contractService.completePurchase(
        {
          assetId: asset.assetId,
          tokenAmount: tokensToBuy,
        },
        asset.token.address // Pass token address for debugging
      );

      if (result.success) {
        console.log('\n✅ Purchase transaction successful!');
        console.log('Transaction Hash:', result.purchaseTxHash);
        console.log('Block Number:', result.blockNumber);

        setPurchaseStatus('Purchase successful! 🎉 Notifying backend...');

        // Notify backend about the purchase (matching script output format)
        try {
          const notifyPayload = {
            txHash: result.purchaseTxHash!,
            assetId: asset.assetId,
            amount: (parseFloat(tokensToBuy) * 1e18).toString(),
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
    <div className="min-h-screen bg-[#f6fbff]">
      <div className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-semibold text-[#111111]">
                Invoice #{asset.metadata.invoiceNumber}
              </h1>
              <p className="text-md text-[#6B7280]">
                {asset.metadata.buyerName} - {asset.metadata.industry}
              </p>
              <p className="text-sm text-[#6B7280]">
                Status: <span className="font-semibold">{asset.status}</span>
              </p>
            </div>

            {/* Chart Section */}
            <div className="bg-[#EBF0E8] rounded-3xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-5xl font-semibold text-[#111111]">
                          ${parseFloat(asset.tokenParams.pricePerToken).toFixed(2)}
                        </p>
                        <p className="text-green-600 text-sm mt-1">Token Price</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {timeFilters.map(filter => (
                            <button key={filter} onClick={() => setTimeRange(filter)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full ${timeRange === filter ? 'bg-white text-black shadow-sm' : 'bg-transparent text-[#6B7280]'}`}>
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}}/>
                        <YAxis orientation="right" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(value) => `$${value}`}/>
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
                    {parseFloat(asset.tokenParams.totalSupply).toLocaleString()} tokens
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#6B7280]">Minimum Investment</p>
                  <p className="font-medium text-[#111111]">
                    {parseFloat(asset.tokenParams.minInvestment).toLocaleString()} tokens
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
                    {asset.token.address}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#6B7280]">Attestation Hash</p>
                  <p className="font-medium text-[#111111] font-mono text-xs break-all">
                    {asset.attestation.hash}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#6B7280]">Registry Block</p>
                  <p className="font-medium text-[#111111]">{asset.registry.blockNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sticky Buy Panel */}
          <div className="relative">
            <div className="sticky top-12">
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-[#111111] mb-6">Buy Tokens</h2>
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
                      onChange={(e) => setTokensToBuy(e.target.value)}
                      className="bg-transparent border-none text-2xl font-medium text-[#111111] p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="bg-[#F3F4F6] rounded-2xl p-4">
                    <label htmlFor="total-price" className="text-xs text-[#6B7280]">
                      Estimated Total Price
                    </label>
                    <p id="total-price" className="text-2xl font-medium text-[#111111]">
                      ${estimatedTotalPrice} USDC
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      (Final price fetched from contract)
                    </p>
                  </div>
                  <div className="text-xs text-[#6B7280] space-y-1">
                    <div className="flex justify-between">
                      <span>Your USDC Balance</span>
                      <span className="font-medium text-[#111111]">
                        {parseFloat(usdcBalance).toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowance</span>
                      <span className="font-medium text-green-600">
                        {parseFloat(usdcAllowance) > 1000000 ? 'Unlimited' : `${parseFloat(usdcAllowance).toFixed(2)} USDC`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Investment</span>
                      <span className="font-medium text-[#111111]">
                        {parseFloat(asset.tokenParams.minInvestment).toLocaleString()} tokens
                      </span>
                    </div>
                  </div>
                  {purchaseStatus && (
                    <div className={`text-sm p-3 rounded-lg ${
                      purchaseStatus.includes('successful')
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
                    disabled={isPurchasing || !address}
                    className="w-full bg-black text-white rounded-xl h-14 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPurchasing ? 'Processing...' : !address ? 'Connect Wallet' : 'Buy Tokens'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailsPage;
