import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  Video,
  Heart,
  Share2,
  Calendar,
  FileText,
  X,
  Briefcase,
  GraduationCap,
  Award,
  MessageCircle,
  DollarSign,
  Zap,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { TabButtons } from '@/components/ui/TabButtons';
import { Card } from '@/components/ui/Card';
import { mockProfessionals } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';
import { ShareProfileModal } from '@/components/profile/ShareProfileModal';
import { mockUserProfile } from '@/mockData/user';

type TabType = 'feed' | 'about' | 'availability' | 'cv';

interface Availability {
  id: string;
  availableAt: 'every' | 'specific';
  days?: string[];
  date?: Date;
  startHour: string;
  endHour: string;
  currency: 'USD' | 'TRY' | 'EUR';
  pricePerMinute: string;
}

const mockAvailabilities: Availability[] = [
  {
    id: '1',
    availableAt: 'every',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startHour: '09:00',
    endHour: '17:00',
    currency: 'USD',
    pricePerMinute: '2.50',
  },
  {
    id: '2',
    availableAt: 'every',
    days: ['Saturday', 'Sunday'],
    startHour: '10:00',
    endHour: '18:00',
    currency: 'USD',
    pricePerMinute: '3.00',
  },
  {
    id: '3',
    availableAt: 'specific',
    date: new Date('2025-12-25'),
    startHour: '10:00',
    endHour: '14:00',
    currency: 'USD',
    pricePerMinute: '3.00',
  },
];

interface Post {
  id: string;
  content: string;
  timestamp: string;
  image?: string;
}

const mockPosts: Post[] = [
  {
    id: '1',
    content:
      "Just finished an amazing session on career pivoting! Remember: it's never too late to pursue your passion. The best time to start was yesterday, the second best time is now. 🚀",
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    content:
      'New blog post: "5 Steps to Ace Your Next Job Interview". Check it out and let me know your thoughts!',
    timestamp: '1 day ago',
  },
  {
    id: '3',
    content:
      "Celebrating 1000+ successful coaching sessions this year! Thank you all for trusting me with your career journey. Here's to many more transformations! 🎉",
    timestamp: '3 days ago',
  },
];

export default function ProfessionalProfileScreen() {
  const { id } = useLocalSearchParams();
  const professional = mockProfessionals.find((p) => p.id === id);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [cvModalVisible, setCvModalVisible] = useState(false);
  const { theme } = useTheme();

  if (!professional) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={{ color: theme.colors.primary }}>
          Professional not found
        </Text>
      </SafeAreaView>
    );
  }

  const handleCallNow = (type: 'voice' | 'video') => {
    router.push(`/call/${professional.id}?type=${type}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <View style={styles.feedContainer}>
            {mockPosts.map((post) => (
              <Card key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Image
                    source={{ uri: professional.avatar }}
                    style={styles.postAvatar}
                  />
                  <View style={styles.postHeaderText}>
                    <View style={styles.postNameRow}>
                      <Text
                        style={[
                          styles.postName,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {professional.name}
                      </Text>
                      {professional.isVerified && (
                        <ShieldCheck
                          size={20}
                          color={theme.colors.primary}
                          strokeWidth={2.5}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.postTimestamp,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {post.timestamp}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.postContent, { color: theme.colors.text }]}
                >
                  {post.content}
                </Text>
              </Card>
            ))}
            {mockPosts.length === 0 && (
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
                  No posts yet
                </Text>
              </View>
            )}
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
            {/* Urgent Call Card */}
            {mockUserProfile.urgentCallEnabled && (
              <Card
                padding="none"
                style={[
                  styles.urgentCallCard,
                  {
                    backgroundColor:
                      theme.name === 'dark' ? '#000000' : theme.colors.card,
                    borderColor:
                      theme.name === 'dark'
                        ? 'rgba(255, 255, 255, 0.3)'
                        : theme.colors.border,
                    borderWidth: 1.5,
                    padding: 16,
                    marginBottom: 16,
                  },
                ]}
              >
                <View style={styles.urgentCallHeader}>
                  <View style={styles.urgentCallHeaderLeft}>
                    <View
                      style={[
                        styles.urgentCallIconContainer,
                        {
                          backgroundColor:
                            theme.name === 'dark'
                              ? '#FFD60A' + '20'
                              : '#FFD60A' + '15',
                        },
                      ]}
                    >
                      <Zap size={20} color="#FFD60A" />
                    </View>
                    <View style={styles.urgentCallInfo}>
                      <Text
                        style={[
                          styles.urgentCallTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        Urgent Call Available
                      </Text>
                      <Text
                        style={[
                          styles.urgentCallDescription,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Available for urgent calls outside scheduled hours
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.urgentCallPriceRow}>
                  <View
                    style={[
                      styles.urgentCallPriceBadge,
                      {
                        backgroundColor:
                          theme.name === 'dark'
                            ? '#FFD60A' + '20'
                            : '#FFD60A' + '15',
                      },
                    ]}
                  >
                    <DollarSign size={16} color="#FFD60A" />
                    <Text
                      style={[
                        styles.urgentCallPriceText,
                        { color: '#FFD60A' },
                      ]}
                    >
                      {mockUserProfile.urgentCallCurrency === 'USD'
                        ? '$'
                        : mockUserProfile.urgentCallCurrency === 'TRY'
                        ? '₺'
                        : '€'}
                      {mockUserProfile.urgentCallPrice.toFixed(2)}/min
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {mockAvailabilities.length === 0 ? (
              <Card
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.card },
                ]}
              >
                <Calendar size={48} color={theme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  No Availability Set
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  This professional hasn't set their availability schedule yet
                </Text>
              </Card>
            ) : (
              mockAvailabilities.map((item) => (
                <Card
                  key={item.id}
                  padding="none"
                  style={[
                    styles.availabilityCard,
                    {
                      backgroundColor:
                        theme.name === 'dark' ? '#000000' : theme.colors.card,
                      borderColor:
                        theme.name === 'dark'
                          ? 'rgba(255, 255, 255, 0.3)'
                          : theme.colors.border,
                      borderWidth: 1.5,
                      padding: 16,
                      marginBottom: 16,
                    },
                  ]}
                >
                  {/* Header Section */}
                  <View style={styles.availabilityCardHeader}>
                    <View style={styles.availabilityCardHeaderLeft}>
                      <View
                        style={[
                          styles.availabilityIconContainer,
                          {
                            backgroundColor:
                              theme.name === 'dark'
                                ? theme.colors.accent + '20'
                                : theme.colors.accent + '15',
                          },
                        ]}
                      >
                        <Calendar
                          size={20}
                          color={
                            theme.name === 'dark'
                              ? theme.colors.accent
                              : theme.colors.accent
                          }
                        />
                      </View>
                      <View style={styles.availabilityHeaderInfo}>
                        {item.availableAt === 'every' ? (
                          <Text
                            style={[
                              styles.availabilityScheduleBadge,
                              {
                                backgroundColor:
                                  theme.name === 'dark'
                                    ? theme.colors.accent + '40'
                                    : theme.colors.accent + '25',
                                color: theme.colors.accent,
                                alignSelf: 'flex-start',
                              },
                            ]}
                          >
                            Weekly Schedule
                          </Text>
                        ) : (
                          <Text
                            style={[
                              styles.availabilityScheduleBadge,
                              {
                                backgroundColor:
                                  theme.name === 'dark'
                                    ? theme.colors.primary + '40'
                                    : theme.colors.primary + '25',
                                color: theme.colors.primary,
                                alignSelf: 'flex-start',
                              },
                            ]}
                          >
                            One-time
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Content Section */}
                  <View style={styles.availabilityCardContent}>
                    {item.availableAt === 'every' && (
                      <View style={styles.availabilityDaysContainer}>
                        {item.days?.map((day, index) => (
                          <View
                            key={index}
                            style={[
                              styles.availabilityDayTag,
                              {
                                backgroundColor: theme.colors.surface,
                                borderColor:
                                  theme.name === 'dark'
                                    ? theme.colors.accent
                                    : theme.colors.accent,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.availabilityDayTagText,
                                {
                                  color:
                                    theme.name === 'dark'
                                      ? theme.colors.accent
                                      : theme.colors.accent,
                                },
                              ]}
                            >
                              {day.substring(0, 3)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {item.availableAt === 'specific' && (
                      <View style={styles.availabilityDateContainer}>
                        <Text
                          style={[
                            styles.availabilityDateText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.date?.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    )}

                    <View style={styles.availabilityTimePriceRow}>
                      <View style={styles.availabilityTimeContainer}>
                        <Clock
                          size={16}
                          color={
                            theme.name === 'dark'
                              ? theme.colors.success
                              : theme.colors.success
                          }
                        />
                        <Text
                          style={[
                            styles.availabilityTimeText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.startHour} - {item.endHour}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.availabilityPriceBadge,
                          {
                            backgroundColor:
                              theme.name === 'dark'
                                ? theme.colors.success + '20'
                                : theme.colors.success + '15',
                          },
                        ]}
                      >
                        <DollarSign
                          size={16}
                          color={
                            theme.name === 'dark'
                              ? theme.colors.success
                              : theme.colors.success
                          }
                        />
                        <Text
                          style={[
                            styles.availabilityPriceText,
                            {
                              color:
                                theme.name === 'dark'
                                  ? theme.colors.success
                                  : theme.colors.success,
                            },
                          ]}
                        >
                          {item.currency === 'USD'
                            ? '$'
                            : item.currency === 'TRY'
                            ? '₺'
                            : '€'}
                          {item.pricePerMinute}/min
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        );

      case 'cv':
        return (
          <View style={styles.cvContainer}>
            <Card style={styles.sectionCard}>
              <View style={styles.cvSection}>
                <View style={styles.cvSectionHeader}>
                  <Briefcase size={20} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.cvSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Experience
                  </Text>
                </View>
                <View
                  style={[
                    styles.cvItem,
                    { borderLeftColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.cvItemTitle,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Senior Career Coach
                  </Text>
                  <Text
                    style={[
                      styles.cvItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    TalkConnect Inc.
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDate,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    2020 - Present
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Providing career guidance and professional development
                    coaching to 500+ clients worldwide.
                  </Text>
                </View>
                <View
                  style={[
                    styles.cvItem,
                    { borderLeftColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.cvItemTitle,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Career Development Specialist
                  </Text>
                  <Text
                    style={[
                      styles.cvItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Global Careers LLC
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDate,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    2017 - 2020
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Specialized in leadership coaching and career transitions
                    for mid to senior-level professionals.
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.cvSection}>
                <View style={styles.cvSectionHeader}>
                  <GraduationCap size={20} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.cvSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Education
                  </Text>
                </View>
                <View
                  style={[
                    styles.cvItem,
                    { borderLeftColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.cvItemTitle,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Ph.D. in Organizational Psychology
                  </Text>
                  <Text
                    style={[
                      styles.cvItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Stanford University
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDate,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    2013 - 2017
                  </Text>
                </View>
                <View
                  style={[
                    styles.cvItem,
                    { borderLeftColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.cvItemTitle,
                      { color: theme.colors.primary },
                    ]}
                  >
                    M.A. in Counseling Psychology
                  </Text>
                  <Text
                    style={[
                      styles.cvItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Columbia University
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDate,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    2011 - 2013
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.cvSection}>
                <View style={styles.cvSectionHeader}>
                  <Award size={20} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.cvSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Skills & Certifications
                  </Text>
                </View>
                <View style={styles.cvSkills}>
                  {[
                    'Career Coaching',
                    'Leadership Development',
                    'Executive Coaching',
                    'Performance Management',
                    'Talent Development',
                    'Change Management',
                  ].map((skill, index) => (
                    <View
                      key={index}
                      style={[
                        styles.cvSkillTag,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cvSkillText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
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
        showLogo={true}
        showBack={true}
        backPosition="right"
        rightButtons={[
          <View key="favorite-share" style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? theme.colors.surface
                      : theme.name === 'light'
                      ? theme.colors.brandPink
                      : '#000000',
                },
              ]}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Heart
                size={20}
                color={
                  isFavorite
                    ? theme.name === 'light'
                      ? '#FFFFFF'
                      : theme.name === 'dark'
                      ? theme.colors.error
                      : '#FFFFFF'
                    : '#FFFFFF'
                }
                fill={
                  isFavorite
                    ? theme.name === 'light'
                      ? '#FFFFFF'
                      : theme.name === 'dark'
                      ? theme.colors.error
                      : '#FFFFFF'
                    : 'transparent'
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? theme.colors.surface
                      : theme.name === 'light'
                      ? theme.colors.brandPink
                      : '#000000',
                },
              ]}
              onPress={() => setShareModalVisible(true)}
            >
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>,
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Urgent Call Button */}
        {mockUserProfile.urgentCallEnabled && (
          <TouchableOpacity
            style={styles.urgentCallButton}
            onPress={() => {
              // Handle urgent call action
            }}
          >
            <Zap size={18} color="#000000" />
            <Text style={styles.urgentCallButtonText}>
              Urgent Call Now •{' '}
              {mockUserProfile.urgentCallCurrency === 'USD'
                ? '$'
                : mockUserProfile.urgentCallCurrency === 'TRY'
                ? '₺'
                : '€'}
              {mockUserProfile.urgentCallPrice.toFixed(2)}/min
            </Text>
          </TouchableOpacity>
        )}

        {/* Profile Header */}
        <Card
          style={[styles.profileCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: professional.avatar }}
                style={styles.avatar}
              />
              {professional.isOnline && (
                <View
                  style={[
                    styles.onlineIndicator,
                    { borderColor: theme.colors.card },
                  ]}
                />
              )}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.profileName, { color: theme.colors.text }]}
                >
                  {professional.name}
                </Text>
                {professional.isVerified && (
                  <ShieldCheck
                    size={22}
                    color={theme.colors.primary}
                    strokeWidth={3}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.profileTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {professional.title}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <MapPin size={12} color={theme.colors.textMuted} />
                <Text
                  style={[
                    styles.profileLocation,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Available Worldwide
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.statsRow, { borderTopColor: theme.colors.divider }]}
          >
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {professional.rating}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Rating
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.divider },
              ]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {professional.totalCalls}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Calls
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.divider },
              ]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {mockPosts.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Posts
              </Text>
            </View>
          </View>
        </Card>

        {/* Tab Navigation */}
        <View
          style={{
            backgroundColor:
              theme.name === 'dark' ? '#000000' : theme.colors.card,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <TabButtons
            options={[
              { key: 'feed', label: 'Feed' },
              { key: 'about', label: 'About' },
              { key: 'availability', label: 'Availability' },
              { key: 'cv', label: 'CV' },
            ]}
            selectedKey={activeTab}
            onSelect={(key) => setActiveTab(key as TabType)}
            showWrapper={false}
          />
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Share Profile Modal */}
      <ShareProfileModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        professionalData={{
          id: professional.id,
          name: professional.name,
          title: professional.title,
          avatar: professional.avatar,
          rating: professional.rating,
          totalCalls: professional.totalCalls,
          isVerified: professional.isVerified,
          ratePerMinute: professional.ratePerMinute,
          specialties: professional.specialties,
        }}
      />

      {/* Call Actions */}
      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.callActionsWrapper,
          { backgroundColor: theme.colors.card },
        ]}
      >
        <View
          style={[
            styles.callActions,
            {
              borderTopColor: theme.colors.border,
              shadowColor: theme.colors.text,
            },
          ]}
        >
          <View style={styles.callButtonsRow}>
            <TouchableOpacity
              style={[
                styles.callTypeButton,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={() => handleCallNow('voice')}
            >
              <Phone size={18} color={theme.colors.surface} />
              <Text
                style={[styles.callTypeText, { color: theme.colors.surface }]}
              >
                Voice
              </Text>
            </TouchableOpacity>

            {/* Video Call Button - Hidden for now */}
            {/* <TouchableOpacity
              style={[
                styles.callTypeButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleCallNow('video')}
            >
              <Video size={18} color={theme.colors.surface} />
              <Text
                style={[styles.callTypeText, { color: theme.colors.surface }]}
              >
                Video
              </Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={[
                styles.callTypeButton,
                styles.scheduleCallButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => router.push(`/schedule-call/${professional.id}`)}
            >
              <Calendar size={18} color={theme.colors.primary} />
              <Text
                style={[styles.callTypeText, { color: theme.colors.primary }]}
              >
                Schedule
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  urgentCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD60A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  urgentCallButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  profileCard: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  feedContainer: {
    padding: 16,
  },
  postCard: {
    marginBottom: 16,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  postName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  postTimestamp: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  postContent: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
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
  availabilityCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  availabilityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  availabilityCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  availabilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityHeaderInfo: {
    flex: 1,
  },
  availabilityScheduleBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  availabilityCardContent: {
    gap: 12,
  },
  availabilityDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityDayTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  availabilityDayTagText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  availabilityDateContainer: {
    marginBottom: 4,
  },
  availabilityDateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  availabilityTimePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  availabilityTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  availabilityTimeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  availabilityPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  availabilityPriceText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  urgentCallCard: {
    borderRadius: 16,
  },
  urgentCallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgentCallHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  urgentCallIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentCallInfo: {
    flex: 1,
  },
  urgentCallTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  urgentCallDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  urgentCallPriceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  urgentCallPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  urgentCallPriceText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  cvContainer: {
    padding: 16,
  },
  cvSection: {
    marginBottom: 8,
  },
  cvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cvSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginLeft: 10,
  },
  cvItem: {
    paddingLeft: 16,
    paddingBottom: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
  },
  cvItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  cvItemSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  cvItemDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  cvItemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  cvSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cvSkillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cvSkillText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
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
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
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
  },
  scheduleCallButton: {
    borderWidth: 1.5,
  },
  callTypeText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    marginLeft: 6,
  },
});
