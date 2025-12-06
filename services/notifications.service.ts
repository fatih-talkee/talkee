import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type {
  Notification,
  NotificationInsert,
  NotificationType,
} from '../types/database.types';
import { NotificationBehavior } from 'expo-notifications';

// NotificationSettings is already in database.types.ts
export type { NotificationSettings } from '../types/database.types';

class NotificationsService {
  private expoPushToken: string | null = null;

  /**
   * Initialize notifications (request permissions and get token)
   */
  async initialize(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return null;
      }

      if (!Device.isDevice) {
        console.log('Notifications only work on physical devices');
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
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;

      // Configure notification behavior
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Save token to database
      await this.savePushToken(token);

      return token;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to database
   */
  private async savePushToken(token: string): Promise<void> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return;
      }

      // Note: user_devices table doesn't exist in current schema
      // You may need to create this table or store token differently
      await supabase.from('user_devices').upsert({
        user_id: currentUser.id,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      return (data || []) as Notification[];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
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
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
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
        console.error('Error marking notification as read:', error);
        throw new Error(`Failed to mark as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
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
        console.error('Error marking all as read:', error);
        throw new Error(`Failed to mark all as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
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
        console.error('Error deleting notification:', error);
        throw new Error(`Failed to delete notification: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
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
        console.error('Error deleting all notifications:', error);
        throw new Error(`Failed to delete all notifications: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAllNotifications:', error);
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
        console.log('Local notifications not supported on web');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
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
      console.error('Error in getSettings:', error);
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
      console.log('Settings would be updated:', settings);
      return true;
    } catch (error) {
      console.error('Error in updateSettings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    callback: (notification: Notification) => void
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
            callback(payload.new as Notification);
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

    // Handle notification received while app is foregrounded
    Notifications.setNotificationHandler({
      handleNotification: async (): Promise<NotificationBehavior> => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Handle navigation based on notification type
      console.log('Notification tapped:', data);
      // TODO: Implement navigation logic
    });
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
  ): Promise<Notification | null> {
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
        console.error('Error creating notification:', error);
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      return notification as Notification;
    } catch (error) {
      console.error('Error in createNotification:', error);
      throw error;
    }
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(
    type: NotificationType,
    limit: number = 20
  ): Promise<Notification[]> {
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
        console.error('Error fetching notifications by type:', error);
        return [];
      }

      return (data || []) as Notification[];
    } catch (error) {
      console.error('Error in getNotificationsByType:', error);
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
        console.error('Error clearing old notifications:', error);
        throw new Error(`Failed to clear old notifications: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in clearOldNotifications:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
