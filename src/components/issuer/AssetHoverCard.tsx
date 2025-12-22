// src/components/issuer/AssetHoverCard.tsx

import { type IssuerAsset } from '../../types/issuer.types';
import { TrendingUp, Calendar, MapPin, Info } from 'lucide-react';

interface AssetHoverCardProps {
  asset: IssuerAsset;
  onViewMore: () => void;
  position: { top: number; left: number };
}

export const AssetHoverCard = ({ asset, onViewMore, position }: AssetHoverCardProps) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const soldPercentage =
    (asset.tokenDistribution.soldTokens / asset.tokenDistribution.totalTokens) * 100;

  return (
    <div
      className="fixed z-[9999] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        animation: 'fadeIn 0.2s ease-in-out',
        background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
        width: '768px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onViewMore();
      }}
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <h3 className="font-antic font-normal text-xl leading-tight mb-2 text-foreground">
          {asset.name}
        </h3>

        {asset.location && (
          <div className="flex items-center text-sm text-foreground/60 mb-3">
            <MapPin className="w-4 h-4 mr-1.5" />
            <span className="font-inter">{asset.location}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-gray-100 text-foreground rounded-lg text-xs font-medium font-inter border border-gray-200">
            {asset.assetType}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Invoice Amount */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-foreground/60" />
              <span className="text-xs font-medium text-foreground/70 font-inter">
                Invoice Value
              </span>
            </div>
            <p className="font-antic font-normal text-foreground text-base">
              {formatCurrency(asset.invoice.amount)}
            </p>
          </div>

          {/* Due Date */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-foreground/60" />
              <span className="text-xs font-medium text-foreground/70 font-inter">Due Date</span>
            </div>
            <p className="font-antic font-normal text-foreground text-sm">
              {formatDate(asset.invoice.dueDate)}
            </p>
          </div>
        </div>

        {/* Token Distribution */}
        <div className="mb-5 bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground font-inter">
              Token Distribution
            </span>
            <span className="text-sm font-semibold text-foreground font-inter">
              {soldPercentage.toFixed(0)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-foreground h-2 rounded-full transition-all duration-500"
              style={{ width: `${soldPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-inter">
            <span className="text-foreground/70">
              Sold: <span className="font-semibold text-foreground">
                {asset.tokenDistribution.soldTokens.toLocaleString()}
              </span>
            </span>
            <span className="text-foreground/70">
              Total: <span className="font-semibold text-foreground">
                {asset.tokenDistribution.totalTokens.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        {/* Overview snippet */}
        {asset.overview && (
          <div className="mb-5 bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-foreground/70 font-inter line-clamp-2 leading-relaxed">
              {asset.overview}
            </p>
          </div>
        )}

        {/* View More Button */}
        <button
          onClick={onViewMore}
          className="w-full bg-foreground hover:bg-foreground/90 text-white font-inter font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Info className="w-4 h-4" />
          View Full Details
        </button>
      </div>
    </div>
  );
};
