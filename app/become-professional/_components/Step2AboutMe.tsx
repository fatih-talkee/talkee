import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FileText } from 'lucide-react-native';
import { TagInput } from '@/components/ui/TagInput';
import { useTheme } from '@/contexts/ThemeContext';

interface Step2AboutMeProps {
  specialties: string[];
  languages: string[];
  skillsCertifications: string[];
  onSpecialtiesChange: (tags: string[]) => void;
  onLanguagesChange: (tags: string[]) => void;
  onSkillsCertificationsChange: (tags: string[]) => void;
}

export function Step2AboutMe({
  specialties,
  languages,
  skillsCertifications,
  onSpecialtiesChange,
  onLanguagesChange,
  onSkillsCertificationsChange,
}: Step2AboutMeProps) {
  const { theme } = useTheme();

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
            <FileText
              size={20}
              color={theme.colors.surface}
              strokeWidth={2.5}
            />
          </View>
        </View>

        <Text style={[styles.titleCompact, { color: theme.colors.text }]}>
          About You
        </Text>
        <Text
          style={[
            styles.subtitleCompact,
            { color: theme.colors.textSecondary },
          ]}
        >
          Tell users about your expertise and what makes you unique
        </Text>

        <View style={styles.formCompact}>
          {/* Specialties (Tag Input) */}
          <View style={styles.tagInputWrapper}>
            <TagInput
              label="Specialties"
              tags={specialties}
              onTagsChange={onSpecialtiesChange}
              placeholder="e.g., Career Transition, Work-Life Balance"
              maxTags={10}
              maxLength={50}
              helperText="Add specific areas where you provide expertise"
            />
          </View>

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          {/* Languages (Tag Input) */}
          <View style={styles.tagInputWrapper}>
            <TagInput
              label="Languages"
              tags={languages}
              onTagsChange={onLanguagesChange}
              placeholder="e.g., English, Turkish, Spanish"
              maxTags={8}
              maxLength={30}
              required
              helperText="Languages you can provide consultations in"
            />
          </View>

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          {/* Skills & Certifications */}
          <View style={styles.tagInputWrapper}>
            <TagInput
              label="Skills & Certifications"
              tags={skillsCertifications}
              onTagsChange={onSkillsCertificationsChange}
              placeholder="e.g., Certified Life Coach, NLP Practitioner"
              maxTags={15}
              maxLength={60}
              helperText="Add your professional certifications, courses, and key skills"
            />
          </View>

          {/* Info Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.primary + '10',
                borderColor: theme.colors.primary + '40',
              },
            ]}
          >
            <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>
              💡 Pro Tip
            </Text>
            <Text
              style={[styles.infoText, { color: theme.colors.textSecondary }]}
            >
              All fields are optional, but a complete profile helps build trust
              and attract more clients.
            </Text>
          </View>
        </View>
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
    gap: 24,
  },
  tagInputWrapper: {
    width: '100%',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
});
// Default export to prevent Expo Router from treating this as a route
export default null;
