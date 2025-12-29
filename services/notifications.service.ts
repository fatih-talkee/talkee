import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Notification as ExpoNotification,
  NotificationBehavior,
} from 'expo-notifications';
import type {
  Notification as DbNotification,
  NotificationInsert,
  NotificationType,
} from '../types/database.types';
import { logger } from '../lib/logger';

// NotificationSettings is already in database.types.ts
export type { NotificationSettings } from '../types/database.types';

// Configure notification behavior globally
if (Platform.OS !== 'web') {
  logger.info(
    '[NotificationService] 🔧 Setting up global notification handler',
    {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    }
  );

  Notifications.setNotificationHandler({
    handleNotification: async (
      notification: ExpoNotification
    ): Promise<NotificationBehavior> => {
      const handlerStartTime = Date.now();
      // Güvenli tip kontrolü ile trigger tipini alalım
      const trigger = notification.request.trigger;
      const triggerType = (trigger as any)?.type;
      const content = notification.request.content;
      const data = (content?.data || {}) as any;

      logger.info(
        '[NotificationService] 📬 Foreground notification handler called',
        {
          title: content.title,
          body: content.body?.substring(0, 50),
          triggerType,
          notificationId: notification.request.identifier,
          dataKeys: Object.keys(data || {}),
          dataType: data?.type,
          timestamp: new Date().toISOString(),
        }
      );

      const isAndroid = Platform.OS === 'android';
      const isLocal = Boolean(data?.is_local);
      const isRemotePush =
        triggerType === 'push' || Boolean((trigger as any)?.remoteMessage);

      logger.debug('[NotificationService] 🔍 Notification classification', {
        isAndroid,
        isLocal,
        isRemotePush,
        triggerType,
        timestamp: new Date().toISOString(),
      });

      // Android: If a remote push arrives while foreground, the OS may not show it reliably.
      // We re-publish it as a local notification on our channel for consistent behavior.
      let republishedOk = false;
      const shouldRepublishAndroidRemote =
        isAndroid && isRemotePush && !isLocal;

      logger.debug('[NotificationService] 🔍 Republish decision', {
        shouldRepublishAndroidRemote,
        isAndroid,
        isRemotePush,
        isLocal,
        timestamp: new Date().toISOString(),
      });

      if (shouldRepublishAndroidRemote) {
        try {
          const republishStartTime = Date.now();
          logger.info(
            '[NotificationService] 🔄 Republishing remote push as local',
            {
              title: content.title,
              triggerType,
              channelId: 'talkee-default-v2',
              timestamp: new Date().toISOString(),
            }
          );

          await Notifications.scheduleNotificationAsync({
            content: {
              title: content.title || 'Talkee',
              body: content.body || '',
              data: { ...data, is_local: true },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: { channelId: 'talkee-default-v2' },
          });

          republishedOk = true;
          const republishElapsed = Date.now() - republishStartTime;
          logger.info(
            '[NotificationService] ✅ Republished remote push as local (foreground)',
            {
              title: content.title,
              triggerType,
              elapsed: `${republishElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (e) {
          logger.error(
            '[NotificationService] ❌ Failed to republish remote push as local',
            e,
            {
              title: content.title,
              triggerType,
              errorMessage: e instanceof Error ? e.message : String(e),
              errorStack: e instanceof Error ? e.stack : undefined,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      // Only suppress the original remote notification if we successfully republished it.
      const shouldSuppressAndroidRemote =
        shouldRepublishAndroidRemote && republishedOk;

      const handlerElapsed = Date.now() - handlerStartTime;
      logger.debug('[NotificationService] 📤 Returning notification behavior', {
        shouldShowAlert: !shouldSuppressAndroidRemote,
        shouldShowBanner: !shouldSuppressAndroidRemote,
        shouldShowList: !shouldSuppressAndroidRemote,
        shouldPlaySound: !shouldSuppressAndroidRemote,
        shouldSetBadge: true,
        shouldSuppressAndroidRemote,
        republishedOk,
        elapsed: `${handlerElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        // shouldShowAlert is deprecated in this expo-notifications version.
        // Keep it enabled for compatibility, but also set the new fields.
        // On Android, we intentionally avoid showing the *remote* notification while foreground.
        // We re-publish it as a local notification in `onNotificationReceived` to ensure consistent UX
        // and prevent duplicates on devices where the OS would also show it.
        // Android: suppress ONLY remote push in foreground; allow local notifications.
        // Remote push will be re-published as local in `onNotificationReceived`.
        shouldShowAlert: !shouldSuppressAndroidRemote,
        shouldShowBanner: !shouldSuppressAndroidRemote,
        shouldShowList: !shouldSuppressAndroidRemote,
        shouldPlaySound: !shouldSuppressAndroidRemote,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    },
  });

  logger.info(
    '[NotificationService] ✅ Global notification handler configured',
    {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    }
  );
}

class NotificationsService {
  private expoPushToken: string | null = null;
  private authStateSubscription: { unsubscribe: () => void } | null = null;
  private notificationResponseSubscription: { remove: () => void } | null =
    null;
  private notificationReceivedSubscription: { remove: () => void } | null =
    null;
  private notificationReceivedCallbacks = new Set<
    (notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    }) => void
  >();
  // Initialize to a time far in the past so taps before SIGNED_IN are ignored
  // This prevents notification taps during login from redirecting to notifications page
  private lastAuthChangeTime: number = Date.now() - 10000;

  /**
   * Remove previously-delivered call_request notifications from the OS tray.
   * Useful when the call ends but the original "Incoming Call" notification lingers.
   */
  async dismissIncomingCallNotifications(params: {
    callId?: string | null;
    callSid?: string | null;
  }): Promise<void> {
    const dismissStartTime = Date.now();
    logger.info(
      '[NotificationService] 🔔 dismissIncomingCallNotifications called',
      {
        callId: params.callId,
        callSid: params.callSid,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      }
    );

    if (Platform.OS === 'web') {
      logger.debug(
        '[NotificationService] ⏭️ Skipping dismiss on web platform',
        {
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    const callId = params.callId ?? undefined;
    const callSid = params.callSid ?? undefined;
    if (!callId && !callSid) {
      logger.debug(
        '[NotificationService] ⏭️ No callId or callSid provided, skipping',
        {
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    try {
      const fetchStartTime = Date.now();
      logger.debug(
        '[NotificationService] 🔍 Fetching presented notifications',
        {
          timestamp: new Date().toISOString(),
        }
      );

      const presented = await Notifications.getPresentedNotificationsAsync();
      const fetchElapsed = Date.now() - fetchStartTime;

      logger.debug('[NotificationService] 📊 Presented notifications fetched', {
        totalCount: presented.length,
        elapsed: `${fetchElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      const filterStartTime = Date.now();
      const matches = presented.filter((n) => {
        const data = (n.request.content.data || {}) as any;
        const type = data?.type;

        if (type !== 'call_request' && type !== 'incoming_call') return false;
        if (callId && data?.call_id && data.call_id === callId) return true;
        if (callSid && data?.call_sid && data.call_sid === callSid) return true;
        return false;
      });
      const filterElapsed = Date.now() - filterStartTime;

      logger.debug('[NotificationService] 🔍 Filtered matching notifications', {
        matchesCount: matches.length,
        totalPresented: presented.length,
        elapsed: `${filterElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (matches.length > 0) {
        logger.info(
          '[NotificationService] 🗑️ Dismissing matching notifications',
          {
            callId,
            callSid,
            count: matches.length,
            identifiers: matches.map((n) => n.request.identifier),
            timestamp: new Date().toISOString(),
          }
        );

        const dismissPromises = matches.map(async (n) => {
          try {
            const dismissItemStartTime = Date.now();
            await Notifications.dismissNotificationAsync(n.request.identifier);
            const dismissItemElapsed = Date.now() - dismissItemStartTime;
            logger.debug('[NotificationService] ✅ Dismissed notification', {
              identifier: n.request.identifier,
              elapsed: `${dismissItemElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
          } catch (dismissError) {
            logger.warn(
              '[NotificationService] ⚠️ Failed to dismiss notification',
              {
                identifier: n.request.identifier,
                error:
                  dismissError instanceof Error
                    ? dismissError.message
                    : String(dismissError),
                timestamp: new Date().toISOString(),
              }
            );
          }
        });

        await Promise.allSettled(dismissPromises);
        const totalElapsed = Date.now() - dismissStartTime;

        logger.info(
          '[NotificationService] ✅ Dismissed incoming call notifications',
          {
            callId,
            callSid,
            count: matches.length,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        logger.debug(
          '[NotificationService] ℹ️ No matching notifications to dismiss',
          {
            callId,
            callSid,
            totalPresented: presented.length,
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (e) {
      const totalElapsed = Date.now() - dismissStartTime;
      logger.warn(
        '[NotificationService] ❌ Failed dismissing incoming call notifications',
        {
          callId,
          callSid,
          elapsed: `${totalElapsed}ms`,
          error: e instanceof Error ? e.message : String(e),
          errorStack: e instanceof Error ? e.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * Initialize notifications (request permissions and get token)
   */
  async initialize(): Promise<string | null> {
    const initStartTime = Date.now();
    logger.info('[NotificationService] 🎬 Initializing notifications service', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

    try {
      if (Platform.OS === 'web') {
        logger.info('[NotificationService] ⏭️ Skipping push init on web', {
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      if (!Device.isDevice) {
        logger.warn(
          '[NotificationService] ⚠️ Push not available on simulator/emulator (Device.isDevice=false)',
          {
            platform: Platform.OS,
            timestamp: new Date().toISOString(),
          }
        );
        return null;
      }

      // Request permissions
      const permissionsStartTime = Date.now();
      logger.debug(
        '[NotificationService] 🔍 Checking notification permissions',
        {
          timestamp: new Date().toISOString(),
        }
      );

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      logger.debug('[NotificationService] 📊 Current permission status', {
        existingStatus,
        timestamp: new Date().toISOString(),
      });

      if (existingStatus !== 'granted') {
        logger.info(
          '[NotificationService] 🔔 Requesting notification permissions',
          {
            timestamp: new Date().toISOString(),
          }
        );

        const requestStartTime = Date.now();
        const { status } = await Notifications.requestPermissionsAsync();
        const requestElapsed = Date.now() - requestStartTime;
        finalStatus = status;

        logger.info('[NotificationService] 📊 Permission request result', {
          requestedStatus: status,
          elapsed: `${requestElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      const permissionsElapsed = Date.now() - permissionsStartTime;

      if (finalStatus !== 'granted') {
        logger.warn('[NotificationService] ⚠️ Push permission not granted', {
          status: finalStatus,
          elapsed: `${permissionsElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      logger.info('[NotificationService] ✅ Notification permissions granted', {
        status: finalStatus,
        elapsed: `${permissionsElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // Keep device token in sync with DB across login/logout.
      // (App can start before login; we still want to save token once the user signs in.)
      logger.debug('[NotificationService] 🔧 Setting up auth state listener', {
        timestamp: new Date().toISOString(),
      });
      this.setupAuthStateListener();

      // Get Expo push token with project ID
      // Project ID is required for Expo Push API to work correctly
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenOptions = projectId ? { projectId } : undefined;

      logger.debug('[NotificationService] 🔍 Getting Expo push token', {
        hasProjectId: !!projectId,
        projectId: projectId?.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
      });

      const tokenStartTime = Date.now();
      const token = (await Notifications.getExpoPushTokenAsync(tokenOptions))
        .data;
      const tokenElapsed = Date.now() - tokenStartTime;
      this.expoPushToken = token;

      logger.info('[NotificationService] ✅ Expo push token obtained', {
        tokenPrefix: token.substring(0, 20) + '...',
        tokenLength: token.length,
        elapsed: `${tokenElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // Configure notification behavior
      if (Platform.OS === 'android') {
        logger.info(
          '[NotificationService] 🔧 Configuring Android notification channels',
          {
            timestamp: new Date().toISOString(),
          }
        );

        // Change channel ID to force update on device
        const channelId = 'talkee-default-v2';

        // Remove old channel if possible
        try {
          logger.debug(
            '[NotificationService] 🗑️ Attempting to delete old default channel',
            {
              timestamp: new Date().toISOString(),
            }
          );
          await Notifications.deleteNotificationChannelAsync('default');
          logger.debug('[NotificationService] ✅ Old default channel deleted', {
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          logger.debug(
            '[NotificationService] ℹ️ Old default channel not found or already deleted',
            {
              error: e instanceof Error ? e.message : String(e),
              timestamp: new Date().toISOString(),
            }
          );
        }

        const channelStartTime = Date.now();
        await Notifications.setNotificationChannelAsync(channelId, {
          name: 'Talkee Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          showBadge: true,
          enableVibrate: true,
          enableLights: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default', // Using string 'default' for system default sound
        });
        const channelElapsed = Date.now() - channelStartTime;

        logger.info(
          '[NotificationService] ✅ Main notification channel configured',
          {
            channelId,
            elapsed: `${channelElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );

        // Also ensure the default channel is configured for fallback
        const defaultChannelStartTime = Date.now();
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
        });
        const defaultChannelElapsed = Date.now() - defaultChannelStartTime;

        logger.info(
          '[NotificationService] ✅ Default notification channel configured',
          {
            elapsed: `${defaultChannelElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Save token to database
      logger.debug('[NotificationService] 💾 Saving push token to database', {
        timestamp: new Date().toISOString(),
      });
      const saveStartTime = Date.now();
      await this.savePushToken(token);
      const saveElapsed = Date.now() - saveStartTime;

      const totalElapsed = Date.now() - initStartTime;
      logger.info(
        '[NotificationService] ✅ Notifications service initialized successfully',
        {
          tokenPrefix: token.substring(0, 20) + '...',
          saveElapsed: `${saveElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        }
      );

      return token;
    } catch (error) {
      const totalElapsed = Date.now() - initStartTime;
      logger.error(
        '[NotificationService] ❌ Error initializing notifications',
        error,
        {
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
  }

  /**
   * Keep push token synced after auth changes (login after boot is common).
   */
  private setupAuthStateListener(): void {
    if (this.authStateSubscription) {
      logger.debug(
        '[NotificationService] ℹ️ Auth state listener already set up',
        {
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    logger.info('[NotificationService] 🔧 Setting up auth state listener', {
      timestamp: new Date().toISOString(),
    });

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        const authChangeStartTime = Date.now();
        logger.debug(
          '[NotificationService] 🔐 Auth state change event received',
          {
            event,
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            hasPushToken: !!this.expoPushToken,
            timestamp: new Date().toISOString(),
          }
        );

        if (!session?.user) {
          logger.debug(
            '[NotificationService] ⏭️ No session/user, skipping token sync',
            {
              event,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }

        if (!this.expoPushToken) {
          logger.debug(
            '[NotificationService] ⏭️ No push token available, skipping sync',
            {
              event,
              userId: session.user.id,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }

        logger.info(
          '[NotificationService] 🔐 Auth changed; syncing push token',
          {
            event,
            userId: session.user.id,
            tokenPrefix: this.expoPushToken.substring(0, 20) + '...',
            timestamp: new Date().toISOString(),
          }
        );

        // Track SIGNED_IN event to ignore notification taps during login transition
        if (event === 'SIGNED_IN') {
          this.lastAuthChangeTime = Date.now();
          logger.info('[NotificationService] ✅ SIGNED_IN event tracked', {
            lastAuthChangeTime: new Date(this.lastAuthChangeTime).toISOString(),
            willIgnoreTapsFor: '5000ms',
            timestamp: new Date().toISOString(),
          });
        }

        const saveStartTime = Date.now();
        await this.savePushToken(this.expoPushToken);
        const saveElapsed = Date.now() - saveStartTime;
        const totalElapsed = Date.now() - authChangeStartTime;

        logger.info(
          '[NotificationService] ✅ Push token synced after auth change',
          {
            event,
            userId: session.user.id,
            saveElapsed: `${saveElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
      });

      this.authStateSubscription = subscription;
      logger.info(
        '[NotificationService] ✅ Auth state listener set up successfully',
        {
          timestamp: new Date().toISOString(),
        }
      );
    } catch (e) {
      logger.error(
        '[NotificationService] ❌ Failed to setup auth state listener',
        e,
        {
          errorMessage: e instanceof Error ? e.message : String(e),
          errorStack: e instanceof Error ? e.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * Get or create device identifier
   * Uses AsyncStorage to persist device ID across app sessions
   */
  private async getDeviceIdentifier(): Promise<string> {
    const identifierStartTime = Date.now();
    logger.debug('[NotificationService] 🔍 Getting device identifier', {
      timestamp: new Date().toISOString(),
    });

    try {
      const storageKey = '@talkee_device_id';
      const readStartTime = Date.now();
      let deviceId = await AsyncStorage.getItem(storageKey);
      const readElapsed = Date.now() - readStartTime;

      logger.debug(
        '[NotificationService] 📖 Device identifier read from storage',
        {
          hasDeviceId: !!deviceId,
          deviceIdPrefix: deviceId ? deviceId.substring(0, 20) + '...' : null,
          elapsed: `${readElapsed}ms`,
          timestamp: new Date().toISOString(),
        }
      );

      if (!deviceId) {
        logger.info(
          '[NotificationService] 🆔 Generating new device identifier',
          {
            platform: Platform.OS,
            modelName: Device.modelName,
            osName: Device.osName,
            osVersion: Device.osVersion,
            timestamp: new Date().toISOString(),
          }
        );

        // Generate a unique device identifier
        // Combine device info with a random component
        const deviceInfo = `${Platform.OS}-${Device.modelName || 'unknown'}-${
          Device.osName || 'unknown'
        }-${Device.osVersion || 'unknown'}`;
        const randomComponent = Math.random().toString(36).substring(2, 15);
        deviceId = `${deviceInfo}-${randomComponent}`;

        logger.debug('[NotificationService] 🆔 Device identifier generated', {
          deviceIdPrefix: deviceId.substring(0, 30) + '...',
          deviceIdLength: deviceId.length,
          timestamp: new Date().toISOString(),
        });

        // Store for future use
        const writeStartTime = Date.now();
        await AsyncStorage.setItem(storageKey, deviceId);
        const writeElapsed = Date.now() - writeStartTime;

        logger.info(
          '[NotificationService] ✅ Device identifier saved to storage',
          {
            deviceIdPrefix: deviceId.substring(0, 30) + '...',
            elapsed: `${writeElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        logger.debug(
          '[NotificationService] ✅ Using existing device identifier',
          {
            deviceIdPrefix: deviceId.substring(0, 30) + '...',
            timestamp: new Date().toISOString(),
          }
        );
      }

      const totalElapsed = Date.now() - identifierStartTime;
      logger.debug('[NotificationService] ✅ Device identifier obtained', {
        deviceIdPrefix: deviceId.substring(0, 30) + '...',
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return deviceId;
    } catch (error) {
      const totalElapsed = Date.now() - identifierStartTime;
      logger.error(
        '[NotificationService] ❌ Error getting device identifier',
        error,
        {
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      // Fallback to a simple identifier
      const fallbackId = `${Platform.OS}-${Date.now()}`;
      logger.warn('[NotificationService] ⚠️ Using fallback device identifier', {
        fallbackId,
        timestamp: new Date().toISOString(),
      });
      return fallbackId;
    }
  }

  /**
   * Get device name for display
   */
  private getDeviceName(): string {
    logger.debug('[NotificationService] 🔍 Getting device name', {
      timestamp: new Date().toISOString(),
    });

    try {
      const modelName = Device.modelName || 'Unknown Device';
      const brand = Device.brand || '';
      const osName = Device.osName || Platform.OS;
      const osVersion = Device.osVersion || '';

      logger.debug('[NotificationService] 📱 Device info collected', {
        modelName,
        brand,
        osName,
        osVersion,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      });

      let deviceName: string;
      if (brand && brand !== modelName) {
        deviceName = `${brand} ${modelName} (${osName} ${osVersion})`;
      } else {
        deviceName = `${modelName} (${osName} ${osVersion})`;
      }

      logger.debug('[NotificationService] ✅ Device name generated', {
        deviceName,
        timestamp: new Date().toISOString(),
      });

      return deviceName;
    } catch (error) {
      logger.error(
        '[NotificationService] ❌ Error getting device name',
        error,
        {
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }
      );
      const fallbackName = `${Platform.OS} Device`;
      logger.warn('[NotificationService] ⚠️ Using fallback device name', {
        fallbackName,
        timestamp: new Date().toISOString(),
      });
      return fallbackName;
    }
  }

  /**
   * Save push token to database
   * Supports multiple devices per user:
   * - Each device gets its own token entry
   * - Same device with new token: updates existing or creates new entry
   * - Old tokens for same device are marked inactive
   */
  private async savePushToken(token: string): Promise<void> {
    const saveStartTime = Date.now();
    logger.info('[NotificationService] 💾 Saving push token to database', {
      tokenPrefix: token.substring(0, 20) + '...',
      tokenLength: token.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.warn(
          '[NotificationService] ⏭️ No current user, skipping token save',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      const deviceIdStartTime = Date.now();
      const deviceId = await this.getDeviceIdentifier();
      const deviceIdElapsed = Date.now() - deviceIdStartTime;

      const deviceNameStartTime = Date.now();
      const deviceName = this.getDeviceName();
      const deviceNameElapsed = Date.now() - deviceNameStartTime;

      const appVersion = Constants.expoConfig?.version || '1.0.0';

      logger.debug('[NotificationService] 📱 Device info collected', {
        deviceIdPrefix: deviceId.substring(0, 30) + '...',
        deviceName,
        appVersion,
        deviceIdElapsed: `${deviceIdElapsed}ms`,
        deviceNameElapsed: `${deviceNameElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // Check if this device already has a token (same device_id)
      const fetchStartTime = Date.now();
      logger.debug(
        '[NotificationService] 🔍 Checking for existing device tokens',
        {
          userId: currentUser.id,
          deviceIdPrefix: deviceId.substring(0, 30) + '...',
          timestamp: new Date().toISOString(),
        }
      );

      const { data: existingDevices, error: fetchError } = await supabase
        .from('user_devices')
        .select('id, push_token, is_active')
        .eq('user_id', currentUser.id)
        .eq('device_id', deviceId)
        .order('updated_at', { ascending: false });

      const fetchElapsed = Date.now() - fetchStartTime;

      if (fetchError) {
        logger.error(
          '[NotificationService] ❌ Error fetching existing devices',
          fetchError,
          {
            userId: currentUser.id,
            deviceIdPrefix: deviceId.substring(0, 30) + '...',
            elapsed: `${fetchElapsed}ms`,
            errorMessage: fetchError.message,
            errorCode: fetchError.code,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        logger.debug('[NotificationService] 📊 Existing devices fetched', {
          count: existingDevices?.length || 0,
          elapsed: `${fetchElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      // If same device has different token, mark old tokens as inactive
      if (existingDevices && existingDevices.length > 0) {
        const activeDevices = existingDevices.filter((d) => d.is_active);
        const hasDifferentToken = activeDevices.some(
          (d) => d.push_token !== token
        );

        logger.debug('[NotificationService] 🔍 Checking for token changes', {
          totalDevices: existingDevices.length,
          activeDevices: activeDevices.length,
          hasDifferentToken,
          timestamp: new Date().toISOString(),
        });

        if (hasDifferentToken) {
          // Mark old tokens for this device as inactive
          const oldTokenIds = activeDevices
            .filter((d) => d.push_token !== token)
            .map((d) => d.id);

          logger.info(
            '[NotificationService] 🔄 Deactivating old tokens for device',
            {
              deviceIdPrefix: deviceId.substring(0, 30) + '...',
              oldTokenCount: oldTokenIds.length,
              timestamp: new Date().toISOString(),
            }
          );

          if (oldTokenIds.length > 0) {
            const deactivateStartTime = Date.now();
            const { error: deactivateError } = await supabase
              .from('user_devices')
              .update({
                is_active: false,
                updated_at: new Date().toISOString(),
              })
              .in('id', oldTokenIds);

            const deactivateElapsed = Date.now() - deactivateStartTime;

            if (deactivateError) {
              logger.error(
                '[NotificationService] ❌ Error deactivating old tokens',
                deactivateError,
                {
                  deviceIdPrefix: deviceId.substring(0, 30) + '...',
                  oldTokenCount: oldTokenIds.length,
                  elapsed: `${deactivateElapsed}ms`,
                  errorMessage: deactivateError.message,
                  errorCode: deactivateError.code,
                  timestamp: new Date().toISOString(),
                }
              );
            } else {
              logger.info(
                '[NotificationService] ✅ Deactivated old tokens for device',
                {
                  deviceIdPrefix: deviceId.substring(0, 30) + '...',
                  count: oldTokenIds.length,
                  elapsed: `${deactivateElapsed}ms`,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        } else {
          logger.debug(
            '[NotificationService] ℹ️ No token change detected, skipping deactivation',
            {
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      // Upsert device token (update if exists, insert if new)
      // Unique constraint: (user_id, push_token) allows multiple devices per user
      const upsertStartTime = Date.now();
      logger.info('[NotificationService] 💾 Upserting device token', {
        userId: currentUser.id,
        tokenPrefix: token.substring(0, 20) + '...',
        deviceIdPrefix: deviceId.substring(0, 30) + '...',
        deviceName,
        platform: Platform.OS,
        appVersion,
        timestamp: new Date().toISOString(),
      });

      const { error: upsertError } = await supabase.from('user_devices').upsert(
        {
          user_id: currentUser.id,
          push_token: token,
          platform: Platform.OS,
          device_id: deviceId,
          device_name: deviceName,
          app_version: appVersion,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,push_token',
        }
      );

      const upsertElapsed = Date.now() - upsertStartTime;
      const totalElapsed = Date.now() - saveStartTime;

      if (upsertError) {
        logger.error(
          '[NotificationService] ❌ Error upserting push token',
          upsertError,
          {
            userId: currentUser.id,
            deviceIdPrefix: deviceId.substring(0, 30) + '...',
            elapsed: `${upsertElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: upsertError.message,
            errorCode: upsertError.code,
            timestamp: new Date().toISOString(),
          }
        );
        // Don't throw - token saving is not critical for app functionality
      } else {
        logger.info('[NotificationService] ✅ Push token saved successfully', {
          platform: Platform.OS,
          deviceIdPrefix: deviceId.substring(0, 30) + '...',
          deviceName,
          userId: currentUser.id,
          upsertElapsed: `${upsertElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const totalElapsed = Date.now() - saveStartTime;
      logger.error('[NotificationService] ❌ Error saving push token', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user's notifications with professional info
   * Optimized: Uses cached user ID and avoids redundant queries
   */
  async getNotifications(
    limit: number = 20,
    offset: number = 0
  ): Promise<DbNotification[]> {
    try {
      const startTotal = Date.now();
      logger.info('📬 [NotificationService] Starting fetch...', {
        limit,
        offset,
      });

      // Use getCurrentUser() to get user_id from users table (not auth_id from session)
      const userStart = Date.now();
      const currentUser = await usersService.getCurrentUser();
      logger.info('📬 User fetched', {
        duration: `${Date.now() - userStart}ms`,
        hasUser: !!currentUser,
        userId: currentUser?.id,
        authId: currentUser?.auth_id?.substring(0, 8) + '...',
      });

      if (!currentUser) {
        logger.warn('📬 No current user, returning empty');
        return [];
      }

      // ✅ OPTIMIZED: Only select fields needed for list display
      // Single optimized query: Get notifications with professional info in one go
      // No need for separate professional query - return empty professional field
      const queryStart = Date.now();
      const { data, error } = await supabase
        .from('notifications')
        .select(
          `
          id,
          title,
          message,
          type,
          is_read,
          created_at,
          data,
          user_id
        `
        )
        .eq('user_id', currentUser.id) // Use user.id (from users table), not auth_id
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      logger.info('📬 Main query completed', {
        duration: `${Date.now() - queryStart}ms`,
        count: data?.length || 0,
        userId: currentUser.id,
        limit,
        offset,
      });

      // Also log unread count in fetched data for debugging
      if (data && data.length > 0) {
        const unreadInFetched = data.filter((n) => !n.is_read).length;
        logger.info('📬 Fetched notifications breakdown', {
          total: data.length,
          unread: unreadInFetched,
          read: data.length - unreadInFetched,
        });
      }

      if (error) {
        logger.error('Error fetching notifications', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get unique professional IDs from notification data
      const professionalIds = new Set<string>();
      data.forEach((notification) => {
        const professionalId = notification.data?.professional_id;
        if (professionalId) {
          professionalIds.add(professionalId);
        }
      });

      // Fetch professional info if needed (parallel to avoid blocking)
      let professionalsMap: Map<
        string,
        { name: string; avatar_url: string | null }
      > = new Map();

      if (professionalIds.size > 0) {
        try {
          const profStart = Date.now();
          logger.info('📬 Fetching professional data...', {
            count: professionalIds.size,
          });

          // ✅ OPTIMIZED: Use Supabase client's built-in timeout mechanism
          // Remove Promise.race as it doesn't properly cancel the request
          const { data: professionalsData, error: professionalsError } =
            await supabase
              .from('professionals')
              .select('id, users!inner(id, name, avatar_url)')
              .in('id', Array.from(professionalIds));

          logger.info('📬 Professional data fetched', {
            duration: `${Date.now() - profStart}ms`,
            success: !professionalsError,
          });

          if (!professionalsError && professionalsData) {
            professionalsData.forEach((prof: any) => {
              if (prof.users) {
                professionalsMap.set(prof.id, {
                  name: prof.users.name || 'Professional',
                  avatar_url: prof.users.avatar_url,
                });
              }
            });
          }
        } catch (error) {
          // Silently fail professional fetch - notifications will still load
          logger.warn('Failed to fetch professional data for notifications', {
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Enrich notifications with professional info
      const enrichedNotifications = data.map((notification) => {
        const professionalId = notification.data?.professional_id;
        if (professionalId && professionalsMap.has(professionalId)) {
          const professional = professionalsMap.get(professionalId)!;
          return {
            ...notification,
            professional: {
              id: professionalId,
              name: professional.name,
              avatar_url: professional.avatar_url,
            },
          };
        }
        return notification;
      });

      logger.info('✅ [NotificationService] Fetch completed', {
        totalDuration: `${Date.now() - startTotal}ms`,
        count: enrichedNotifications.length,
      });

      return enrichedNotifications as DbNotification[];
    } catch (error) {
      logger.error('Error in getNotifications', error);
      return [];
    }
  }

  /**
   * Get current user ID from cache or session
   * Faster than getCurrentUser() as it doesn't fetch full user object
   * Note: This is now only called when auth is ready (via useNotifications enabled flag)
   */
  private async getCurrentUserId(): Promise<string | null> {
    const getUserIdStartTime = Date.now();
    logger.debug('[NotificationService] 🔍 getCurrentUserId called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const sessionStartTime = Date.now();
      logger.debug(
        '[NotificationService] 🔍 Getting session from Supabase auth',
        {
          timestamp: new Date().toISOString(),
        }
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const sessionElapsed = Date.now() - sessionStartTime;
      const totalElapsed = Date.now() - getUserIdStartTime;

      const userId = session?.user?.id || null;

      logger.debug('[NotificationService] ✅ Current user ID obtained', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: userId ? userId.substring(0, 8) + '...' : null,
        sessionElapsed: `${sessionElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return userId;
    } catch (error) {
      const totalElapsed = Date.now() - getUserIdStartTime;
      logger.error(
        '[NotificationService] ❌ Error getting current user ID',
        error,
        {
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
  }

  /**
   * Get unread notification count
   * IMPORTANT: Uses getCurrentUser() to get user_id (not auth_id) from users table
   */
  async getUnreadCount(): Promise<number> {
    try {
      const startTime = Date.now();
      // Use getCurrentUser() to get user_id from users table (not auth_id from session)
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        logger.warn('📬 [NotificationService] getUnreadCount: No current user');
        return 0;
      }

      logger.info('📬 [NotificationService] getUnreadCount: Starting...', {
        userId: currentUser.id,
        authId: currentUser.auth_id?.substring(0, 8) + '...',
      });

      // ✅ OPTIMIZED: Only select id for count (head: true means no data returned, only count)
      const queryStartTime = Date.now();
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id) // Use user.id (from users table), not auth_id
        .eq('is_read', false);
      const queryElapsed = Date.now() - queryStartTime;

      if (error) {
        logger.error('📬 [NotificationService] getUnreadCount: Error', error, {
          userId: currentUser.id,
          errorMessage: error.message,
          errorCode: error.code,
        });
        return 0;
      }

      const result = count || 0;
      const totalDuration = Date.now() - startTime;
      logger.info('[NotificationService] ✅ getUnreadCount completed', {
        userId: currentUser.id,
        count: result,
        duration: `${totalDuration}ms`,
        queryElapsed: `${queryElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('📬 [NotificationService] getUnreadCount: Exception', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   * ✅ FIX: Added user_id validation to prevent unauthorized access
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const markStartTime = Date.now();
    logger.info('[NotificationService] 📖 markAsRead called', {
      notificationId,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          notificationId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const updateStartTime = Date.now();
      logger.debug('[NotificationService] 🔄 Updating notification as read', {
        notificationId,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

      // ✅ FIX: Add user_id validation to prevent unauthorized access
      const { error, data } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', currentUser.id)
        .select('id')
        .single();

      const updateElapsed = Date.now() - updateStartTime;
      const totalElapsed = Date.now() - markStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error marking notification as read',
          error,
          {
            notificationId,
            userId: currentUser.id,
            elapsed: `${updateElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to mark as read: ${error.message}`);
      }

      // ✅ FIX: Check if notification was actually updated (might not exist or belong to another user)
      if (!data) {
        logger.warn(
          '[NotificationService] ⚠️ Notification not found or doesn\'t belong to user',
          {
            notificationId,
            userId: currentUser.id,
            elapsed: `${updateElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error('Notification not found or access denied');
      }

      logger.info('[NotificationService] ✅ Notification marked as read', {
        notificationId,
        userId: currentUser.id,
        updateElapsed: `${updateElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - markStartTime;
      logger.error('[NotificationService] ❌ Error in markAsRead', error, {
        notificationId,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    const markAllStartTime = Date.now();
    logger.info('[NotificationService] 📖 markAllAsRead called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const updateStartTime = Date.now();
      logger.info(
        '[NotificationService] 🔄 Marking all notifications as read',
        {
          userId: currentUser.id,
          timestamp: new Date().toISOString(),
        }
      );

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      const updateElapsed = Date.now() - updateStartTime;
      const totalElapsed = Date.now() - markAllStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error marking all as read',
          error,
          {
            userId: currentUser.id,
            elapsed: `${updateElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to mark all as read: ${error.message}`);
      }

      logger.info('[NotificationService] ✅ All notifications marked as read', {
        userId: currentUser.id,
        updateElapsed: `${updateElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - markAllStartTime;
      logger.error('[NotificationService] ❌ Error in markAllAsRead', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const deleteStartTime = Date.now();
    logger.info('[NotificationService] 🗑️ deleteNotification called', {
      notificationId,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          notificationId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const dbDeleteStartTime = Date.now();
      logger.info('[NotificationService] 🗑️ Deleting notification', {
        notificationId,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);

      const deleteElapsed = Date.now() - dbDeleteStartTime;
      const totalElapsed = Date.now() - deleteStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error deleting notification',
          error,
          {
            notificationId,
            userId: currentUser.id,
            elapsed: `${deleteElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to delete notification: ${error.message}`);
      }

      logger.info('[NotificationService] ✅ Notification deleted', {
        notificationId,
        userId: currentUser.id,
        deleteElapsed: `${deleteElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - deleteStartTime;
      logger.error(
        '[NotificationService] ❌ Error in deleteNotification',
        error,
        {
          notificationId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<boolean> {
    const deleteAllStartTime = Date.now();
    logger.info('[NotificationService] 🗑️ deleteAllNotifications called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const deleteStartTime = Date.now();
      logger.info('[NotificationService] 🗑️ Deleting all notifications', {
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);

      const deleteElapsed = Date.now() - deleteStartTime;
      const totalElapsed = Date.now() - deleteAllStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error deleting all notifications',
          error,
          {
            userId: currentUser.id,
            elapsed: `${deleteElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to delete all notifications: ${error.message}`);
      }

      logger.info('[NotificationService] ✅ All notifications deleted', {
        userId: currentUser.id,
        deleteElapsed: `${deleteElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - deleteAllStartTime;
      logger.error(
        '[NotificationService] ❌ Error in deleteAllNotifications',
        error,
        {
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Send local notification (for testing or offline scenarios)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    const sendStartTime = Date.now();
    logger.info('[NotificationService] 📤 sendLocalNotification called', {
      title,
      body: body.substring(0, 50) + '...',
      hasData: !!data,
      dataType: data?.type,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

    try {
      if (Platform.OS === 'web') {
        logger.debug(
          '[NotificationService] ⏭️ Skipping local notification on web',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      const scheduleStartTime = Date.now();
      logger.debug('[NotificationService] 📅 Scheduling local notification', {
        title,
        channelId: Platform.OS === 'android' ? 'talkee-default-v2' : null,
        timestamp: new Date().toISOString(),
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...(data || {}), is_local: true },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        },
        // On Android, specify the channel via trigger (ChannelAwareTriggerInput) for immediate delivery.
        trigger:
          Platform.OS === 'android' ? { channelId: 'talkee-default-v2' } : null,
      });

      const scheduleElapsed = Date.now() - scheduleStartTime;
      const totalElapsed = Date.now() - sendStartTime;

      logger.info('[NotificationService] ✅ Local notification sent', {
        title,
        scheduleElapsed: `${scheduleElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const totalElapsed = Date.now() - sendStartTime;
      logger.error(
        '[NotificationService] ❌ Error sending local notification',
        error,
        {
          title,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * Get notification settings
   * Note: notification_settings table doesn't exist in current schema
   * Returns default settings for now
   */
  async getSettings(): Promise<
    import('../types/database.types').NotificationSettings
  > {
    const getSettingsStartTime = Date.now();
    logger.info('[NotificationService] ⚙️ getSettings called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      // TODO: Create notification_settings table if needed
      // For now, return default settings
      const defaultSettings = {
        push_enabled: true,
        call_notifications: true,
        review_notifications: true,
        payment_notifications: true,
        message_notifications: true,
        promotional_notifications: false,
      };

      const totalElapsed = Date.now() - getSettingsStartTime;
      logger.info(
        '[NotificationService] ✅ Returning default notification settings',
        {
          userId: currentUser.id,
          settings: defaultSettings,
          elapsed: `${totalElapsed}ms`,
          note: 'notification_settings table not implemented yet',
          timestamp: new Date().toISOString(),
        }
      );

      return defaultSettings;
    } catch (error) {
      const totalElapsed = Date.now() - getSettingsStartTime;
      logger.error('[NotificationService] ❌ Error in getSettings', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      const fallbackSettings = {
        push_enabled: true,
        call_notifications: true,
        review_notifications: true,
        payment_notifications: true,
        message_notifications: true,
        promotional_notifications: false,
      };

      logger.warn('[NotificationService] ⚠️ Returning fallback settings', {
        settings: fallbackSettings,
        timestamp: new Date().toISOString(),
      });

      return fallbackSettings;
    }
  }

  /**
   * Update notification settings
   * Note: notification_settings table doesn't exist in current schema
   */
  async updateSettings(
    settings: Partial<import('../types/database.types').NotificationSettings>
  ): Promise<boolean> {
    const updateStartTime = Date.now();
    logger.info('[NotificationService] ⚙️ updateSettings called', {
      settingsKeys: Object.keys(settings),
      settings,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      // TODO: Implement when notification_settings table is created
      const totalElapsed = Date.now() - updateStartTime;
      logger.warn(
        '[NotificationService] ⚠️ updateSettings not implemented yet',
        {
          userId: currentUser.id,
          requestedSettings: settings,
          elapsed: `${totalElapsed}ms`,
          note: 'notification_settings table not created yet',
          timestamp: new Date().toISOString(),
        }
      );

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - updateStartTime;
      logger.error('[NotificationService] ❌ Error in updateSettings', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications
   * ✅ FIX: Fixed race condition by ensuring subscription is set up before returning unsubscribe function
   */
  subscribeToNotifications(
    callback: (notification: DbNotification) => void
  ): () => void {
    logger.info('[NotificationService] 📡 subscribeToNotifications called', {
      timestamp: new Date().toISOString(),
    });

    let subscription: any = null;
    let isUnsubscribed = false;

    // Set up subscription asynchronously
    (async () => {
      const subscribeStartTime = Date.now();
      logger.debug(
        '[NotificationService] 🔍 Getting current user for subscription',
        {
          timestamp: new Date().toISOString(),
        }
      );

      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        logger.warn(
          '[NotificationService] ⚠️ No current user, skipping subscription',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      // Check if already unsubscribed before setting up subscription
      if (isUnsubscribed) {
        logger.debug(
          '[NotificationService] ⏭️ Already unsubscribed, skipping subscription setup',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      logger.info(
        '[NotificationService] 📡 Setting up real-time subscription',
        {
          userId: currentUser.id,
          channel: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
          timestamp: new Date().toISOString(),
        }
      );

      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`,
          },
          (payload) => {
            logger.debug(
              '[NotificationService] 📬 Real-time notification received',
              {
                notificationId: (payload.new as DbNotification)?.id,
                type: (payload.new as DbNotification)?.type,
                userId: currentUser.id,
                timestamp: new Date().toISOString(),
              }
            );
            callback(payload.new as DbNotification);
          }
        )
        .subscribe();

      const subscribeElapsed = Date.now() - subscribeStartTime;
      logger.info('[NotificationService] ✅ Real-time subscription set up', {
        userId: currentUser.id,
        elapsed: `${subscribeElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    })();

    return () => {
      logger.info(
        '[NotificationService] 🔚 Unsubscribing from real-time notifications',
        {
          hasSubscription: !!subscription,
          isUnsubscribed,
          timestamp: new Date().toISOString(),
        }
      );

      isUnsubscribed = true;

      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
        logger.debug('[NotificationService] ✅ Unsubscribed successfully', {
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.debug(
          '[NotificationService] ⚠️ Subscription not yet initialized, marked for cleanup',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }
    };
  }

  /**
   * Setup notification listeners
   */
  setupListeners(): void {
    logger.info('[NotificationService] 🔧 setupListeners called', {
      platform: Platform.OS,
      hasExistingSubscription: !!this.notificationResponseSubscription,
      timestamp: new Date().toISOString(),
    });

    if (Platform.OS === 'web') {
      logger.debug('[NotificationService] ⏭️ Skipping setup on web platform', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Make idempotent (hot reload / remount safety)
    if (this.notificationResponseSubscription) {
      logger.info(
        '[NotificationService] 🔄 Removing existing notification response subscription',
        {
          timestamp: new Date().toISOString(),
        }
      );
      this.notificationResponseSubscription.remove();
      this.notificationResponseSubscription = null;
      logger.debug('[NotificationService] ✅ Existing subscription removed', {
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(
      '[NotificationService] 📡 Setting up notification response listener',
      {
        timestamp: new Date().toISOString(),
      }
    );

    // Handle notification tap
    this.notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const timestamp = Date.now();

        logger.info('[NotificationService] 🔔 Notification tap received', {
          notificationId: data?.notification_id,
          type: data?.type,
          professional_id: data?.professional_id,
          action_url: data?.action_url,
          call_id: data?.call_id,
          timestamp: new Date(timestamp).toISOString(),
          dataKeys: Object.keys(data || {}),
        });

        // Ignore browser referrer taps (these are not real notifications, just browser metadata)
        const isBrowserReferrerTap =
          data &&
          Object.keys(data).every(
            (key) =>
              key.startsWith('org.chromium.chrome.browser.') ||
              key.startsWith('com.android.browser.') ||
              key === 'android.intent.extra.REFERRER'
          );

        if (isBrowserReferrerTap) {
          logger.info(
            '[NotificationService] ⛔ Ignoring browser referrer tap (not a real notification)',
            {
              dataKeys: Object.keys(data || {}),
            }
          );
          return;
        }

        // Ignore notification taps within 5 seconds of login to prevent redirect during auth transition
        const timeSinceAuthChange = timestamp - this.lastAuthChangeTime;
        logger.info('[NotificationService] ⏱️ Auth timing check', {
          timeSinceAuthChange: `${timeSinceAuthChange}ms`,
          lastAuthChangeTime: this.lastAuthChangeTime
            ? new Date(this.lastAuthChangeTime).toISOString()
            : 'never',
          willIgnore: timeSinceAuthChange < 5000,
        });

        if (timeSinceAuthChange < 5000) {
          logger.info(
            '[NotificationService] ⛔ Ignoring notification tap during login transition',
            {
              timeSinceAuthChange: `${timeSinceAuthChange}ms`,
            }
          );
          return;
        }

        // Log notification tap
        logger.userAction('notification_tapped', {
          notificationId: data?.notification_id,
          type: data?.type,
        });

        // Handle navigation based on notification data
        if (data?.professional_id) {
          const { Linking } = require('react-native');
          const url = `talkee://professional/${data.professional_id}`;
          logger.info('[NotificationService] 🧭 Navigating to professional', {
            url,
            professional_id: data.professional_id,
          });
          Linking.openURL(url).catch((err: Error) => {
            logger.error('Failed to open professional link', err);
          });
        } else if (data?.action_url) {
          const { Linking } = require('react-native');
          logger.info('[NotificationService] 🧭 Navigating to action_url', {
            action_url: data.action_url,
          });
          Linking.openURL(data.action_url).catch((err: Error) => {
            logger.error('Failed to open action URL', err);
          });
        } else if (
          data?.type === 'call_request' ||
          data?.type === 'call_started'
        ) {
          if (data?.call_id) {
            const { Linking } = require('react-native');
            const url = `talkee://call/${data.call_id}?incoming=true`;
            logger.info('[NotificationService] 🧭 Navigating to call', {
              url,
              call_id: data.call_id,
            });
            // call_id is the DB call record id; open CallScreen in "incoming" mode
            Linking.openURL(url).catch((err: Error) => {
              logger.error('Failed to open call link', err);
            });
          }
        } else {
          const { Linking } = require('react-native');
          const url = 'talkee://notifications';
          logger.info(
            '[NotificationService] 🧭 Navigating to notifications (default)',
            {
              url,
              reason: 'No professional_id, action_url, or call_id found',
              dataKeys: Object.keys(data || {}),
            }
          );
          Linking.openURL(url).catch((err: Error) => {
            logger.error('Failed to open notifications link', err);
          });
        }
      });

    logger.info(
      '[NotificationService] ✅ Notification listeners set up successfully',
      {
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Listen for notifications received while app is in foreground
   * Returns unsubscribe function
   */
  onNotificationReceived(
    callback: (notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    }) => void
  ): () => void {
    logger.info('[NotificationService] 📬 onNotificationReceived called', {
      currentCallbacksCount: this.notificationReceivedCallbacks.size,
      hasSubscription: !!this.notificationReceivedSubscription,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

    if (Platform.OS === 'web') {
      logger.debug('[NotificationService] ⏭️ Skipping on web platform', {
        timestamp: new Date().toISOString(),
      });
      return () => {};
    }

    this.notificationReceivedCallbacks.add(callback);
    logger.debug('[NotificationService] ✅ Callback added', {
      totalCallbacks: this.notificationReceivedCallbacks.size,
      timestamp: new Date().toISOString(),
    });

    if (!this.notificationReceivedSubscription) {
      logger.info(
        '[NotificationService] 📡 Setting up notification received listener',
        {
          timestamp: new Date().toISOString(),
        }
      );

      this.notificationReceivedSubscription =
        Notifications.addNotificationReceivedListener((notification) => {
          const receivedStartTime = Date.now();
          const { title, body, data } = notification.request.content;
          const trigger = notification.request.trigger;
          const triggerType = (trigger as any)?.type;

          logger.info('[NotificationService] 📬 Notification received', {
            title,
            body: body?.substring(0, 50),
            triggerType,
            isLocal: (data as any)?.is_local,
            notificationId: notification.request.identifier,
            dataType: (data as any)?.type,
            dataKeys: Object.keys(data || {}),
            timestamp: new Date().toISOString(),
          });

          const payload = {
            title: title || '',
            body: body || '',
            data: data as Record<string, any>,
          };

          // If we receive an end/missed signal, clear any lingering call_request notification.
          const nType = (payload.data as any)?.type;
          if (nType === 'call_ended' || nType === 'call_missed') {
            logger.debug(
              '[NotificationService] 🔔 Call ended/missed notification, dismissing incoming call notifications',
              {
                type: nType,
                callId: (payload.data as any)?.call_id,
                callSid: (payload.data as any)?.call_sid,
                timestamp: new Date().toISOString(),
              }
            );
            void this.dismissIncomingCallNotifications({
              callId: (payload.data as any)?.call_id,
              callSid: (payload.data as any)?.call_sid,
            });
          }

          // Fan-out to all subscribers (IncomingCallHandler, screens, etc.)
          logger.debug('[NotificationService] 📤 Fanning out to callbacks', {
            callbackCount: this.notificationReceivedCallbacks.size,
            timestamp: new Date().toISOString(),
          });

          for (const cb of this.notificationReceivedCallbacks) {
            try {
              const cbStartTime = Date.now();
              cb(payload);
              const cbElapsed = Date.now() - cbStartTime;
              logger.debug('[NotificationService] ✅ Callback executed', {
                elapsed: `${cbElapsed}ms`,
                timestamp: new Date().toISOString(),
              });
            } catch (e) {
              logger.error(
                '[NotificationService] ❌ onNotificationReceived cb error',
                e,
                {
                  errorMessage: e instanceof Error ? e.message : String(e),
                  errorStack: e instanceof Error ? e.stack : undefined,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }

          const receivedElapsed = Date.now() - receivedStartTime;
          logger.debug(
            '[NotificationService] ✅ Notification processing completed',
            {
              elapsed: `${receivedElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
        });

      logger.info(
        '[NotificationService] ✅ Notification received listener set up',
        {
          timestamp: new Date().toISOString(),
        }
      );
    }

    return () => {
      logger.info(
        '[NotificationService] 🔚 Unsubscribing from notification received',
        {
          currentCallbacksCount: this.notificationReceivedCallbacks.size,
          timestamp: new Date().toISOString(),
        }
      );

      this.notificationReceivedCallbacks.delete(callback);

      logger.debug('[NotificationService] 📊 Callback removed', {
        remainingCallbacks: this.notificationReceivedCallbacks.size,
        timestamp: new Date().toISOString(),
      });

      if (this.notificationReceivedCallbacks.size === 0) {
        logger.info(
          '[NotificationService] 🔚 Removing notification received subscription (no more callbacks)',
          {
            timestamp: new Date().toISOString(),
          }
        );
        this.notificationReceivedSubscription?.remove();
        this.notificationReceivedSubscription = null;
        logger.debug('[NotificationService] ✅ Subscription removed', {
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Create notification (typically called by backend/system)
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<DbNotification | null> {
    const createStartTime = Date.now();
    logger.info('[NotificationService] 📝 createNotification called', {
      userId,
      type,
      title,
      message: message.substring(0, 50) + '...',
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      timestamp: new Date().toISOString(),
    });

    try {
      const notificationData: NotificationInsert = {
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        is_read: false,
      };

      logger.debug(
        '[NotificationService] 💾 Inserting notification to database',
        {
          userId,
          type,
          timestamp: new Date().toISOString(),
        }
      );

      const insertStartTime = Date.now();
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      const insertElapsed = Date.now() - insertStartTime;
      const totalElapsed = Date.now() - createStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error creating notification',
          error,
          {
            userId,
            type,
            elapsed: `${insertElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      logger.info(
        '[NotificationService] ✅ Notification created successfully',
        {
          notificationId: notification?.id,
          userId,
          type,
          insertElapsed: `${insertElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        }
      );

      return notification as DbNotification;
    } catch (error) {
      const totalElapsed = Date.now() - createStartTime;
      logger.error(
        '[NotificationService] ❌ Error in createNotification',
        error,
        {
          userId,
          type,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Get user's active device tokens
   * Used for sending push notifications to all user devices
   */
  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const fetchStartTime = Date.now();
    logger.info('[NotificationService] 📱 getUserDeviceTokens called', {
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const queryStartTime = Date.now();
      logger.debug('[NotificationService] 🔍 Fetching active device tokens', {
        userId,
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase
        .from('user_devices')
        .select('push_token')
        .eq('user_id', userId)
        .eq('is_active', true);

      const queryElapsed = Date.now() - queryStartTime;
      const totalElapsed = Date.now() - fetchStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error fetching user device tokens',
          error,
          {
            userId,
            elapsed: `${queryElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        return [];
      }

      const tokens = (data || []).map((device) => device.push_token);

      logger.info('[NotificationService] ✅ User device tokens fetched', {
        userId,
        tokenCount: tokens.length,
        queryElapsed: `${queryElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return tokens;
    } catch (error) {
      const totalElapsed = Date.now() - fetchStartTime;
      logger.error(
        '[NotificationService] ❌ Error in getUserDeviceTokens',
        error,
        {
          userId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return [];
    }
  }

  /**
   * Get all devices for current user
   */
  async getUserDevices(): Promise<
    Array<{
      id: string;
      push_token: string;
      platform: string;
      device_name: string | null;
      device_id: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>
  > {
    const fetchStartTime = Date.now();
    logger.info('[NotificationService] 📱 getUserDevices called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.warn(
          '[NotificationService] ⚠️ No current user, returning empty array',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return [];
      }

      const queryStartTime = Date.now();
      logger.debug('[NotificationService] 🔍 Fetching user devices', {
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

      const queryElapsed = Date.now() - queryStartTime;
      const totalElapsed = Date.now() - fetchStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error fetching user devices',
          error,
          {
            userId: currentUser.id,
            elapsed: `${queryElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        return [];
      }

      const devices = (data || []) as Array<{
        id: string;
        push_token: string;
        platform: string;
        device_name: string | null;
        device_id: string | null;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;

      const activeCount = devices.filter((d) => d.is_active).length;
      logger.info('[NotificationService] ✅ User devices fetched', {
        userId: currentUser.id,
        totalDevices: devices.length,
        activeDevices: activeCount,
        inactiveDevices: devices.length - activeCount,
        queryElapsed: `${queryElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return devices;
    } catch (error) {
      const totalElapsed = Date.now() - fetchStartTime;
      logger.error('[NotificationService] ❌ Error in getUserDevices', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      return [];
    }
  }

  /**
   * Remove/Deactivate a device token
   */
  async removeDeviceToken(deviceId: string): Promise<boolean> {
    const removeStartTime = Date.now();
    logger.info('[NotificationService] 🗑️ removeDeviceToken called', {
      deviceId,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          deviceId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const updateStartTime = Date.now();
      logger.info('[NotificationService] 🔄 Deactivating device token', {
        deviceId,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', deviceId)
        .eq('user_id', currentUser.id);

      const updateElapsed = Date.now() - updateStartTime;
      const totalElapsed = Date.now() - removeStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error removing device token',
          error,
          {
            deviceId,
            userId: currentUser.id,
            elapsed: `${updateElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to remove device: ${error.message}`);
      }

      logger.info('[NotificationService] ✅ Device token deactivated', {
        deviceId,
        userId: currentUser.id,
        updateElapsed: `${updateElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - removeStartTime;
      logger.error(
        '[NotificationService] ❌ Error in removeDeviceToken',
        error,
        {
          deviceId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Cleanup all subscriptions and listeners
   * Should be called when the service is being destroyed or app is closing
   */
  cleanup(): void {
    const cleanupStartTime = Date.now();
    logger.info('[NotificationService] 🧹 cleanup called', {
      timestamp: new Date().toISOString(),
    });

    try {
      // Cleanup auth state subscription
      if (this.authStateSubscription) {
        logger.debug(
          '[NotificationService] 🔚 Unsubscribing from auth state changes',
          {
            timestamp: new Date().toISOString(),
          }
        );
        this.authStateSubscription.unsubscribe();
        this.authStateSubscription = null;
        logger.debug(
          '[NotificationService] ✅ Auth state subscription cleaned up',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Cleanup notification response subscription
      if (this.notificationResponseSubscription) {
        logger.debug(
          '[NotificationService] 🔚 Removing notification response subscription',
          {
            timestamp: new Date().toISOString(),
          }
        );
        this.notificationResponseSubscription.remove();
        this.notificationResponseSubscription = null;
        logger.debug(
          '[NotificationService] ✅ Notification response subscription cleaned up',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Cleanup notification received subscription
      if (this.notificationReceivedSubscription) {
        logger.debug(
          '[NotificationService] 🔚 Removing notification received subscription',
          {
            timestamp: new Date().toISOString(),
          }
        );
        this.notificationReceivedSubscription.remove();
        this.notificationReceivedSubscription = null;
        logger.debug(
          '[NotificationService] ✅ Notification received subscription cleaned up',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Clear callbacks
      this.notificationReceivedCallbacks.clear();

      const cleanupElapsed = Date.now() - cleanupStartTime;
      logger.info('[NotificationService] ✅ Cleanup completed', {
        elapsed: `${cleanupElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const cleanupElapsed = Date.now() - cleanupStartTime;
      logger.error('[NotificationService] ❌ Error during cleanup', error, {
        elapsed: `${cleanupElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Clean up inactive device tokens (older than 30 days)
   */
  async cleanupInactiveTokens(): Promise<boolean> {
    const cleanupStartTime = Date.now();
    logger.info('[NotificationService] 🧹 cleanupInactiveTokens called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      logger.info(
        '[NotificationService] 🧹 Cleaning up inactive tokens older than 30 days',
        {
          userId: currentUser.id,
          cutoffDate: thirtyDaysAgo.toISOString(),
          timestamp: new Date().toISOString(),
        }
      );

      const deleteStartTime = Date.now();
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('is_active', false)
        .lt('updated_at', thirtyDaysAgo.toISOString());

      const deleteElapsed = Date.now() - deleteStartTime;
      const totalElapsed = Date.now() - cleanupStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error cleaning up inactive tokens',
          error,
          {
            userId: currentUser.id,
            elapsed: `${deleteElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        return false;
      }

      logger.info('[NotificationService] ✅ Inactive tokens cleaned up', {
        userId: currentUser.id,
        deleteElapsed: `${deleteElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - cleanupStartTime;
      logger.error(
        '[NotificationService] ❌ Error in cleanupInactiveTokens',
        error,
        {
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /*
   * Send push notification via Supabase Edge Function
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    category?: string,
    channelId?: string
  ): Promise<boolean> {
    try {
      logger.info('[NotificationService] Sending push notification', {
        userId,
        title,
        body: body.substring(0, 50) + '...',
        hasData: !!data,
        dataType: data?.type,
        category,
        channelId,
      });

      const { data: response, error } = await supabase.functions.invoke(
        'send-push',
        {
          body: {
            user_id: userId,
            title,
            body,
            data,
            category, // ✅ Category for action buttons (e.g., 'INCOMING_CALL')
            channelId,
            sound: 'default',
            priority: 'high',
          },
        }
      );

      if (error) {
        logger.error(
          '[NotificationService] Error invoking send-push function',
          error,
          {
            userId,
            errorMessage: error.message,
            errorName: error.name,
          }
        );
        return false;
      }

      logger.info('[NotificationService] send-push function response', {
        userId,
        responseSuccess: response?.success,
        resultSuccess: response?.result?.success,
        resultFailed: response?.result?.failed,
        resultErrors: response?.result?.errors,
        fullResponse: response,
      });

      const acceptedCount = Number(response?.result?.success || 0);
      if (!response?.success || acceptedCount <= 0) {
        logger.warn(
          '[NotificationService] Push notification not delivered (no active/valid devices?)',
          {
            userId,
            response,
            acceptedCount,
            resultFailed: response?.result?.failed,
            resultErrors: response?.result?.errors,
          }
        );
        return false;
      }

      logger.info('[NotificationService] Push notification sent successfully', {
        userId,
        acceptedCount,
      });

      return true;
    } catch (error) {
      logger.error(
        '[NotificationService] Error in sendPushNotification',
        error,
        {
          userId,
          title,
        }
      );
      return false; // Don't throw, just return false
    }
  }

  /**
   * Send batch push notifications to multiple users
   */
  async sendBatchPushNotifications(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    const batchStartTime = Date.now();
    logger.info('[NotificationService] 📤 sendBatchPushNotifications called', {
      userCount: userIds.length,
      title,
      body: body.substring(0, 50) + '...',
      hasData: !!data,
      dataType: data?.type,
      timestamp: new Date().toISOString(),
    });

    try {
      // Since our current send-push function handles one user_id at a time,
      // we'll iterate and send individual requests for now.
      // Ideally, the Edge Function should be updated to accept an array of user_ids for better performance.

      logger.debug(
        '[NotificationService] 📤 Creating batch push notification promises',
        {
          userCount: userIds.length,
          timestamp: new Date().toISOString(),
        }
      );

      const promises = userIds.map((userId) =>
        this.sendPushNotification(userId, title, body, data)
      );

      logger.info(
        '[NotificationService] ⏳ Waiting for all batch notifications to complete',
        {
          userCount: userIds.length,
          timestamp: new Date().toISOString(),
        }
      );

      const settleStartTime = Date.now();
      const results = await Promise.allSettled(promises);
      const settleElapsed = Date.now() - settleStartTime;
      const totalElapsed = Date.now() - batchStartTime;

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value === true
      ).length;
      const failed = results.filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && r.value === false)
      ).length;

      logger.info(
        '[NotificationService] ✅ Batch push notifications completed',
        {
          totalUsers: userIds.length,
          successful,
          failed,
          settleElapsed: `${settleElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        }
      );

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - batchStartTime;
      logger.error(
        '[NotificationService] ❌ Error in sendBatchPushNotifications',
        error,
        {
          userCount: userIds.length,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return false;
    }
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(
    type: NotificationType,
    limit: number = 20
  ): Promise<DbNotification[]> {
    const fetchStartTime = Date.now();
    logger.info('[NotificationService] 📬 getNotificationsByType called', {
      type,
      limit,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.warn(
          '[NotificationService] ⚠️ No current user, returning empty array',
          {
            type,
            timestamp: new Date().toISOString(),
          }
        );
        return [];
      }

      const queryStartTime = Date.now();
      logger.debug('[NotificationService] 🔍 Fetching notifications by type', {
        userId: currentUser.id,
        type,
        limit,
        timestamp: new Date().toISOString(),
      });

      // ✅ OPTIMIZED: Only select fields needed for list display
      const { data, error } = await supabase
        .from('notifications')
        .select(
          `
          id,
          title,
          message,
          type,
          is_read,
          created_at,
          data,
          user_id
        `
        )
        .eq('user_id', currentUser.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      const queryElapsed = Date.now() - queryStartTime;
      const totalElapsed = Date.now() - fetchStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error fetching notifications by type',
          error,
          {
            userId: currentUser.id,
            type,
            limit,
            elapsed: `${queryElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        return [];
      }

      const notifications = (data || []) as DbNotification[];

      logger.info('[NotificationService] ✅ Notifications by type fetched', {
        userId: currentUser.id,
        type,
        count: notifications.length,
        limit,
        queryElapsed: `${queryElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return notifications;
    } catch (error) {
      const totalElapsed = Date.now() - fetchStartTime;
      logger.error(
        '[NotificationService] ❌ Error in getNotificationsByType',
        error,
        {
          type,
          limit,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return [];
    }
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  async clearOldNotifications(): Promise<boolean> {
    const clearStartTime = Date.now();
    logger.info('[NotificationService] 🧹 clearOldNotifications called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[NotificationService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[NotificationService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      logger.info(
        '[NotificationService] 🧹 Clearing old notifications older than 30 days',
        {
          userId: currentUser.id,
          cutoffDate: thirtyDaysAgo.toISOString(),
          timestamp: new Date().toISOString(),
        }
      );

      const deleteStartTime = Date.now();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      const deleteElapsed = Date.now() - deleteStartTime;
      const totalElapsed = Date.now() - clearStartTime;

      if (error) {
        logger.error(
          '[NotificationService] ❌ Error clearing old notifications',
          error,
          {
            userId: currentUser.id,
            elapsed: `${deleteElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(`Failed to clear old notifications: ${error.message}`);
      }

      logger.info('[NotificationService] ✅ Old notifications cleared', {
        userId: currentUser.id,
        deleteElapsed: `${deleteElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      const totalElapsed = Date.now() - clearStartTime;
      logger.error(
        '[NotificationService] ❌ Error in clearOldNotifications',
        error,
        {
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
