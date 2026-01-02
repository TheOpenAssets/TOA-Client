// src/pages/issuer/dashboard/IssuerDashboard.page.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Plus, TrendingUp, Package, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { type IssuerAsset } from '../../../types/issuer.types';
import { AssetHoverCard } from '../../../components/issuer/AssetHoverCard';
import { AssetUploadModal } from '../../../components/issuer/AssetUploadModal';
import HeroBackground from '../../landing/HeroBackground';
import { NotificationBell } from '../../../components/notifications/NotificationBell';
import { assetService } from '../../../lib/api/asset.service';
import { authService } from '../../../lib/api/auth.service';

// Calculate stats from assets
const calculateStats = (assets: any[]) => {
  const totalAssets = assets.length;

  // Calculate funds raised from sold tokens
  const fundsRaised = assets.reduce((acc, asset) => {
    // Get sold tokens from listing
    const soldTokensRaw = asset.listing?.sold || '0';
    const soldTokens = typeof soldTokensRaw === 'string'
      ? (soldTokensRaw.length > 18 ? parseFloat(soldTokensRaw) / 1e18 : parseFloat(soldTokensRaw))
      : soldTokensRaw;

    // Get price from listing (USDC has 6 decimals)
    const priceRaw = asset.listing?.price || asset.tokenParams?.pricePerToken || '0';
    const tokenPrice = typeof priceRaw === 'string'
      ? (priceRaw.length > 6 ? parseFloat(priceRaw) / 1e6 : parseFloat(priceRaw))
      : priceRaw;

    if (soldTokens > 0 && tokenPrice > 0) {
      return acc + (soldTokens * tokenPrice);
    }
    return acc;
  }, 0);

  // Count assets by status
  const assetsPending = assets.filter((a) =>
    a.status === 'UPLOADED' || a.status === 'HASHED' || a.status === 'MERKLED'
  ).length;

  const settledAssets = assets.filter((a) =>
    a.status === 'SETTLED' || a.listing?.active === false
  ).length;

  return {
    totalAssets,
    fundsRaised,
    assetsPending,
    settledAssets,
  };
};

const IssuerDashboardPage = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<IssuerAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [hoverPosition] = useState({ top: 0, left: 0 });
  const [hideTimeoutId, setHideTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Verify authentication on component mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Check if access token exists
        if (!authService.isAuthenticated()) {
          console.warn('No access token found. Redirecting to login...');
          navigate('/', { replace: true });
          return;
        }

        // Verify token with backend
        const user = await authService.getCurrentUser();

        // Check if user has ORIGINATOR role (issuer)
        if (user.role !== 'ORIGINATOR') {
          console.warn(`Unauthorized role: ${user.role}. Issuer dashboard requires ORIGINATOR role.`);
          setError('Unauthorized access. You do not have permission to access the issuer dashboard.');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
          return;
        }

        console.log('Authentication verified. User:', user);
      } catch (err: any) {
        console.error('Authentication verification failed:', err);
        setError(err.message || 'Authentication failed. Redirecting to login...');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    };

    verifyAuth();
  }, [navigate]);

  // Fetch assets on component mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await assetService.getAllAssets({ limit: 100 });
        setAssets(response.assets);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
        setError('Failed to load assets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  const stats = calculateStats(assets);

  const handleCardMouseEnter = () => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      setHideTimeoutId(null);
    }
  };

  const handleCardMouseLeave = () => {
    setHoveredAssetId(null);
  };

  // Open asset upload modal
  const openAssetOnboardingForm = () => {
    setIsUploadModalOpen(true);
  };

  // Handle successful upload
  const handleUploadSuccess = () => {
    // Refresh assets list
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const response = await assetService.getAllAssets({ limit: 100 });
        setAssets(response.assets);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
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
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      UPLOADED: {
        label: 'Uploaded',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      HASHED: {
        label: 'Hashed',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      MERKLED: {
        label: 'Merkled',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
      },
      ATTESTED: {
        label: 'Attested',
        className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      },
      REGISTERED: {
        label: 'Registered',
        className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      },
      TOKENIZED: {
        label: 'Tokenized',
        className: 'bg-teal-100 text-teal-700 border-teal-200',
      },
      SCHEDULED: {
        label: 'Scheduled',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
       },
      LISTED: {
        label: 'Listed',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      SETTLED: {
        label: 'Settled',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      },
      pending: {
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      },
      registered: {
        label: 'Registered',
        className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      },
      listed: {
        label: 'Listed',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      partially_sold: {
        label: 'Partially Sold',
        className: 'bg-orange-100 text-orange-700 border-orange-200',
      },
      settled: {
        label: 'Settled',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      },
    };

    const badge = badges[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    };

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
              <h1 className="font-geist text-2xl md:text-3xl font-normal text-foreground">
                Issuer Dashboard
              </h1>
              <p className="font-inter text-sm text-muted-foreground mt-1">
                Manage your tokenized assets
              </p>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell role="ORIGINATOR" />

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
          <p className="font-geist text-4xl font-normal text-foreground">
            {loading ? '...' : stats.totalAssets}
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
          <p className="font-geist text-4xl font-normal text-foreground">
            {loading ? '...' : formatCurrency(stats.fundsRaised)}
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
          <p className="font-geist text-4xl font-normal text-foreground">
            {loading ? '...' : stats.assetsPending}
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
          <p className="font-geist text-4xl font-normal text-foreground">
            {loading ? '...' : stats.settledAssets}
          </p>
        </div>
          </div>
        </div>

        {/* My Assets Section */}
        <div className="bg-[#d8dfe5] rounded-2xl p-8 shadow-lg overflow-hidden z-20">
          <div className="mb-8">
        <h2 className="font-geist text-3xl font-normal text-foreground">My Assets</h2>
        <p className="font-inter text-sm text-foreground/70 mt-2">
          Track and manage your tokenized assets portfolio
        </p>
          </div>

          {/* Loading State */}
          {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
          <p className="ml-3 font-inter text-foreground/70">Loading assets...</p>
        </div>
          )}

          {/* Error State */}
          {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="font-inter text-red-600 text-center">{error}</p>
          <div className="mt-4 text-center">
            <Button
          onClick={() => window.location.reload()}
          className="bg-foreground hover:bg-foreground/90 text-black font-inter"
            >
          Try Again
            </Button>
          </div>
        </div>
          )}

          {/* Assets Table */}
          {!loading && !error && (
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
              Invoice Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider font-inter">
              Status
            </th>
          </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
          {assets.map((asset: any) => {
          // Map API response to display format
          const invoiceNumber = asset.metadata?.invoiceNumber || asset.name || 'Unnamed Asset';
          const assetType = asset.assetType || 'N/A';

          // Parse total supply from tokenParams (could be string or number, with/without decimals)
          const totalSupplyRaw = asset.tokenParams?.totalSupply || '0';
          const totalTokens = typeof totalSupplyRaw === 'string'
            ? (totalSupplyRaw.length > 18 ? parseFloat(totalSupplyRaw) / 1e18 : parseFloat(totalSupplyRaw))
            : totalSupplyRaw;

          // Get sold tokens from listing
          const soldTokensRaw = asset.listing?.sold || '0';
          const soldTokens = typeof soldTokensRaw === 'string'
            ? (soldTokensRaw.length > 18 ? parseFloat(soldTokensRaw) / 1e18 : parseFloat(soldTokensRaw))
            : soldTokensRaw;

          const soldPercentage = totalTokens > 0 ? (soldTokens / totalTokens) * 100 : 0;

          // Get invoice details from metadata
          const faceValue = parseFloat(asset.metadata?.faceValue || '0');
          const dueDate = asset.metadata?.dueDate;

          return (
            <tr
              key={asset._id || asset.assetId}
              className="hover:bg-gray-50/50 transition-all duration-200 cursor-pointer relative group"
              
              onClick={() => handleViewAssetDetails(asset.assetId)}
            >
              <td className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-foreground/60" />
              </div>
              <div>
                <div className="font-geist font-normal text-foreground text-base">
              {invoiceNumber}
                </div>
                <div className="font-inter text-xs text-foreground/60 mt-0.5">
              {assetType}
                </div>
              </div>
            </div>
              </td>
              <td className="px-6 py-5">
            <div className="font-inter text-sm mb-2">
              <span className="font-semibold text-foreground text-base">
                {soldTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-foreground/60">
                {' '}
                / {totalTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-black h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${soldPercentage}%` }}
              />
            </div>
            <div className="font-inter text-xs text-foreground/60 mt-1">
              {soldPercentage.toFixed(1)}% Sold
            </div>
              </td>
              
              <td className="px-6 py-5">
            <div className="font-geist font-normal text-foreground text-base">
              {formatCurrency(faceValue)}
            </div>
            <div className="font-inter text-xs text-foreground/60 mt-0.5">
              Due: {dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) : 'N/A'}
            </div>
              </td>
              <td className="px-6 py-5">{getStatusBadge(asset.status)}</td>
            </tr>
          );
            })}
            </tbody>
          </table>

          {/* Render Hover Card Outside Table */}
          {hoveredAssetId && (
            <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
            >
          <AssetHoverCard
            asset={assets.find((a: any) => a.assetId === hoveredAssetId)!}
            onViewMore={() => handleViewAssetDetails(hoveredAssetId!)}
            position={hoverPosition}
          />
            </div>
          )}

          {/* Empty State (if no assets) */}
          {assets.length === 0 && (
            <div className="px-6 py-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-geist text-lg font-semibold text-foreground mb-2">
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
          )}
        </div>
      </main>
      {/* Sticky Logout Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={() => {
        authService.logout();
        navigate('/');
          }}
          className="bg-black/50 hover:bg-black/90 text-white font-geist rounded-xl px-6 py-3  font-medium shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Logout
        </button>
      </div>

      {/* Asset Upload Modal */}
      <AssetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default IssuerDashboardPage;
