/**
 * Login Screen - FIXED OAUTH VERSION
 * Handles OAuth redirects for both web and mobile
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
import { Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toastService';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const validatePhone = (phone: string) => {
    const phoneRegex =
      /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
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

    try {
      // For now, lookup user by phone to get email
      // TODO: Implement proper phone→email lookup in backend
      const { data: userData, error: lookupError } = await supabase
        .from('users')
        .select('email')
        .eq('phone', phone.trim())
        .single();

      if (lookupError || !userData) {
        toast.error({
          title: 'Phone Not Found',
          message: 'No account found with this phone number',
        });
        setLoading(false);
        return;
      }

      // Login with email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (error) {
        console.error('Login error:', error);

        if (error.message.includes('Invalid login credentials')) {
          toast.error({
            title: 'Login Failed',
            message: 'Invalid phone or password. Please try again.',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast.error({
            title: 'Email Not Verified',
            message: 'Please verify your email before logging in.',
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
      console.error('Unexpected login error:', error);
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: 'google' | 'facebook' | 'linkedin'
  ) => {
    setSocialLoading(provider);

    try {
      // ✅ FIXED: Different redirect URLs for web vs mobile
      const redirectUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback` // Web: http://localhost:8081/auth/callback
          : 'talkee://auth/callback'; // Mobile: Deep link

      console.log('OAuth redirect URL:', redirectUrl); // Debug

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false, // Let Supabase handle redirect
        },
      });

      if (error) {
        console.error(`${provider} login error:`, error);
        toast.error({
          title: 'Login Failed',
          message: `Failed to sign in with ${provider}`,
        });
      }

      // On web, this will redirect to OAuth provider
      // On mobile, it will open in-app browser
    } catch (error: any) {
      console.error(`Unexpected ${provider} login error:`, error);
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
          style={styles.content}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/talkee_logoF.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to connect with professionals
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                variant="light"
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                autoComplete="tel"
                leftIcon={<Phone size={20} color="#9E9E9E" />}
              />

              <Input
                variant="light"
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
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

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/auth/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title={loading ? 'Signing In...' : 'Log In'}
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

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

              <View style={styles.dividerBottom}>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Don't have an account?{' '}
                  <Link href="/auth/register" asChild>
                    <Text style={styles.footerLink}>Sign Up</Text>
                  </Link>
                </Text>
              </View>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
  },
  form: {},
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  loginButton: {
    marginBottom: 24,
    backgroundColor: '#2e2461',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
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
  dividerBottom: {
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
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
