// src/pages/issuer/asset-details/AssetDetailsWrapper.page.tsx

import { useParams, Navigate } from 'react-router-dom';
import { getAssetById } from '../../../lib/data/mock-assets';
import AssetDetailsPage from './AssetDetails.page';

const AssetDetailsWrapper = () => {
  const { assetId } = useParams<{ assetId: string }>();

  if (!assetId) {
    return <Navigate to="/issuer/dashboard" replace />;
  }

  const asset = getAssetById(assetId);

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#f6fbff] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-antic text-2xl font-bold text-foreground mb-2">
            Asset Not Found
          </h2>
          <p className="font-inter text-muted-foreground mb-6">
            The asset you're looking for doesn't exist.
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
