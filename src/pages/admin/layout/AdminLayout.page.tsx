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
        <header className="bg-white/70 rounded-3xl  sticky top-0 z-20 border-b border-gray-200 mt-4 mx-6 backdrop-blur-sm">
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
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-72 border-r  border-gray-200 bg-white/40 backdrop-blur-sm min-h-[calc(100vh-89px)]">
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
                          ? 'bg-foreground text-black/70 shadow-md'
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
           
            {/* logout  */}
            <div className="absolute bottom-0 w-72 mb-6 px-4">
              <Link
                to="/"
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-inter text-sm font-medium text-black-600 hover:bg-red-50 transition-all duration-200"
              >
                <Package className="w-5 h-5" />
                <span>Logout</span>
              </Link>
           </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8  min-h-[calc(100vh-89px)]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
