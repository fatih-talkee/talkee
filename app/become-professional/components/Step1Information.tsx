import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { User, Mail } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Step1InformationProps {
  fullName: string;
  email: string;
  bio: string;
  profileLoading: boolean;
  onFullNameChange: (text: string) => void;
  onEmailChange: (text: string) => void;
  onBioChange: (text: string) => void;
}

export function Step1Information({
  fullName,
  email,
  bio,
  profileLoading,
  onFullNameChange,
  onEmailChange,
  onBioChange,
}: Step1InformationProps) {
  const { theme } = useTheme();
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const bioLength = bio.length;
  const minLength = 50;
  const maxLength = 500;
  const isValid = bioLength >= minLength && bioLength <= maxLength;

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={[styles.stepContent, styles.stepContentCompact]}>
        <View
          style={[
            styles.iconContainerCompact,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View
            style={[
              styles.iconCircleCompact,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <User size={20} color={theme.colors.surface} strokeWidth={2.5} />
          </View>
        </View>
        {profileLoading ? (
          <View style={styles.loadingContainer}>
            <Text
              style={[styles.loadingText, { color: theme.colors.textMuted }]}
            >
              Loading your information...
            </Text>
          </View>
        ) : (
          <View style={styles.formCompact}>
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
                  value={fullName}
                  onChangeText={onFullNameChange}
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
                  value={email}
                  onChangeText={onEmailChange}
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
                      color:
                        bioLength < minLength
                          ? theme.colors.error || '#ef4444'
                          : bioLength > maxLength
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
                onChangeText={onBioChange}
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
                        ? theme.colors.primary
                        : isValid
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

              {bioLength >= minLength && bioLength <= maxLength && (
                <Text
                  style={[styles.helperText, { color: theme.colors.textMuted }]}
                >
                  ✓ Great! Tell users about your background, approach, and what
                  makes you stand out
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepContentCompact: {
    alignItems: 'flex-start',
    width: '100%',
  },
  iconContainerCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  iconCircleCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCompact: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
    textAlign: 'left',
  },
  subtitleCompact: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 20,
  },
  formCompact: {
    width: '100%',
    gap: 16,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 6,
  },
  inputGroup: {
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    lineHeight: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
});
