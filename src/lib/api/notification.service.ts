// src/lib/api/notification.service.ts

import BaseService from './base.service';
import type {
  BackendNotification,
  NotificationsResponse,
  UnreadCountResponse,
  NotificationType
} from '../../types/notification.types';

class NotificationService extends BaseService {
  private sseAbortController: AbortController | null = null;
  private sseReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private isSSEConnected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Singleton state management to prevent multiple concurrent fetches
  private cachedNotifications: BackendNotification[] | null = null;
  private cachedUnreadCount: number = 0;
  private isFetchingNotifications: boolean = false;
  private notificationsFetchPromise: Promise<NotificationsResponse> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor() {
    super();
  }

  private getNetwork(): string {
    const segment = window.location.pathname.split('/')[1];
    return ['mantle', 'stellar'].includes(segment) ? segment : 'mantle';
  }

  /**
   * Fetch all notifications with optional filtering
   */
  async getAllNotifications(
    filter: 'all' | 'unread' | 'read' = 'all',
    limit: number = 20,
    offset: number = 0,
    forceRefresh: boolean = false
  ): Promise<NotificationsResponse> {
    const now = Date.now();
    const isCacheValid = this.cachedNotifications !== null &&
      (now - this.cacheTimestamp) < this.CACHE_TTL &&
      !forceRefresh;

    if (isCacheValid && offset === 0) {
      return {
        notifications: this.cachedNotifications!,
        meta: {
          unreadCount: this.cachedUnreadCount,
          totalCount: this.cachedNotifications!.length,
        },
      };
    }

    if (this.isFetchingNotifications && this.notificationsFetchPromise) {
      return this.notificationsFetchPromise;
    }

    this.isFetchingNotifications = true;

    this.notificationsFetchPromise = (async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('filter', filter);
        queryParams.append('limit', limit.toString());
        queryParams.append('offset', offset.toString());

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        try {
          const response = await fetch(
            `${this.baseURL}/notifications`,
            {
              method: 'GET',
              headers: this.getAuthHeaders(),
              signal: abortController.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error('Failed to fetch notifications');
          }

          const data: NotificationsResponse = await response.json();

          if (offset === 0) {
            this.cachedNotifications = data.notifications;
            this.cachedUnreadCount = data.meta.unreadCount;
            this.cacheTimestamp = Date.now();
          }

          return data;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      } finally {
        this.isFetchingNotifications = false;
        this.notificationsFetchPromise = null;
      }
    })();

    return this.notificationsFetchPromise;
  }

  async getNotificationById(id: string): Promise<BackendNotification> {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000);

      try {
        const response = await fetch(`${this.baseURL}/notifications/${id}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Notification not found or access denied');
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(`Error fetching notification ${id}:`, error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000);

      try {
        const response = await fetch(`${this.baseURL}/notifications/unread-count`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to fetch unread count');
        }

        const data: UnreadCountResponse = await response.json();
        return data.unreadCount;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000);

      try {
        const response = await fetch(`${this.baseURL}/notifications/${id}/read`, {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error('Failed to mark notification as read');
        }

        if (this.cachedNotifications) {
          const notification = this.cachedNotifications.find((n) => n._id === id);
          if (notification && !notification.read) {
            notification.read = true;
            notification.readAt = new Date().toISOString();
            this.cachedUnreadCount = Math.max(0, this.cachedUnreadCount - 1);
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000);

      try {
        const response = await fetch(`${this.baseURL}/notifications/mark-all-read`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to mark all notifications as read');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error('Failed to mark all notifications as read');
        }

        if (this.cachedNotifications) {
          const now = new Date().toISOString();
          this.cachedNotifications.forEach((n) => {
            if (!n.read) {
              n.read = true;
              n.readAt = now;
            }
          });
          this.cachedUnreadCount = 0;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  addNotificationToCache(notification: BackendNotification): void {
    if (this.cachedNotifications) {
      this.cachedNotifications = [notification, ...this.cachedNotifications];
      if (!notification.read) {
        this.cachedUnreadCount++;
      }
    }
  }

  invalidateCache(): void {
    this.cachedNotifications = null;
    this.cacheTimestamp = 0;
    this.cachedUnreadCount = 0;
  }

  subscribeToNotifications(callback: (notification: BackendNotification) => void): () => void {
    if (this.isSSEConnected) {
      return () => this.closeSSEConnection();
    }

    this.closeSSEConnection();
    const network = this.getNetwork();
    const token = localStorage.getItem(`${network}_access_token`) || localStorage.getItem('access_token');
    if (!token) {
      return () => { };
    }

    const connectSSE = async () => {
      this.sseAbortController = new AbortController();
      this.isSSEConnected = true;

      try {
        const url = `${this.baseURL}/notifications/stream`;
        const headers: HeadersInit = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        };

        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: this.sseAbortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE Connection Failed: ${response.status}`);
        }

        this.sseReader = response.body?.getReader() || null;
        if (!this.sseReader) throw new Error('ReadableStream not supported');

        const decoder = new TextDecoder();
        let buffer = '';

        while (this.isSSEConnected) {
          const { done, value } = await this.sseReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          let currentData = '';

          for (const line of lines) {
            if (line.trim() === '') {
              if (currentData) {
                try {
                  if (currentEvent === 'notification') {
                    const rawData = JSON.parse(currentData);
                    const notification: BackendNotification = {
                      _id: rawData.id || rawData._id,
                      header: rawData.header || rawData.summary,
                      detail: rawData.detail,
                      type: rawData.type,
                      severity: rawData.severity,
                      action: rawData.action,
                      actionMetadata: rawData.actionMetadata,
                      receivedAt: rawData.timestamp || new Date().toISOString(),
                      read: false,
                      readAt: null,
                      summary: rawData.summary,
                      walletAddress: rawData.walletAddress,
                      icon: rawData.icon
                    };
                    this.addNotificationToCache(notification);
                    callback(notification);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
              currentEvent = 'message';
              currentData = '';
              continue;
            }

            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData += line.slice(6);
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          if (this.isSSEConnected) {
            this.reconnectTimeout = setTimeout(() => {
              connectSSE();
            }, 5000);
          }
        }
      } finally {
        if (this.sseReader) this.sseReader.releaseLock();
      }
    };

    connectSSE();
    return () => this.closeSSEConnection();
  }

  private closeSSEConnection(): void {
    this.isSSEConnected = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.sseAbortController) this.sseAbortController.abort();
    this.sseAbortController = null;
    this.sseReader = null;
  }

  filterNotificationsByRole(
    notifications: BackendNotification[],
    role: 'ORIGINATOR' | 'INVESTOR' | 'ADMIN'
  ): BackendNotification[] {
    const roleFilters: Record<string, NotificationType[]> = {
      ORIGINATOR: ['ASSET_STATUS', 'TOKEN_DEPLOYED'],
      INVESTOR: [
        'ASSET_STATUS',
        'KYC_STATUS',
        'YIELD_DISTRIBUTED',
        'PAYOUT_SETTLED',
        'TOKEN_PURCHASED',
        'TOKEN_DEPLOYED',
        'SYSTEM_ALERT',
        'MARKETPLACE_LISTING',
        'BID_PLACED',
        'AUCTION_WON',
        'BID_REFUNDED',
        'ORDER_FILLED',
        'ORDER_CANCELED',
        'ORDER_ACTIVE',
        'ORDER_CREATED',
        'ORDER_CANCELLED',
        'TRUSTLINE_APPROVED',
      ],
      ADMIN: ['ASSET_STATUS', 'YIELD_DISTRIBUTED'],
    };

    const allowedTypes = roleFilters[role] || [];
    return notifications.filter((n) => allowedTypes.includes(n.type));
  }
}

export const notificationService = new NotificationService();
export type { NotificationType, BackendNotification, NotificationsResponse, UnreadCountResponse };
