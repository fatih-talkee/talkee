import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { EducationInput } from '@/components/EducationInput';
import { ExperienceInput } from '@/components/ExperienceInput';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { GraduationCap } from 'lucide-react-native';
import type {
  EducationFormData,
  ExperienceFormData,
} from '@/types/education_experience.types';

export default function EducationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { profileData, professional, isLoading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [educations, setEducations] = useState<EducationFormData[]>([]);
  const [experiences, setExperiences] = useState<ExperienceFormData[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (profileData?.user?.id && profileData?.professional?.id) {
        try {
          setLoading(true);
          const result = await professionalsService.getProfessionalByUserId(
            profileData.user.id
          );

          if (result.success && result.professional) {
            const prof = result.professional;

            // Convert educations
            if (prof.educations && Array.isArray(prof.educations)) {
              const educationsData: EducationFormData[] = prof.educations.map(
                (edu: any) => ({
                  degree_level: edu.degree_level,
                  institution: edu.institution || undefined,
                  field_of_study: edu.field_of_study || undefined,
                  start_year: edu.start_year?.toString() || undefined,
                  end_year: edu.end_year?.toString() || undefined,
                  is_current: edu.is_current || false,
                })
              );
              setEducations(educationsData);
            } else {
              setEducations([]);
            }

            // Convert experiences
            if (prof.experiences && Array.isArray(prof.experiences)) {
              const experiencesData: ExperienceFormData[] =
                prof.experiences.map((exp: any) => {
                  // Extract year from start_date (format: "YYYY-01-01")
                  const startYear = exp.start_date
                    ? exp.start_date.split('-')[0]
                    : undefined;
                  const endYear = exp.end_date
                    ? exp.end_date.split('-')[0]
                    : undefined;

                  return {
                    title: exp.title || undefined,
                    company: exp.company || undefined,
                    location: exp.location || undefined,
                    start_year: startYear,
                    end_year: endYear,
                    is_current: exp.is_current || false,
                  };
                });
              setExperiences(experiencesData);
            } else {
              setExperiences([]);
            }
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
            message: 'Failed to load education and experience data',
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

    setSaving(true);

    try {
      // Convert educations to API format
      const educationsData = educations.map((edu) => ({
        degree_level: edu.degree_level,
        institution: edu.institution || null,
        field_of_study: edu.field_of_study || null,
        start_year: edu.start_year ? Number(edu.start_year) : null,
        end_year: edu.end_year ? Number(edu.end_year) : null,
        is_current: edu.is_current || false,
        description: null, // Description not in form data
      }));

      // Convert experiences to API format
      const experiencesData = experiences.map((exp) => {
        const startYear = exp.start_year ? String(exp.start_year) : null;
        const endYear = exp.end_year ? String(exp.end_year) : null;

        const startDate = startYear ? `${startYear}-01-01` : null;
        const endDate = exp.is_current
          ? null
          : endYear
          ? `${endYear}-12-31`
          : null;

        return {
          title: exp.title || null,
          company: exp.company || null,
          location: exp.location || null,
          start_date: startDate,
          end_date: endDate,
          is_current: exp.is_current || false,
          description: null, // Description not in form data
        };
      });

      const result =
        await professionalsService.updateProfessionalEducationExperience(
          professional.id,
          {
            educations: educationsData,
            experiences: experiencesData,
          }
        );

      if (!result.success) {
        toast.error({
          title: 'Error',
          message: result.error || 'Failed to update education and experience',
        });
        setSaving(false);
        return;
      }

      toast.success({
        title: 'Success',
        message: 'Education and experience updated successfully',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving education and experience:', error);
      toast.error({
        title: 'Error',
        message:
          error.message ||
          'Failed to save education and experience information',
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
        <Header showLogo={false} title="CV" showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading education and experience..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={false} title="CV" showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.form}>
          {/* Education */}
          <EducationInput
            educations={educations}
            onEducationsChange={setEducations}
          />

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          {/* Experience */}
          <ExperienceInput
            experiences={experiences}
            onExperiencesChange={setExperiences}
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
      </ScrollView>

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
          disabled={saving}
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
  footer: {
    padding: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
  },
});
