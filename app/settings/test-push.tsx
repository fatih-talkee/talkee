import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/lib/toastService';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { notificationsService } from '@/services/notifications.service';
import * as Notifications from 'expo-notifications';
import { Platform, AppState, Linking } from 'react-native';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';

export default function TestPushScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useProfile();
  const [loading, setLoading] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any[] | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [notificationChannelStatus, setNotificationChannelStatus] = useState<
    string | null
  >(null);
  const [appState, setAppState] = useState<string>(AppState.currentState);

  const loadDeviceInfo = async () => {
    if (!user?.id) return;
    try {
      const { data: devices } = await supabase
        .from('user_devices')
        .select(
          'push_token, platform, is_active, device_name, device_id, created_at, updated_at'
        )
        .eq('user_id', user.id)
        .eq('is_active', true);
      setDeviceInfo(devices || []);
    } catch (error) {
      console.error('Error loading device info:', error);
    }
  };

  React.useEffect(() => {
    loadDeviceInfo();
    checkPermissions();
    checkNotificationChannel();

    // Monitor app state
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id]);

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setPermissionStatus('Web platform - notifications not supported');
      return;
    }
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('Error checking permissions');
    }
  };

  const checkNotificationChannel = async () => {
    if (Platform.OS !== 'android') {
      setNotificationChannelStatus('iOS - channels not applicable');
      return;
    }
    try {
      const channels = await Notifications.getNotificationChannelsAsync();
      const defaultChannel = channels.find((ch) => ch.id === 'default');
      if (defaultChannel) {
        setNotificationChannelStatus(
          `Configured (importance: ${defaultChannel.importance})`
        );
      } else {
        setNotificationChannelStatus('Not configured - using system default');
      }
    } catch (error) {
      console.error('Error checking notification channel:', error);
      setNotificationChannelStatus('Error checking channel');
    }
  };

  const testPushNotification = async () => {
    if (!user?.id) {
      toast.error({
        title: 'Error',
        message: 'User not found',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 [TEST-PUSH] ==========================================');
      console.log('🧪 [TEST-PUSH] Starting push notification test...', {
        user_id: user.id,
        timestamp: new Date().toISOString(),
      });

      // First, check device tokens
      const { data: devices, error: devicesError } = await supabase
        .from('user_devices')
        .select(
          'push_token, platform, is_active, device_name, device_id, created_at, updated_at'
        )
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Update device info state
      setDeviceInfo(devices || []);

      if (devicesError) {
        throw new Error(`Failed to fetch devices: ${devicesError.message}`);
      }

      console.log('📱 [TEST-PUSH] Device tokens fetched:', {
        count: devices?.length || 0,
        devices: devices?.map((d) => ({
          platform: d.platform,
          device_name: d.device_name,
          device_id: d.device_id,
          has_token: !!d.push_token,
          token_length: d.push_token?.length || 0,
          token_preview: d.push_token
            ? d.push_token.substring(0, 40) + '...'
            : 'NO TOKEN',
          token_valid_format:
            d.push_token?.startsWith('ExponentPushToken[') ||
            d.push_token?.startsWith('ExpoPushToken['),
        })),
      });

      if (!devices || devices.length === 0) {
        throw new Error(
          'No active device tokens found. Make sure notifications are initialized.'
        );
      }

      // Get Supabase URL and anon key
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY not configured');
      }

      console.log('🔐 [TEST-PUSH] Environment check:', {
        has_supabase_url: !!supabaseUrl,
        supabase_url: supabaseUrl,
        has_anon_key: !!supabaseAnonKey,
        anon_key_preview: supabaseAnonKey?.substring(0, 20) + '...',
      });

      // Get session for auth header
      console.log('🔑 [TEST-PUSH] Getting session...');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('✅ [TEST-PUSH] Session obtained:', {
        has_session: !!session,
        user_id: session.user?.id,
        access_token_preview: session.access_token?.substring(0, 30) + '...',
      });

      // Prepare request payload
      const requestPayload = {
        user_id: user.id,
        title: '🧪 Test Push Notification',
        body: 'This is a test push notification from the test screen!',
        data: {
          type: 'test',
          test_id: Date.now().toString(),
          timestamp: new Date().toISOString(),
        },
        sound: 'default',
        priority: 'high' as const,
      };

      console.log('📤 [TEST-PUSH] Preparing request:', {
        url: `${supabaseUrl}/functions/v1/send-push`,
        method: 'POST',
        payload: requestPayload,
        payload_stringified: JSON.stringify(requestPayload, null, 2),
      });

      // Try direct fetch first to see raw response
      const requestStartTime = Date.now();
      console.log('⏱️ [TEST-PUSH] Sending request to edge function...');
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(requestPayload),
      });
      const requestDuration = Date.now() - requestStartTime;
      console.log(`⏱️ [TEST-PUSH] Request completed in ${requestDuration}ms`);

      console.log('📥 [TEST-PUSH] Response received:', {
        status: response.status,
        status_text: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
      });

      const responseText = await response.text();
      console.log('📥 [TEST-PUSH] Raw response body:', {
        response_length: responseText.length,
        response_preview: responseText.substring(0, 500) + '...',
        full_response: responseText,
      });

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [TEST-PUSH] Failed to parse response:', parseError);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 200)}`
        );
      }

      const error = !response.ok
        ? { message: data?.error || 'Request failed' }
        : null;

      console.log('📥 [TEST-PUSH] Raw response:', {
        has_data: !!data,
        has_error: !!error,
        data_type: typeof data,
        data_keys: data ? Object.keys(data) : [],
        data_stringified: JSON.stringify(data, null, 2),
        error: error
          ? {
              message: error.message,
            }
          : null,
      });

      if (error) {
        throw new Error(`Push failed: ${error.message}`);
      }

      console.log('📥 [TEST-PUSH] Response received:', {
        success: data?.success,
        result: data?.result,
        error: data?.error,
        full_response: data,
        result_type: typeof data?.result,
        result_keys: data?.result ? Object.keys(data.result) : [],
      });

      // Check if push was actually sent
      const pushResult = data?.result;
      const successCount = pushResult?.success || 0;
      const failedCount = pushResult?.failed || 0;
      const errors = pushResult?.errors || [];

      console.log('📊 [TEST-PUSH] Push result details:', {
        success_count: successCount,
        failed_count: failedCount,
        errors: errors,
        total_devices: devices?.length || 0,
        push_result: pushResult,
        full_response_data: data,
      });

      // Additional validation: check if Expo actually accepted the push
      if (successCount > 0) {
        console.log('✅ [TEST-PUSH] Expo API accepted push notification(s)');
        console.log(
          '💡 [TEST-PUSH] If notification does not appear on device:'
        );
        console.log('  1. Check device notification settings');
        console.log('  2. Check if app has notification permissions');
        console.log('  3. Check if device is online and can receive push');
        console.log('  4. Check Expo push service status');
        console.log('  5. Verify token is still valid in database');
      } else {
        console.error(
          '❌ [TEST-PUSH] No push notifications were accepted by Expo API'
        );
        console.error('💡 [TEST-PUSH] Possible reasons:');
        console.error('  - Invalid push tokens');
        console.error('  - Device not registered with Expo');
        console.error('  - Token expired or revoked');
        console.error('  - Expo API error (check errors array)');
      }

      console.log('🧪 [TEST-PUSH] ==========================================');

      const isSuccess = data?.success !== false && successCount > 0;

      setResult({
        success: isSuccess,
        message:
          successCount > 0
            ? `✅ Push sent to ${successCount} device(s)! ${
                failedCount > 0 ? `(${failedCount} failed)` : ''
              }`
            : failedCount > 0
            ? `❌ Push failed for ${failedCount} device(s). ${
                errors.length > 0 ? `Errors: ${errors.join(', ')}` : ''
              }`
            : '⚠️ No devices received push notification',
        details: {
          ...data,
          success_count: successCount,
          failed_count: failedCount,
          errors: errors,
          device_count: devices?.length || 0,
        },
      });

      if (isSuccess) {
        toast.success({
          title: 'Success',
          message: `Push sent to ${successCount} device(s)!`,
        });
      } else {
        toast.error({
          title: 'Failed',
          message:
            failedCount > 0
              ? `Failed for ${failedCount} device(s). Check details.`
              : 'No devices received push. Check Supabase logs.',
        });
      }
    } catch (error: any) {
      console.error('❌ [TEST-PUSH] Error:', error);
      setResult({
        success: false,
        message: error.message || 'Unknown error',
        details: error,
      });
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to send push notification',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshPushToken = async () => {
    if (!user?.id) {
      toast.error({
        title: 'Error',
        message: 'User not found',
      });
      return;
    }

    setRefreshingToken(true);
    setResult(null);

    try {
      console.log('🔄 [REFRESH-TOKEN] Refreshing push token...', {
        user_id: user.id,
      });

      // Re-initialize notifications to get a fresh token
      const token = await notificationsService.initialize();

      if (token) {
        console.log('✅ [REFRESH-TOKEN] Token refreshed successfully', {
          token: token.substring(0, 30) + '...',
        });
        setResult({
          success: true,
          message: 'Push token refreshed successfully!',
          details: {
            token: token.substring(0, 30) + '...',
          },
        });
        toast.success({
          title: 'Success',
          message: 'Push token refreshed! Try sending a test push now.',
        });
      } else {
        throw new Error('Failed to get push token. Check permissions.');
      }
    } catch (error: any) {
      console.error('❌ [REFRESH-TOKEN] Error:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to refresh push token',
        details: error,
      });
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to refresh push token',
      });
    } finally {
      setRefreshingToken(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={false} title="Test Push Notification" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Push Notification Test
          </Text>
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            This will send a test push notification to your device. Make sure
            notifications are enabled and the app has permission.
          </Text>

          <View style={styles.infoSection}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              User ID:
            </Text>
            <Text
              style={[styles.infoValue, { color: theme.colors.textSecondary }]}
            >
              {user?.id || 'Not available'}
            </Text>
          </View>

          {/* Permission Status */}
          <View style={styles.infoSection}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              Notification Permissions:
            </Text>
            <View style={styles.statusRow}>
              {permissionStatus === 'granted' ? (
                <CheckCircle size={16} color={theme.colors.success} />
              ) : (
                <AlertCircle size={16} color={theme.colors.error} />
              )}
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      permissionStatus === 'granted'
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {permissionStatus || 'Checking...'}
              </Text>
            </View>
            {permissionStatus !== 'granted' && (
              <Text
                style={[styles.statusHint, { color: theme.colors.textMuted }]}
              >
                Go to Settings → Apps → Talkee → Notifications → Enable
              </Text>
            )}
          </View>

          {/* Android Notification Channel */}
          {Platform.OS === 'android' && (
            <View style={styles.infoSection}>
              <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
                Android Notification Channel:
              </Text>
              <Text
                style={[
                  styles.statusText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {notificationChannelStatus || 'Checking...'}
              </Text>
            </View>
          )}

          {/* App State */}
          <View style={styles.infoSection}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              App State:
            </Text>
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    appState === 'active'
                      ? theme.colors.warning
                      : theme.colors.success,
                },
              ]}
            >
              {appState === 'active'
                ? '⚠️ Foreground - Try backgrounding the app'
                : appState === 'background'
                ? '✅ Background - Notifications should appear'
                : appState}
            </Text>
            {appState === 'active' && (
              <Text
                style={[styles.statusHint, { color: theme.colors.textMuted }]}
              >
                Tip: Press Home button to background the app, then send push
              </Text>
            )}
          </View>

          {/* Device Info Section */}
          {deviceInfo && deviceInfo.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
                Active Devices ({deviceInfo.length}):
              </Text>
              {deviceInfo.map((device, index) => (
                <View key={index} style={styles.deviceItem}>
                  <Text
                    style={[
                      styles.deviceText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {device.device_name || device.platform || 'Unknown Device'}
                  </Text>
                  <Text
                    style={[
                      styles.deviceToken,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Token:{' '}
                    {device.push_token?.substring(0, 40) + '...' || 'NO TOKEN'}
                  </Text>
                  <Text
                    style={[
                      styles.devicePlatform,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Platform: {device.platform || 'Unknown'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.testButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: loading ? 0.6 : 1,
              },
            ]}
            onPress={testPushNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Send size={20} color="#ffffff" />
                <Text style={styles.testButtonText}>Send Test Push</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.refreshButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: refreshingToken ? 0.6 : 1,
              },
            ]}
            onPress={refreshPushToken}
            disabled={refreshingToken}
          >
            {refreshingToken ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <RefreshCw size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.refreshButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Refresh Push Token
                </Text>
              </>
            )}
          </TouchableOpacity>

          {result && (
            <View
              style={[
                styles.resultContainer,
                {
                  backgroundColor: result.success
                    ? theme.colors.success + '20'
                    : theme.colors.error + '20',
                  borderColor: result.success
                    ? theme.colors.success
                    : theme.colors.error,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                {result.success ? (
                  <CheckCircle size={24} color={theme.colors.success} />
                ) : (
                  <XCircle size={24} color={theme.colors.error} />
                )}
                <Text
                  style={[
                    styles.resultTitle,
                    {
                      color: result.success
                        ? theme.colors.success
                        : theme.colors.error,
                    },
                  ]}
                >
                  {result.success ? 'Success' : 'Failed'}
                </Text>
              </View>
              <Text
                style={[styles.resultMessage, { color: theme.colors.text }]}
              >
                {result.message}
              </Text>
              {result.details && (
                <View style={styles.detailsContainer}>
                  <Text
                    style={[
                      styles.detailsLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Details:
                  </Text>
                  <Text
                    style={[
                      styles.detailsText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📋 Logları Nasıl Görüntüleyebilirsiniz?
          </Text>

          <View style={styles.logSection}>
            <Text style={[styles.logTitle, { color: theme.colors.text }]}>
              1. Metro Bundler Terminali
            </Text>
            <Text
              style={[styles.logText, { color: theme.colors.textSecondary }]}
            >
              Metro bundler terminalinde (npx expo start) loglar otomatik
              görünür. Şu prefix'lerle başlayan logları arayın:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={[styles.codeText, { color: theme.colors.text }]}>
                🧪 [TEST-PUSH]{'\n'}
                📤 [TEST-PUSH]{'\n'}
                📥 [TEST-PUSH]
              </Text>
            </View>
          </View>

          <View style={styles.logSection}>
            <Text style={[styles.logTitle, { color: theme.colors.text }]}>
              2. Android Logcat (Terminal)
            </Text>
            <Text
              style={[styles.logText, { color: theme.colors.textSecondary }]}
            >
              Android cihazınızdan logları görmek için terminalde şu komutu
              çalıştırın:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={[styles.codeText, { color: theme.colors.text }]}>
                adb logcat *:S ReactNativeJS:V | grep -i "test-push"
              </Text>
            </View>
          </View>

          <View style={styles.logSection}>
            <Text style={[styles.logTitle, { color: theme.colors.text }]}>
              3. Supabase Dashboard (Edge Function Logları)
            </Text>
            <Text
              style={[styles.logText, { color: theme.colors.textSecondary }]}
            >
              Supabase Dashboard → Edge Functions → send-push → Logs
              {'\n'}
              Şu prefix'lerle başlayan logları arayın:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={[styles.codeText, { color: theme.colors.text }]}>
                📤 [SEND-PUSH]{'\n'}
                📥 [SEND-PUSH]{'\n'}
                🎫 [SEND-PUSH]
              </Text>
            </View>
          </View>

          <View style={styles.logSection}>
            <Text style={[styles.logTitle, { color: theme.colors.text }]}>
              🔍 Troubleshooting
            </Text>
            <Text
              style={[styles.logText, { color: theme.colors.textSecondary }]}
            >
              If Expo API accepts push (success: 1) but notification doesn't
              appear:
            </Text>
            <View style={styles.troubleshootList}>
              <Text
                style={[
                  styles.troubleshootItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                1. Background the app (press Home button) before sending push
              </Text>
              <Text
                style={[
                  styles.troubleshootItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                2. Wait 10-30 seconds for notification to arrive
              </Text>
              <Text
                style={[
                  styles.troubleshootItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                3. Check device settings: Settings → Apps → Talkee →
                Notifications
              </Text>
              <Text
                style={[
                  styles.troubleshootItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                4. Try Expo Push Tool: https://expo.dev/notifications
              </Text>
              <Text
                style={[
                  styles.troubleshootItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                5. Verify token format in database matches
                ExponentPushToken[...]
              </Text>
            </View>
          </View>

          <View style={styles.logSection}>
            <Text style={[styles.logTitle, { color: theme.colors.text }]}>
              💡 İpucu
            </Text>
            <Text
              style={[styles.logText, { color: theme.colors.textSecondary }]}
            >
              Detaylı rehber için: docs/VIEW_TEST_PUSH_LOGS.md dosyasına bakın
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
  },
  refreshButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  resultMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailsLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  logSection: {
    marginBottom: 20,
  },
  logTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  logText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    lineHeight: 20,
  },
  deviceItem: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  deviceText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  deviceToken: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  devicePlatform: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  statusHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    fontStyle: 'italic',
  },
  troubleshootList: {
    marginTop: 8,
    paddingLeft: 16,
  },
  troubleshootItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    lineHeight: 20,
  },
});
