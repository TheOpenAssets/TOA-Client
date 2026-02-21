// src/pages/issuer/asset-details/AssetDetailsWrapper.page.tsx

import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { assetService } from '../../../lib/api/asset.service';
import AssetDetailsPage from './AssetDetails.page';
// import { Loader2 } from 'lucide-react';
import { type IssuerAsset } from '../../../types/issuer.types';
import { PageLoader } from '../../../components/ui/page-loader';
import { useNetwork } from '../../../lib/network/NetworkContext';

const AssetDetailsWrapper = () => {
  const { networkPath } = useNetwork();
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
    return <Navigate to={networkPath('/issuer/dashboard')} replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <PageLoader text='' />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-geist text-2xl font-semibold text-[#111111] mb-2">
            {error || 'Asset Not Found'}
          </h2>
          <p className="font-geist text-[#6B7280] mb-6">
            The asset you're looking for doesn't exist or could not be loaded.
          </p>
          <a
            href={networkPath('/issuer/dashboard')}
            className="inline-block px-6 py-3 bg-black hover:bg-black/90 text-white font-geist rounded-xl transition-all duration-200"
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
