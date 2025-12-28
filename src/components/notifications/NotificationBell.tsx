// src/components/notifications/NotificationBell.tsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Bell, FileCheck, Coins, Award, TrendingUp, AlertCircle, DollarSign, UserCheck, XCircle } from 'lucide-react';
import {
  notificationService,
  type BackendNotification,
  type NotificationType,
} from '../../lib/api/notification.service';

/**
 * Map notification types to Lucide icons
 */
const getNotificationIcon = (type: NotificationType) => {
  const iconMap: Record<NotificationType, any> = {
    ASSET_STATUS: FileCheck,
    TOKEN_DEPLOYED: Coins,
    KYC_STATUS: UserCheck,
    BID_PLACED: Award,
    AUCTION_WON: Award,
    BID_REFUNDED: XCircle,
    TOKEN_PURCHASED: TrendingUp,
    YIELD_DISTRIBUTED: DollarSign,
  };

  return iconMap[type] || AlertCircle;
};

/**
 * Get severity color classes
 */
const getSeverityColor = (severity: string) => {
  const colorMap: Record<string, string> = {
    SUCCESS: 'text-green-600',
    INFO: 'text-blue-600',
    WARNING: 'text-yellow-600',
    ERROR: 'text-red-600',
  };

  return colorMap[severity] || 'text-gray-600';
};

/**
 * Format timestamp to relative time
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return then.toLocaleDateString();
};

interface NotificationBellProps {
  /**
   * User role to filter notifications
   */
  role: 'ORIGINATOR' | 'INVESTOR' | 'ADMIN';
}

/**
 * NotificationBell - Reusable notification component for all roles
 *
 * Features:
 * - Real-time SSE notifications
 * - Unread count badge
 * - Mark as read / mark all as read
 * - Role-based filtering
 * - Action navigation
 */
export function NotificationBell({ role }: NotificationBellProps) {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await notificationService.getAllNotifications('all', 50, 0);

      // Filter by role
      const filteredNotifications = notificationService.filterNotificationsByRole(
        response.notifications,
        role
      );

      setNotifications(filteredNotifications);
      setUnreadCount(filteredNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to SSE for real-time notifications
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribeToRealTime = () => {
      unsubscribe = notificationService.subscribeToNotifications((newNotification) => {
        // Filter by role
        const allowed = notificationService.filterNotificationsByRole([newNotification], role);
        if (allowed.length === 0) return;

        console.log('📬 New notification for', role, ':', newNotification);

        // Add to notifications list
        setNotifications((prev) => [newNotification, ...prev]);
        if (!newNotification.read) {
          setUnreadCount((prev) => prev + 1);
        }

        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.header, {
            body: newNotification.detail,
            icon: '/logo.png',
          });
        }
      });
    };

    subscribeToRealTime();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [role]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle notification click - navigate based on action
  const handleNotificationClick = async (notification: BackendNotification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on action
    if (notification.action && notification.action !== 'NONE') {
      const metadata = notification.actionMetadata || {};

      switch (notification.action) {
        case 'VIEW_ASSET':
          if (metadata.assetId) {
            if (role === 'ORIGINATOR') {
              navigate(`/issuer/asset/${metadata.assetId}`);
            } else if (role === 'ADMIN') {
              navigate(`/admin/operations`); // Admin views assets in operations page
            } else {
              navigate(`/marketplace/asset/${metadata.assetId}`);
            }
          }
          break;

        case 'VIEW_PORTFOLIO':
          navigate('/portfolio');
          break;

        case 'VIEW_MARKETPLACE':
          navigate('/marketplace');
          break;

        case 'CLAIM_YIELD':
          navigate('/portfolio'); // Yield claiming happens in portfolio
          break;

        case 'VIEW_KYC':
          navigate('/onboarding'); // KYC page
          break;

        default:
          break;
      }

      // Close popover after navigation
      setIsOpen(false);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = tab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell size={16} strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1 bg-purple-500 rounded-full w-5 h-5 flex items-center justify-center" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 bg-white/80 backdrop-blur-sm">
        {/* Header with Tabs + Mark All */}
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'all' | 'unread')}>
          <div className="flex items-center justify-between border-b px-4 py-3 bg-white/40">
            <TabsList className="bg-transparent">
              <TabsTrigger value="all" className="text-sm font-inter">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-sm font-inter">
                Unread
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-purple-500 text-white">{unreadCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium font-inter text-foreground/70 hover:text-foreground hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[480px] overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="mt-3 text-sm font-inter text-foreground/70">
                  Loading notifications...
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-inter text-foreground/70">
                  {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const severityColor = getSeverityColor(notification.severity);

                return (
                  <button
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors ${
                      notification.read
                        ? 'hover:bg-gray-50/50'
                        : 'bg-blue-50/30 hover:bg-blue-50/50'
                    } ${notification.action !== 'NONE' ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`mt-1 ${severityColor}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p
                        className={`text-sm font-inter ${
                          notification.read
                            ? 'text-foreground/80 font-normal'
                            : 'text-foreground font-semibold'
                        }`}
                      >
                        {notification.header}
                      </p>
                      <p className="text-xs font-inter text-foreground/60 line-clamp-2">
                        {notification.detail}
                      </p>
                      <p className="text-xs font-inter text-foreground/50">
                        {formatRelativeTime(notification.receivedAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="mt-2 inline-block w-2 h-2 rounded-full bg-purple-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Tabs>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 text-center border-t bg-white/40">
            <p className="text-xs font-inter text-foreground/60">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
