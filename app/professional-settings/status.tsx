import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { CheckCircle, Eye, EyeOff, Radio } from 'lucide-react-native';

export default function StatusScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profileData, professional, isLoading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

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
            setIsAvailable(prof.is_available ?? true);
            setIsPublic(prof.is_public ?? true);
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
            message: 'Failed to load status information',
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
    if (!profileData?.professional?.id) {
      toast.error({
        title: 'Error',
        message: 'Professional data not found',
      });
      return;
    }

    if (!professional?.id) {
      toast.error({
        title: 'Error',
        message: 'Professional data not found',
      });
      return;
    }

    setSaving(true);

    try {
      const result = await professionalsService.updateProfessionalStatus(
        professional.id,
        {
          is_available: isAvailable,
          is_public: isPublic,
        }
      );

      if (!result.success) {
        toast.error({
          title: 'Error',
          message: result.error || 'Failed to update status',
        });
        setSaving(false);
        return;
      }

      toast.success({
        title: 'Success',
        message: 'Status and visibility updated successfully',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving status:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to save status information',
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
        <Header showLogo={false} title="Status & Visibility" showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading status information..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={false} title="Status & Visibility" showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.form}>
          {/* Availability Status */}
          <Card
            style={[
              styles.settingCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.settingHeader}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isAvailable
                        ? theme.colors.success + '15'
                        : theme.colors.error + '15',
                    },
                  ]}
                >
                  <Radio
                    size={24}
                    color={
                      isAvailable ? theme.colors.success : theme.colors.error
                    }
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    Available Now
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {isAvailable
                      ? 'You are currently available for calls'
                      : 'You are currently unavailable for calls'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.success + '80',
                }}
                thumbColor={isAvailable ? theme.colors.success : '#f4f3f4'}
              />
            </View>
          </Card>

          {/* Public Visibility */}
          <Card
            style={[
              styles.settingCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.settingHeader}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isPublic
                        ? theme.colors.primary + '15'
                        : theme.colors.textMuted + '15',
                    },
                  ]}
                >
                  {isPublic ? (
                    <Eye size={24} color={theme.colors.primary} />
                  ) : (
                    <EyeOff size={24} color={theme.colors.textMuted} />
                  )}
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    Public Profile
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {isPublic
                      ? 'Your profile is visible to all users'
                      : 'Your profile is hidden from search and listings'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary + '80',
                }}
                thumbColor={isPublic ? theme.colors.primary : '#f4f3f4'}
              />
            </View>
          </Card>

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
              💡 Information
            </Text>
            <Text
              style={[styles.infoText, { color: theme.colors.textSecondary }]}
            >
              • <Text style={{ fontFamily: 'Inter-Bold' }}>Available Now</Text>:
              When enabled, users can see that you're online and available for
              immediate calls.
              {'\n\n'}
              • <Text style={{ fontFamily: 'Inter-Bold' }}>Public Profile</Text>:
              When enabled, your profile appears in search results and category
              listings. When disabled, only users with a direct link can view
              your profile.
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
    gap: 16,
  },
  settingCard: {
    padding: 20,
    borderWidth: 1,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
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
    lineHeight: 20,
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

