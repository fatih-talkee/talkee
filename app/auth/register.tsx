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
import { Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useIsMounted } from '@/hooks/useIsMounted';

export default function RegisterScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useIsMounted();

  const handleRegister = async () => {
    setLoading(true);
    // Mock: after basic client checks, go to OTP verification
    setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        const to = encodeURIComponent(phone || '');
        router.push(`/auth/otp?context=register&to=${to}`);
      }
    }, 400);
  };

  const handleSocialRegister = (provider: string) => {
    console.log(`Register with ${provider}`);
    // Mock social register - navigate directly to home
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 500);
  };

  return (
    <LinearGradient colors={['#2e2461', '#d60f83']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/talkee_logoF.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join thousands of users connecting with experts
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
                leftIcon={<Phone size={20} color="#9E9E9E" />}
              />

              <Input
                variant="light"
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
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

              <Input
                variant="light"
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
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

              <Button
                title={loading ? 'Creating Account...' : 'Sign Up'}
                onPress={handleRegister}
                disabled={
                  loading || !phone || !password || password !== confirmPassword
                }
                style={styles.registerButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={() => handleSocialRegister('Google')}
                >
                  <View style={styles.socialButtonContent}>
                    <View style={styles.googleIcon}>
                      <Text style={styles.googleIconText}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.facebookButton]}
                  onPress={() => handleSocialRegister('Facebook')}
                >
                  <View style={styles.socialButtonContent}>
                    <View style={styles.facebookIcon}>
                      <Text style={styles.facebookIconText}>f</Text>
                    </View>
                    <Text style={styles.facebookButtonText}>
                      Continue with Facebook
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.linkedinButton]}
                  onPress={() => handleSocialRegister('LinkedIn')}
                >
                  <View style={styles.socialButtonContent}>
                    <View style={styles.linkedinIcon}>
                      <Text style={styles.linkedinIconText}>in</Text>
                    </View>
                    <Text style={styles.linkedinButtonText}>
                      Continue with LinkedIn
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.terms}>
                <Text style={styles.termsText}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>

              <View style={styles.dividerBottom}>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Already have an account?{' '}
                  <Link href="/auth/login" asChild>
                    <Text style={styles.footerLink}>Log In</Text>
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  registerButton: {
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
  terms: {
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#2e2461',
    fontFamily: 'Inter-Medium',
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
