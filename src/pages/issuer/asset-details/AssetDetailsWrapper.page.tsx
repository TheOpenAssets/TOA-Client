// src/pages/issuer/asset-details/AssetDetailsWrapper.page.tsx

import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { assetService } from '../../../lib/api/asset.service';
import AssetDetailsPage from './AssetDetails.page';
import { Loader2 } from 'lucide-react';
import { type IssuerAsset } from '../../../types/issuer.types';

const AssetDetailsWrapper = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<IssuerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setLoading(false);
      return;
    }

    const fetchAsset = async () => {
      try {
        setLoading(true);
        const fetchedAsset: any = await assetService.getAssetById(assetId);
        if (fetchedAsset) {
          setAsset(fetchedAsset);
        } else {
          setError('Asset not found.');
        }
      } catch (err) {
        setError('Failed to fetch asset details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

  if (!assetId) {
    return <Navigate to="/issuer/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-geist text-2xl font-bold text-foreground mb-2">
            {error || 'Asset Not Found'}
          </h2>
          <p className="font-inter text-muted-foreground mb-6">
            The asset you're looking for doesn't exist or could not be loaded.
          </p>
          <a
            href="/issuer/dashboard"
            className="inline-block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-inter rounded-lg transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <AssetDetailsPage asset={asset} />;
};

export default AssetDetailsWrapper;
