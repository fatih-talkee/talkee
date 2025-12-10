/**
 * Forgot Password Screen - PHONE VERSION
 * Send OTP to phone for password reset
 */

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
import { Phone } from 'lucide-react-native';
import MaskInput from 'react-native-mask-input';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';

// Turkish phone mask: +90 XXX XXX XX XX
const PHONE_MASK = [
  '+',
  '9',
  '0',
  ' ',
  /\d/,
  /\d/,
  /\d/,
  ' ',
  /\d/,
  /\d/,
  /\d/,
  ' ',
  /\d/,
  /\d/,
  ' ',
  /\d/,
  /\d/,
];

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return cleaned.length >= 13; // +90 + 10 digits
  };

  const handleResetPassword = async () => {
    if (!phone.trim() || !validatePhone(phone)) {
      toast.error({
        title: 'Invalid Phone',
        message: 'Please enter a valid phone number',
      });
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\s/g, '');
      
      // ✅ Send OTP for password reset
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
      });

      if (error) {
        toast.error({
          title: 'Reset Failed',
          message: error.message || 'Failed to send verification code',
        });
        return;
      }

      setSent(true);
      toast.success({
        title: 'Code Sent',
        message: 'Check your phone for the verification code',
      });
    } catch (error: any) {
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <LinearGradient
        colors={['#2e2461', theme.colors.brandPink]}
        style={styles.container}
      >
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
            </View>

            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Phone size={48} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>Check Your Phone</Text>
              <Text style={styles.successText}>
                We've sent a verification code to {phone}. Enter the code to reset your password.
              </Text>

              <Button
                title="Enter Code"
                onPress={() => {
                  const cleanPhone = phone.replace(/\s/g, '');
                  router.push(`/auth/otp?phone=${encodeURIComponent(cleanPhone)}&reset=true`);
                }}
                style={styles.backToLoginButton}
              />

              <Button
                title="Resend Code"
                onPress={() => {
                  setSent(false);
                  handleResetPassword();
                }}
                style={styles.resendButton}
                variant="outline"
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2e2461', theme.colors.brandPink]}
      style={styles.container}
    >
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your phone number and we'll send you a verification code
            </Text>
          </View>

          <View style={styles.form}>
            {/* Phone Number with Mask */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View
                style={[
                  styles.phoneInputWrapper,
                  phoneFocused && styles.phoneInputWrapperFocused,
                ]}
              >
                <Phone size={20} color="#9E9E9E" style={styles.phoneIcon} />
                <MaskInput
                  value={phone}
                  onChangeText={(masked, unmasked) => {
                    setPhone(masked);
                  }}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  mask={PHONE_MASK}
                  placeholder="+90 555 123 45 67"
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <Button
              title={loading ? 'Sending...' : 'Send Verification Code'}
              onPress={handleResetPassword}
              disabled={loading}
              style={styles.resetButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Remember your password?{' '}
              <Link href="/auth/login" asChild>
                <Text style={styles.footerLink}>Sign In</Text>
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
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
  },
  phoneInputWrapperFocused: {
    borderColor: '#2e2461',
  },
  phoneIcon: {
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    outlineStyle: 'none',
  },
  resetButton: {
    marginTop: 8,
    backgroundColor: '#2e2461',
  },
  footer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  footerLink: {
    color: '#2e2461',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    letterSpacing: 0.2,
    fontWeight: 'bold',
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
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#E5E5E5',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  resendButton: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
  },
  backToLoginButton: {
    width: '100%',
    backgroundColor: '#2e2461',
  },
});
