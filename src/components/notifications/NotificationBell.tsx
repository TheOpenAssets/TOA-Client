import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Bell, FileCheck, Coins, Award, TrendingUp,
  AlertCircle, DollarSign, UserCheck, XCircle
} from 'lucide-react';

import { Button } from '../ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

import {
  notificationService,
  type BackendNotification,
  type NotificationType,
} from '../../lib/api/notification.service';
import { PageLoader } from '../ui/page-loader';

const getNotificationIcon = (type: NotificationType | string) => {
  const iconMap: Record<string, any> = {
    ASSET_STATUS: FileCheck, TOKEN_DEPLOYED: Coins, KYC_STATUS: UserCheck,
    BID_PLACED: Award, AUCTION_WON: Award, BID_REFUNDED: XCircle,
    TOKEN_PURCHASED: TrendingUp, YIELD_DISTRIBUTED: DollarSign, SYSTEM_ALERT: Bell,
  };
  return iconMap[type] || AlertCircle;
};

// Muted colors for read items, bold for unread
const getSeverityColor = (_severity: string, isRead: boolean) => {
  if (isRead) return 'text-slate-300';
  return 'text-slate-900';
};

const formatRelativeTime = (timestamp: string): string => {
  const diffMs = new Date().getTime() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  return `${Math.floor(diffMins / 1440)}d`;
};

const AuctionEndedDetail = ({ notification, isRead }: { notification: BackendNotification, isRead: boolean }) => {
  const metadata = notification.actionMetadata;
  if (!metadata?.suggestedClearingPrice) return <p className={`text-[11px] ${isRead ? 'text-slate-300' : 'text-slate-400'}`}>{notification.detail}</p>;

  return (
    <div className={`mt-2 space-y-2 border-l ${isRead ? 'border-slate-100' : 'border-slate-200'} pl-3`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight">
        <span className={isRead ? 'text-slate-200' : 'text-slate-400'}>Target</span>
        <span className={isRead ? 'text-slate-300' : 'text-slate-900'}>${(parseFloat(metadata.suggestedClearingPrice) / 1e6).toFixed(2)}</span>
      </div>
      {!isRead && (
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          Review required
        </p>
      )}
    </div>
  );
};

export function NotificationBell({ role }: { role: 'ORIGINATOR' | 'INVESTOR' | 'ADMIN' }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      const response = await notificationService.getAllNotifications('all', 50, 0, forceRefresh);
      const filtered = notificationService.filterNotificationsByRole(response.notifications, role);
      setNotifications(filtered);
      setUnreadCount(filtered.filter((n) => !n.read).length);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  }, [role]);

  // Fetch unread count initially for the badge
  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };
    fetchInitialCount();
  }, []);

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications((newNotification) => {
      const allowed = notificationService.filterNotificationsByRole([newNotification], role);
      if (allowed.length === 0) return;
      
      // Trigger Toast
      toast(newNotification.header, {
        icon: newNotification.severity === 'SUCCESS' ? '✅' : 
              newNotification.severity === 'ERROR' ? '❌' : 
              newNotification.severity === 'WARNING' ? '⚠️' : 'ℹ️',
        duration: 4000,
        position: 'top-right',
        className: 'font-geist text-sm font-medium'
      });

      setNotifications((prev) => [newNotification, ...prev]);
      if (!newNotification.read) setUnreadCount((prev) => prev + 1);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [role]);

  const handleNotificationClick = async (n: BackendNotification) => {
    if (!n.read) {
      await notificationService.markAsRead(n._id);
      setNotifications((prev) => prev.map((item) => item._id === n._id ? { ...item, read: true } : item));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (n.action && n.action !== 'NONE') {
      const metadata = n.actionMetadata || {};
      if (n.action === 'VIEW_ASSET' && metadata.assetId) {
        navigate(role === 'ORIGINATOR' ? `/issuer/asset/${metadata.assetId}` : role === 'ADMIN' ? `/admin/operations` : `/marketplace/asset/${metadata.assetId}`);
      }
      setIsOpen(false);
    }
  };

  const filteredNotifications = tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/40 backdrop-blur-md z-[40]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          loadNotifications(true);
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="relative h-10 w-10 border border-gray-200 rounded-full hover:bg-gray-200 transition-colors z-[50]"
          >
            <Bell size={18} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-slate-900 rounded-full border border-white" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={12}
          className="w-[380px] p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-2xl bg-white z-[50]"
        >
          <div className="flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Activity Feed</h2>
                {unreadCount > 0 && (
                  <button
                    onClick={() => notificationService.markAllAsRead()}
                    className="text-[10px] font-bold text-slate-900 uppercase opacity-30 hover:opacity-100 transition-opacity"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="bg-slate-50 p-1 rounded-lg w-full flex border border-slate-100">
                  <TabsTrigger value="all" className="flex-1 text-[10px] font-bold uppercase data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-400 transition-all">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="flex-1 text-[10px] font-bold uppercase data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-400 transition-all gap-2 flex items-center justify-center">
                    Unread
                    {unreadCount > 0 && (
                      <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] min-w-[14px]">
                        {unreadCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <PageLoader text="Syncing" />
              ) : filteredNotifications.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-200 uppercase tracking-widest">
                  No Updates
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const Icon = getNotificationIcon(n.type);
                  return (
                    <motion.button
                      key={n._id}
                      whileHover={{ x: 2, backgroundColor: "rgba(241, 245, 249, 0.4)" }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex w-full items-start gap-4 p-4 rounded-xl transition-colors text-left mb-0.5 
                        ${!n.read ? 'bg-slate-90/80 shadow-sm border border-slate-100/50' : 'bg-transparent opacity-60'}`}
                    >
                      <div className={`mt-0.5 ${getSeverityColor(n.severity, n.read)}`}>
                        <Icon size={14} strokeWidth={!n.read ? 2.5 : 2} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`text-[12px] tracking-tight ${n.read ? 'text-slate-800 font-medium' : 'text-slate-900 font-bold'}`}>
                            {n.header}
                          </p>
                          <span className={`text-[9px] font-bold uppercase ml-2 flex-shrink-0 ${n.read ? 'text-slate-500' : 'text-slate-700'}`}>
                            {formatRelativeTime(n.receivedAt)}
                          </span>
                        </div>

                        {n.type === 'SYSTEM_ALERT' && n.header.includes('Auction Ended') ? (
                          <AuctionEndedDetail notification={n} isRead={n.read} />
                        ) : (
                          <p className={`text-[11px] leading-snug line-clamp-2 ${n.read ? 'text-slate-500 font-normal' : 'text-slate-700 font-medium'}`}>
                            {n.detail}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-50 text-center">
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">
                {filteredNotifications.length} items
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}