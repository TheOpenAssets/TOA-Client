// src/pages/admin/listings/Listings.page.tsx

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { adminService } from '../../../lib/api/admin.service';
import type { ApiAdminAsset, AuctionClearingPriceInfo } from '../../../types/admin.types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { PageLoader } from '../../../components/ui/page-loader';

const ListingsPage = () => {
  const [assets, setAssets] = useState<ApiAdminAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ApiAdminAsset | null>(null);
  const [clearingPrice, setClearingPrice] = useState('');
  const [isEndingAuction, setIsEndingAuction] = useState(false);
  const [clearingInfo, setClearingInfo] = useState<AuctionClearingPriceInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const { success, error: toastError, info } = useToast();

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const response = (await adminService.getAllAssets()) as unknown as { assets: ApiAdminAsset[] };
      setAssets(response.assets || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError('Failed to fetch assets. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
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

  const handleEndAuctionClick = async (asset: ApiAdminAsset) => {
    setSelectedAsset(asset);
    setClearingPrice('');
    setClearingInfo(null);
    setIsModalOpen(true);
    setIsLoadingInfo(true);
    try {
      const info = await adminService.getAuctionClearingPriceInfo(asset.assetId);
      setClearingInfo(info);
      const sp = parseFloat(info.suggestedPrice);
      setClearingPrice((sp > 1000 ? sp / 1e6 : sp).toString());
    } catch (error) {
      toastError('Failed to load auction data', 'Could not load bidding data for this auction.');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleConfirmEndAuction = async () => {
    if (!selectedAsset || !clearingPrice) {
      toastError('Error', 'Please enter a clearing price.');
      return;
    }

    setIsEndingAuction(true);
    try {
      const isStellar = selectedAsset.token?.address && !selectedAsset.token.address.startsWith('0x');

      if (isStellar) {
        // Stellar Path
        const [code, issuer] = selectedAsset.token.address.split(':');
        if (!code || !issuer) throw new Error('Invalid Stellar token address format');

        info('Ending Stellar Auction...', 'Please sign the transactions in your wallet.');

        // 1. Execute on-chain (Client-side signing via Freighter)
        // We assume the connected wallet is the admin/issuer
        // Need to import stellarService dynamically or statically? It's already available in lib
        const { stellarService } = await import('../../../lib/api/stellar.service');
        const { isConnected, getAddress } = await import('@stellar/freighter-api');

        if (!(await isConnected())) {
          throw new Error('Freighter wallet not connected');
        }
        const adminAddress = await getAddress();
        if (!adminAddress || !adminAddress.address) throw new Error('Could not get admin address');

        const result = await stellarService.endAuction(
          adminAddress.address,
          code,
          issuer,
          selectedAsset.tokenParams.totalSupply || '0', // Full supply must be in contract
          clearingPrice
        );

        // 2. Notify Backend
        info('Syncing status...', 'Notifying backend of auction end.');
        await adminService.notifyAuctionEnded(
          selectedAsset.assetId,
          parseFloat(clearingPrice).toFixed(4), // Pass canonical 4-decimal string
          result.txHash
        );

        success('Auction Ended Successfully', `Auction cleared on Stellar! TX: ${result.txHash.slice(0, 10)}...`);

      } else {
        // EVM Path (Backend handles signing)
        const canonicalClearingPrice = parseFloat(clearingPrice).toFixed(4);
        info('Ending auction...', 'This may take a moment. The backend is processing the on-chain transaction.');

        const result = await adminService.endAuctionOnChain(selectedAsset.assetId, canonicalClearingPrice);

        if (!result.success) {
          throw new Error(result.message || 'Failed to end auction.');
        }

        success('Auction Ended Successfully', `${selectedAsset.metadata.invoiceNumber} has been successfully ended. TX: ${result.transactionHash.slice(0, 10)}...`);
      }

      setIsModalOpen(false);
      fetchAssets();

    } catch (err: unknown) {
      console.error('End auction error:', err);
      const error = err as Error;
      toastError('Failed to End Auction', error.message || 'An unknown error occurred.');
    } finally {
      setIsEndingAuction(false);
    }
  };

  const formatCurrency = (value: string | number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Number(value));
  };

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <PageLoader text="Loading Listings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="font-gellix text-lg text-red-600 mb-4">{error}</div>
          <button
            onClick={fetchAssets}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 scrollbar-hide">
      <div>
        <h2 className="font-gellix text-3xl font-semibold text-foreground mb-2">Asset Listings</h2>
        <p className="font-gellix text-sm text-foreground/70">
          View and manage all static and auction listings on the marketplace.
        </p>
      </div>

      <div
        className="bg-white rounded-2xl scrollbar-hide overflow-hidden"
        style={{
          boxShadow: `
            4px 4px 12px rgba(243, 244, 245, 0.08),
            8px 8px 24px rgba(150, 151, 151, 0.06),
            12px 12px 36px rgba(92, 92, 93, 0.04),
            16px 16px 48px rgba(45, 46, 47, 0.02)
          `,
        }}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-center font-gellix text-xs font-medium text-black uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">Face Value</th>
              <th className="px-6 py-3 text-left font-gellix text-xs font-medium text-black uppercase tracking-wider">Listed At</th>
              <th className="px-6 py-3 text-right font-gellix text-xs font-medium text-black uppercase tracking-wider">Results</th>
            </tr>
          </thead>
          <tbody>
            {assets.length > 0 ? (
              assets.map((asset, index) => (
                <tr key={asset.assetId} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}>
                  <td className="px-6 py-4">
                    <div className="font-gellix text-sm font-semibold text-foreground">{asset.metadata.invoiceNumber}</div>
                    <div className="font-gellix text-xs text-foreground/60">{asset.assetId}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={asset.assetType === 'AUCTION' ? 'destructive' : 'secondary'}>
                      {asset.assetType}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline">{(asset.assetType === 'AUCTION' && (asset.status === 'ENDED' || asset.status === 'AUCTION_DECLARED')) ? 'Ended' : 'Active'}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-gellix text-sm font-semibold text-foreground">
                      {formatCurrency(asset.metadata.faceValue, asset.metadata.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-gellix text-sm text-foreground">
                      {new Date(asset.listing?.listedAt || asset.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {asset.assetType === 'AUCTION' && (asset.status === 'ENDED' || asset.status === 'AUCTION_DECLARED') ? (
                      asset.listing?.clearingPrice ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Announced: ${asset.listing.clearingPrice ? (() => { const cp = parseFloat(asset.listing.clearingPrice); return (cp > 1000 ? cp / 1e6 : cp).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }); })() : 'N/A'}
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleEndAuctionClick(asset)} className="bg-blue-600 hover:bg-blue-700 text-white">
                          Announce Clearance
                        </Button>
                      )
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center h-24 font-gellix text-sm text-foreground/60">
                  No listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="font-gellix text-2xl font-semibold">End Auction for {selectedAsset?.metadata.invoiceNumber}</DialogTitle>
            <DialogDescription className="font-gellix text-sm text-foreground/70">
              Enter the final clearing price in USDC. This action will execute a blockchain transaction and is irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div>
              <label htmlFor="clearing-price" className="font-gellix text-sm font-semibold text-foreground">
                Clearing Price (USDC)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="clearing-price"
                  type="number"
                  step="any"
                  value={clearingPrice}
                  onChange={(e) => setClearingPrice(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 0.85"
                />
              </div>
              {clearingInfo && <p className="font-gellix text-xs text-foreground/60 mt-1">Suggested: ${(() => { const sp = parseFloat(clearingInfo.suggestedPrice); return (sp > 1000 ? sp / 1e6 : sp).toFixed(4); })()}</p>}
            </div>
            {isLoadingInfo ? (
              <div className="col-span-2 flex items-center justify-center h-48">
                <PageLoader text='' />
              </div>
            ) : clearingInfo && (
              <div className="col-span-2 space-y-4">
                <div className="font-gellix text-sm space-y-1">
                  <p><strong>{clearingInfo.totalBids} total bids</strong>, covering {clearingInfo.percentageOfSupply.toFixed(2)}% of supply.</p>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                  <h4 className="font-gellix font-semibold">All Bids</h4>
                  {clearingInfo.allBids.map((bid, i) => {
                    const amount = parseFloat(bid.tokenAmount);
                    const canonicalAmount = amount > 1e9 ? amount / 1e18 : amount;
                    const price = parseFloat(bid.price);
                    const canonicalPrice = price > 1000 ? price / 1e6 : price;
                    return (
                      <div key={i} className="font-gellix text-xs flex justify-between">
                        <span>{bid.bidder.slice(0, 10)}...</span>
                        <span>{canonicalAmount.toLocaleString()} tokens</span>
                        <span className="font-mono">${canonicalPrice.toFixed(4)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isEndingAuction}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEndAuction} disabled={isEndingAuction || !clearingPrice} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isEndingAuction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Declare results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingsPage;
