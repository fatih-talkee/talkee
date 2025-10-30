import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useIsMounted } from '@/hooks/useIsMounted';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useIsMounted();

  const handleSignup = async () => {
    setLoading(true);
    // Mock signup delay
    setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        router.push('/(tabs)');
      }
    }, 2000);
  };

  const handleSocialSignup = (provider: string) => {
    console.log(`Signup with ${provider}`);
    // Mock social signup
    setTimeout(() => {
      router.push('/(tabs)');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join thousands of users connecting with experts</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
              placeholder="Enter your full name"
              leftIcon={<User size={20} color="#64748b" />}
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color="#64748b" />}
            />

            <Input
              label="Phone Number"
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color="#64748b" />}
            />

            <Input
              label="Password"
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              placeholder="Create a password"
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={20} color="#64748b" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              }
            />

            <Input
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
              placeholder="Confirm your password"
              secureTextEntry={!showConfirmPassword}
              leftIcon={<Lock size={20} color="#64748b" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              }
            />

            <Button
              title={loading ? "Creating Account..." : "Create Account"}
              onPress={handleSignup}
              disabled={loading}
              style={styles.signupButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialSignup('Google')}
              >
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialSignup('Facebook')}
              >
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialSignup('LinkedIn')}
              >
                <Text style={styles.socialButtonText}>LinkedIn</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.terms}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/auth/login" asChild>
              <Text style={styles.footerLink}>Sign In</Text>
            </Link>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  signupButton: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  socialButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  terms: {
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#f59e0b',
    fontFamily: 'Inter-Medium',
  },
  footer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  footerLink: {
    color: '#f59e0b',
    fontFamily: 'Inter-Medium',
  },
});