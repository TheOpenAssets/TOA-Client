// src/pages/admin/payout/PayoutView.page.tsx
import { useState, useEffect } from 'react';
import { DollarSign, Check, Loader2, ExternalLink } from 'lucide-react';
import { adminService } from '../../../lib/api/admin.service';
import { PageLoader } from '../../../components/ui/page-loader';
import { useNetwork } from '../../../lib/network/NetworkContext';
interface PayoutAsset {
  assetId: string;
  invoiceNumber: string;
  originator: string;
  totalSupply: number;
  sold: number;
  price: number;
  totalRaised: number;
  status: string;
  assetType: string;
  payoutExecuted?: boolean;
}

const PayoutViewPage = () => {
  const { network } = useNetwork();
  const [assets, setAssets] = useState<PayoutAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOut, setPayingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    assetId: string;
    txHash: string;
    amount: string;
  } | null>(null);

  useEffect(() => {
    fetchListedAssets();
    const style = document.createElement('style');
    style.innerHTML = `
      /* Hide scrollbar for Chrome, Safari and Opera */
      ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      
      /* Hide scrollbar for IE, Edge and Firefox */
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      
      /* Ensure scrolling still works */
      html, body {
        overflow: auto;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchListedAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all assets
      const { assets: allAssets } = await adminService.getAllAssets({});

      console.log('All assets:', allAssets);

      // Filter for LISTED, ENDED, PAYOUT_COMPLETE, or AUCTION_DECLARED assets
      const filteredAssets = allAssets.filter((asset: any) =>
        ['LISTED', 'AUCTION_DECLARED', 'ENDED', 'PAYOUT_COMPLETE'].includes(asset.status)
      );

      console.log('Filtered assets for payout:', filteredAssets);

      // Map all listed assets (show even if no tokens sold yet)
      const payoutAssets: PayoutAsset[] = filteredAssets
        .map((asset: any) => {
          // Parse sold tokens
          const getCanonical = (val: string | number) => {
            if (!val) return 0;
            const r = typeof val === 'string' ? parseFloat(val) : val;
            return r > 1e9 ? r / 1e18 : r;
          };
          const sold = getCanonical(asset.listing?.sold || '0');

          // Parse total supply
          const totalSupply = getCanonical(asset.tokenParams?.totalSupply || '0');

          // Parse price (USDC)
          // Heuristic: if > 1000, assume raw 6-decimal (e.g. 850000 = $0.85). 
          // If < 1000, assume canonical (e.g. 0.85 = $0.85).
          const priceRaw = asset.assetType === 'AUCTION'
            ? (asset.listing?.clearingPrice || '0')
            : (asset.listing?.price || asset.tokenParams?.pricePerToken || '0');

          const pVal = parseFloat(priceRaw as string);
          const priceInUsdc = pVal > 1000 ? pVal / 1e6 : pVal;

          // Calculate total raised
          const totalRaised = sold * priceInUsdc;

          console.log(`Asset ${asset.assetId}:`, {
            assetType: asset.assetType,
            soldTokens: sold,
            priceRaw,
            priceInUsdc,
            totalRaised
          });

          return {
            assetId: asset.assetId,
            invoiceNumber: asset.metadata?.invoiceNumber || asset.assetId,
            originator: asset.originator,
            totalSupply,
            sold,
            price: priceInUsdc, // Price per token in USDC (already divided by 1e6)
            totalRaised,
            status: asset.status,
            assetType: asset.assetType,
            payoutExecuted: asset.status === 'PAYOUT_COMPLETE',
          };
        });

      setAssets(payoutAssets);
    } catch (err: any) {
      console.error('Failed to fetch listed assets:', err);
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async (assetId: string) => {
    try {
      setPayingOut(assetId);
      setError(null);
      setSuccessMessage(null);

      console.log(`Executing payout for asset: ${assetId}`);

      if (assets.find(asset => asset.assetId === assetId)?.status && ['PAYOUT_COMPLETE'].includes(assets.find(asset => asset.assetId === assetId)?.status || '')) {
        console.log('Payout already executed for this asset.');
        return;
      }

      const result = await adminService.executePayout(assetId);

      console.log('Payout result:', result);

      // Show success message
      setSuccessMessage({
        assetId,
        txHash: result.transactionHash,
        amount: result.totalUsdcRaisedFormatted || result.totalUsdcRaised,
      });

      // Refresh the list
      await fetchListedAssets();
    } catch (err: any) {
      console.error('Payout failed:', err);
      setError(err.message || 'Payout execution failed');
    } finally {
      setPayingOut(null);
    }
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-gellix text-3xl font-semibold text-foreground mb-2">
          Asset Payouts
        </h2>
        <p className="font-gellix text-sm text-foreground/70">
          Execute payouts to originators for sold tokens
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-gellix text-lg font-semibold text-green-800 mb-2">
                Payout Executed Successfully!
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-gellix text-green-700">
                  Amount: <span className="font-semibold">{successMessage.amount}</span>
                </p>
                <p className="font-gellix text-green-700 flex items-center gap-2">
                  Transaction:{' '}
                  <a
                    href={`${network.explorerUrl}/tx/${successMessage.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                  >
                    {successMessage.txHash.slice(0, 10)}...{successMessage.txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="font-gellix text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-full">
          <PageLoader text="Loading Assets..." />
        </div>
      )}

      {/* Assets Table */}
      {!loading && (
        <div
          className="bg-transparent  overflow-hidden"
        >
          {assets.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="font-gellix text-lg font-semibold text-foreground mb-2">
                No Listed Assets
              </h3>
              <p className="font-gellix text-sm text-foreground/60">
                No listed assets found. Assets will appear here after listing.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Originator
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Tokens Sold
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Total Raised
                  </th>
                  <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, index) => (
                  <tr key={asset.assetId} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-gellix text-sm font-semibold text-foreground">
                          {asset.invoiceNumber}
                        </p>
                        <p className="font-gellix text-xs text-foreground/60 mt-0.5">
                          {asset.assetType}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-foreground">
                        {truncateAddress(asset.originator)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-gellix text-sm font-semibold text-foreground">
                          {asset.sold.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="font-gellix text-xs text-foreground/60">
                          of {asset.totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-gellix text-base font-semibold text-green-600">
                        ${asset.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {asset.payoutExecuted ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          Paid Out
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {asset.payoutExecuted ? (
                        <span className="font-gellix text-xs text-foreground/60">Completed</span>
                      ) : asset.sold === 0 ? (
                        <span className="font-gellix text-xs text-foreground/40">No tokens sold yet</span>
                      ) : (
                        <button
                          onClick={() => handlePayout(asset.assetId)}
                          disabled={payingOut === asset.assetId}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                        >
                          {payingOut === asset.assetId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4" />
                              Execute Payout
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default PayoutViewPage;
