import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GraduationCap } from 'lucide-react-native';
import { EducationInput } from '@/components/EducationInput';
import { ExperienceInput } from '@/components/ExperienceInput';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  EducationFormData,
  ExperienceFormData,
} from '@/types/education_experience.types';

interface Step3EducationExperienceProps {
  educations: EducationFormData[];
  experiences: ExperienceFormData[];
  onEducationsChange: (educations: EducationFormData[]) => void;
  onExperiencesChange: (experiences: ExperienceFormData[]) => void;
}

export function Step3EducationExperience({
  educations,
  experiences,
  onEducationsChange,
  onExperiencesChange,
}: Step3EducationExperienceProps) {
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
            <GraduationCap
              size={20}
              color={theme.colors.surface}
              strokeWidth={2.5}
            />
          </View>
        </View>

        <Text style={[styles.titleCompact, { color: theme.colors.text }]}>
          Education & Experience
        </Text>
        <Text
          style={[
            styles.subtitleCompact,
            { color: theme.colors.textSecondary },
          ]}
        >
          Add your educational background and work experience
        </Text>

        <View style={styles.formCompact}>
          {/* Education */}
          <EducationInput
            educations={educations}
            onEducationsChange={onEducationsChange}
          />

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          {/* Experience */}
          <ExperienceInput
            experiences={experiences}
            onExperiencesChange={onExperiencesChange}
          />

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
              and attract more clients. Add your education and experience to
              stand out!
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
