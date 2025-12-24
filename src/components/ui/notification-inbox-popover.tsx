"use client";

import { useState, useEffect } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Bell } from "lucide-react";
import { notificationService, type Notification } from "../../lib/services/notification.service";

function NotificationInboxPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const allNotifications = await notificationService.getAllNotifications();
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter((n: Notification) => n.unread).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = tab === "unread" ? notifications.filter((n: Notification) => n.unread) : notifications;

  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="outline" className="relative" aria-label="Open notifications">
          <Bell size={16} strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 bg-white/60" >
        {/* Header with Tabs + Mark All */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <TabsList className="bg-transparent">
              <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-sm">
                Unread {unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}
              </TabsTrigger>
            </TabsList>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-muted-foreground hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              filtered.map((n) => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-accent"
                  >
                    <div className="mt-1 text-muted-foreground">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p
                        className={`text-sm ${
                          n.unread ? "font-semibold text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {n.user} {n.action}{" "}
                        <span className="font-medium">{n.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{n.timestamp}</p>
                    </div>
                    {n.unread && (
                      <span className="mt-1 inline-block size-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-3 py-2 text-center">
          <Button variant="ghost" size="sm" className="w-full">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationInboxPopover };
