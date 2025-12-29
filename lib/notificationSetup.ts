// lib/notificationSetup.ts - UPDATED VERSION

import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Setup notification handler
 * ✅ Foreground: Don't show incoming call notifications (IncomingCallHandler modal handles it)
 * ✅ Background/Closed: Show incoming call notifications with action buttons
 */
export function setupNotificationHandler() {
  logger.info('[NotificationSetup] 🔧 Setting up notification handler', {
    timestamp: new Date().toISOString(),
  });

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      const isIncomingCall = data?.type === 'incoming_call';

      // ✅ Check if app is in foreground
      const appState = AppState.currentState;
      const isAppInForeground = appState === 'active';

      logger.debug('[NotificationSetup] 📨 Notification received', {
        type: data?.type,
        isIncomingCall,
        appState,
        isAppInForeground,
        timestamp: new Date().toISOString(),
      });

      // ✅ If incoming call and app is in FOREGROUND
      if (isIncomingCall && isAppInForeground) {
        logger.info(
          '[NotificationSetup] 🚫 Suppressing incoming call notification (app is foreground)',
          {
            note: 'IncomingCallHandler modal will show instead',
            timestamp: new Date().toISOString(),
          }
        );

        // ❌ Don't show notification - IncomingCallHandler modal will handle it
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      // ✅ If incoming call and app is in BACKGROUND/CLOSED
      if (isIncomingCall && !isAppInForeground) {
        logger.info(
          '[NotificationSetup] ✅ Showing incoming call notification (app is background)',
          {
            timestamp: new Date().toISOString(),
          }
        );

        // ✅ Show notification with sound and alert
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      }

      // ✅ For all other notifications (billing, etc)
      logger.debug('[NotificationSetup] ✅ Showing regular notification', {
        type: data?.type,
        timestamp: new Date().toISOString(),
      });

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });

  logger.info('[NotificationSetup] ✅ Notification handler configured', {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  logger.info('[NotificationSetup] 🔔 Requesting notification permissions', {
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  });

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    logger.debug('[NotificationSetup] 📊 Existing permission status', {
      status: existingStatus,
      timestamp: new Date().toISOString(),
    });

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      logger.info('[NotificationSetup] 🙏 Requesting permissions...', {
        timestamp: new Date().toISOString(),
      });

      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;

      logger.info('[NotificationSetup] 📋 Permission request result', {
        status: finalStatus,
        granted: finalStatus === 'granted',
        timestamp: new Date().toISOString(),
      });
    }

    if (finalStatus !== 'granted') {
      logger.warn('[NotificationSetup] ⚠️ Notification permissions denied', {
        status: finalStatus,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    // ✅ Configure notification categories with action buttons
    await configureNotificationCategories();

    logger.info('[NotificationSetup] ✅ Notification permissions granted', {
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    logger.error(
      '[NotificationSetup] ❌ Failed to request permissions',
      error,
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
    return false;
  }
}

/**
 * Configure notification categories with action buttons
 * ✅ This makes Accept/Decline buttons work on notifications
 */
async function configureNotificationCategories() {
  logger.info('[NotificationSetup] 🔧 Configuring notification categories', {
    timestamp: new Date().toISOString(),
  });

  try {
    // ✅ INCOMING_CALL category with Accept/Decline actions
    await Notifications.setNotificationCategoryAsync('INCOMING_CALL', [
      {
        identifier: 'ACCEPT_CALL',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'DECLINE_CALL',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    logger.info('[NotificationSetup] ✅ Notification categories configured', {
      categories: ['INCOMING_CALL'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      '[NotificationSetup] ❌ Failed to configure categories',
      error,
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
  }
}

/**
 * Setup notification response listener
 * Handles when user taps notification or action buttons
 */
export function setupNotificationResponseListener(
  onAccept: (callId: string) => void,
  onDecline: (callId: string) => void
) {
  logger.info(
    '[NotificationSetup] 🔧 Setting up notification response listener',
    {
      timestamp: new Date().toISOString(),
    }
  );

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const responseStartTime = Date.now();
      const { notification, actionIdentifier } = response;
      const data = notification.request.content.data;
      const callId = data?.call_id as string | undefined;

      logger.info('[NotificationSetup] 📲 Notification response received', {
        actionIdentifier,
        hasCallId: !!callId,
        callId,
        dataType: data?.type,
        notificationId: notification.request.identifier,
        notificationTitle: notification.request.content.title,
        notificationBody: notification.request.content.body,
        dataKeys: Object.keys(data || {}),
        callerId: data?.caller_id,
        callerName: data?.caller_name,
        callType: data?.call_type,
        urgent: data?.urgent,
        timestamp: new Date().toISOString(),
      });

      if (!callId || data?.type !== 'incoming_call') {
        logger.warn('[NotificationSetup] ⚠️ Invalid notification response', {
          hasCallId: !!callId,
          callId,
          dataType: data?.type,
          expectedType: 'incoming_call',
          dataKeys: Object.keys(data || {}),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Handle action buttons
      if (actionIdentifier === 'ACCEPT_CALL') {
        logger.info(
          '[NotificationSetup] ✅ User accepted call from notification',
          {
            callId,
            actionIdentifier,
            callerId: data?.caller_id,
            callerName: data?.caller_name,
            callType: data?.call_type,
            urgent: data?.urgent,
            timestamp: new Date().toISOString(),
          }
        );
        onAccept(callId);
      } else if (actionIdentifier === 'DECLINE_CALL') {
        logger.info(
          '[NotificationSetup] ❌ User declined call from notification',
          {
            callId,
            actionIdentifier,
            callerId: data?.caller_id,
            callerName: data?.caller_name,
            callType: data?.call_type,
            urgent: data?.urgent,
            timestamp: new Date().toISOString(),
          }
        );
        onDecline(callId);
      } else {
        // Default tap (no action button)
        logger.info('[NotificationSetup] 👆 User tapped notification (no action)', {
          callId,
          actionIdentifier,
          callerId: data?.caller_id,
          callerName: data?.caller_name,
          callType: data?.call_type,
          urgent: data?.urgent,
          note: 'Defaulting to accept',
          timestamp: new Date().toISOString(),
        });
        onAccept(callId); // Default to opening the call
      }

      const responseElapsed = Date.now() - responseStartTime;
      logger.debug('[NotificationSetup] ⏱️ Notification response processed', {
        actionIdentifier,
        callId,
        responseElapsed: `${responseElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  );

  logger.info(
    '[NotificationSetup] ✅ Notification response listener registered',
    {
      timestamp: new Date().toISOString(),
    }
  );

  return subscription;
}
