// src/lib/api/notification.service.ts

import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

/**
 * Notification types from backend
 * export enum NotificationType {
  ASSET_STATUS = 'ASSET_STATUS',
  KYC_STATUS = 'KYC_STATUS',
  YIELD_DISTRIBUTED = 'YIELD_DISTRIBUTED',
  PAYOUT_SETTLED = 'PAYOUT_SETTLED',
  TOKEN_PURCHASED = 'TOKEN_PURCHASED',
  TOKEN_DEPLOYED = 'TOKEN_DEPLOYED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  MARKETPLACE_LISTING = 'MARKETPLACE_LISTING',
  BID_PLACED = 'BID_PLACED',
  AUCTION_WON = 'AUCTION_WON',
  BID_REFUNDED = 'BID_REFUNDED',
  ORDER_FILLED = 'ORDER_FILLED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_ACTIVE = 'ORDER_ACTIVE',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',

}

export enum NotificationSeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationAction {
  VIEW_ASSET = 'VIEW_ASSET',
  VIEW_PORTFOLIO = 'VIEW_PORTFOLIO',
  CLAIM_YIELD = 'CLAIM_YIELD',
  VIEW_MARKETPLACE = 'VIEW_MARKETPLACE',
  VIEW_KYC = 'VIEW_KYC',
  NONE = 'NONE',
}

 * 
 * 
 */
export type NotificationType =
  | 'ASSET_STATUS'
  | 'KYC_STATUS'
  | 'YIELD_DISTRIBUTED'
  | 'PAYOUT_SETTLED'
  | 'TOKEN_PURCHASED'
  | 'TOKEN_DEPLOYED'
  | 'SYSTEM_ALERT'
  | 'MARKETPLACE_LISTING'
  | 'BID_PLACED'
  | 'AUCTION_WON'
  | 'BID_REFUNDED'
  | 'ORDER_FILLED'
  | 'ORDER_CANCELED'
  | 'ORDER_ACTIVE'
  | 'ORDER_CREATED'
  | 'ORDER_CANCELLED';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export type NotificationAction =
  | 'VIEW_ASSET'
  | 'VIEW_PORTFOLIO'
  | 'CLAIM_YIELD'
  | 'VIEW_MARKETPLACE'
  | 'VIEW_KYC'
  | 'NONE';

/**
 * Notification structure from backend
 */
export interface BackendNotification {
  _id: string;
  header: string;
  summary?: string; // Added from SSE payload
  detail: string;
  type: NotificationType;
  severity: NotificationSeverity;
  action: NotificationAction;
  walletAddress?: string; // Added from SSE payload
  actionMetadata?: {
    assetId?: string;
    amount?: string;
    totalPayment?: string;
    bidIndex?: string;
    [key: string]: any;
  };
  icon?: string;
  read: boolean;
  readAt: string | null;
  receivedAt: string;
}

/**
 * Response from GET /notifications
 */
export interface NotificationsResponse {
  notifications: BackendNotification[];
  meta: {
    unreadCount: number;
    totalCount: number;
  };
}

/**
 * Response from GET /notifications/unread-count
 */
export interface UnreadCountResponse {
  unreadCount: number;
}

/**
 * Notification Service - Connects to backend /notifications endpoints
 * Based on NOTIFICATIONS.md API spec
 */
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
    super(API_BASE_URL);
  }

  /**
   * Fetch all notifications with optional filtering
   * GET /notifications
   *
   * OPTIMIZED: Prevents multiple concurrent fetches and caches results
   *
   * @param filter - 'all', 'unread', or 'read'
   * @param limit - Number of notifications per page (default: 20)
   * @param offset - Pagination offset (default: 0)
   * @param forceRefresh - Force bypass cache (default: false)
   */
  async getAllNotifications(
    filter: 'all' | 'unread' | 'read' = 'all',
    limit: number = 20,
    offset: number = 0,
    forceRefresh: boolean = false
  ): Promise<NotificationsResponse> {
    // Return cached data if available and not expired
    const now = Date.now();
    const isCacheValid = this.cachedNotifications !== null &&
                         (now - this.cacheTimestamp) < this.CACHE_TTL &&
                         !forceRefresh;

    if (isCacheValid && offset === 0) {
      console.log('📦 Returning cached notifications (preventing duplicate fetch)');
      return {
        notifications: this.cachedNotifications!,
        meta: {
          unreadCount: this.cachedUnreadCount,
          totalCount: this.cachedNotifications!.length,
        },
      };
    }

    // If already fetching, return the existing promise to prevent concurrent fetches
    if (this.isFetchingNotifications && this.notificationsFetchPromise) {
      console.log('⏳ Fetch already in progress, waiting for existing request...');
      return this.notificationsFetchPromise;
    }

    // Mark as fetching and create new fetch promise
    this.isFetchingNotifications = true;

    this.notificationsFetchPromise = (async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('filter', filter);
        queryParams.append('limit', limit.toString());
        queryParams.append('offset', offset.toString());

        // Create AbortController with 30s timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        try {
          console.log('🔄 Fetching notifications from API...');
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

          // Cache the results (only for first page)
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
        // Reset fetching state
        this.isFetchingNotifications = false;
        this.notificationsFetchPromise = null;
      }
    })();

    return this.notificationsFetchPromise;
  }

  /**
   * Get notification by ID
   * GET /notifications/:id
   */
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

  /**
   * Get unread count
   * GET /notifications/unread-count
   */
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

  /**
   * Mark notification as read
   * PATCH /notifications/:id/read
   */
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

        // Update cache
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

  /**
   * Mark all notifications as read
   * POST /notifications/mark-all-read
   */
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

        // Update cache - mark all as read
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

  /**
   * Add a new notification to the cache (called when SSE receives new notification)
   */
  addNotificationToCache(notification: BackendNotification): void {
    if (this.cachedNotifications) {
      this.cachedNotifications = [notification, ...this.cachedNotifications];
      if (!notification.read) {
        this.cachedUnreadCount++;
      }
    }
  }

  /**
   * Invalidate the cache (force next fetch to refresh)
   */
  invalidateCache(): void {
    this.cachedNotifications = null;
    this.cacheTimestamp = 0;
    this.cachedUnreadCount = 0;
  }

  /**
   * Subscribe to real-time notifications via SSE
   * GET /notifications/stream
   * 
   * Custom implementation using fetch/ReadableStream to support headers (Auth)
   * Mimics EventSource behavior including parsing event types.
   *
   * @param callback - Function called when new notification arrives
   * @returns Unsubscribe function
   */
  subscribeToNotifications(callback: (notification: BackendNotification) => void): () => void {
    if (this.isSSEConnected) {
      console.warn('⚠️ SSE connection already active, skipping duplicate');
      return () => this.closeSSEConnection();
    }

    this.closeSSEConnection();
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found for SSE connection');
      return () => {};
    }

    const connectSSE = async () => {
      this.sseAbortController = new AbortController();
      this.isSSEConnected = true;

      try {
        const url = `${this.baseURL}/notifications/stream`;
        console.log(`🔄 Connecting to Notification Stream at: ${url}`);
        
        // Match BaseService headers and required SSE headers
        // Removing ngrok-skip-browser-warning as it might cause CORS issues on localhost if not allowed
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
            const errorText = await response.text().catch(() => 'No error details');
            throw new Error(`SSE Connection Failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        this.sseReader = response.body?.getReader() || null;
        if (!this.sseReader) throw new Error('ReadableStream not supported');

        console.log('✅ SSE Connected');
        
        const decoder = new TextDecoder();
        let buffer = '';

        while (this.isSSEConnected) {
          const { done, value } = await this.sseReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last partial line in buffer
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          let currentData = '';
          
          for (const line of lines) {
            if (line.trim() === '') {
              // End of event dispatch
              if (currentData) {
                try {
                  if (currentEvent === 'notification') {
                    const rawData = JSON.parse(currentData);
                    // Map SSE payload to BackendNotification interface
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
                    console.log('🔔 Notification Received:', notification.header);
                    this.addNotificationToCache(notification);
                    callback(notification);
                  } else if (currentEvent === 'connected') {
                    console.log('📡 Stream Handshake:', currentData);
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
          console.error('❌ SSE Error:', error);
          if (this.isSSEConnected) {
             this.reconnectTimeout = setTimeout(() => {
               console.log('♻️ Reconnecting SSE...');
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

  /**
   * Close SSE connection
   */
  private closeSSEConnection(): void {
    this.isSSEConnected = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.sseAbortController) this.sseAbortController.abort();
    this.sseAbortController = null;
    this.sseReader = null;
    console.log('🔌 SSE Connection Closed');
  }

  /**
   * Filter notifications by role
   * This is client-side filtering to ensure only relevant notifications are shown
   */
  filterNotificationsByRole(
    notifications: BackendNotification[],
    role: 'ORIGINATOR' | 'INVESTOR' | 'ADMIN'
  ): BackendNotification[] {
    const roleFilters: Record<string, NotificationType[]> = {
      ORIGINATOR: ['ASSET_STATUS', 'TOKEN_DEPLOYED'],
      INVESTOR: [
        'KYC_STATUS',
        'BID_PLACED',
        'AUCTION_WON',
        'BID_REFUNDED',
        'TOKEN_PURCHASED',
        'YIELD_DISTRIBUTED',
        'ORDER_CANCELLED',
        'ORDER_CREATED',
        'ORDER_FILLED',
        'ORDER_ACTIVE',
        'ASSET_STATUS',
      ],
      ADMIN: ['ASSET_STATUS', 'YIELD_DISTRIBUTED'],
    };

    const allowedTypes = roleFilters[role] || [];
    return notifications.filter((n) => allowedTypes.includes(n.type));
  }
}

// Singleton instance
export const notificationService = new NotificationService();
