// hooks/useNotifications.ts
// React Query hooks for notification management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { notificationsService } from '@/services';
import type { Notification } from '@/types/database.types';

/**
 * Get notifications for current user
 */
export function useNotifications(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['notifications', limit, offset],
    queryFn: async (): Promise<Notification[]> => {
      try {
        const notifications = await notificationsService.getNotifications(
          limit,
          offset
        );
        return notifications;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch notifications' });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 1, // 1 minute (notifications change frequently)
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async (): Promise<number> => {
      try {
        const count = await notificationsService.getUnreadCount();
        return count;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch unread count' });
        throw error;
      }
    },
    staleTime: 1000 * 30, // 30 seconds (frequently updated)
    gcTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
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
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>([
        'notifications',
      ]);
      const previousUnreadCount = queryClient.getQueryData<number>([
        'notifications',
        'unread-count',
      ]);

      // Optimistically update notifications to mark all as read
      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          ['notifications'],
          previousNotifications.map((n) => ({ ...n, is_read: true }))
        );
      }

      // Optimistically update unread count to 0
      queryClient.setQueryData<number>(['notifications', 'unread-count'], 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications'],
          context.previousNotifications
        );
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          ['notifications', 'unread-count'],
          context.previousUnreadCount
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.refetchQueries({ queryKey: ['notifications'] });
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
    queryKey: ['notifications', 'settings'],
    queryFn: async () => {
      try {
        return await notificationsService.getNotificationSettings();
      } catch (error) {
        handleError(error, { title: 'Failed to fetch notification settings' });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
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
        queryKey: ['notifications', 'settings'],
      });
    },
  });
}
