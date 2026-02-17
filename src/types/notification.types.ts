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
  summary?: string;
  detail: string;
  type: NotificationType;
  severity: NotificationSeverity;
  action: NotificationAction;
  walletAddress?: string;
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
