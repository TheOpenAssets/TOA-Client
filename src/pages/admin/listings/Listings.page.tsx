// src/pages/admin/listings/Listings.page.tsx

import { useEffect, useState } from 'react';
import { adminService } from '../../../lib/api/admin.service';
import { contractService } from '../../../lib/api/contract.service';
import type { ApiAdminAsset } from '../../../types/admin.types';
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

const ListingsPage = () => {
  const [assets, setAssets] = useState<ApiAdminAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ApiAdminAsset | null>(null);
  const [clearingPrice, setClearingPrice] = useState('');
  const [isEndingAuction, setIsEndingAuction] = useState(false);
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
  }, []);

  const handleEndAuctionClick = (asset: ApiAdminAsset) => {
    setSelectedAsset(asset);
    setClearingPrice('');
    setIsModalOpen(true);
  };

  const handleConfirmEndAuction = async () => {
    if (!selectedAsset || !clearingPrice) {
      toastError('Error', 'Please enter a clearing price.');
      return;
    }

    setIsEndingAuction(true);
    try {
      // Step 1: End auction on-chain
      info('Step 1/2: Ending auction on-chain...', 'Please check your wallet and confirm the transaction.');
      const onChainResult = await contractService.endAuctionOnChain(selectedAsset.assetId, clearingPrice);

      if (!onChainResult.success || !onChainResult.transactionHash || !onChainResult.clearingPriceWei) {
        throw new Error(onChainResult.error || 'Failed to end auction on-chain.');
      }
      
      success('Step 1/2: Success!', `Auction ended on-chain. TX: ${onChainResult.transactionHash.slice(0, 10)}...`);

      // Step 2: Notify backend
      info('Step 2/2: Notifying backend...', 'Syncing on-chain data with the backend.');
      const backendResult = await adminService.notifyAuctionEnded(selectedAsset.assetId, onChainResult.clearingPriceWei, onChainResult.transactionHash);

      if (!backendResult.success) {
        throw new Error(backendResult.error || 'Backend notification failed.');
      }

      success('Auction Ended Successfully', `${selectedAsset.metadata.invoiceNumber} has been successfully ended.`);

      setIsModalOpen(false);
      fetchAssets(); // Refresh the list

    } catch (err: unknown) {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading listings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Asset Listings</h1>
      <p className="text-muted-foreground mt-2 mb-6">
        View and manage all static and auction listings on the marketplace.
      </p>

      <div className="bg-white rounded-lg border shadow-sm">
        {/* Fake Table Header */}
        <div className="flex p-4 border-b bg-gray-50 rounded-t-lg font-semibold text-sm text-muted-foreground">
          <div className="w-1/4">Asset</div>
          <div className="w-1/6">Type</div>
          <div className="w-1/6">Status</div>
          <div className="w-1/6">Face Value</div>
          <div className="w-1/6">Listed At</div>
          <div className="w-1/6 text-right">Actions</div>
        </div>
        {/* Fake Table Body */}
        <div>
          {assets.length > 0 ? (
            assets.map((asset) => (
              <div key={asset.assetId} className="flex p-4 border-b items-center">
                <div className="w-1/4">
                  <div className="font-medium">{asset.metadata.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">{asset.assetId}</div>
                </div>
                <div className="w-1/6">
                  <Badge variant={asset.assetType === 'AUCTION' ? 'destructive' : 'secondary'}>
                    {asset.assetType}
                  </Badge>
                </div>
                <div className="w-1/6">
                  <Badge variant="outline">{asset.listing?.phase || asset.status}</Badge>
                </div>
                <div className="w-1/6">
                  {formatCurrency(asset.metadata.faceValue, asset.metadata.currency)}
                </div>
                <div className="w-1/6">
                  {new Date(asset.listing?.listedAt || asset.createdAt).toLocaleDateString()}
                </div>
                <div className="w-1/6 text-right">
                  {asset.assetType === 'AUCTION' && asset.listing?.phase === 'BIDDING' && (
                    <Button size="sm" onClick={() => handleEndAuctionClick(asset)} className='cta-button'>
                      End Auction
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
              No listings found.
            </div>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Auction for {selectedAsset?.metadata.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Enter the final clearing price in USDC. This action will execute a blockchain transaction and is irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="clearing-price" className="text-right font-semibold">
                Clearing Price
              </label>
              <Input
                id="clearing-price"
                type="number"
                value={clearingPrice}
                onChange={(e) => setClearingPrice(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 0.85"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isEndingAuction}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEndAuction} disabled={isEndingAuction || !clearingPrice} className='cta-button'>
              {isEndingAuction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & End Auction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingsPage;
