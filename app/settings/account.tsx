import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Lock,
  Trash2,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Check,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/hooks/useProfile';
import { usersService } from '@/services/supabase';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { format } from 'date-fns';
import MaskInput from 'react-native-mask-input';
import { PageLoading } from '@/components/ui/PageLoading';
import { signInWithGoogle } from '@/utils/GoogleAuth';

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

export default function AccountSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user, isLoading: profileLoading, refetch } = useProfile();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    totalCalls: 0,
    totalSpent: 0,
    totalMinutes: 0,
  });
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Check if user has password (email provider means they registered with password)
  const hasPassword = user?.oauth_providers?.includes('email') ?? true;

  // All available providers
  const allProviders = [
    { id: 'email', name: 'Email & Password', icon: '🔑' },
    { id: 'google', name: 'Google', icon: '🔵' },
    { id: 'facebook', name: 'Facebook', icon: '🔵' },
    { id: 'linkedin', name: 'LinkedIn', icon: '🔵' },
  ] as const;

  // Handle linking a provider
  const handleLinkProvider = async (
    provider: 'google' | 'facebook' | 'linkedin'
  ) => {
    try {
      const redirectUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : 'talkee://auth/callback';

      if (provider === 'google') {
        // Use Google-specific auth flow
        try {
          const result = await signInWithGoogle();

          if (result.success && result.session) {
            // Session is established, callback handler will link the provider
            toast.show({
              type: 'info',
              title: 'Connecting...',
              message: 'Google account is being linked',
            });
          } else if (result.cancelled) {
            toast.info({
              title: 'Cancelled',
              message: 'Google sign-in was cancelled',
            });
          } else if (result.error) {
            toast.error({
              title: 'Connection Failed',
              message: result.error,
            });
          } else {
            // Browser flow - callback handler will process
            toast.show({
              type: 'info',
              title: 'Connecting...',
              message: 'Please complete the Google authentication',
            });
          }
        } catch (googleError: any) {
          console.error('Google link error:', googleError);
          toast.error({
            title: 'Connection Failed',
            message: googleError?.message || 'Failed to connect Google account',
          });
        }
      } else {
        // Facebook & LinkedIn - use standard OAuth flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
            // This will link the provider to the current account
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          toast.error({
            title: 'Connection Failed',
            message: error.message || 'Failed to connect account',
          });
        } else {
          toast.show({
            type: 'info',
            title: 'Connecting...',
            message: `Please complete the ${provider} authentication`,
          });
        }
      }
    } catch (error: any) {
      console.error('Link provider error:', error);
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
    }
  };

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || '',
        email: user.primary_email || '',
        phone: user.phone || '',
      });
      loadUserStats();
    }
  }, [user]);

  // Listen for auth state changes (e.g., when provider is linked)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Refresh profile data when auth state changes (e.g., after linking provider)
        await refetch();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  const loadUserStats = async () => {
    try {
      const stats = await usersService.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      toast.error({
        title: 'Invalid Name',
        message: 'Name must be at least 2 characters',
      });
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      toast.error({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
      });
      return;
    }

    // Clean phone number (remove spaces from mask)
    const cleanPhone = formData.phone.replace(/\s/g, '');

    if (!cleanPhone || cleanPhone.length < 13) {
      toast.error({
        title: 'Invalid Phone',
        message: 'Please enter a valid phone number',
      });
      return;
    }

    setLoading(true);

    try {
      // Update profile in database
      await usersService.updateProfile({
        name: formData.fullName.trim(),
        primary_email: formData.email.trim().toLowerCase(),
        phone: cleanPhone,
      });

      // Refetch profile data
      await refetch();

      toast.success({
        title: 'Profile Updated',
        message: 'Your account information has been updated',
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error({
        title: 'Update Failed',
        message: error.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChangePassword = () => {
    try {
      router.push('/settings/change-password');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSetPassword = () => {
    try {
      router.push('/settings/set-password');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;

    setDeleteLoading(true);

    try {
      // ✅ Use usersService.deleteAccount()
      const result = await usersService.deleteAccount();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Success!
      toast.success({
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted',
      });

      // Close modal
      setShowDeleteModal(false);

      // ✅ Navigate to login after a delay
      setTimeout(() => {
        router.replace('/auth/login');
      }, 1500);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error({
        title: 'Deletion Failed',
        message: error.message || 'Failed to delete account',
      });
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading..." />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="User not found" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        rightButtons={[
          <TouchableOpacity
            key="edit"
            onPress={() => {
              if (isEditing) {
                // Cancel - reset form data
                setFormData({
                  fullName: user.name || '',
                  email: user.primary_email || '',
                  phone: user.phone || '',
                });
              }
              setIsEditing(!isEditing);
            }}
            style={[
              styles.editButton,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? theme.colors.surface
                    : theme.name === 'light'
                    ? theme.colors.brandPink
                    : '#000000',
              },
            ]}
          >
            <Text
              style={[
                styles.editButtonText,
                {
                  color: '#FFFFFF',
                },
              ]}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>,
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
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
            Personal Information
          </Text>

          <View
            style={[
              styles.inputGroup,
              {
                borderColor:
                  focusedInput === 'fullName' && isEditing
                    ? theme.colors.primary
                    : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <User
              color={theme.colors.textMuted}
              size={18}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              editable={isEditing}
              onFocus={() => setFocusedInput('fullName')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View
            style={[
              styles.inputGroup,
              {
                borderColor:
                  focusedInput === 'email' && isEditing
                    ? theme.colors.primary
                    : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Mail
              color={theme.colors.textMuted}
              size={18}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={isEditing}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View
            style={[
              styles.inputGroup,
              {
                borderColor:
                  focusedInput === 'phone' && isEditing
                    ? theme.colors.primary
                    : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Phone
              color={theme.colors.textMuted}
              size={18}
              style={{ marginRight: 8 }}
            />
            <MaskInput
              value={formData.phone}
              onChangeText={(masked, unmasked) => {
                setFormData({ ...formData, phone: masked });
              }}
              mask={PHONE_MASK}
              placeholder="+90 555 123 45 67"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              keyboardType="phone-pad"
              editable={isEditing}
              onFocus={() => setFocusedInput('phone')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {isEditing && (
            <Button
              title={loading ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={loading}
              style={styles.saveButton}
            />
          )}
        </View>

        {/* Security */}
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
            Security
          </Text>

          {/* Conditional: Change Password or Set Password */}
          {hasPassword ? (
            // User has password → Show "Change Password"
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleChangePassword}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Lock size={20} color={theme.colors.primary} />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Change Password
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Update your account password
                  </Text>
                </View>
              </View>
              <ChevronRight
                size={20}
                color={
                  theme.name === 'dark' ? '#FFFFFF' : theme.colors.textMuted
                }
              />
            </TouchableOpacity>
          ) : (
            // OAuth-only user → Show "Set Password"
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleSetPassword}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <ShieldCheck
                  size={20}
                  color={theme.colors.success || '#10b981'}
                />
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: theme.colors.success || '#10b981' },
                    ]}
                  >
                    Set Password
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Add password login as backup option
                  </Text>
                </View>
              </View>
              <ChevronRight
                size={20}
                color={
                  theme.name === 'dark' ? '#FFFFFF' : theme.colors.textMuted
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Connected Accounts */}
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
            Connected Accounts
          </Text>
          <View style={styles.connectedAccountsList}>
            {allProviders.map((providerInfo) => {
              const isConnected = user.oauth_providers?.includes(
                providerInfo.id
              );
              const providerEmail = user.oauth_emails?.[providerInfo.id];

              return (
                <View
                  key={providerInfo.id}
                  style={[
                    styles.accountItem,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.accountItemLeft}>
                    <Text style={styles.providerIcon}>{providerInfo.icon}</Text>
                    <View style={styles.accountItemInfo}>
                      <Text
                        style={[
                          styles.providerText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {providerInfo.name}
                      </Text>
                      {isConnected && providerEmail && (
                        <Text
                          style={[
                            styles.providerEmail,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {providerEmail}
                        </Text>
                      )}
                      {isConnected && !providerEmail && (
                        <Text
                          style={[
                            styles.providerEmail,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          Connected
                        </Text>
                      )}
                      {!isConnected && providerInfo.id !== 'email' && (
                        <Text
                          style={[
                            styles.providerEmail,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          Not connected
                        </Text>
                      )}
                    </View>
                  </View>
                  {isConnected ? (
                    <View
                      style={[
                        styles.connectedBadge,
                        { backgroundColor: theme.colors.success + '20' },
                      ]}
                    >
                      <Check
                        size={16}
                        color={theme.colors.success || '#10b981'}
                      />
                      <Text
                        style={[
                          styles.connectedBadgeText,
                          { color: theme.colors.success || '#10b981' },
                        ]}
                      >
                        Connected
                      </Text>
                    </View>
                  ) : providerInfo.id !== 'email' ? (
                    <TouchableOpacity
                      style={[
                        styles.linkButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      onPress={() =>
                        handleLinkProvider(
                          providerInfo.id as 'google' | 'facebook' | 'linkedin'
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color="#FFFFFF" />
                      <Text style={styles.linkButtonText}>Connect</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Account Actions */}
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
            Account Actions
          </Text>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Trash2 size={20} color={theme.colors.error} />
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingLabel, { color: theme.colors.error }]}
                >
                  Delete Account
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Permanently delete your account and all data
                </Text>
              </View>
            </View>
            <ChevronRight
              size={20}
              color={theme.name === 'dark' ? '#FFFFFF' : theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Account Info */}
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
            Account Information
          </Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Member Since
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {formatDate(user.created_at)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Account Type
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {user.role === 'professional' ? 'Professional' : 'Standard'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Calls
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {userStats.totalCalls}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Account ID
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {user.id.split('-')[0].toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalIconContainer}>
              <View
                style={[
                  styles.modalIcon,
                  { backgroundColor: theme.colors.error + '20' },
                ]}
              >
                <AlertTriangle size={32} color={theme.colors.error} />
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Delete Account?
            </Text>

            <Text
              style={[
                styles.modalDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              Are you sure you want to permanently delete your account? This
              action cannot be undone.
            </Text>

            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: theme.colors.error + '10',
                  borderColor: theme.colors.error + '30',
                },
              ]}
            >
              <Text style={[styles.warningText, { color: theme.colors.error }]}>
                All your data will be permanently deleted, including:
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Your profile and personal information
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Call history and recordings
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Credits and payment history
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Favorites and preferences
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.deleteButton,
                  { backgroundColor: theme.colors.error },
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteButtonText}>
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
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
    marginBottom: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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
  saveButton: {
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  dangerItem: {
    marginTop: 0,
  },
  connectedAccountsList: {
    gap: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  accountItemInfo: {
    flex: 1,
  },
  providerText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  providerEmail: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  connectedBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  linkButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }),
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  warningItem: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
