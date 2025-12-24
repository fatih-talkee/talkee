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
  Notifications.setNotificationHandler({
    handleNotification: async (
      notification: ExpoNotification
    ): Promise<NotificationBehavior> => {
      // Güvenli tip kontrolü ile trigger tipini alalım
      const trigger = notification.request.trigger;
      const triggerType = (trigger as any)?.type;
      const content = notification.request.content;
      const data = (content?.data || {}) as any;

      logger.info('[NotificationService] Foreground notification handler', {
        title: content.title,
        triggerType,
      });

      const isAndroid = Platform.OS === 'android';
      const isLocal = Boolean(data?.is_local);
      const isRemotePush =
        triggerType === 'push' || Boolean((trigger as any)?.remoteMessage);

      // Android: If a remote push arrives while foreground, the OS may not show it reliably.
      // We re-publish it as a local notification on our channel for consistent behavior.
      let republishedOk = false;
      const shouldRepublishAndroidRemote =
        isAndroid && isRemotePush && !isLocal;

      if (shouldRepublishAndroidRemote) {
        try {
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
          logger.info(
            '[NotificationService] Republished remote push as local (foreground)',
            { title: content.title, triggerType }
          );
        } catch (e) {
          logger.error(
            '[NotificationService] Failed to republish remote push as local',
            e
          );
        }
      }

      // Only suppress the original remote notification if we successfully republished it.
      const shouldSuppressAndroidRemote =
        shouldRepublishAndroidRemote && republishedOk;

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
    if (Platform.OS === 'web') return;

    const callId = params.callId ?? undefined;
    const callSid = params.callSid ?? undefined;
    if (!callId && !callSid) return;

    try {
      const presented = await Notifications.getPresentedNotificationsAsync();
      const matches = presented.filter((n) => {
        const data = (n.request.content.data || {}) as any;
        const type = data?.type;

        if (type !== 'call_request' && type !== 'incoming_call') return false;
        if (callId && data?.call_id && data.call_id === callId) return true;
        if (callSid && data?.call_sid && data.call_sid === callSid) return true;
        return false;
      });

      for (const n of matches) {
        try {
          await Notifications.dismissNotificationAsync(n.request.identifier);
        } catch {
          // ignore
        }
      }

      if (matches.length > 0) {
        logger.info(
          '[NotificationService] Dismissed incoming call notifications',
          {
            callId,
            callSid,
            count: matches.length,
          }
        );
      }
    } catch (e) {
      logger.warn(
        '[NotificationService] Failed dismissing incoming call notifications',
        {
          callId,
          callSid,
          error: e instanceof Error ? e.message : String(e),
        }
      );
    }
  }

  /**
   * Initialize notifications (request permissions and get token)
   */
  async initialize(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        logger.info('[NotificationService] Skipping push init on web');
        return null;
      }

      if (!Device.isDevice) {
        logger.warn(
          '[NotificationService] Push not available on simulator/emulator (Device.isDevice=false)'
        );
        return null;
      }

      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('[NotificationService] Push permission not granted', {
          status: finalStatus,
        });
        return null;
      }

      // Keep device token in sync with DB across login/logout.
      // (App can start before login; we still want to save token once the user signs in.)
      this.setupAuthStateListener();

      // Get Expo push token with project ID
      // Project ID is required for Expo Push API to work correctly
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenOptions = projectId ? { projectId } : undefined;

      const token = (await Notifications.getExpoPushTokenAsync(tokenOptions))
        .data;
      this.expoPushToken = token;

      // Configure notification behavior
      if (Platform.OS === 'android') {
        // Change channel ID to force update on device
        const channelId = 'talkee-default-v2';

        // Remove old channel if possible
        try {
          await Notifications.deleteNotificationChannelAsync('default');
        } catch (e) {
          // Ignore
        }

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

        // Also ensure the default channel is configured for fallback
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
        });
      }

      // Save token to database
      await this.savePushToken(token);

      return token;
    } catch (error) {
      logger.error('Error initializing notifications', error);
      return null;
    }
  }

  /**
   * Keep push token synced after auth changes (login after boot is common).
   */
  private setupAuthStateListener(): void {
    if (this.authStateSubscription) return;

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session?.user) return;
        if (!this.expoPushToken) return;

        logger.info(
          '[NotificationService] 🔐 Auth changed; syncing push token',
          {
            event,
            userId: session.user.id,
            timestamp: new Date().toISOString(),
          }
        );

        // Track SIGNED_IN event to ignore notification taps during login transition
        if (event === 'SIGNED_IN') {
          this.lastAuthChangeTime = Date.now();
          logger.info('[NotificationService] ✅ SIGNED_IN event tracked', {
            lastAuthChangeTime: new Date(this.lastAuthChangeTime).toISOString(),
            willIgnoreTapsFor: '2000ms',
          });
        }

        await this.savePushToken(this.expoPushToken);
      });

      this.authStateSubscription = subscription;
    } catch (e) {
      logger.error(
        '[NotificationService] Failed to setup auth state listener',
        e
      );
    }
  }

  /**
   * Get or create device identifier
   * Uses AsyncStorage to persist device ID across app sessions
   */
  private async getDeviceIdentifier(): Promise<string> {
    try {
      const storageKey = '@talkee_device_id';
      let deviceId = await AsyncStorage.getItem(storageKey);

      if (!deviceId) {
        // Generate a unique device identifier
        // Combine device info with a random component
        const deviceInfo = `${Platform.OS}-${Device.modelName || 'unknown'}-${
          Device.osName || 'unknown'
        }-${Device.osVersion || 'unknown'}`;
        const randomComponent = Math.random().toString(36).substring(2, 15);
        deviceId = `${deviceInfo}-${randomComponent}`;

        // Store for future use
        await AsyncStorage.setItem(storageKey, deviceId);
      }

      return deviceId;
    } catch (error) {
      logger.error('Error getting device identifier', error);
      // Fallback to a simple identifier
      return `${Platform.OS}-${Date.now()}`;
    }
  }

  /**
   * Get device name for display
   */
  private getDeviceName(): string {
    try {
      const modelName = Device.modelName || 'Unknown Device';
      const brand = Device.brand || '';
      const osName = Device.osName || Platform.OS;
      const osVersion = Device.osVersion || '';

      if (brand && brand !== modelName) {
        return `${brand} ${modelName} (${osName} ${osVersion})`;
      }
      return `${modelName} (${osName} ${osVersion})`;
    } catch (error) {
      return `${Platform.OS} Device`;
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
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return;
      }

      const deviceId = await this.getDeviceIdentifier();
      const deviceName = this.getDeviceName();
      const appVersion = Constants.expoConfig?.version || '1.0.0';

      // Check if this device already has a token (same device_id)
      const { data: existingDevices, error: fetchError } = await supabase
        .from('user_devices')
        .select('id, push_token, is_active')
        .eq('user_id', currentUser.id)
        .eq('device_id', deviceId)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        logger.error('Error fetching existing devices', fetchError);
      }

      // If same device has different token, mark old tokens as inactive
      if (existingDevices && existingDevices.length > 0) {
        const activeDevices = existingDevices.filter((d) => d.is_active);
        const hasDifferentToken = activeDevices.some(
          (d) => d.push_token !== token
        );

        if (hasDifferentToken) {
          // Mark old tokens for this device as inactive
          const oldTokenIds = activeDevices
            .filter((d) => d.push_token !== token)
            .map((d) => d.id);

          if (oldTokenIds.length > 0) {
            const { error: deactivateError } = await supabase
              .from('user_devices')
              .update({
                is_active: false,
                updated_at: new Date().toISOString(),
              })
              .in('id', oldTokenIds);

            if (deactivateError) {
              logger.error('Error deactivating old tokens', deactivateError);
            } else {
              logger.info('Deactivated old tokens for device', {
                deviceId,
                count: oldTokenIds.length,
              });
            }
          }
        }
      }

      // Upsert device token (update if exists, insert if new)
      // Unique constraint: (user_id, push_token) allows multiple devices per user
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

      if (upsertError) {
        logger.error('Error upserting push token', upsertError);
        // Don't throw - token saving is not critical for app functionality
      } else {
        logger.info('Push token saved successfully', {
          platform: Platform.OS,
          deviceId,
          userId: currentUser.id,
        });
      }
    } catch (error) {
      logger.error('Error saving push token', error);
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

      // Use cached current user to avoid extra query
      const userStart = Date.now();
      const currentUserId = await this.getCurrentUserId();
      logger.info('📬 User ID fetched', {
        duration: `${Date.now() - userStart}ms`,
      });

      if (!currentUserId) {
        logger.warn('📬 No user ID, returning empty');
        return [];
      }

      // Single optimized query: Get notifications with professional info in one go
      // No need for separate professional query - return empty professional field
      const queryStart = Date.now();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      logger.info('📬 Main query completed', {
        duration: `${Date.now() - queryStart}ms`,
        count: data?.length || 0,
      });

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

          // Add timeout for professional data fetch
          const professionalsPromise = Promise.race([
            supabase
              .from('professionals')
              .select('id, users!inner(id, name, avatar_url)')
              .in('id', Array.from(professionalIds)),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Professional fetch timeout')),
                5000
              )
            ),
          ]) as Promise<any>;

          const { data: professionalsData, error: professionalsError } =
            await professionalsPromise;

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
          logger.warn(
            'Failed to fetch professional data for notifications',
            error
          );
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
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch (error) {
      logger.error('Error getting current user ID', error);
      return null;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return 0;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (error) {
        logger.error('Error fetching unread count', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error in getUnreadCount', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        logger.error('Error marking notification as read', error);
        throw new Error(`Failed to mark as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Error in markAsRead', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (error) {
        logger.error('Error marking all as read', error);
        throw new Error(`Failed to mark all as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Error in markAllAsRead', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);

      if (error) {
        logger.error('Error deleting notification', error);
        throw new Error(`Failed to delete notification: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteNotification', error);
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) {
        logger.error('Error deleting all notifications', error);
        throw new Error(`Failed to delete all notifications: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteAllNotifications', error);
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
    try {
      if (Platform.OS === 'web') {
        return;
      }

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
    } catch (error) {
      logger.error('Error sending local notification', error);
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
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // TODO: Create notification_settings table if needed
      // For now, return default settings
      return {
        push_enabled: true,
        call_notifications: true,
        review_notifications: true,
        payment_notifications: true,
        message_notifications: true,
        promotional_notifications: false,
      };
    } catch (error) {
      logger.error('Error in getSettings', error);
      return {
        push_enabled: true,
        call_notifications: true,
        review_notifications: true,
        payment_notifications: true,
        message_notifications: true,
        promotional_notifications: false,
      };
    }
  }

  /**
   * Update notification settings
   * Note: notification_settings table doesn't exist in current schema
   */
  async updateSettings(
    settings: Partial<import('../types/database.types').NotificationSettings>
  ): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // TODO: Implement when notification_settings table is created
      return true;
    } catch (error) {
      logger.error('Error in updateSettings', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    callback: (notification: DbNotification) => void
  ): () => void {
    let subscription: any;

    (async () => {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return;
      }

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
            callback(payload.new as DbNotification);
          }
        )
        .subscribe();
    })();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }

  /**
   * Setup notification listeners
   */
  setupListeners(): void {
    if (Platform.OS === 'web') return;

    // Make idempotent (hot reload / remount safety)
    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
      this.notificationResponseSubscription = null;
    }

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
    if (Platform.OS === 'web') {
      return () => {};
    }

    this.notificationReceivedCallbacks.add(callback);

    if (!this.notificationReceivedSubscription) {
      this.notificationReceivedSubscription =
        Notifications.addNotificationReceivedListener((notification) => {
          const { title, body, data } = notification.request.content;
          const trigger = notification.request.trigger;
          const triggerType = (trigger as any)?.type;

          logger.info('[NotificationService] Notification received', {
            title,
            triggerType,
            isLocal: (data as any)?.is_local,
          });

          const payload = {
            title: title || '',
            body: body || '',
            data: data as Record<string, any>,
          };

          // If we receive an end/missed signal, clear any lingering call_request notification.
          const nType = (payload.data as any)?.type;
          if (nType === 'call_ended' || nType === 'call_missed') {
            void this.dismissIncomingCallNotifications({
              callId: (payload.data as any)?.call_id,
              callSid: (payload.data as any)?.call_sid,
            });
          }

          // Fan-out to all subscribers (IncomingCallHandler, screens, etc.)
          for (const cb of this.notificationReceivedCallbacks) {
            try {
              cb(payload);
            } catch (e) {
              logger.error(
                '[NotificationService] onNotificationReceived cb error',
                e
              );
            }
          }
        });
    }

    return () => {
      this.notificationReceivedCallbacks.delete(callback);
      if (this.notificationReceivedCallbacks.size === 0) {
        this.notificationReceivedSubscription?.remove();
        this.notificationReceivedSubscription = null;
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
    try {
      const notificationData: NotificationInsert = {
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        is_read: false,
      };

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating notification', error);
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      return notification as DbNotification;
    } catch (error) {
      logger.error('Error in createNotification', error);
      throw error;
    }
  }

  /**
   * Get user's active device tokens
   * Used for sending push notifications to all user devices
   */
  async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('push_token')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching user device tokens', error);
        return [];
      }

      return (data || []).map((device) => device.push_token);
    } catch (error) {
      logger.error('Error in getUserDeviceTokens', error);
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
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user devices', error);
        return [];
      }

      return (data || []) as Array<{
        id: string;
        push_token: string;
        platform: string;
        device_name: string | null;
        device_id: string | null;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
    } catch (error) {
      logger.error('Error in getUserDevices', error);
      return [];
    }
  }

  /**
   * Remove/Deactivate a device token
   */
  async removeDeviceToken(deviceId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', deviceId)
        .eq('user_id', currentUser.id);

      if (error) {
        logger.error('Error removing device token', error);
        throw new Error(`Failed to remove device: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Error in removeDeviceToken', error);
      throw error;
    }
  }

  /**
   * Clean up inactive device tokens (older than 30 days)
   */
  async cleanupInactiveTokens(): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('is_active', false)
        .lt('updated_at', thirtyDaysAgo.toISOString());

      if (error) {
        logger.error('Error cleaning up inactive tokens', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in cleanupInactiveTokens', error);
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
    channelId?: string
  ): Promise<boolean> {
    try {
      const { data: response, error } = await supabase.functions.invoke(
        'send-push',
        {
          body: {
            user_id: userId,
            title,
            body,
            data,
            channelId,
            sound: 'default',
            priority: 'high',
          },
        }
      );

      if (error) {
        logger.error('Error invoking send-push function', error);
        return false;
      }

      const acceptedCount = Number(response?.result?.success || 0);
      if (!response?.success || acceptedCount <= 0) {
        logger.warn(
          'Push notification not delivered (no active/valid devices?)',
          {
            response,
            acceptedCount,
          }
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in sendPushNotification', error);
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
    try {
      // Since our current send-push function handles one user_id at a time,
      // we'll iterate and send individual requests for now.
      // Ideally, the Edge Function should be updated to accept an array of user_ids for better performance.

      const promises = userIds.map((userId) =>
        this.sendPushNotification(userId, title, body, data)
      );

      await Promise.allSettled(promises);
      return true;
    } catch (error) {
      logger.error('Error in sendBatchPushNotifications', error);
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
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching notifications by type', error);
        return [];
      }

      return (data || []) as DbNotification[];
    } catch (error) {
      logger.error('Error in getNotificationsByType', error);
      return [];
    }
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  async clearOldNotifications(): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        logger.error('Error clearing old notifications', error);
        throw new Error(`Failed to clear old notifications: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Error in clearOldNotifications', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
