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
import { TagInput } from '@/components/ui/TagInput';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { FileText } from 'lucide-react-native';

export default function AboutScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profileData, professional, isLoading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [skillsCertifications, setSkillsCertifications] = useState<string[]>(
    []
  );

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
            setSpecialties(prof.specialties || []);
            setLanguages(prof.languages || []);
            setSkillsCertifications(prof.skills_certifications || []);
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
            message: 'Failed to load about me information',
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
    if (languages.length === 0) {
      toast.error({
        title: 'Validation Error',
        message: 'At least one language is required',
      });
      return;
    }

    setSaving(true);

    if (!professional?.id) {
      toast.error({
        title: 'Error',
        message: 'Professional data not found',
      });
      setSaving(false);
      return;
    }

    try {
      const result = await professionalsService.updateProfessionalAboutMe(
        professional.id,
        {
          specialties,
          languages,
          skills_certifications: skillsCertifications,
        }
      );

      if (!result.success) {
        toast.error({
          title: 'Error',
          message: result.error || 'Failed to update about me',
        });
        setSaving(false);
        return;
      }

      toast.success({
        title: 'Success',
        message: 'About me information updated successfully',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving about me:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to save about me information',
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
        <Header showLogo showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading about me information..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            About Me
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Tell users about your expertise and what makes you unique
          </Text>
        </View>

        <View style={styles.form}>
          {/* Specialties */}
          <View style={styles.tagInputWrapper}>
            <TagInput
              label="Specialties"
              tags={specialties}
              onTagsChange={setSpecialties}
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

          {/* Languages */}
          <View style={styles.tagInputWrapper}>
            <TagInput
              label="Languages"
              tags={languages}
              onTagsChange={setLanguages}
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
              onTagsChange={setSkillsCertifications}
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
              All fields are optional except languages, but a complete profile
              helps build trust and attract more clients.
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
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving || languages.length === 0}
          style={styles.saveButton}
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
  footer: {
    padding: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
  },
});
