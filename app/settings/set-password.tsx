import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Lock, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';

export default function SetPasswordScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Password strength validation
  const passwordRequirements = {
    minLength: newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(newPassword),
    hasLowerCase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSetPassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error({
        title: 'Missing Fields',
        message: 'Please fill in all fields',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error({
        title: 'Password Mismatch',
        message: 'Passwords do not match',
      });
      return;
    }

    if (!isPasswordValid) {
      toast.error({
        title: 'Weak Password',
        message: 'Password must meet all requirements',
      });
      return;
    }

    setLoading(true);

    try {
      // Set password for OAuth user
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Set password error:', error);
        throw new Error(error.message);
      }

      // Success!
      toast.success({
        title: 'Password Set',
        message: 'You can now login with email and password',
      });

      // Clear form
      setNewPassword('');
      setConfirmPassword('');

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast.error({
        title: 'Failed to Set Password',
        message: error.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <View style={styles.requirementRow}>
      {met ? (
        <Check size={16} color={theme.colors.success || '#10b981'} />
      ) : (
        <X size={16} color={theme.colors.textMuted} />
      )}
      <Text
        style={[
          styles.requirementItem,
          {
            color: met
              ? theme.colors.success || '#10b981'
              : theme.colors.textSecondary,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: theme.colors.success + '20' || '#10b98120' },
            ]}
          >
            <ShieldCheck size={40} color={theme.colors.success || '#10b981'} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            Set a Password
          </Text>
          <Text
            style={[
              styles.heroDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            Add password login as a backup option for your account
          </Text>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.form}>
            {/* New Password */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    focusedInput === 'newPassword'
                      ? theme.colors.primary
                      : newPassword
                    ? isPasswordValid
                      ? theme.colors.success || '#10b981'
                      : theme.colors.error
                    : theme.colors.border,
                },
              ]}
            >
              <Lock
                size={18}
                color={theme.colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <TextInput
                placeholder="New Password"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                onFocus={() => setFocusedInput('newPassword')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff size={18} color={theme.colors.textMuted} />
                ) : (
                  <Eye size={18} color={theme.colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    focusedInput === 'confirmPassword'
                      ? theme.colors.primary
                      : confirmPassword && newPassword
                      ? newPassword === confirmPassword
                        ? theme.colors.success || '#10b981'
                        : theme.colors.error
                      : theme.colors.border,
                },
              ]}
            >
              <Lock
                size={18}
                color={theme.colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} color={theme.colors.textMuted} />
                ) : (
                  <Eye size={18} color={theme.colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Requirements */}
            {newPassword.length > 0 && (
              <View style={styles.requirements}>
                <Text
                  style={[
                    styles.requirementsTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Password Requirements:
                </Text>
                <RequirementItem
                  met={passwordRequirements.minLength}
                  text="At least 8 characters long"
                />
                <RequirementItem
                  met={passwordRequirements.hasUpperCase}
                  text="Include uppercase letters (A-Z)"
                />
                <RequirementItem
                  met={passwordRequirements.hasLowerCase}
                  text="Include lowercase letters (a-z)"
                />
                <RequirementItem
                  met={passwordRequirements.hasNumber}
                  text="Include at least one number (0-9)"
                />
              </View>
            )}

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                {newPassword === confirmPassword ? (
                  <View style={styles.matchRow}>
                    <Check
                      size={16}
                      color={theme.colors.success || '#10b981'}
                    />
                    <Text
                      style={[
                        styles.matchText,
                        { color: theme.colors.success || '#10b981' },
                      ]}
                    >
                      Passwords match
                    </Text>
                  </View>
                ) : (
                  <View style={styles.matchRow}>
                    <X size={16} color={theme.colors.error} />
                    <Text
                      style={[styles.matchText, { color: theme.colors.error }]}
                    >
                      Passwords do not match
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Button
              title={loading ? 'Setting Password...' : 'Set Password'}
              onPress={handleSetPassword}
              disabled={
                loading || !isPasswordValid || newPassword !== confirmPassword
              }
              style={styles.setButton}
            />
          </View>
        </View>

        {/* Benefits Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Why Set a Password?
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🔐</Text>
              <View style={styles.benefitText}>
                <Text
                  style={[styles.benefitTitle, { color: theme.colors.text }]}
                >
                  Backup Login Method
                </Text>
                <Text
                  style={[
                    styles.benefitDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Access your account even if OAuth provider is unavailable
                </Text>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🛡️</Text>
              <View style={styles.benefitText}>
                <Text
                  style={[styles.benefitTitle, { color: theme.colors.text }]}
                >
                  Enhanced Security
                </Text>
                <Text
                  style={[
                    styles.benefitDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Multiple login options provide better account protection
                </Text>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🔄</Text>
              <View style={styles.benefitText}>
                <Text
                  style={[styles.benefitTitle, { color: theme.colors.text }]}
                >
                  Flexibility
                </Text>
                <Text
                  style={[
                    styles.benefitDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Login with email/password or any connected social account
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  requirements: {
    marginTop: 8,
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementItem: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  matchIndicator: {
    marginTop: -8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  setButton: {
    marginTop: 12,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
});
