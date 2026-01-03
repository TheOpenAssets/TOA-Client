// src/pages/issuer/dashboard/IssuerDashboard.page.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Plus, TrendingUp, Package, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { type IssuerAsset } from '../../../types/issuer.types';
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
              <button
                onClick={() => {
                  authService.logout();
                  navigate('/');
                }}
                className="bg-black hover:bg-black/90 text-white font-geist rounded-xl px-6 py-2.5 font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[85vw] mx-auto px-6 py-4 overflow-hidden relative">
        {/* Overview Section - Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 z-20 overflow-hidden">
          {/* Total Assets */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 z-20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <p className="font-geist text-sm text-[#6B7280] font-medium">Total Assets</p>
              </div>
              <p className="font-geist text-3xl font-semibold text-[#111111]">
                {loading ? '...' : stats.totalAssets}
              </p>
            </div>
          </div>

          {/* Funds Raised */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 z-20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="font-geist text-sm text-[#6B7280] font-medium">Funds Raised</p>
              </div>
              <p className="font-geist text-3xl font-semibold text-[#111111]">
                {loading ? '...' : formatCurrency(stats.fundsRaised / 1000000)}
              </p>
            </div>
          </div>

          {/* Assets Pending */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 z-20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="font-geist text-sm text-[#6B7280] font-medium">Assets Pending</p>
              </div>
              <p className="font-geist text-3xl font-semibold text-[#111111]">
                {loading ? '...' : stats.assetsPending}
              </p>
            </div>
          </div>

          {/* Settled Assets */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <p className="font-geist text-sm text-[#6B7280] font-medium">Settled Assets</p>
              </div>
              <p className="font-geist text-3xl font-semibold text-[#111111]">
                {loading ? '...' : stats.settledAssets}
              </p>
            </div>
          </div>
        </div>

        {/* My Assets Section */}
        <div className="bg-transparent rounded-2xl p-8   overflow-hidden z-20">
          <div className="mb-6">
            <h2 className="font-geist text-2xl font-semibold text-[#111111]">My Assets</h2>
            <p className="font-geist text-sm text-[#6B7280] mt-1">
              Track and manage your tokenized assets portfolio
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="ml-3 font-geist text-[#6B7280]">Loading assets...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="font-geist text-red-600 text-center">{error}</p>
              <div className="mt-4 text-center">
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-black hover:bg-black/90 text-white font-geist"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Assets Table */}
          {!loading && !error && (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-geist">
                      Asset Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-geist">
                      Token Distribution
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-geist">
                      Invoice Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-geist">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
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
                        className="hover:bg-gray-50 transition-all duration-200 cursor-pointer relative group"

                        onClick={() => handleViewAssetDetails(asset.assetId)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-[#6B7280]" />
                            </div>
                            <div>
                              <div className="font-geist font-medium text-[#111111] text-sm">
                                {invoiceNumber}
                              </div>
                              <div className="font-geist text-xs text-[#6B7280] mt-0.5">
                                {assetType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-geist text-sm mb-2">
                            <span className="font-semibold text-[#111111]">
                              {soldTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-[#6B7280]">
                              {' '}
                              / {totalTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${soldPercentage}%` }}
                            />
                          </div>
                          <div className="font-geist text-xs text-[#6B7280] mt-1">
                            {soldPercentage.toFixed(1)}% Sold
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-geist font-semibold text-[#111111] text-sm">
                            {formatCurrency(faceValue)}
                          </div>
                          <div className="font-geist text-xs text-[#6B7280] mt-0.5">
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
              {/* Empty State (if no assets) */}
              {assets.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-geist text-lg font-semibold text-[#111111] mb-2">
                    No assets yet
                  </h3>
                  <p className="font-geist text-sm text-[#6B7280] mb-6">
                    Get started by creating your first tokenized asset
                  </p>
                  <Button
                    onClick={openAssetOnboardingForm}
                    className="bg-black hover:bg-black/90 text-white font-geist rounded-xl px-5 py-2.5 shadow-sm"
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
