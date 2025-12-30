// src/pages/admin/layout/AdminLayout.page.tsx

import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Network,
  Coins,
  Package,
  DollarSign,
  List,
} from 'lucide-react';
import HeroBackground from '../../landing/HeroBackground';
import { NotificationBell } from '../../../components/notifications/NotificationBell';
import { authService } from '../../../lib/api/auth.service';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLayout = () => {
  const location = useLocation();
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

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
        if (user.role !== 'ADMIN') {
          console.warn(`Unauthorized role: ${user.role}. Admin dashboard requires Admin role.`);
          setError('Unauthorized access. You do not have permission to access the admin dashboard.');
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

  const navigation = [
    {
      name: 'Overview',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Listings',
      path: '/admin/listings',
      icon: List,
    },
    {
      name: 'Compliance Queue',
      path: '/admin/compliance',
      icon: ShieldCheck,
      
    },
    {
      name: 'On-Chain Operations',
      path: '/admin/operations',
      icon: Network,
    },
    {
      name: 'Payouts',
      path: '/admin/payouts',
      icon: DollarSign,
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

  return (
    <div className="min-h-screen bg-[#f6fbff]">
      <HeroBackground />

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
                
                {/* Notification Bell */}
                <NotificationBell role="ADMIN" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Sidebar */}
          <aside className="w-72 border-r border-gray-200 bg-white/40 backdrop-blur-sm h-full overflow-y-auto">
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
          <main className="flex-1 p-8 h-full overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

