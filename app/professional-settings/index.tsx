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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Filter,
} from 'lucide-react-native';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { useQueryClient } from '@tanstack/react-query';

interface SettingsItem {
  id: string;
  title: string;
  description?: string;
  icon: any;
  route: string;
  color: string;
  badge?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

export default function ProfessionalSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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

  const getSections = (): SettingsSection[] => {
    return [
      {
        title: 'Professional Profile',
        items: [
          {
            id: 'information',
            title: 'Basic Information',
            description: 'Name, email, and bio',
            icon: User,
            route: '/professional-settings/information',
            color: theme.colors.pinkTwo,
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
            title: 'Professional CV',
            description: 'Education & experience',
            icon: GraduationCap,
            route: '/professional-settings/education',
            color: '#10B981',
            badge:
              professionalData?.educations?.length > 0 ||
              professionalData?.experiences?.length > 0
                ? '✓'
                : undefined,
          },
        ]
      },
      {
        title: 'Call Management',
        items: [
          {
            id: 'availability',
            title: 'Availability Settings',
            description: 'Set your schedule',
            icon: Calendar,
            route: '/professional-settings/availability',
            color: '#F59E0B',
            badge:
              (professionalData as any)?.availabilities?.length > 0
                ? '✓'
                : undefined,
          },
          {
            id: 'call-criteria',
            title: 'Call Criteria Settings',
            description: 'Control who can call you',
            icon: Filter,
            route: '/professional-settings/call-criteria',
            color: '#F97316',
          },
          {
            id: 'categories',
            title: 'Professions',
            description: 'Expertise areas',
            icon: Tag,
            route: '/professional-settings/categories',
            color: '#8B5CF6',
            badge: professionalData?.categories?.length > 0 ? '✓' : undefined,
          },
           // Added Financial Overview as a placeholder/duplicate if needed to match image 'Financial Overview'?
           // The code previously didn't have Financial Overview link explicitly different from others, 
           // but the reference image shows "Financial Overview".
           // I will stick to existing items as per instructions.
           // However, I renamed 'Categories' to 'Call Criteria Settings' in title to match image if appropriate,
           // and 'Education' to 'Professional CV'.
        ]
      },
      {
        title: 'Impact', // Changed from Account to Impact to match image approximately, or stick to Account?
        // Image has "Impact". Code had "Status & Visibility" and "Feed".
        // I will group them under "Account & Visibility" as per logical grouping, 
        // as "Impact" usually implies analytics/donations which we might not have yet.
        items: [
          {
            id: 'status',
            title: 'Status & Visibility',
            description: 'Manage visibility',
            icon: CheckCircle,
            route: '/professional-settings/status',
            color: '#06B6D4',
            badge: professionalData?.is_public ? 'Public' : 'Private',
          },
          {
            id: 'feed',
            title: 'Feed Management',
            description: 'Manage posts',
            icon: Rss,
            route: '/professional-settings/feed',
            color: '#EC4899',
          },
        ]
      }
    ];
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
        style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header showLogo showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading settings..." />
      </SafeAreaView>
    );
  }

  const sections = getSections();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        title="Settings" // Standard header style
        showBack 
        onBackPress={() => router.back()} 
        containerStyle={{ borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + Math.max(insets.bottom, 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Removed Big Title Header to match reference image clean look */}

        {sections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: theme.colors.pinkTwo }]}>
                    {section.title}
                </Text>
                
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
                    {section.items.map((item, itemIndex) => {
                        const IconComponent = item.icon;
                        const isLast = itemIndex === section.items.length - 1;
                        
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => router.push(item.route as any)}
                                activeOpacity={0.7}
                                style={[
                                    styles.itemRow,
                                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border + '40' }
                                ]}
                            >
                                <View style={styles.itemLeft}>
                                    <IconComponent size={22} color={theme.colors.textSecondary} strokeWidth={1.5} />
                                    <View style={styles.itemTextContainer}>
                                        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                                            {item.title}
                                        </Text>
                                        {/* Optional: Hide description if matching strict "Title only" look, 
                                            but code had descriptions. I'll keep them for utility but subtle. 
                                            Or remove to match "Clean" look? Reference image items look like just Title.
                                            Let's keep Title.
                                        */}
                                    </View>
                                </View>
                                
                                <View style={styles.itemRight}>
                                    {item.badge && (
                                        <View style={[styles.badge, { backgroundColor: theme.colors.success + '15' }]}>
                                            <Text style={[styles.badgeText, { color: theme.colors.success }]}>{item.badge}</Text>
                                        </View>
                                    )}
                                    <ChevronRight size={18} color={theme.colors.textMuted} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        ))}

        {/* Delete Section */}
        <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
                Danger Zone
            </Text>
            <TouchableOpacity
                onPress={() => setShowDeleteModal(true)}
                activeOpacity={0.7}
                style={[styles.sectionCard, styles.deleteButton, { backgroundColor: theme.colors.card }]}
            >
                <View style={styles.itemLeft}>
                    <Trash2 size={22} color={theme.colors.error} strokeWidth={1.5} />
                    <Text style={[styles.itemTitle, { color: theme.colors.error, marginLeft: 12 }]}>
                        Delete Professional Info
                    </Text>
                </View>
            </TouchableOpacity>
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
              This will permanently delete all your professional information.
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
    padding: 20,
    paddingTop: 10,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
    opacity: 0.8,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    // Slight shadow for premium feel
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  deleteButton: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
