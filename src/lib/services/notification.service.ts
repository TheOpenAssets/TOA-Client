// src/lib/services/notification.service.ts

import type { LucideIcon } from 'lucide-react';
import { GitMerge, FileText, ClipboardCheck, Mail, AlertCircle, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';

export interface Notification {
  id: number;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  unread: boolean;
  icon: LucideIcon;
  category: 'asset' | 'payment' | 'kyc' | 'system' | 'message';
}

// Mock data for issuer notifications
const mockNotifications: Notification[] = [
  {
    id: 1,
    user: "John Investor",
    action: "purchased tokens for",
    target: "Luxury Apartment #A101",
    timestamp: "5 minutes ago",
    unread: true,
    icon: TrendingUp,
    category: 'asset',
  },
  {
    id: 2,
    user: "Sarah Williams",
    action: "submitted payment for",
    target: "Invoice #INV-2024-001",
    timestamp: "15 minutes ago",
    unread: true,
    icon: DollarSign,
    category: 'payment',
  },
  {
    id: 3,
    user: "Admin",
    action: "approved KYC for",
    target: "Commercial Property #CP-045",
    timestamp: "1 hour ago",
    unread: false,
    icon: CheckCircle2,
    category: 'kyc',
  },
  {
    id: 4,
    user: "Michael Chen",
    action: "sent you a message about",
    target: "Token distribution timeline",
    timestamp: "3 hours ago",
    unread: false,
    icon: Mail,
    category: 'message',
  },
  {
    id: 5,
    user: "Platform",
    action: "shared file",
    target: "Q4 Financial Report.pdf",
    timestamp: "5 hours ago",
    unread: false,
    icon: FileText,
    category: 'asset',
  },
  {
    id: 6,
    user: "Emily Roberts",
    action: "completed KYC verification",
    target: "Investor onboarding",
    timestamp: "1 day ago",
    unread: false,
    icon: ClipboardCheck,
    category: 'kyc',
  },
  {
    id: 7,
    user: "System",
    action: "alert",
    target: "Asset listing pending approval",
    timestamp: "2 days ago",
    unread: false,
    icon: AlertCircle,
    category: 'system',
  },
  {
    id: 8,
    user: "David Kumar",
    action: "initiated transfer for",
    target: "Residential Complex #RC-023",
    timestamp: "3 days ago",
    unread: false,
    icon: GitMerge,
    category: 'asset',
  },
];

/**
 * Notification Service - Handles all notification-related operations
 *
 * MOCK MODE: Currently using simulated data for development
 *
 * TO INTEGRATE WITH BACKEND:
 * 1. Replace mock data with API calls to your notification endpoints
 * 2. Implement WebSocket or Server-Sent Events for real-time notifications
 * 3. Add notification state management (Redux, Zustand, etc.)
 */
class NotificationService {
  private notifications: Notification[] = [...mockNotifications];

  /**
   * Get all notifications
   */
  async getAllNotifications(): Promise<Notification[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.notifications;
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.notifications.filter(n => n.unread);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const unread = await this.getUnreadNotifications();
    return unread.length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications[index].unread = false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    this.notifications = this.notifications.map(n => ({
      ...n,
      unread: false,
    }));
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  /**
   * Get notifications by category
   */
  async getNotificationsByCategory(category: Notification['category']): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return this.notifications.filter(n => n.category === category);
  }

  /**
   * Add new notification (for testing)
   */
  addNotification(notification: Omit<Notification, 'id'>): void {
    const newId = Math.max(...this.notifications.map(n => n.id), 0) + 1;
    this.notifications.unshift({
      ...notification,
      id: newId,
    });
  }

  /**
   * Subscribe to real-time notifications
   * This would connect to WebSocket/SSE in production
   */
  subscribe(_callback: (notification: Notification) => void): () => void {
    // Mock implementation - in production, connect to WebSocket
    console.log('📡 Subscribed to notifications (mock mode)');

    // Return unsubscribe function
    return () => {
      console.log('📡 Unsubscribed from notifications');
    };
  }
}

// Singleton instance
export const notificationService = new NotificationService();
