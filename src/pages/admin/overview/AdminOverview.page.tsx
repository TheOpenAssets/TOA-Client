// src/pages/admin/overview/AdminOverview.page.tsx

import { useEffect } from 'react';
import { TrendingUp, Package, ShieldCheck, Network, Clock, Gavel } from 'lucide-react';
import { useAdminStore } from '../../../stores/admin.store';

const AdminOverviewPage = () => {
  const { stats, activities, isLoading, error, fetchAdminDashboardData } = useAdminStore();

  useEffect(() => {
    fetchAdminDashboardData();

    // Hide scrollbars globally for this page
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
  }, [fetchAdminDashboardData]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get activity icon and color
  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'YIELD_DISTRIBUTED':
        return { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' };
      case 'ASSET_TOKENIZED':
        return { icon: Network, color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'COMPLIANCE_APPROVED':
        return { icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-50' };
      case 'COMPLIANCE_PENDING':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' };
      case 'ASSET_REGISTERED':
        return { icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' };
      case 'ASSET_LISTED':
        return { icon: Gavel, color: 'text-indigo-500', bg: 'bg-indigo-50' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="font-gellix text-lg text-foreground">Loading admin overview...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="font-gellix text-lg text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchAdminDashboardData()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-gellix text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="font-gellix text-3xl font-semibold text-foreground mb-2">
          Dashboard Overview
        </h2>
        <p className="font-gellix text-sm text-foreground/70">
          Monitor and manage the complete asset lifecycle
        </p>
      </div>

      {/* Stats Grid - Matching Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Compliance */}
        <div
          className="bg-white rounded-2xl border border-gray-200 hover:bg-gray-50 hover:border-gray-200 p-6 flex flex-col relative overflow-hidden"
        >
          <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
            Pending Compliance
          </h3>
          <p className="font-gellix text-3xl font-semibold text-foreground">
            {stats?.pendingCompliance ?? 0}
          </p>
          <p className="font-gellix text-xs text-gray-500 mt-2">
            Assets awaiting review
          </p>
          <ShieldCheck className="absolute bottom-4 right-4 w-8 h-8 text-gray-200" />
        </div>

        {/* Compliance Approved */}
        <div
          className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col relative overflow-hidden hover:bg-gray-50 hover:border-gray-200"
        >
          <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
            Ready for Registry
          </h3>
          <p className="font-gellix text-3xl font-semibold text-foreground">
            {stats?.complianceApproved ?? 0}
          </p>
          <p className="font-gellix text-xs text-gray-500 mt-2">
            Assets approved for on-chain
          </p>
          <Package className="absolute bottom-4 right-4 w-8 h-8 text-gray-200" />
        </div>

        {/* On-Chain Assets */}
        <div
          className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col relative overflow-hidden hover:bg-gray-50 hover:border-gray-200 "
        >
          <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
            On-Chain Assets
          </h3>
          <p className="font-gellix text-3xl font-semibold text-foreground">
            {stats?.onChainAssets ?? 0}
          </p>
          <p className="font-gellix text-xs text-gray-500 mt-2">
            Registered & tokenized
          </p>
          <Network className="absolute bottom-4 right-4 w-8 h-8 text-gray-200" />
        </div>

        {/* Total Yield */}
        <div
          className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col relative hover:bg-gray-50 hover:border-gray-200 overflow-hidden"
        >
          <h3 className="font-gellix text-xs font-medium text-gray-500 mb-2">
            Yield Distributed
          </h3>
          <p className="font-gellix text-3xl font-semibold text-foreground">
            {formatCurrency(stats?.totalYieldDistributed ?? 0)}
          </p>
          <p className="font-gellix text-xs text-gray-500 mt-2">
            Total USDC distributed
          </p>
          <TrendingUp className="absolute bottom-4 right-4 w-8 h-8 text-gray-200" />
        </div>
      </div>

      {/* Recent Activity - Matching Portfolio Table */}
      <div
        className="bg-white rounded-2xl p-6 flex flex-col relative overflow-hidden border-t-2 border-gray-100"
      >
        <div className="mb-6">
          <h3 className="font-gellix text-2xl font-semibold text-foreground">Recent Activity</h3>
          <p className="font-gellix text-sm text-foreground/70 mt-1">
            Latest platform operations and updates
          </p>
        </div>

        <div className="space-y-3">
          {activities.map((activity) => {
            const { icon: Icon, color, bg } = getActivityStyle(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-gellix text-sm font-medium text-foreground">
                        {activity.assetName}
                      </p>
                      <p className="font-gellix text-xs text-foreground/60 mt-0.5">
                        {activity.details}
                      </p>
                      <p className="font-gellix text-xs text-foreground/60 mt-1">
                        Minraise: {Number(activity.minraise) / 1e6} USDC
                      </p>
                      <p className="font-gellix text-xs text-foreground/50 mt-1">
                        By {activity.actor}
                      </p>
                    </div>
                    <span className="font-gellix text-xs text-foreground/50 whitespace-nowrap">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
