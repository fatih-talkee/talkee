import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type OtpContext = 'register' | 'forgot';

export default function OtpScreen() {
  const { context, to } = useLocalSearchParams<{
    context?: OtpContext;
    to?: string;
  }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const onVerify = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Mock: route based on context
      if (context === 'register') {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    }, 800);
  };

  const onResend = () => {
    if (seconds > 0) return;
    // Mock resend
    setSeconds(60);
  };

  const label =
    context === 'register' ? 'Verify your account' : 'Verify to reset password';
  const helper = to
    ? `We sent a 6-digit code to ${to}`
    : 'Enter the 6-digit code we sent you';

  return (
    <LinearGradient colors={['#2e2461', '#d60f83']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/talkee_logoF.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.subtitle}>{helper}</Text>
          </View>

          <View style={styles.form}>
            <Input
              variant="light"
              label="Verification Code"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />

            <Button
              title={loading ? 'Verifying...' : 'Verify'}
              onPress={onVerify}
              disabled={loading || code.length < 6}
              style={styles.verifyButton}
            />

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't get the code?</Text>
              <TouchableOpacity disabled={seconds > 0} onPress={onResend}>
                <Text
                  style={[
                    styles.resendLink,
                    seconds > 0 && styles.resendLinkDisabled,
                  ]}
                >
                  Resend{seconds > 0 ? ` (${seconds}s)` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 40, marginBottom: 32, alignItems: 'center' },
  logoImage: { width: 180, height: 60, marginBottom: 24 },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#E5E5E5',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: { flex: 1 },
  input: { backgroundColor: 'transparent', color: '#FFFFFF' },
  verifyButton: { marginTop: 12 },
  resendRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  resendText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#FFFFFF' },
  resendLink: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: { opacity: 0.6, textDecorationLine: 'none' },
});
