/**
 * Notification Configuration
 *
 * Setup for expo-notifications to handle in-call billing notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Configure notification handler
 * This allows notifications to show even when app is in foreground (during calls)
 */
export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: Notifications.Notification) => {
      const notificationType =
        (notification.request.content.data?.type as string) ?? '';

      logger.debug('[Notifications] 🔔 Handling notification', {
        type: notificationType,
        title: notification.request.content.title,
        timestamp: new Date().toISOString(),
      });

      // Show alert even when app is in foreground
      // This is crucial for displaying billing updates during active calls
      return {
        shouldShowAlert: true,
        shouldPlaySound: notificationType !== 'billing_update', // Silent for regular updates
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });

  logger.info('[Notifications] ✅ Notification handler configured', {
    timestamp: new Date().toISOString(),
  });
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    logger.info('[Notifications] 🔧 Requesting notification permissions', {
      timestamp: new Date().toISOString(),
    });

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('[Notifications] ⚠️ Notification permission not granted', {
        status: finalStatus,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    logger.info('[Notifications] ✅ Notification permission granted', {
      timestamp: new Date().toISOString(),
    });

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannels();
    }

    return true;
  } catch (error) {
    logger.error('[Notifications] ❌ Error requesting permissions', error, {
      timestamp: new Date().toISOString(),
    });
    return false;
  }
};

/**
 * Setup Android notification channels
 */
const setupAndroidNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Billing updates channel (low priority, silent)
    await Notifications.setNotificationChannelAsync('billing_updates', {
      name: 'Billing Updates',
      description: 'Real-time call billing information',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      showBadge: false,
    });

    // Balance warnings channel (high priority, with sound)
    await Notifications.setNotificationChannelAsync('balance_warnings', {
      name: 'Balance Warnings',
      description: 'Low balance and critical warnings',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      showBadge: false,
      enableLights: true,
      lightColor: '#FF9500',
    });

    logger.info('[Notifications] ✅ Android notification channels created', {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Notifications] ❌ Error creating Android channels', error, {
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Clear all billing notifications
 */
export const clearBillingNotifications = async () => {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    const billingNotifications = notifications.filter(
      (n) =>
        (n.request.content.data?.type as string)?.includes('billing') ||
        (n.request.content.data?.type as string)?.includes('balance')
    );

    for (const notification of billingNotifications) {
      await Notifications.dismissNotificationAsync(
        notification.request.identifier
      );
    }

    logger.info('[Notifications] 🧹 Cleared billing notifications', {
      count: billingNotifications.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Notifications] ❌ Error clearing notifications', error, {
      timestamp: new Date().toISOString(),
    });
  }
};
