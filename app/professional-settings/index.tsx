import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/PageLoading';
import {
  User,
  FileText,
  GraduationCap,
  Tag,
  Calendar,
  CheckCircle,
  Rss,
  Trash2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { useQueryClient } from '@tanstack/react-query';

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  color: string;
  badge?: string;
}

export default function ProfessionalSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { profileData } = useProfile();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadProfessionalData = async () => {
      if (profileData?.user?.id) {
        try {
          const result = await professionalsService.getProfessionalByUserId(
            profileData.user.id
          );
          if (result.success && result.professional) {
            setProfessionalData(result.professional as any);
          }
        } catch (error) {
          console.error('Error loading professional data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadProfessionalData();
  }, [profileData]);

  const getSettingsItems = (): SettingsItem[] => {
    const items: SettingsItem[] = [
      {
        id: 'information',
        title: 'Information',
        description: 'Name, email, and bio',
        icon: User,
        route: '/professional-settings/information',
        color: theme.colors.primary,
        badge: professionalData?.bio ? '✓' : undefined,
      },
      {
        id: 'about',
        title: 'About Me',
        description: 'Specialties, languages, and skills',
        icon: FileText,
        route: '/professional-settings/about',
        color: '#3B82F6',
        badge:
          professionalData?.specialties?.length > 0 ||
          professionalData?.languages?.length > 0
            ? '✓'
            : undefined,
      },
      {
        id: 'education',
        title: 'Education & Experience',
        description: 'Academic background and work history',
        icon: GraduationCap,
        route: '/professional-settings/education',
        color: '#10B981',
        badge:
          professionalData?.educations?.length > 0 ||
          professionalData?.experiences?.length > 0
            ? '✓'
            : undefined,
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Select your expertise areas',
        icon: Tag,
        route: '/professional-settings/categories',
        color: '#8B5CF6',
        badge: professionalData?.categories?.length > 0 ? '✓' : undefined,
      },
      {
        id: 'availability',
        title: 'Availability',
        description: 'Set your schedule and pricing',
        icon: Calendar,
        route: '/professional-settings/availability',
        color: '#F59E0B',
        badge:
          (professionalData as any)?.availabilities?.length > 0
            ? '✓'
            : undefined,
      },
      {
        id: 'status',
        title: 'Status & Visibility',
        description: 'Manage your profile visibility',
        icon: CheckCircle,
        route: '/professional-settings/status',
        color: '#06B6D4',
        badge: professionalData?.is_public ? 'Public' : 'Private',
      },
      {
        id: 'feed',
        title: 'Feed Management',
        description: 'Manage your posts and content',
        icon: Rss,
        route: '/professional-settings/feed',
        color: '#EC4899',
      },
    ];

    return items;
  };

  const handleDeleteProfessional = async () => {
    if (!professionalData?.id) {
      toast.show('No professional profile found', 'error');
      return;
    }

    setDeleting(true);
    try {
      const result = await professionalsService.deleteProfessional(
        professionalData.id
      );

      if (result.success) {
        toast.show('Professional profile deleted successfully', 'success');

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['professionals'] });

        // Navigate back to profile
        router.back();
      } else {
        toast.show(
          result.error || 'Failed to delete professional profile',
          'error'
        );
      }
    } catch (error: any) {
      console.error('Error deleting professional:', error);
      toast.show(error.message || 'An error occurred', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack onBackPress={() => router.push('/(tabs)')} />
        <PageLoading message="Loading professional settings..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack onBackPress={() => router.push('/(tabs)')} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Professional Settings
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Manage your professional profile
          </Text>
        </View>

        <View style={styles.section}>
          {getSettingsItems().map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  if (!item.route) {
                    console.error('Route is missing for item:', item.id);
                    return;
                  }
                  try {
                    router.push(item.route as any);
                  } catch (error) {
                    console.error('Navigation error:', error);
                  }
                }}
                activeOpacity={0.7}
              >
                <Card
                  style={[
                    styles.settingsCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: item.color + '15' },
                      ]}
                    >
                      <IconComponent size={24} color={item.color} />
                    </View>
                    <View style={styles.cardText}>
                      <View style={styles.cardHeader}>
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor:
                                  item.badge === '✓'
                                    ? theme.colors.success + '20'
                                    : theme.colors.primary + '20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                {
                                  color:
                                    item.badge === '✓'
                                      ? theme.colors.success
                                      : theme.colors.primary,
                                },
                              ]}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.cardDescription,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.description}
                      </Text>
                    </View>
                    <ChevronRight
                      size={20}
                      color={theme.colors.textMuted}
                      style={styles.chevron}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Delete Professional Info Section */}
        <View style={styles.deleteSection}>
          <Card
            style={[
              styles.deleteCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.error + '40',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.7}
              style={styles.deleteButton}
            >
              <View
                style={[
                  styles.deleteIconContainer,
                  { backgroundColor: theme.colors.error + '15' },
                ]}
              >
                <Trash2 size={24} color={theme.colors.error} />
              </View>
              <View style={styles.deleteText}>
                <Text
                  style={[styles.deleteTitle, { color: theme.colors.error }]}
                >
                  Delete Professional Info
                </Text>
                <Text
                  style={[
                    styles.deleteDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Remove all professional information. You can still use the app
                  as a regular user.
                </Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !deleting && setShowDeleteModal(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: theme.colors.error + '15' },
              ]}
            >
              <AlertTriangle size={32} color={theme.colors.error} />
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Delete Professional Info?
            </Text>

            <Text
              style={[
                styles.modalDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              This will permanently delete all your professional information,
              including:
            </Text>

            <View style={styles.modalList}>
              <Text
                style={[
                  styles.modalListItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                • Your professional profile
              </Text>
              <Text
                style={[
                  styles.modalListItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                • Education and experience
              </Text>
              <Text
                style={[
                  styles.modalListItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                • Availability schedules
              </Text>
              <Text
                style={[
                  styles.modalListItem,
                  { color: theme.colors.textSecondary },
                ]}
              >
                • Feed posts
              </Text>
            </View>

            <Text style={[styles.modalNote, { color: theme.colors.textMuted }]}>
              You can still use the app as a regular user.
            </Text>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowDeleteModal(false)}
                variant="outline"
                disabled={deleting}
                style={styles.modalCancelButton}
              />
              <Button
                title={deleting ? 'Deleting...' : 'Delete'}
                onPress={handleDeleteProfessional}
                variant="danger"
                disabled={deleting}
                style={styles.modalDeleteButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingBottom: 40,
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
  section: {
    gap: 12,
    marginBottom: 32,
  },
  settingsCard: {
    padding: 16,
    marginBottom: 0,
  },
  cardContent: {
    flexDirection: 'row',
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
  cardText: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 8,
  },
  deleteSection: {
    marginTop: 8,
  },
  deleteCard: {
    padding: 16,
    borderWidth: 1.5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deleteText: {
    flex: 1,
  },
  deleteTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  deleteDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalList: {
    width: '100%',
    marginBottom: 16,
  },
  modalListItem: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 4,
  },
  modalNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
  },
  modalDeleteButton: {
    flex: 1,
  },
});
