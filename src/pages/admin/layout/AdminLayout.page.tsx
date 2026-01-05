// src/pages/admin/layout/AdminLayout.page.tsx

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Network,
  Coins,
  DollarSign,
  List,
  LogOut,
} from 'lucide-react';
import HeroBackground from '../../landing/HeroBackground';
import { NotificationBell } from '../../../components/notifications/NotificationBell';
import { authService } from '../../../lib/api/auth.service';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../stores/auth.store';

const AdminLayout = () => {
  const location = useLocation();
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    

    const verifyAuth = async () => {
      try {
        // Check if access token exists
       
        // Verify token with backend
        const currentUser = await authService.getCurrentUser();

        // Check if user has ADMIN role
        if (currentUser.role !== 'ADMIN') {
          setError('Unauthorized access. You do not have permission to access the admin dashboard.');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
          return;
        }

        console.log('Authentication verified. User:', currentUser);
      } catch (err: any) {
        console.error('Authentication verification failed:', err);
        setError(err.message || 'Authentication failed. Redirecting to login...');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    };

    verifyAuth();

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
  }, [navigate, user]);

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
      name: 'Compliance',
      path: '/admin/compliance',
      icon: ShieldCheck,
    },
    {
      name: 'Operations',
      path: '/admin/operations',
      icon: Network,
    },
    {
      name: 'Payouts',
      path: '/admin/payouts',
      icon: DollarSign,
    },
    {
      name: 'Settlements',
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

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#ffffff]">
      <HeroBackground />

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Navigation Bar - Matching Portfolio/Marketplace */}
        <header className="bg-transparent z-40 relative flex-shrink-0">
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Logo */}
              <div className="flex items-center gap-6">
                <div className="top-0 left-0">
                  <div className="w-32 h-16 bg-foreground rounded-full top-0 left-0">
                    <span className="text-white font-bold text-lg top-0 left-0">
                      <img
                        src="./ALogo-removebg-preview.svg"
                        alt="Logo"
                        onClick={() => navigate('/')}
                        className='cursor-pointer'
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* Center: Navigation */}
              <nav className="flex items-center gap-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 font-geist border border-gray-200 text-sm font-medium pl-3 pr-3 hover:bg-gray-100 transition-colors p-1.5 rounded-xl ${
                        active
                          ? 'text-foreground bg-gray-100'
                          : 'text-foreground/70 hover:text-blue-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Right: Notification Bell + Logout */}
              <div className="flex items-center gap-3">
                <NotificationBell role="ADMIN" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-gellix text-sm font-medium hover:bg-black/80 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Full Width */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1600px] mx-auto px-6 py-6 h-full z-40 relative">
            <main className="h-full overflow-y-auto scollbar-hide">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
