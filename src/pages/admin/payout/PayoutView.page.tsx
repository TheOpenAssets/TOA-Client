// src/pages/admin/payout/PayoutView.page.tsx
import { useState, useEffect } from 'react';
import { DollarSign, Check, Loader2, ExternalLink } from 'lucide-react';
import { adminService } from '../../../lib/api/admin.service';

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
  }, []);

  const fetchListedAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all listed assets
      const { assets: allAssets } = await adminService.getAllAssets({
        status: 'LISTED',
      });

      console.log('Listed assets:', allAssets);

      // Map all listed assets (show even if no tokens sold yet)
      const payoutAssets: PayoutAsset[] = allAssets
        .map((asset: any) => {
          // Parse sold tokens
          const soldRaw = asset.listing?.sold || '0';
          const sold = typeof soldRaw === 'string'
            ? (soldRaw.length > 18 ? parseFloat(soldRaw) / 1e18 : parseFloat(soldRaw))
            : soldRaw;

          // Parse total supply
          const totalSupplyRaw = asset.tokenParams?.totalSupply || '0';
          const totalSupply = typeof totalSupplyRaw === 'string'
            ? (totalSupplyRaw.length > 18 ? parseFloat(totalSupplyRaw) / 1e18 : parseFloat(totalSupplyRaw))
            : totalSupplyRaw;

          // Parse price (USDC with 6 decimals)
          const priceRaw = asset.listing?.price || '0';
          const price = typeof priceRaw === 'string'
            ? (priceRaw.length > 6 ? parseFloat(priceRaw) / 1e6 : parseFloat(priceRaw))
            : priceRaw;

          const totalRaised = sold * price;

          return {
            assetId: asset.assetId,
            invoiceNumber: asset.metadata?.invoiceNumber || asset.assetId,
            originator: asset.originator,
            totalSupply,
            sold,
            price,
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-antic text-3xl font-semibold text-foreground mb-2">
          Asset Payouts
        </h1>
        <p className="font-antic text-sm text-gray-500">
          Execute payouts to originators for sold tokens
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-antic text-lg font-semibold text-green-800 mb-2">
                Payout Executed Successfully!
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-antic text-green-700">
                  Amount: <span className="font-semibold">{successMessage.amount}</span>
                </p>
                <p className="font-antic text-green-700 flex items-center gap-2">
                  Transaction:{' '}
                  <a
                    href={`https://sepolia.mantlescan.xyz/tx/${successMessage.txHash}`}
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
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="font-antic text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
          <p className="ml-3 font-antic text-foreground/70">Loading assets...</p>
        </div>
      )}

      {/* Assets Table */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {assets.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
                No Listed Assets
              </h3>
              <p className="font-antic text-sm text-gray-500">
                No listed assets found. Assets will appear here after listing.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-antic">
                    Asset
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-antic">
                    Originator
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-antic">
                    Tokens Sold
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-antic">
                    Total Raised
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-antic">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-foreground/70 uppercase tracking-wider font-antic">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map((asset) => (
                  <tr key={asset.assetId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-antic text-sm font-semibold text-foreground">
                          {asset.invoiceNumber}
                        </p>
                        <p className="font-antic text-xs text-gray-500 mt-0.5">
                          {asset.assetType}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-mono text-sm text-foreground">
                        {truncateAddress(asset.originator)}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-antic text-sm font-semibold text-foreground">
                          {asset.sold.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="font-antic text-xs text-gray-500">
                          of {asset.totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-antic text-base font-semibold text-green-600">
                        ${asset.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      {asset.payoutExecuted ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-green-100 text-green-700 border-green-200">
                          Paid Out
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-yellow-100 text-yellow-700 border-yellow-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {asset.payoutExecuted ? (
                        <span className="font-antic text-xs text-gray-500">Completed</span>
                      ) : asset.sold === 0 ? (
                        <span className="font-antic text-xs text-gray-400">No tokens sold yet</span>
                      ) : (
                        <button
                          onClick={() => handlePayout(asset.assetId)}
                          disabled={payingOut === asset.assetId}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-antic text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
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
