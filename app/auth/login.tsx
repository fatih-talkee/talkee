import React, { useState, useEffect, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
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

// Complete auth session when returning from browser
WebBrowser.maybeCompleteAuthSession();

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
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // iOS double-fire guard: Aynı deep link'in iki kez işlenmesini engeller
  const oauthProcessingRef = useRef(false);

  // ✅ Deep link dinleyicisi
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (event: { url: string }) => {
    logger.info('[OAuth] 🔗 RAW Deep link received:', { url: event.url });

    // iOS Fix: Aynı OAuth callback'in iki kez işlenmesini engelle.
    // iOS'ta openAuthSessionAsync + Linking.addEventListener kombinasyonu
    // deep link'i birden fazla kez tetikleyebilir.
    if (oauthProcessingRef.current) {
      logger.info('[OAuth] ⏭️ Deep link zaten işleniyor, atlanıyor (iOS double-fire)');
      return;
    }

    try {
      const url = event.url;

      // Auth callback veya token içermeyen URL'leri görmezden gel
      if (!url.includes('auth/callback') && !url.includes('access_token=')) {
        logger.info('[OAuth] ⏭️ Auth callback değil, atlanıyor');
        return;
      }

      // Token'ları URL'den çıkar
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

      logger.info('[OAuth] Token parse edildi:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });

      if (accessToken && refreshToken) {
        // Guard'i aktif et — ikinci tetiklenmeyi engelle
        oauthProcessingRef.current = true;

        try {
          logger.info('[OAuth] Session set ediliyor...');

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            logger.error('[OAuth] Supabase setSession hatası:', error);
            throw error;
          }

          logger.info('[OAuth] Session başarıyla set edildi!');

          // Session'in tam olarak yayılması için kısa bekle
          await new Promise((resolve) => setTimeout(resolve, 800));

          logger.info('[OAuth] Callback sayfasına yönlendiriliyor...');
          router.replace('/auth/callback');
        } finally {
          // 3 saniye sonra guard'i sıfırla — yeni giriş denemelerini engelleme
          setTimeout(() => {
            oauthProcessingRef.current = false;
          }, 3000);
        }
      } else {
        logger.error('[OAuth] URL\'de token bulunamadı. URL:', url);
        throw new Error('Could not find access tokens in the callback URL.');
      }
    } catch (error: any) {
      oauthProcessingRef.current = false;
      logger.error('[OAuth] FATAL Deep link hatası:', error);
      toast.error({
        title: 'Authentication Failed',
        message: error.message || 'Please try again',
      });
    }
  };

  const handleSocialLogin = async (
    provider: 'google' | 'facebook' | 'linkedin'
  ) => {
    setSocialLoading(provider);

    try {
      // ✅ Always use custom scheme for mobile
      const redirectUri = 'net.talkee.app://auth/callback';
      
      // ✅ Supabase LinkedIn OIDC uses 'linkedin_oidc' provider name
      const supabaseProvider = provider === 'linkedin' ? 'linkedin_oidc' : provider;

      logger.info(`[OAuth] Starting ${supabaseProvider} login`, {
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

      // ✅ Open OAuth in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      logger.info('[OAuth] Browser closed', { type: result.type, hasUrl: !!(result as any).url });

      // iOS Fix: ASWebAuthenticationSession token'ları Linking.addEventListener'a değil
      // doğrudan result.url'e yazıyor. Android'de bu kod çalışsa bile oauthProcessingRef
      // guard'ı çift işlemeyi engeller — regresyon yok.
      if (result.type === 'success' && (result as any).url) {
        await handleDeepLink({ url: (result as any).url });
      }
    } catch (error: any) {
      logger.error(`[OAuth] ${provider} error:`, error);
      toast.error({
        title: 'Login Failed',
        message: error.message || 'An error occurred',
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return cleaned.length >= 13;
  };

  const handleLogin = async () => {
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

      const { data, error } = await supabase.auth.signInWithPassword({
        phone: cleanPhone,
        password,
      });

      if (error) {
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
            message: 'Invalid phone or password',
          });
        } else {
          toast.error({
            title: 'Login Failed',
            message: error.message,
          });
        }
        return;
      }

      if (data.session) {
        logger.info('[Login] Login successful', {
          userId: data.session.user.id,
        });

        toast.success({
          title: 'Welcome Back!',
          message: 'Login successful',
        });

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
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

      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
      });

      if (error) {
        toast.error({
          title: 'Resend Failed',
          message: error.message,
        });
      } else {
        toast.success({
          title: 'Code Sent',
          message: 'A new verification code has been sent',
        });

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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Phone Number */}
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
                    onChangeText={(masked) => {
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

              {/* Password */}
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

              {/* Forgot Password */}
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

              {/* Social Buttons */}
              <View style={styles.socialButtons}>
                {/* Google */}
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

                {/* Facebook */}
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

                {/* LinkedIn */}
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
    fontWeight: 'bold',
  },
});
