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

  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Fetch all notifications with optional filtering
   * GET /notifications
   *
   * @param filter - 'all', 'unread', or 'read'
   * @param limit - Number of notifications per page (default: 20)
   * @param offset - Pagination offset (default: 0)
   */
  async getAllNotifications(
    filter: 'all' | 'unread' | 'read' = 'all',
    limit: number = 20,
    offset: number = 0
  ): Promise<NotificationsResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('filter', filter);
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(
        `${this.baseURL}/notifications?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   * GET /notifications/:id
   */
  async getNotificationById(id: string): Promise<BackendNotification> {
    try {
      const response = await fetch(`${this.baseURL}/notifications/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Notification not found or access denied');
      }

      return await response.json();
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
      const response = await fetch(`${this.baseURL}/notifications/unread-count`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data: UnreadCountResponse = await response.json();
      return data.unreadCount;
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
      const response = await fetch(`${this.baseURL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to mark notification as read');
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
      const response = await fetch(`${this.baseURL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications via SSE
   * GET /notifications/stream
   *
   * @param callback - Function called when new notification arrives
   * @returns Unsubscribe function
   */
  subscribeToNotifications(callback: (notification: BackendNotification) => void): () => void {
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
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to establish SSE connection');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        console.log('📡 SSE connection established');

        const readStream = async () => {
          try {
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;

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
          } catch (error) {
            console.error('SSE connection error:', error);
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
              console.log('Attempting to reconnect SSE...');
              connectSSE();
            }, 5000);
          }
        };

        readStream();
      };

      connectSSE();

      // Return unsubscribe function
      return () => {
        this.closeSSEConnection();
      };
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      return () => {};
    }
  }

  /**
   * Close SSE connection
   */
  private closeSSEConnection(): void {
    if (this.eventSource) {
      console.log('📡 Closing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
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
