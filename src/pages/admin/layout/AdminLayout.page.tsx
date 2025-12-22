// src/pages/admin/layout/AdminLayout.page.tsx

import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Network,
  Coins,
  TrendingUp,
  Package,
  Users,
  DollarSign,
} from 'lucide-react';
import HeroBackground from '../../landing/HeroBackground';
import { calculateAdminStats } from '../../../lib/data/admin-mock-data';

const AdminLayout = () => {
  const location = useLocation();
  const stats = calculateAdminStats();

  const navigation = [
    {
      name: 'Overview',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Compliance Queue',
      path: '/admin/compliance',
      icon: ShieldCheck,
      badge: stats.pendingCompliance,
    },
    {
      name: 'On-Chain Operations',
      path: '/admin/operations',
      icon: Network,
      badge: stats.complianceApproved,
    },
    {
      name: 'Settlements & Yield',
      path: '/admin/settlements',
      icon: Coins,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

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

  return (
    <div className="min-h-screen bg-[#f6fbff]">
      <HeroBackground />

      <div className="relative z-10">
        {/* Top Header */}
        <header className="bg-transparent border-b border-gray-200">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-antic text-3xl font-normal text-foreground">
                  Admin Dashboard
                </h1>
                <p className="font-inter text-sm text-foreground/70 mt-1">
                  RWA Tokenization Platform Management
                </p>
              </div>

              {/* Global Stats - Top Bar */}
              <div className="hidden xl:flex items-center gap-6">
                <div className="text-right">
                  <p className="font-inter text-xs text-foreground/60">Total AUM</p>
                  <p className="font-antic text-xl font-normal text-foreground">
                    {formatCurrency(stats.assetsUnderManagement)}
                  </p>
                </div>
                <div className="h-10 w-px bg-gray-300" />
                <div className="text-right">
                  <p className="font-inter text-xs text-foreground/60">On-Chain Assets</p>
                  <p className="font-antic text-xl font-normal text-foreground">
                    {stats.onChainAssets}
                  </p>
                </div>
                <div className="h-10 w-px bg-gray-300" />
                <div className="text-right">
                  <p className="font-inter text-xs text-foreground/60">Yield Distributed</p>
                  <p className="font-antic text-xl font-normal text-foreground">
                    {formatCurrency(stats.totalYieldDistributed)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-72 border-r border-gray-200 bg-white/40 backdrop-blur-sm min-h-[calc(100vh-89px)]">
            <nav className="p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-xl
                      font-inter text-sm font-medium transition-all duration-200
                      ${
                        active
                          ? 'bg-foreground text-white shadow-md'
                          : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`
                        px-2.5 py-0.5 rounded-lg text-xs font-semibold
                        ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-primary/10 text-primary'
                        }
                      `}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Stats */}
            <div className="p-4 mt-6 space-y-3">
              <div
                className="rounded-xl p-4"
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="font-inter text-xs text-foreground/60">Assets Under Management</p>
                    <p className="font-antic text-lg font-normal text-foreground">
                      {formatCurrency(stats.assetsUnderManagement)}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <Package className="w-5 h-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="font-inter text-xs text-foreground/60">Total Assets</p>
                    <p className="font-antic text-lg font-normal text-foreground">
                      {stats.pendingCompliance + stats.complianceApproved + stats.onChainAssets}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="font-inter text-xs text-foreground/60">Originators</p>
                    <p className="font-antic text-lg font-normal text-foreground">
                      {stats.totalOriginators}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="font-inter text-xs text-foreground/60">Yield Distributed</p>
                    <p className="font-antic text-lg font-normal text-foreground">
                      {formatCurrency(stats.totalYieldDistributed)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
