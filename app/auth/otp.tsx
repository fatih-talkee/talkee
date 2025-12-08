import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMounted } from '@/hooks/useIsMounted';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';

export default function VerifyPhoneScreen() {
  const { phone, name, context } = useLocalSearchParams();
  const cleanPhone = Array.isArray(phone) ? phone[0] : phone;
  const userName = Array.isArray(name) ? name[0] : name;
  const verifyContext = Array.isArray(context) ? context[0] : context;

  const { theme } = useTheme();
  const toast = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const isMountedRef = useIsMounted();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text.charAt(text.length - 1);
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((digit) => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const shakeInputs = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleVerify = async (verificationCode: string) => {
    if (!cleanPhone) {
      toast.error({
        title: 'Error',
        message: 'Phone number not found',
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ Verify OTP with Supabase
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: cleanPhone,
        token: verificationCode,
        type: 'sms',
      });

      if (verifyError) {
        console.error('OTP verification error:', verifyError);

        setError('Invalid verification code. Please try again.');
        setCode(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
        shakeInputs();

        toast.error({
          title: 'Verification Failed',
          message: verifyError.message || 'Invalid code',
        });

        setLoading(false);
        return;
      }

      if (data.session) {
        // ✅ Success! User is verified and logged in

        // Create user profile
        try {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', data.user?.id || '')
            .single();

          if (!existingProfile) {
            // Create profile with email from auth.users
            await supabase.from('users').insert({
              auth_id: data.user?.id || '',
              phone: cleanPhone,
              primary_email: data.user?.email || '', // Get email from auth
              name: userName || cleanPhone,
              role: 'user',
            });
          }
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail - user can update profile later
        }

        toast.success({
          title: 'Phone Verified!',
          message: 'Your account is now active',
        });

        setLoading(false);
        router.replace('/auth/setup-account');
      }
    } catch (error: any) {
      console.error('Unexpected verification error:', error);
      setError('An error occurred. Please try again.');
      setCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
      shakeInputs();

      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
      });

      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || !cleanPhone) return;

    setLoading(true);

    try {
      // ✅ Resend OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
      });

      if (error) {
        console.error('Resend error:', error);
        toast.error({
          title: 'Resend Failed',
          message: error.message || 'Failed to resend code',
        });
      } else {
        toast.success({
          title: 'Code Resent',
          message: 'A new verification code has been sent',
        });
        setCanResend(false);
        setResendTimer(60);
        setError('');
      }
    } catch (error: any) {
      console.error('Unexpected resend error:', error);
      toast.error({
        title: 'Error',
        message: 'Failed to resend code',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: string | string[] | undefined) => {
    if (!phoneNumber) return '';
    const phoneStr = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;
    if (!phoneStr || phoneStr.length < 4) return phoneStr;
    // Show last 4 digits: +90 *** *** 45 67
    const lastFour = phoneStr.slice(-4);
    return `+90 *** *** ${lastFour.substring(0, 2)} ${lastFour.substring(2)}`;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
        >
          <ArrowLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Check size={32} color={theme.colors.surface} strokeWidth={3} />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          {verifyContext === 'pending'
            ? 'Complete Verification'
            : 'Verify Your Phone'}
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {verifyContext === 'pending'
            ? "You're almost there! Enter the code to complete your registration"
            : "We've sent a 6-digit verification code to"}
        </Text>

        <Text style={[styles.phoneNumber, { color: theme.colors.primary }]}>
          {formatPhoneNumber(cleanPhone)}
        </Text>

        <Animated.View
          style={[
            styles.codeContainer,
            { transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: digit
                    ? theme.colors.primary
                    : theme.colors.border,
                  color: theme.colors.text,
                },
                error && styles.codeInputError,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        ) : null}

        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, { color: theme.colors.textMuted }]}>
            Didn't receive the code?
          </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResendCode}>
              <Text
                style={[styles.resendLink, { color: theme.colors.primary }]}
              >
                Resend Code
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={[styles.resendTimer, { color: theme.colors.textMuted }]}
            >
              Resend in {resendTimer}s
            </Text>
          )}
        </View>

        <Button
          title={loading ? 'Verifying...' : 'Verify & Continue'}
          onPress={() => handleVerify(code.join(''))}
          disabled={loading || code.some((digit) => !digit)}
          style={[
            styles.verifyButton,
            {
              backgroundColor: code.every((digit) => digit)
                ? theme.colors.primary
                : theme.colors.surface,
              opacity: code.every((digit) => digit) ? 1 : 0.5,
            },
          ]}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.changeNumberButton}
        >
          <Text
            style={[
              styles.changeNumberText,
              { color: theme.colors.textSecondary },
            ]}
          >
            Change Phone Number
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  phoneNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 48,
    letterSpacing: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  codeInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  resendLink: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  verifyButton: {
    width: '100%',
    marginBottom: 16,
  },
  changeNumberButton: {
    paddingVertical: 12,
  },
  changeNumberText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
});
