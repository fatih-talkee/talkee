import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { usersService } from '@/services/supabase/user.service';
import { useToast } from '@/lib/toastService';
import { User, Mail, FileText } from 'lucide-react-native';

export default function InformationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profileData, professional, isLoading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  const bioLength = bio.length;
  const minLength = 50;
  const maxLength = 500;
  const isBioValid = bioLength >= minLength && bioLength <= maxLength;

  useEffect(() => {
    const loadData = async () => {
      if (profileData?.user?.id && profileData?.professional?.id) {
        try {
          setLoading(true);
          const result = await professionalsService.getProfessionalByUserId(
            profileData.user.id
          );

          if (result.success && result.professional) {
            const prof = result.professional as any; // Type assertion for primary_email
            setFullName(prof.users?.name || '');
            setEmail(prof.users?.primary_email || '');
            setBio(prof.bio || '');
          } else {
            toast.error({
              title: 'Error',
              message: result.error || 'Failed to load professional data',
            });
          }
        } catch (error: any) {
          console.error('Error loading data:', error);
          toast.error({
            title: 'Error',
            message: 'Failed to load information',
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadData();
  }, [profileData]);

  const handleSave = async () => {
    if (!profileData?.user?.id || !professional?.id) {
      toast.error({
        title: 'Error',
        message: 'Professional data not found',
      });
      return;
    }

    // Validation
    if (!fullName.trim()) {
      toast.error({
        title: 'Validation Error',
        message: 'Full name is required',
      });
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error({
        title: 'Validation Error',
        message: 'Valid email is required',
      });
      return;
    }

    if (!isBioValid) {
      toast.error({
        title: 'Validation Error',
        message: `Bio must be between ${minLength} and ${maxLength} characters`,
      });
      return;
    }

    setSaving(true);

    try {
      // Update user name and email
      const userUpdate: any = {};
      if (fullName.trim() !== profileData.user.name) {
        userUpdate.name = fullName.trim();
      }
      if (email.trim() !== profileData.user.primary_email) {
        userUpdate.primary_email = email.trim();
      }

      if (Object.keys(userUpdate).length > 0) {
        await usersService.updateProfile(userUpdate);
      }

      // Update professional bio
      if (bio.trim() !== professional.bio) {
        const bioResult = await professionalsService.updateProfessionalBio(
          professional.id,
          bio.trim()
        );

        if (!bioResult.success) {
          toast.error({
            title: 'Error',
            message: bioResult.error || 'Failed to update bio',
          });
          setSaving(false);
          return;
        }
      }

      toast.success({
        title: 'Success',
        message: 'Information updated successfully',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving information:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to save information',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo={false} title="Basic Information" showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading information..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={false} title="Basic Information" showBack onBackPress={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Full Name *
            </Text>
            <View
              style={[
                styles.inputGroup,
                {
                  borderColor:
                    focusedInput === 'fullName'
                      ? theme.colors.pinkTwo
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
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.text }]}
                onFocus={() => setFocusedInput('fullName')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Email Address *
            </Text>
            <View
              style={[
                styles.inputGroup,
                {
                  borderColor:
                    focusedInput === 'email'
                      ? theme.colors.pinkTwo
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
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.text }]}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
          </View>

          {/* Bio / About Me */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                About Me *
              </Text>
              <Text
                style={[
                  styles.charCount,
                  {
                    color: !isBioValid
                      ? theme.colors.error || '#ef4444'
                      : theme.colors.textMuted,
                  },
                ]}
              >
                {bioLength} / {maxLength}
              </Text>
            </View>

            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Write a brief introduction about yourself, your experience, and how you can help people..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={8}
              maxLength={maxLength}
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    focusedInput === 'bio'
                      ? theme.colors.pinkTwo
                      : isBioValid
                      ? theme.colors.border
                      : theme.colors.error || '#ef4444',
                  color: theme.colors.text,
                },
              ]}
              textAlignVertical="top"
              onFocus={() => setFocusedInput('bio')}
              onBlur={() => setFocusedInput(null)}
            />

            {bioLength < minLength && (
              <Text
                style={[
                  styles.helperText,
                  { color: theme.colors.error || '#ef4444' },
                ]}
              >
                ⚠️ Minimum {minLength} characters required (
                {minLength - bioLength} more)
              </Text>
            )}

            {isBioValid && (
              <Text
                style={[styles.helperText, { color: theme.colors.textMuted }]}
              >
                ✓ Great! Tell users about your background, approach, and what
                makes you stand out
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with Save Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 60),
          },
        ]}
      >
        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving || !isBioValid}
          style={[styles.saveButton, { backgroundColor: theme.colors.pinkTwo }]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputWrapper: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  textArea: {
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 6,
    lineHeight: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
  },
});
