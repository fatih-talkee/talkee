// hooks/useNotifications.ts
// React Query hooks for notification management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { notificationsService } from '@/services';
import type { Notification } from '@/types/database.types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { useProfile } from '@/hooks/useProfile';

// Query Keys Factory Pattern
export const notificationsKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationsKeys.all, 'list'] as const,
  list: (limit?: number, offset?: number) =>
    [...notificationsKeys.lists(), limit, offset] as const,
  unreadCount: () => [...notificationsKeys.all, 'unread-count'] as const,
  settings: () => [...notificationsKeys.all, 'settings'] as const,
};

/**
 * Get notifications for current user
 * Only fetches when auth state is ready (prevents race condition during login)
 */
export function useNotifications(limit: number = 50, offset: number = 0) {
  // Wait for auth state to be ready before fetching
  const { isLoading: isAuthLoading, profileData } = useProfile();
  const isAuthReady = !isAuthLoading && !!profileData?.user?.id;

  return useQuery({
    queryKey: notificationsKeys.list(limit, offset),
    queryFn: async (): Promise<Notification[]> => {
      try {
        // No timeout needed - auth is already ready when this runs
        const notifications = await notificationsService.getNotifications(
          limit,
          offset
        );
        return notifications;
      } catch (error) {
        logger.error('Failed to fetch notifications', error);
        // Return empty array on error to prevent loading spinner
        return [];
      }
    },
    ...CACHE_CONFIG.NOTIFICATIONS,
    retry: false, // Don't retry on timeout - fail fast
    enabled: isAuthReady, // Only fetch when auth is ready
  });
}

/**
 * Get unread notification count
 * Only fetches when auth state is ready (prevents race condition during login)
 */
export function useUnreadCount() {
  // Wait for auth state to be ready before fetching
  const { isLoading: isAuthLoading, profileData } = useProfile();
  const isAuthReady = !isAuthLoading && !!profileData?.user?.id;

  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      try {
        const count = await notificationsService.getUnreadCount();
        return count;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch unread count' });
        throw error;
      }
    },
    ...CACHE_CONFIG.NOTIFICATIONS_UNREAD_COUNT,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    enabled: isAuthReady, // Only fetch when auth is ready
  });
}

/**
 * Mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        await notificationsService.markAsRead(notificationId);
        return notificationId;
      } catch (error) {
        handleError(error, { title: 'Failed to mark notification as read' });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await notificationsService.markAllAsRead();
      } catch (error) {
        handleError(error, {
          title: 'Failed to mark all notifications as read',
        });
        throw error;
      }
    },
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>(
        notificationsKeys.list()
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationsKeys.unreadCount()
      );

      // Optimistically update notifications to mark all as read
      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          notificationsKeys.list(),
          previousNotifications.map((n) => ({ ...n, is_read: true }))
        );
      }

      // Optimistically update unread count to 0
      queryClient.setQueryData<number>(notificationsKeys.unreadCount(), 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationsKeys.list(),
          context.previousNotifications
        );
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          notificationsKeys.unreadCount(),
          context.previousUnreadCount
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      queryClient.refetchQueries({ queryKey: notificationsKeys.all });
    },
  });
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        await notificationsService.deleteNotification(notificationId);
        return notificationId;
      } catch (error) {
        handleError(error, { title: 'Failed to delete notification' });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Get notification settings
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationsKeys.settings(),
    queryFn: async () => {
      try {
        return await notificationsService.getNotificationSettings();
      } catch (error) {
        handleError(error, { title: 'Failed to fetch notification settings' });
        throw error;
      }
    },
    ...CACHE_CONFIG.NOTIFICATION_SETTINGS,
  });
}

/**
 * Update notification settings
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: any) => {
      try {
        return await notificationsService.updateNotificationSettings(settings);
      } catch (error) {
        handleError(error, { title: 'Failed to update notification settings' });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.settings(),
      });
    },
  });
}
