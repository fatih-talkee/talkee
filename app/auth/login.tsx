/**
 * Login Screen - PHONE + PASSWORD (FINAL VERSION)
 * Direct phone authentication without email lookup
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { signInWithGoogle } from '@/utils/GoogleAuth';
import { LinearGradient } from 'expo-linear-gradient';
import MaskInput from 'react-native-mask-input';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toastService';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

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

export default function LoginScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return cleaned.length >= 13; // +90 + 10 digits
  };

  const handleLogin = async () => {
    // Validation
    if (!phone.trim()) {
      toast.error({
        title: 'Phone Required',
        message: 'Please enter your phone number',
      });
      return;
    }

    if (!validatePhone(phone)) {
      toast.error({
        title: 'Invalid Phone',
        message: 'Please enter a valid phone number',
      });
      return;
    }

    if (!password) {
      toast.error({
        title: 'Password Required',
        message: 'Please enter your password',
      });
      return;
    }

    if (password.length < 6) {
      toast.error({
        title: 'Invalid Password',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    setLoading(true);
    setPendingVerification(false);

    try {
      const cleanPhone = phone.replace(/\s/g, '');

      // ✅ Direct phone + password login (Supabase handles phone auth)
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: cleanPhone,
        password,
      });

      if (error) {
        // Check if phone not confirmed
        if (
          error.message.includes('not confirmed') ||
          error.message.includes('Phone not confirmed')
        ) {
          setPendingVerification(true);
          toast.error({
            title: 'Phone Not Verified',
            message: 'Please verify your phone number first',
          });
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error({
            title: 'Login Failed',
            message: 'Invalid phone or password. Please try again.',
          });
        } else {
          toast.error({
            title: 'Login Failed',
            message: error.message || 'An error occurred during login',
          });
        }
        return;
      }

      if (data.session) {
        toast.success({
          title: 'Welcome Back!',
          message: 'Login successful',
        });

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!phone.trim() || !validatePhone(phone)) {
      toast.error({
        title: 'Invalid Phone',
        message: 'Please enter your phone number first',
      });
      return;
    }

    setResendLoading(true);

    try {
      const cleanPhone = phone.replace(/\s/g, '');

      // Resend OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
      });

      if (error) {
        toast.error({
          title: 'Resend Failed',
          message: error.message || 'Failed to resend code',
        });
      } else {
        toast.success({
          title: 'Code Sent',
          message: 'A new verification code has been sent to your phone',
        });

        // Navigate to OTP
        router.push(
          `/auth/otp?phone=${encodeURIComponent(cleanPhone)}&context=resend`
        );
      }
    } catch (error: any) {
      toast.error({
        title: 'Error',
        message: 'Failed to resend code',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: 'google' | 'facebook' | 'linkedin'
  ) => {
    setSocialLoading(provider);

    try {
      if (provider === 'google') {
        // Use modal presentation
        try {
          const result = await signInWithGoogle();

          if (result.success && result.session) {
            // Session is established, now verify user profile exists
            // If profile doesn't exist, callback handler will create it
            // Don't navigate here - let callback handler or auth state change handle navigation
            // Don't show toast here - callback handler will show appropriate message
            const { data: userProfile } = await supabase
              .from('users')
              .select('id')
              .eq('auth_id', result.session.user.id)
              .single();

            if (!userProfile) {
              // Profile doesn't exist yet - callback handler will create it
              // Show loading message, callback handler will handle navigation and toast
              toast.show({
                type: 'info',
                title: 'Setting up your account...',
                message: 'Please wait',
              });
            }
            // If userProfile exists, callback handler will show toast and handle navigation
          } else if (result.cancelled) {
            toast.info({
              title: 'Cancelled',
              message: 'Google sign-in was cancelled',
            });
          } else if (result.error) {
            toast.error({
              title: 'Login Failed',
              message: result.error,
            });
          } else if (result.success) {
            // Success but needs callback handler - browser is opening, don't show error
            // The callback handler will process the authentication
            // No toast needed here - browser will show Google's UI
          }
        } catch (googleError: any) {
          // Catch any unhandled errors from signInWithGoogle
          console.error('Google sign-in error:', googleError);
          toast.error({
            title: 'Login Failed',
            message: googleError?.message || 'An unexpected error occurred',
          });
        }
      } else {
        // Facebook & LinkedIn - existing flow
        const redirectUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : 'talkee://auth/callback';

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error(`${provider} error:`, error);
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <LinearGradient
      colors={['#2e2461', theme.colors.brandPink]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/talkee_logoF.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Form */}
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
                      setPendingVerification(false);
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

              {/* Password Input */}
              <Input
                variant="light"
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                leftIcon={<Lock size={20} color="#9E9E9E" />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#9E9E9E" />
                    ) : (
                      <Eye size={20} color="#9E9E9E" />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Forgot Password Link */}
              <View style={styles.forgotPasswordContainer}>
                <Link href="/auth/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text style={styles.forgotPasswordText}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Pending Verification Card */}
              {pendingVerification && (
                <View style={styles.verificationCard}>
                  <View style={styles.verificationHeader}>
                    <AlertCircle size={20} color="#f59e0b" />
                    <Text style={styles.verificationTitle}>
                      Pending Verification
                    </Text>
                  </View>
                  <Text style={styles.verificationText}>
                    Your phone number hasn't been verified yet. Please verify to
                    continue.
                  </Text>
                  <Button
                    title={resendLoading ? 'Sending...' : 'Resend Code'}
                    onPress={handleResendCode}
                    disabled={resendLoading}
                    style={styles.resendButton}
                    variant="outline"
                  />
                </View>
              )}

              {/* Login Button */}
              <Button
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginButton}
              />

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={() => handleSocialLogin('google')}
                  disabled={!!socialLoading}
                >
                  <View style={styles.socialButtonContent}>
                    <View style={styles.googleIcon}>
                      <Text style={styles.googleIconText}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>
                      {socialLoading === 'google'
                        ? 'Connecting...'
                        : 'Continue with Google'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.facebookButton]}
                  onPress={() => handleSocialLogin('facebook')}
                  disabled={!!socialLoading}
                >
                  <View style={styles.socialButtonContent}>
                    <View style={styles.facebookIcon}>
                      <Text style={styles.facebookIconText}>f</Text>
                    </View>
                    <Text style={styles.facebookButtonText}>
                      {socialLoading === 'facebook'
                        ? 'Connecting...'
                        : 'Continue with Facebook'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.linkedinButton]}
                  onPress={() => handleSocialLogin('linkedin')}
                  disabled={!!socialLoading}
                >
                  <View style={styles.socialButtonContent}>
                    <View style={styles.linkedinIcon}>
                      <Text style={styles.linkedinIconText}>in</Text>
                    </View>
                    <Text style={styles.linkedinButtonText}>
                      {socialLoading === 'linkedin'
                        ? 'Connecting...'
                        : 'Continue with LinkedIn'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Link href="/auth/register" asChild>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </Link>
              </Text>
            </View>
          </ScrollView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 60,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
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
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  verificationCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#f59e0b',
  },
  verificationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 20,
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderColor: '#f59e0b',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#2e2461',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
  },
  socialButtons: {
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIconText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#000000',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  facebookIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  facebookIconText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1877F2',
  },
  facebookButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  linkedinButton: {
    backgroundColor: '#0077B5',
    borderColor: '#0077B5',
  },
  linkedinIcon: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkedinIconText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#0077B5',
  },
  linkedinButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 24,
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
});
