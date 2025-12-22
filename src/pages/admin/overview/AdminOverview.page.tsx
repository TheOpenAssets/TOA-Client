// src/pages/admin/overview/AdminOverview.page.tsx

import { TrendingUp, Package, ShieldCheck, Network, Clock } from 'lucide-react';
import { calculateAdminStats, mockAdminActivities } from '../../../lib/data/admin-mock-data';

const AdminOverviewPage = () => {
  const stats = calculateAdminStats();

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
      case 'ASSET_REGISTERED':
        return { icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="font-antic text-3xl font-normal text-foreground mb-2">
          Dashboard Overview
        </h2>
        <p className="font-inter text-sm text-foreground/70">
          Monitor and manage the complete asset lifecycle
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Compliance */}
        <div
          className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-foreground/60" />
              <p className="font-inter text-sm text-foreground/70 font-medium">
                Pending Compliance
              </p>
            </div>
            <p className="font-antic text-4xl font-normal text-foreground">
              {stats.pendingCompliance}
            </p>
            <p className="font-inter text-xs text-foreground/60">
              Assets awaiting review
            </p>
          </div>
        </div>

        {/* Compliance Approved */}
        <div
          className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-foreground/60" />
              <p className="font-inter text-sm text-foreground/70 font-medium">
                Ready for Registry
              </p>
            </div>
            <p className="font-antic text-4xl font-normal text-foreground">
              {stats.complianceApproved}
            </p>
            <p className="font-inter text-xs text-foreground/60">
              Assets approved for on-chain
            </p>
          </div>
        </div>

        {/* On-Chain Assets */}
        <div
          className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-foreground/60" />
              <p className="font-inter text-sm text-foreground/70 font-medium">
                On-Chain Assets
              </p>
            </div>
            <p className="font-antic text-4xl font-normal text-foreground">
              {stats.onChainAssets}
            </p>
            <p className="font-inter text-xs text-foreground/60">
              Registered & tokenized
            </p>
          </div>
        </div>

        {/* Total Yield */}
        <div
          className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-foreground/60" />
              <p className="font-inter text-sm text-foreground/70 font-medium">
                Yield Distributed
              </p>
            </div>
            <p className="font-antic text-4xl font-normal text-foreground">
              {formatCurrency(stats.totalYieldDistributed)}
            </p>
            <p className="font-inter text-xs text-foreground/60">
              Total USDC distributed
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div
        className="rounded-2xl p-8 shadow-lg"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
      >
        <div className="mb-6">
          <h3 className="font-antic text-2xl font-normal text-foreground">Recent Activity</h3>
          <p className="font-inter text-sm text-foreground/70 mt-1">
            Latest platform operations and updates
          </p>
        </div>

        <div className="space-y-4">
          {mockAdminActivities.map((activity) => {
            const { icon: Icon, color, bg } = getActivityStyle(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 bg-white rounded-xl hover:bg-white/80 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-inter text-sm font-medium text-foreground">
                        {activity.assetName}
                      </p>
                      <p className="font-inter text-xs text-foreground/60 mt-0.5">
                        {activity.details}
                      </p>
                      <p className="font-inter text-xs text-foreground/50 mt-1">
                        By {activity.actor}
                      </p>
                    </div>
                    <span className="font-inter text-xs text-foreground/50 whitespace-nowrap">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/admin/compliance"
          className="block rounded-2xl p-6 transition-all duration-300 hover-lift"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
            boxShadow: `
              rgba(141, 194, 235, 0.25) 0px -3px 0px 2px inset,
              rgba(16, 49, 77, 0.21) 0px 0.706592px 0.706592px -0.583333px,
              rgba(16, 49, 77, 0.2) 0px 1.80656px 1.80656px -1.16667px,
              rgba(16, 49, 77, 0.2) 0px 3.62176px 3.62176px -1.75px,
              rgba(16, 49, 77, 0.18) 0px 6.8656px 6.8656px -2.33333px,
              rgba(16, 49, 77, 0.16) 0px 13.6468px 13.6468px -2.91667px,
              rgba(16, 49, 77, 0.09) 0px 30px 30px -3.5px
            `,
          }}
        >
          <ShieldCheck className="w-8 h-8 text-foreground/60 mb-3" />
          <h4 className="font-antic text-lg font-normal text-foreground mb-1">
            Review Compliance
          </h4>
          <p className="font-inter text-sm text-foreground/60">
            Process pending compliance requests
          </p>
        </a>

        <a
          href="/admin/operations"
          className="block rounded-2xl p-6 transition-all duration-300 hover-lift"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
            boxShadow: `
              rgba(141, 194, 235, 0.25) 0px -3px 0px 2px inset,
              rgba(16, 49, 77, 0.21) 0px 0.706592px 0.706592px -0.583333px,
              rgba(16, 49, 77, 0.2) 0px 1.80656px 1.80656px -1.16667px,
              rgba(16, 49, 77, 0.2) 0px 3.62176px 3.62176px -1.75px,
              rgba(16, 49, 77, 0.18) 0px 6.8656px 6.8656px -2.33333px,
              rgba(16, 49, 77, 0.16) 0px 13.6468px 13.6468px -2.91667px,
              rgba(16, 49, 77, 0.09) 0px 30px 30px -3.5px
            `,
          }}
        >
          <Network className="w-8 h-8 text-foreground/60 mb-3" />
          <h4 className="font-antic text-lg font-normal text-foreground mb-1">
            On-Chain Operations
          </h4>
          <p className="font-inter text-sm text-foreground/60">
            Register and tokenize assets
          </p>
        </a>

        <a
          href="/admin/settlements"
          className="block rounded-2xl p-6 transition-all duration-300 hover-lift"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
            boxShadow: `
              rgba(141, 194, 235, 0.25) 0px -3px 0px 2px inset,
              rgba(16, 49, 77, 0.21) 0px 0.706592px 0.706592px -0.583333px,
              rgba(16, 49, 77, 0.2) 0px 1.80656px 1.80656px -1.16667px,
              rgba(16, 49, 77, 0.2) 0px 3.62176px 3.62176px -1.75px,
              rgba(16, 49, 77, 0.18) 0px 6.8656px 6.8656px -2.33333px,
              rgba(16, 49, 77, 0.16) 0px 13.6468px 13.6468px -2.91667px,
              rgba(16, 49, 77, 0.09) 0px 30px 30px -3.5px
            `,
          }}
        >
          <TrendingUp className="w-8 h-8 text-foreground/60 mb-3" />
          <h4 className="font-antic text-lg font-normal text-foreground mb-1">
            Record Settlements
          </h4>
          <p className="font-inter text-sm text-foreground/60">
            Manage yield distribution
          </p>
        </a>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
