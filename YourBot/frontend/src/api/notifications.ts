import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * Notification data returned from the backend.
 */
export interface Notification {
  id: number;
  receiverId: number;
  notificationType: string;
  title: string;
  content: string | null;
  refType: string | null;
  refId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/**
 * Paginated notification list response.
 */
export interface PaginatedNotificationList {
  list: Notification[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

/**
 * Query parameters for fetching notifications.
 */
export interface NotificationQuery {
  page?: number;
  page_size?: number;
}

/**
 * Notification API endpoints.
 * Validates: Requirements 5.2
 */
export const notificationsApi = {
  /**
   * GET /api/v1/notifications
   * Get paginated notification list for the current user.
   */
  getNotifications: (params?: NotificationQuery) =>
    apiClient.get<ApiResponse<PaginatedNotificationList>>('/notifications', { params }),

  /**
   * POST /api/v1/notifications/:id/read
   * Mark a single notification as read.
   */
  markAsRead: (id: number) =>
    apiClient.post<ApiResponse<Notification>>(`/notifications/${id}/read`),

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read for the current user.
   */
  markAllAsRead: () =>
    apiClient.post<ApiResponse<{ updated_count: number }>>('/notifications/read-all'),
};
