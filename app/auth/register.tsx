/**
 * Register Screen - WITH EMAIL (FINAL VERSION)
 * Email + Phone + Password registration with SMS OTP
 * + Smart theme and language defaults
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
  ScrollView,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskInput from 'react-native-mask-input';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toastService';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { UserPreferencesService } from '@/services/supabase/userPreferences.service';

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

export default function RegisterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Validation functions
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return cleaned.length >= 13; // +90 + 10 digits
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    // Validation
    if (!name.trim() || name.trim().length < 2) {
      toast.error({
        title: 'Invalid Name',
        message: 'Please enter your full name (min 2 characters)',
      });
      return;
    }

    if (!phone.trim() || !validatePhone(phone)) {
      toast.error({
        title: 'Invalid Phone',
        message: 'Please enter a valid phone number',
      });
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      toast.error({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
      });
      return;
    }

    if (!password || password.length < 6) {
      toast.error({
        title: 'Weak Password',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error({
        title: "Passwords Don't Match",
        message: 'Please make sure your passwords match',
      });
      return;
    }

    setLoading(true);

    try {
      // Clean phone and email
      const cleanPhone = phone.replace(/\s/g, '');
      const cleanEmail = email.trim().toLowerCase();

      // ✅ Sign up with phone + email + password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone: cleanPhone,
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error({
            title: 'Already Registered',
            message:
              'This phone or email is already registered. Please login instead.',
          });
        } else {
          toast.error({
            title: 'Registration Failed',
            message:
              authError.message || 'An error occurred during registration',
          });
        }
        return;
      }

      if (authData.user) {
        // Supabase + Twilio automatically sends SMS with 6-digit code

        toast.success({
          title: 'Verification Code Sent',
          message: 'Check your phone for the 6-digit code',
        });

        // Navigate to OTP with phone, name, and email for profile creation
        router.push(
          `/auth/otp?phone=${encodeURIComponent(
            cleanPhone
          )}&name=${encodeURIComponent(name.trim())}&email=${encodeURIComponent(
            cleanEmail
          )}&context=register`
        );
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

  // iOS double-fire guard: Aynı deep link'in iki kez işlenmesini engeller
  const oauthProcessingRef = React.useRef(false);

  // ✅ Deep link listener for OAuth
  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (event: { url: string }) => {
    logger.info('[OAuth] 🔗 RAW Deep link received (Register):', { url: event.url });

    if (oauthProcessingRef.current) {
      logger.info('[OAuth] ⏭️ Deep link zaten işleniyor, atlanıyor (iOS double-fire)');
      return;
    }

    try {
      const url = event.url;

      if (!url.includes('auth/callback') && !url.includes('access_token=')) {
        return;
      }

      let accessToken = '';
      let refreshToken = '';

      if (url.includes('#')) {
        const hash = url.split('#')[1];
        const params = new URLSearchParams(hash);
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
      }

      if (!accessToken && url.includes('?')) {
        const query = url.split('?')[1];
        const params = new URLSearchParams(query);
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
      }

      if (accessToken && refreshToken) {
        oauthProcessingRef.current = true;

        try {
          logger.info('[OAuth] Session set ediliyor (Register)...');

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          logger.info('[OAuth] Session başarıyla set edildi (Register)!');
          await new Promise((resolve) => setTimeout(resolve, 800));
          router.replace('/auth/callback');
        } finally {
          setTimeout(() => {
            oauthProcessingRef.current = false;
          }, 3000);
        }
      }
    } catch (error: any) {
      oauthProcessingRef.current = false;
      logger.error('[OAuth] FATAL Deep link hatası (Register):', error);
      toast.error({
        title: 'Authentication Failed',
        message: error.message || 'Please try again',
      });
    }
  };

  const handleSocialRegister = async (
    provider: 'google' | 'facebook' | 'linkedin'
  ) => {
    setSocialLoading(provider);

    try {
      // ✅ Standardize redirect URI
      const redirectUri = 'net.talkee.app://auth/callback';
      
      // ✅ LinkedIn OIDC fix
      const supabaseProvider = provider === 'linkedin' ? 'linkedin_oidc' : provider;

      logger.info(`[OAuth] Starting ${supabaseProvider} registration`, {
        redirectUri,
        provider: supabaseProvider,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider as any,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL received');

      logger.info('[OAuth] Opening browser...', { url: data.url });

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success' && (result as any).url) {
        await handleDeepLink({ url: (result as any).url });
      }
    } catch (error: any) {
      logger.error(`[OAuth] ${provider} register error:`, error);
      toast.error({
        title: 'Registration Failed',
        message: error.message || 'An error occurred',
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
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <Input
                variant="light"
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                autoCapitalize="words"
                autoComplete="name"
                leftIcon={<User size={20} color="#9E9E9E" />}
              />

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

              {/* Email Input */}
              <Input
                variant="light"
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Mail size={20} color="#9E9E9E" />}
              />

              {/* Password Input */}
              <Input
                variant="light"
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
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

              {/* Confirm Password Input */}
              <Input
                variant="light"
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password"
                leftIcon={<Lock size={20} color="#9E9E9E" />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#9E9E9E" />
                    ) : (
                      <Eye size={20} color="#9E9E9E" />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Register Button */}
              <Button
                title={loading ? 'Creating Account...' : 'Sign Up'}
                onPress={handleRegister}
                disabled={loading}
                style={styles.registerButton}
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
                  onPress={() => handleSocialRegister('google')}
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
                  onPress={() => handleSocialRegister('facebook')}
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
                  onPress={() => handleSocialRegister('linkedin')}
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
                Already have an account?{' '}
                <Link href="/auth/login" asChild>
                  <Text style={styles.footerLink}>Sign In</Text>
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
    marginTop: 40,
    marginBottom: 32,
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
  registerButton: {
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
