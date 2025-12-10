import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Clock,
  Phone,
  Video,
  Heart,
  Share2,
  Calendar,
  MessageCircle,
  DollarSign,
  Zap,
  Briefcase,
  GraduationCap,
  Award,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { TabButtons } from '@/components/ui/TabButtons';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { ShareProfileModal } from '@/components/profile/ShareProfileModal';

// ✅ API HOOKS
import { useProfessional } from '@/hooks/useProfessionals';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useFavorites';

// ✅ TYPE ADAPTERS
import { adaptProfessional, UIProfessional } from '@/utils/typeAdapters';
import { ProfessionalWithRelations } from '@/types/database.types';

type TabType = 'feed' | 'about' | 'availability' | 'cv';

export default function ProfessionalProfileScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('about'); // Start with 'about' since feed is not implemented yet

  // ✅ Fetch professional data
  const {
    data: professionalData,
    isLoading,
    error,
  } = useProfessional(id as string);

  // ✅ Check if favorited
  const { data: isFavorite = false } = useIsFavorite(id as string);

  // ✅ Toggle favorite mutation
  const toggleFavoriteMutation = useToggleFavorite();

  // ✅ Convert to UI format
  const professional = professionalData
    ? adaptProfessional(
        professionalData as unknown as ProfessionalWithRelations
      )
    : null;

  const handleToggleFavorite = async () => {
    try {
      await toggleFavoriteMutation.mutateAsync(id as string);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleCallNow = (type: 'voice' | 'video') => {
    router.push(
      `/schedule-call/${id}?type=${type}` as Href<
        | `/schedule-call/${string}?type=video`
        | `/schedule-call/${string}?type=voice`
      >
    );
  };

  const handleScheduleCall = () => {
    router.push(`/schedule-call/${id}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading professional...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !professional) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Professional not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <View style={styles.feedContainer}>
            <View style={styles.emptyState}>
              <MessageCircle
                size={48}
                color={theme.colors.textMuted}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Feed feature coming soon
              </Text>
            </View>
          </View>
        );

      case 'about':
        return (
          <View style={styles.aboutContainer}>
            <Card style={styles.sectionCard}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.primary }]}
              >
                About Me
              </Text>
              <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
                {professional.bio}
              </Text>
            </Card>

            <Card style={styles.sectionCard}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.primary }]}
              >
                Specialties
              </Text>
              <View style={styles.specialties}>
                {professional.specialties.map((specialty, index) => (
                  <View
                    key={index}
                    style={[
                      styles.specialtyTag,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.specialtyText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {specialty}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.primary }]}
              >
                Languages
              </Text>
              <Text
                style={[
                  styles.languagesText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {professional.languages.join(', ')}
              </Text>
            </Card>
          </View>
        );

      case 'availability':
        return (
          <View style={styles.availabilityContainer}>
            <View style={styles.emptyState}>
              <Calendar
                size={48}
                color={theme.colors.textMuted}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Availability feature coming soon
              </Text>
            </View>
          </View>
        );

      case 'cv':
        return (
          <View style={styles.cvContainer}>
            <View style={styles.emptyState}>
              <Briefcase
                size={48}
                color={theme.colors.textMuted}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textMuted },
                ]}
              >
                CV feature coming soon
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        rightButtons={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.surface,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'transparent',
                },
              ]}
              onPress={() => setShareModalVisible(true)}
            >
              <Share2 size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.surface,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'transparent',
                },
              ]}
              onPress={handleToggleFavorite}
              disabled={toggleFavoriteMutation.isPending}
            >
              <Heart
                size={20}
                color={isFavorite ? theme.colors.error : theme.colors.text}
                fill={isFavorite ? theme.colors.error : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Profile Header */}
        <View
          style={[
            styles.profileHeader,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Image source={{ uri: professional.avatar }} style={styles.avatar} />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {professional.name}
              </Text>
              {professional.isVerified && (
                <ShieldCheck
                  size={24}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              )}
            </View>
            <Text style={[styles.title, { color: theme.colors.textMuted }]}>
              {professional.title}
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Star size={16} color="#FFD60A" fill="#FFD60A" />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {professional.rating.toFixed(1)}
                </Text>
              </View>
              <Text
                style={[styles.statLabel, { color: theme.colors.textMuted }]}
              >
                Rating
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Phone size={16} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {professional.totalCalls}
                </Text>
              </View>
              <Text
                style={[styles.statLabel, { color: theme.colors.textMuted }]}
              >
                Calls
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Clock size={16} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {professional.responseTime}
                </Text>
              </View>
              <Text
                style={[styles.statLabel, { color: theme.colors.textMuted }]}
              >
                Response
              </Text>
            </View>
          </View>

          {/* Online Status */}
          {professional.isOnline && (
            <View style={styles.onlineStatusContainer}>
              <View style={styles.onlineDot} />
              <Text style={[styles.onlineText, { color: '#10B981' }]}>
                Available Now
              </Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TabButtons
            selectedKey={activeTab}
            onSelect={(key: string) => setActiveTab(key as TabType)}
            options={[
              { key: 'about', label: 'About' },
              { key: 'feed', label: 'Feed' },
              { key: 'availability', label: 'Availability' },
              { key: 'cv', label: 'CV' },
            ]}
          />
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Call Actions */}
      <View
        style={[
          styles.callActionsWrapper,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View
          style={[styles.callActions, { borderTopColor: theme.colors.border }]}
        >
          <View style={styles.priceRow}>
            <DollarSign size={20} color={theme.colors.primary} />
            <Text style={[styles.priceText, { color: theme.colors.text }]}>
              ${professional.ratePerMinute}/min
            </Text>
          </View>
          <View style={styles.callButtonsRow}>
            <TouchableOpacity
              style={[
                styles.callTypeButton,
                styles.scheduleCallButton,
                {
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={handleScheduleCall}
            >
              <Calendar size={20} color={theme.colors.primary} />
              <Text
                style={[styles.callTypeText, { color: theme.colors.primary }]}
              >
                Schedule
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.callTypeButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleCallNow('voice')}
            >
              <Phone size={20} color="#FFFFFF" />
              <Text style={[styles.callTypeText, { color: '#FFFFFF' }]}>
                Call Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ShareProfileModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        professionalData={professional as unknown as UIProfessional}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    padding: 24,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    alignSelf: 'center',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  feedContainer: {
    padding: 16,
  },
  aboutContainer: {
    padding: 16,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  languagesText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  availabilityContainer: {
    padding: 16,
  },
  cvContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
  },
  callActionsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  callActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  callButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  scheduleCallButton: {
    borderWidth: 1.5,
  },
  callTypeText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});
