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

  logger.debug('[useNotifications] 🎬 useNotifications hook rendering', {
    limit,
    offset,
    isAuthLoading,
    isAuthReady,
    hasProfileData: !!profileData,
    userId: profileData?.user?.id,
    timestamp: new Date().toISOString(),
  });

  return useQuery({
    queryKey: notificationsKeys.list(limit, offset),
    queryFn: async (): Promise<Notification[]> => {
      const fetchStartTime = Date.now();
      logger.info('[useNotifications] 📬 Fetching notifications', {
        limit,
        offset,
        queryKey: notificationsKeys.list(limit, offset),
        timestamp: new Date().toISOString(),
      });

      try {
        // No timeout needed - auth is already ready when this runs
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.getNotifications',
          {
            limit,
            offset,
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        const notifications = await notificationsService.getNotifications(
          limit,
          offset
        );
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - fetchStartTime;

        logger.info(
          '[useNotifications] ✅ Notifications fetched successfully',
          {
            count: notifications.length,
            limit,
            offset,
            serviceElapsed: `${serviceElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );

        return notifications;
      } catch (error) {
        const totalElapsed = Date.now() - fetchStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to fetch notifications',
          error,
          {
            limit,
            offset,
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
        // Return empty array on error to prevent loading spinner
        return [];
      }
    },
    ...CACHE_CONFIG.NOTIFICATIONS,
    refetchOnMount: 'always', // Always refetch when notifications page mounts
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

  logger.debug('[useNotifications] 🎬 useUnreadCount hook rendering', {
    isAuthLoading,
    isAuthReady,
    hasProfileData: !!profileData,
    userId: profileData?.user?.id,
    timestamp: new Date().toISOString(),
  });

  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      const fetchStartTime = Date.now();
      logger.info('[useNotifications] 📊 Fetching unread count', {
        queryKey: notificationsKeys.unreadCount(),
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.getUnreadCount',
          {
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        const count = await notificationsService.getUnreadCount();
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - fetchStartTime;

        logger.info('[useNotifications] ✅ Unread count fetched successfully', {
          count,
          serviceElapsed: `${serviceElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        return count;
      } catch (error) {
        const totalElapsed = Date.now() - fetchStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to fetch unread count',
          error,
          {
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
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

  logger.debug('[useNotifications] 🎬 useMarkAsRead hook rendering', {
    timestamp: new Date().toISOString(),
  });

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const markStartTime = Date.now();
      logger.info('[useNotifications] 📖 Marking notification as read', {
        notificationId,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.markAsRead',
          {
            notificationId,
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        await notificationsService.markAsRead(notificationId);
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - markStartTime;

        logger.info('[useNotifications] ✅ Notification marked as read', {
          notificationId,
          serviceElapsed: `${serviceElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        return notificationId;
      } catch (error) {
        const totalElapsed = Date.now() - markStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to mark notification as read',
          error,
          {
            notificationId,
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
        handleError(error, { title: 'Failed to mark notification as read' });
        throw error;
      }
    },
    onSuccess: (notificationId) => {
      logger.info(
        '[useNotifications] ✅ Mutation success, invalidating queries',
        {
          notificationId,
          timestamp: new Date().toISOString(),
        }
      );
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.all,
        refetchType: 'all',
      });
      logger.debug('[useNotifications] ✅ Queries invalidated', {
        timestamp: new Date().toISOString(),
      });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  logger.debug('[useNotifications] 🎬 useMarkAllAsRead hook rendering', {
    timestamp: new Date().toISOString(),
  });

  return useMutation({
    mutationFn: async () => {
      const markAllStartTime = Date.now();
      logger.info('[useNotifications] 📖 Marking all notifications as read', {
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.markAllAsRead',
          {
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        await notificationsService.markAllAsRead();
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - markAllStartTime;

        logger.info('[useNotifications] ✅ All notifications marked as read', {
          serviceElapsed: `${serviceElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - markAllStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to mark all notifications as read',
          error,
          {
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
        handleError(error, {
          title: 'Failed to mark all notifications as read',
        });
        throw error;
      }
    },
    onMutate: async () => {
      logger.info(
        '[useNotifications] 🔄 onMutate: Starting optimistic update',
        {
          timestamp: new Date().toISOString(),
        }
      );

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      logger.debug('[useNotifications] 🚫 Cancelling outgoing queries', {
        timestamp: new Date().toISOString(),
      });
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all });

      // Snapshot the previous value
      logger.debug('[useNotifications] 📸 Snapshotting previous values', {
        timestamp: new Date().toISOString(),
      });

      const previousNotifications = queryClient.getQueryData<Notification[]>(
        notificationsKeys.list()
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationsKeys.unreadCount()
      );

      logger.debug('[useNotifications] 📊 Previous values snapshot', {
        previousNotificationsCount: previousNotifications?.length || 0,
        previousUnreadCount,
        timestamp: new Date().toISOString(),
      });

      // Optimistically update notifications to mark all as read
      if (previousNotifications) {
        logger.debug(
          '[useNotifications] 🔄 Optimistically updating notifications',
          {
            count: previousNotifications.length,
            timestamp: new Date().toISOString(),
          }
        );

        queryClient.setQueryData<Notification[]>(
          notificationsKeys.list(),
          previousNotifications.map((n) => ({ ...n, is_read: true }))
        );
      }

      // Optimistically update unread count to 0
      logger.debug(
        '[useNotifications] 🔄 Optimistically updating unread count to 0',
        {
          timestamp: new Date().toISOString(),
        }
      );

      queryClient.setQueryData<number>(notificationsKeys.unreadCount(), 0);

      logger.info('[useNotifications] ✅ Optimistic update completed', {
        timestamp: new Date().toISOString(),
      });

      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, variables, context) => {
      logger.error('[useNotifications] ❌ Mutation error, rolling back', err, {
        hasContext: !!context,
        hasPreviousNotifications: !!context?.previousNotifications,
        previousUnreadCount: context?.previousUnreadCount,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });

      // Rollback on error
      if (context?.previousNotifications) {
        logger.debug('[useNotifications] 🔄 Rolling back notifications', {
          count: context.previousNotifications.length,
          timestamp: new Date().toISOString(),
        });

        queryClient.setQueryData(
          notificationsKeys.list(),
          context.previousNotifications
        );
      }
      if (context?.previousUnreadCount !== undefined) {
        logger.debug('[useNotifications] 🔄 Rolling back unread count', {
          previousUnreadCount: context.previousUnreadCount,
          timestamp: new Date().toISOString(),
        });

        queryClient.setQueryData(
          notificationsKeys.unreadCount(),
          context.previousUnreadCount
        );
      }

      logger.info('[useNotifications] ✅ Rollback completed', {
        timestamp: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      logger.info(
        '[useNotifications] ✅ Mutation success, invalidating and refetching',
        {
          timestamp: new Date().toISOString(),
        }
      );

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.all,
        refetchType: 'all',
      });
      queryClient.refetchQueries({ queryKey: notificationsKeys.all });

      logger.debug('[useNotifications] ✅ Queries invalidated and refetched', {
        timestamp: new Date().toISOString(),
      });
    },
  });
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  logger.debug('[useNotifications] 🎬 useDeleteNotification hook rendering', {
    timestamp: new Date().toISOString(),
  });

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const deleteStartTime = Date.now();
      logger.info('[useNotifications] 🗑️ Deleting notification', {
        notificationId,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.deleteNotification',
          {
            notificationId,
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        await notificationsService.deleteNotification(notificationId);
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - deleteStartTime;

        logger.info('[useNotifications] ✅ Notification deleted', {
          notificationId,
          serviceElapsed: `${serviceElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        return notificationId;
      } catch (error) {
        const totalElapsed = Date.now() - deleteStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to delete notification',
          error,
          {
            notificationId,
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
        handleError(error, { title: 'Failed to delete notification' });
        throw error;
      }
    },
    onSuccess: (notificationId) => {
      logger.info(
        '[useNotifications] ✅ Mutation success, invalidating queries',
        {
          notificationId,
          timestamp: new Date().toISOString(),
        }
      );
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.all,
        refetchType: 'all',
      });
      logger.debug('[useNotifications] ✅ Queries invalidated', {
        timestamp: new Date().toISOString(),
      });
    },
  });
}

/**
 * Get notification settings
 */
export function useNotificationSettings() {
  logger.debug('[useNotifications] 🎬 useNotificationSettings hook rendering', {
    timestamp: new Date().toISOString(),
  });

  return useQuery({
    queryKey: notificationsKeys.settings(),
    queryFn: async () => {
      const fetchStartTime = Date.now();
      logger.info('[useNotifications] ⚙️ Fetching notification settings', {
        queryKey: notificationsKeys.settings(),
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.getSettings',
          {
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        const settings = await notificationsService.getSettings();
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - fetchStartTime;

        logger.info('[useNotifications] ✅ Notification settings fetched', {
          settings,
          serviceElapsed: `${serviceElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        return settings;
      } catch (error) {
        const totalElapsed = Date.now() - fetchStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to fetch notification settings',
          error,
          {
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
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

  logger.debug(
    '[useNotifications] 🎬 useUpdateNotificationSettings hook rendering',
    {
      timestamp: new Date().toISOString(),
    }
  );

  return useMutation({
    mutationFn: async (settings: any) => {
      const updateStartTime = Date.now();
      logger.info('[useNotifications] ⚙️ Updating notification settings', {
        settingsKeys: Object.keys(settings),
        settings,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug(
          '[useNotifications] 📡 Calling notificationsService.updateSettings',
          {
            settingsKeys: Object.keys(settings),
            timestamp: new Date().toISOString(),
          }
        );

        const serviceStartTime = Date.now();
        const result = await notificationsService.updateSettings(settings);
        const serviceElapsed = Date.now() - serviceStartTime;
        const totalElapsed = Date.now() - updateStartTime;

        logger.info('[useNotifications] ✅ Notification settings updated', {
          result,
          serviceElapsed: `${serviceElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (error) {
        const totalElapsed = Date.now() - updateStartTime;
        logger.error(
          '[useNotifications] ❌ Failed to update notification settings',
          error,
          {
            settingsKeys: Object.keys(settings),
            elapsed: `${totalElapsed}ms`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
        handleError(error, { title: 'Failed to update notification settings' });
        throw error;
      }
    },
    onSuccess: () => {
      logger.info(
        '[useNotifications] ✅ Mutation success, invalidating settings query',
        {
          timestamp: new Date().toISOString(),
        }
      );
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.settings(),
      });
      logger.debug('[useNotifications] ✅ Settings query invalidated', {
        timestamp: new Date().toISOString(),
      });
    },
  });
}
