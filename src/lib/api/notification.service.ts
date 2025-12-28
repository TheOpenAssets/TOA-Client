// src/lib/api/notification.service.ts

import BaseService from './base.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f5e22b62e871.ngrok-free.app/';

/**
 * Notification types from backend
 */
export type NotificationType =
  | 'ASSET_STATUS'
  | 'TOKEN_DEPLOYED'
  | 'KYC_STATUS'
  | 'BID_PLACED'
  | 'AUCTION_WON'
  | 'BID_REFUNDED'
  | 'TOKEN_PURCHASED'
  | 'YIELD_DISTRIBUTED';

/**
 * Notification severity levels
 */
export type NotificationSeverity = 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';

/**
 * Notification actions
 */
export type NotificationAction =
  | 'VIEW_ASSET'
  | 'VIEW_PORTFOLIO'
  | 'VIEW_MARKETPLACE'
  | 'CLAIM_YIELD'
  | 'VIEW_KYC'
  | 'NONE';

/**
 * Notification structure from backend
 */
export interface BackendNotification {
  _id: string;
  header: string;
  detail: string;
  type: NotificationType;
  severity: NotificationSeverity;
  action: NotificationAction;
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
  private eventSource: EventSource | null = null;
  private sseAbortController: AbortController | null = null;
  private sseReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private isSSEConnected: boolean = false;

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
   * @param callback - Function called when new notification arrives
   * @returns Unsubscribe function
   */
  subscribeToNotifications(callback: (notification: BackendNotification) => void): () => void {
    // Prevent multiple SSE connections (singleton pattern)
    if (this.isSSEConnected) {
      console.warn('⚠️ SSE connection already active, skipping duplicate');
      return () => {
        this.closeSSEConnection();
      };
    }

    // Close existing connection if any
    this.closeSSEConnection();

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found for SSE connection');
      return () => {};
    }

    try {
      // Create SSE connection with Authorization header
      // Note: EventSource doesn't natively support custom headers, so we use a workaround
      const url = `${this.baseURL}/notifications/stream`;

      // Use fetch with ReadableStream for SSE with custom headers
      const connectSSE = async () => {
        // Create AbortController for this SSE connection
        this.sseAbortController = new AbortController();
        this.isSSEConnected = true;

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'text/event-stream',
            },
            signal: this.sseAbortController.signal,
          });

          if (!response.ok) {
            throw new Error('Failed to establish SSE connection');
          }

          this.sseReader = response.body?.getReader() || null;
          const decoder = new TextDecoder();

          console.log('📡 SSE connection established');

          // Read stream without blocking
          const readStream = async () => {
            if (!this.sseReader) return;

            try {
              while (this.isSSEConnected && this.sseReader) {
                const { done, value } = await this.sseReader.read();

                if (done) {
                  console.log('📡 SSE stream ended');
                  break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    try {
                      const notification: BackendNotification = JSON.parse(data);
                      console.log('📬 New notification received:', notification);
                      callback(notification);
                    } catch (error) {
                      console.error('Error parsing notification event:', error);
                    }
                  }
                }
              }
            } catch (error: any) {
              // Only log if not aborted intentionally
              if (error.name !== 'AbortError') {
                console.error('SSE connection error:', error);

                // Only attempt to reconnect if still supposed to be connected
                if (this.isSSEConnected) {
                  this.isSSEConnected = false;
                  setTimeout(() => {
                    console.log('Attempting to reconnect SSE...');
                    connectSSE();
                  }, 5000);
                }
              }
            } finally {
              // Clean up reader if we're done
              if (this.sseReader) {
                try {
                  this.sseReader.releaseLock();
                } catch (e) {
                  // Reader might already be released
                }
                this.sseReader = null;
              }
            }
          };

          // Start reading stream (non-blocking)
          readStream().catch(console.error);
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('SSE connection error:', error);
          }
          this.isSSEConnected = false;
        }
      };

      connectSSE();

      // Return unsubscribe function
      return () => {
        this.closeSSEConnection();
      };
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      this.isSSEConnected = false;
      return () => {};
    }
  }

  /**
   * Close SSE connection
   */
  private closeSSEConnection(): void {
    if (this.isSSEConnected || this.sseAbortController || this.sseReader) {
      console.log('📡 Closing SSE connection');

      // Set flag to stop reading
      this.isSSEConnected = false;

      // Abort the fetch request
      if (this.sseAbortController) {
        try {
          this.sseAbortController.abort();
        } catch (e) {
          // Already aborted
        }
        this.sseAbortController = null;
      }

      // Release the reader
      if (this.sseReader) {
        try {
          this.sseReader.cancel();
          this.sseReader.releaseLock();
        } catch (e) {
          // Reader might already be released
        }
        this.sseReader = null;
      }

      // Clean up old EventSource if it exists (legacy)
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    }
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
      ],
      ADMIN: ['ASSET_STATUS', 'YIELD_DISTRIBUTED'],
    };

    const allowedTypes = roleFilters[role] || [];
    return notifications.filter((n) => allowedTypes.includes(n.type));
  }
}

// Singleton instance
export const notificationService = new NotificationService();
