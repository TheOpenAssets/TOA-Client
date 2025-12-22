// src/pages/issuer/dashboard/IssuerDashboard.page.tsx

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Plus, TrendingUp, Package, Clock, CheckCircle } from 'lucide-react';

// Mock data for demonstration
const mockStats = {
  totalAssets: 12,
  fundsRaised: 1200000, // $1.2M
  assetsPending: 2,
  settledAssets: 5,
};

const mockAssets = [
  {
    id: 1,
    name: 'Downtown Mumbai Commercial Property',
    userTokens: 200,
    totalTokens: 1000,
    status: 'listed',
    tokenPrice: 100, // Price per token in USD
  },
  {
    id: 2,
    name: 'Green Energy Solar Farm',
    userTokens: 500,
    totalTokens: 2000,
    status: 'partially_sold',
    tokenPrice: 50,
  },
  {
    id: 3,
    name: 'Luxury Resort in Goa',
    userTokens: 300,
    totalTokens: 500,
    status: 'settled',
    tokenPrice: 200,
  },
  {
    id: 4,
    name: 'Tech Park Bangalore',
    userTokens: 1000,
    totalTokens: 1000,
    status: 'pending',
    tokenPrice: 75,
  },
  {
    id: 5,
    name: 'Residential Complex Delhi',
    userTokens: 150,
    totalTokens: 800,
    status: 'registered',
    tokenPrice: 120,
  },
];

type AssetStatus = 'pending' | 'registered' | 'listed' | 'partially_sold' | 'settled';

const IssuerDashboardPage = () => {
  const [assets] = useState(mockAssets);

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
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      registered: {
        label: 'Registered',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      listed: {
        label: 'Listed',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      partially_sold: {
        label: 'Partially Sold',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
      },
      settled: {
        label: 'Settled',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
    };

    const badge = badges[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  // Calculate unsold tokens
  const calculateUnsoldTokens = (userTokens: number, totalTokens: number) => {
    return userTokens;
  };

  // Calculate loan availability (simplified: 70% of unsold token value)
  const calculateLoanAvailability = (unsoldTokens: number, tokenPrice: number) => {
    return Math.floor(unsoldTokens * tokenPrice * 0.7);
  };

  return (
    <div className="min-h-screen bg-[#f6fbff]">
      {/* Header */}
      <header className="bg-white/10 border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className='w-48 h-16 rounded-xl p-7 bg-white'>
              <h1 className="font-antic text-lg md:text-2xl font-bold text-foreground">
                Issuer Dashboard
              </h1>
             
            </div>

            {/* Create Asset Button */}
            <Button
              onClick={openAssetOnboardingForm}
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg"
              title="Create New Asset"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Section - Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Assets */}
          <div className="bg-white/40 rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="space-y-1 bg-white/50">
              <p className="font-inter text-sm text-muted-foreground">Total Assets</p>
              <p className="font-antic text-3xl font-bold text-foreground">
                {mockStats.totalAssets}
              </p>
            </div>
          </div>

          {/* Funds Raised */}
          <div className="bg-white/40 rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-inter text-sm text-muted-foreground">Funds Raised</p>
              <p className="font-antic text-3xl font-bold text-foreground">
                {formatCurrency(mockStats.fundsRaised)}
              </p>
            </div>
          </div>

          {/* Assets Pending */}
          <div className="bg-white/40 rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-inter text-sm text-muted-foreground">Assets Pending</p>
              <p className="font-antic text-3xl font-bold text-foreground">
                {mockStats.assetsPending}
              </p>
            </div>
          </div>

          {/* Settled Assets */}
          <div className="bg-white/40 rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-inter text-sm text-muted-foreground">Settled Assets</p>
              <p className="font-antic text-3xl font-bold text-foreground">
                {mockStats.settledAssets}
              </p>
            </div>
          </div>
        </div>

        {/* My Assets Section */}
        <div className="bg-white/40 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-antic text-xl font-semibold text-foreground">My Assets</h2>
            <p className="font-inter text-sm text-muted-foreground mt-1">
              Track and manage your tokenized assets
            </p>
          </div>

          {/* Assets Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-inter">
                    Asset Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-inter">
                    Token Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-inter">
                    Unsold/Claimable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-inter">
                    Loan Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-inter">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/40 divide-y divide-gray-100">
                {assets.map((asset) => {
                  const unsoldTokens = calculateUnsoldTokens(asset.userTokens, asset.totalTokens);
                  const loanAvailability = calculateLoanAvailability(unsoldTokens, asset.tokenPrice);

                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="font-antic font-medium text-foreground">
                              {asset.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-inter text-sm">
                          <span className="font-semibold text-foreground">{asset.userTokens}</span>
                          <span className="text-muted-foreground"> / {asset.totalTokens} Total</span>
                        </div>
                        <div className="font-inter text-xs text-muted-foreground mt-1">
                          {formatCurrency(asset.tokenPrice)} per token
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-inter font-semibold text-foreground">
                          {unsoldTokens} tokens
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-inter font-semibold text-green-600">
                          {formatCurrency(loanAvailability)}
                        </div>
                        <div className="font-inter text-xs text-muted-foreground">
                          70% of value
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(asset.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
