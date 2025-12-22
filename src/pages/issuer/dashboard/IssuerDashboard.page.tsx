// src/pages/issuer/dashboard/IssuerDashboard.page.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Plus, TrendingUp, Package, Clock, CheckCircle } from 'lucide-react';
import { mockAssets } from '../../../lib/data/mock-assets';
import { type AssetStatus } from '../../../types/issuer.types';
import { AssetHoverCard } from '../../../components/issuer/AssetHoverCard';
import HeroBackground from '../../landing/HeroBackground';

// Calculate stats from mock assets
const calculateStats = () => {
  const totalAssets = mockAssets.length;
  const fundsRaised = mockAssets.reduce(
    (acc, asset) => acc + asset.tokenDistribution.soldTokens * asset.tokenDistribution.tokenPrice,
    0
  );
  const assetsPending = mockAssets.filter((a) => a.status === 'pending').length;
  const settledAssets = mockAssets.filter((a) => a.status === 'settled').length;

  return {
    totalAssets,
    fundsRaised,
    assetsPending,
    settledAssets,
  };
};

const IssuerDashboardPage = () => {
  const navigate = useNavigate();
  const [assets] = useState(mockAssets);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [hideTimeoutId, setHideTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const mockStats = calculateStats();

  const handleMouseEnter = (
    assetId: string,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      setHideTimeoutId(null);
    }

    const cardWidth = 768; // Width of hover card
    const cardHeight = 400; // Approximate height of hover card
    const offset = 20; // Offset from cursor

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Calculate position to the right of cursor
    let left = mouseX + offset;
    let top = mouseY - (cardHeight / 2); // Center vertically with cursor

    // Ensure card stays within viewport horizontally
    if (left + cardWidth > window.innerWidth) {
      left = mouseX - cardWidth - offset; // Show on left if not enough space on right
    }

    // Ensure card stays within viewport vertically
    if (top < 10) {
      top = 10;
    } else if (top + cardHeight > window.innerHeight - 10) {
      top = window.innerHeight - cardHeight - 10;
    }

    setHoveredAssetId(assetId);
    setHoverPosition({ top, left });
  };

  const handleMouseLeave = () => {
    const timeoutId = setTimeout(() => {
      setHoveredAssetId(null);
    }, 200);
    setHideTimeoutId(timeoutId);
  };

  const handleCardMouseEnter = () => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      setHideTimeoutId(null);
    }
  };

  const handleCardMouseLeave = () => {
    setHoveredAssetId(null);
  };

  // Open asset onboarding typeform
  const openAssetOnboardingForm = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      'https://form.typeform.com/to/y0BQnYxs',
      'AssetOnboardingForm',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  // Get status badge styling
  const getStatusBadge = (status: AssetStatus) => {
    const badges = {
      pending: {
        label: 'Pending',
        className: 'bg-gray-100 text-foreground border-gray-200',
      },
      registered: {
        label: 'Registered',
        className: 'bg-gray-100 text-foreground border-gray-200',
      },
      listed: {
        label: 'Listed',
        className: 'bg-gray-100 text-foreground border-gray-200',
      },
      partially_sold: {
        label: 'Partially Sold',
        className: 'bg-gray-100 text-foreground border-gray-200',
      },
      settled: {
        label: 'Settled',
        className: 'bg-gray-100 text-foreground border-gray-200',
      },
    };

    const badge = badges[status];
    return (
      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  // Navigate to asset details
  const handleViewAssetDetails = (assetId: string) => {
    navigate(`/issuer/asset/${assetId}`);
  };

  return (
    <div className="min-h-screen bg-white">
            <HeroBackground />

      {/* Header */}
      <header className=" bg-transparent border-b border-gray-200 relative top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-antic text-2xl md:text-3xl font-normal text-foreground">
                Issuer Dashboard
              </h1>
              <p className="font-inter text-sm text-muted-foreground mt-1">
                Manage your tokenized assets
              </p>
            </div>

            {/* Create Asset Button */}
            <Button
              onClick={openAssetOnboardingForm}
              className="bg-foreground hover:bg-foreground/90 text-black rounded-xl px-6 py-3 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 font-inter font-medium"
              title="Create New Asset"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add New Asset</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 overflow-hidden relative">
        {/* Overview Section - Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 z-20 overflow-hidden">
          {/* Total Assets */}
          <div
        className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift z-20"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">Total Assets</p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {mockStats.totalAssets}
          </p>
        </div>
          </div>

          {/* Funds Raised */}
          <div
        className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift z-20"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">Funds Raised</p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {formatCurrency(mockStats.fundsRaised)}
          </p>
        </div>
          </div>

          {/* Assets Pending */}
          <div
        className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift z-20"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">Assets Pending</p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {mockStats.assetsPending}
          </p>
        </div>
          </div>

          {/* Settled Assets */}
          <div
        className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-foreground/60" />
            <p className="font-inter text-sm text-foreground/70 font-medium">Settled Assets</p>
          </div>
          <p className="font-antic text-4xl font-normal text-foreground">
            {mockStats.settledAssets}
          </p>
        </div>
          </div>
        </div>

        {/* My Assets Section */}
        <div className="bg-[#d8dfe5] rounded-2xl p-8 shadow-lg overflow-hidden z-20">
          <div className="mb-8">
        <h2 className="font-antic text-3xl font-normal text-foreground">My Assets</h2>
        <p className="font-inter text-sm text-foreground/70 mt-2">
          Track and manage your tokenized assets portfolio
        </p>
          </div>

          {/* Assets Table */}
          <div className="overflow-x-auto bg-white rounded-xl">
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
          <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
            Asset Name
          </th>
          <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
            Token Distribution
          </th>
          <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
            Unsold Tokens
          </th>
          <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
            Invoice Amount
          </th>
          <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
            Status
          </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {assets.map((asset) => {
          const soldPercentage =
            (asset.tokenDistribution.soldTokens /
              asset.tokenDistribution.totalTokens) *
            100;

          return (
            <tr
              key={asset.id}
              className="hover:bg-gray-50/50 transition-all duration-200 cursor-pointer relative group"
              onMouseEnter={(e) => handleMouseEnter(asset.id, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleViewAssetDetails(asset.id)}
            >
              <td className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-foreground/60" />
              </div>
              <div>
                <div className="font-antic font-normal text-foreground text-base">
              {asset.name}
                </div>
                <div className="font-inter text-xs text-foreground/60 mt-0.5">
              {asset.assetType}
                </div>
              </div>
            </div>
              </td>
              <td className="px-6 py-5">
            <div className="font-inter text-sm mb-2">
              <span className="font-semibold text-foreground text-base">
                {asset.tokenDistribution.soldTokens.toLocaleString()}
              </span>
              <span className="text-foreground/60">
                {' '}
                / {asset.tokenDistribution.totalTokens.toLocaleString()}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-foreground h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${soldPercentage}%` }}
              />
            </div>
            <div className="font-inter text-xs text-foreground/60 mt-1">
              {soldPercentage.toFixed(1)}% Sold
            </div>
              </td>
              <td className="px-6 py-5">
            <div className="inline-flex flex-col items-start">
              <div className="font-inter font-semibold text-foreground text-base">
                {asset.tokenDistribution.unsoldTokens.toLocaleString()}
              </div>
              <div className="font-inter text-xs text-foreground/60 mt-0.5">
                {formatCurrency(asset.tokenDistribution.tokenPrice)} per token
              </div>
            </div>
              </td>
              <td className="px-6 py-5">
            <div className="font-antic font-normal text-foreground text-base">
              {formatCurrency(asset.invoice.amount)}
            </div>
            <div className="font-inter text-xs text-foreground/60 mt-0.5">
              Due: {new Date(asset.invoice.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
              </td>
              <td className="px-6 py-5">{getStatusBadge(asset.status)}</td>
            </tr>
          );
            })}
          </tbody>
        </table>
          </div>

          {/* Render Hover Card Outside Table */}
          {hoveredAssetId && (
        <AssetHoverCard
          asset={assets.find((a) => a.id === hoveredAssetId)!}
          onViewMore={() => handleViewAssetDetails(hoveredAssetId)}
          position={hoverPosition}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        />
          )}

          {/* Empty State (if no assets) */}
          {assets.length === 0 && (
        <div className="px-6 py-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
            No assets yet
          </h3>
          <p className="font-inter text-sm text-muted-foreground mb-6">
            Get started by creating your first tokenized asset
          </p>
          <Button
            onClick={openAssetOnboardingForm}
            className="bg-purple-500 hover:bg-purple-600 text-white font-inter"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Asset
          </Button>
        </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default IssuerDashboardPage;
