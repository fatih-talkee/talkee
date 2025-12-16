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
import { ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react-native';

export default function TestPushScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useProfile();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

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
      console.log('🧪 [TEST-PUSH] Starting push notification test...', {
        user_id: user.id,
      });

      // First, check device tokens
      const { data: devices, error: devicesError } = await supabase
        .from('user_devices')
        .select('push_token, platform, is_active, device_name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (devicesError) {
        throw new Error(`Failed to fetch devices: ${devicesError.message}`);
      }

      console.log('📱 [TEST-PUSH] Device tokens:', {
        count: devices?.length || 0,
        devices: devices?.map((d) => ({
          platform: d.platform,
          device_name: d.device_name,
          has_token: !!d.push_token,
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

      // Call send-push function via Supabase client (uses service role internally)
      console.log('📤 [TEST-PUSH] Calling send-push function...', {
        url: `${supabaseUrl}/functions/v1/send-push`,
        user_id: user.id,
      });

      // Get session for auth header
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Try direct fetch first to see raw response
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          user_id: user.id,
          title: '🧪 Test Push Notification',
          body: 'This is a test push notification from the test screen!',
          data: {
            type: 'test',
            test_id: Date.now().toString(),
          },
          sound: 'default',
          priority: 'high',
        }),
      });

      const responseText = await response.text();
      console.log('📥 [TEST-PUSH] Raw fetch response:', {
        status: response.status,
        statusText: response.statusText,
        response_text: responseText,
        response_length: responseText.length,
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
              name: error.name,
              stack: error.stack,
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
      });

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo={false}
        leftComponent={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
        title="Test Push Notification"
      />

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
            Debug Information
          </Text>
          <Text
            style={[styles.debugText, { color: theme.colors.textSecondary }]}
          >
            Check console logs for detailed debug information. Look for logs
            starting with:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={[styles.codeText, { color: theme.colors.text }]}>
              🧪 [TEST-PUSH]
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
    fontFamily: 'monospace',
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
});
