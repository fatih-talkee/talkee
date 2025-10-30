import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useIsMounted } from '@/hooks/useIsMounted';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isMountedRef = useIsMounted();

  const handleResetPassword = async () => {
    setLoading(true);
    // Mock reset delay
    setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        const to = encodeURIComponent(email || '');
        router.push(`/auth/otp?context=forgot&to=${to}`);
      }
    }, 1500);
  };

  if (sent) {
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
              <Text style={styles.titleLight}>Reset Password</Text>
              <Text style={styles.subtitleLight}>
                Enter your email address and we'll send you a link to reset your
                password
              </Text>
            </View>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Mail size={48} color="#10b981" />
              </View>
              <Text style={styles.successTitleLight}>Check Your Email</Text>
              <Text style={styles.successTextLight}>
                We've sent a password reset link to {email}. Please check your
                inbox and follow the instructions to reset your password.
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => router.push('/auth/login')}
                style={styles.backToLoginButton}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
            <Text style={styles.titleLight}>Reset Password</Text>
            <Text style={styles.subtitleLight}>
              Enter your email address and we'll send you a link to reset your
              password
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              variant="light"
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color="#9E9E9E" />}
            />

            <Button
              title={loading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleResetPassword}
              disabled={loading || !email}
              style={styles.resetButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTextLight}>
              Remember your password?{' '}
              <Link href="/auth/login" asChild>
                <Text style={styles.footerLinkLight}>Sign In</Text>
              </Link>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 60,
    marginBottom: 24,
  },
  titleLight: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitleLight: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputLight: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  resetButton: {
    marginTop: 8,
  },
  footer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerTextLight: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  footerLinkLight: {
    color: '#2e2461',
    fontFamily: 'Inter-Medium',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitleLight: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  successTextLight: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#E5E5E5',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backToLoginButton: {
    width: '100%',
  },
});
