import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Pressable,
  Platform,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  Badge,
  Clock,
  MapPin,
  Phone,
  Video,
  Heart,
  Share2,
  MessageCircle,
  Calendar,
  FileText,
  X,
  Briefcase,
  GraduationCap,
  Award,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockProfessionals } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProfessionalProfileScreen() {
  const { id } = useLocalSearchParams();
  const professional = mockProfessionals.find((p) => p.id === id);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cvModalVisible, setCvModalVisible] = useState(false);
  const { theme } = useTheme();

  if (!professional) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={{ color: theme.colors.text }}>Professional not found</Text>
      </SafeAreaView>
    );
  }

  const handleCallNow = (type: 'voice' | 'video') => {
    router.push(`/call/${professional.id}?type=${type}`);
  };

  const handleShare = async () => {
    try {
      const url = `https://talkee.app/professional/${professional.id}`;
      const message = `${professional.name} - ${professional.title}\n${url}`;
      await Share.share({ message, url, title: professional.name });
    } catch (e) {
      // no-op
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo={true}
        leftButton={
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ArrowLeft size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
        rightButton={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Heart
                size={20}
                color={isFavorite ? theme.colors.error : theme.colors.textMuted}
                fill={isFavorite ? theme.colors.error : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={handleShare}
            >
              <Share2 size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: professional.avatar }}
                style={[styles.avatar, { borderColor: theme.colors.border }]}
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
                <Text style={[styles.name, { color: theme.colors.text }]}>
                  {professional.name}
                </Text>
                {professional.isVerified && (
                  <Badge
                    size={20}
                    color={theme.colors.primary}
                    strokeWidth={2}
                  />
                )}
              </View>
              <Text
                style={[styles.title, { color: theme.colors.textSecondary }]}
              >
                {professional.title}
              </Text>
              <View style={styles.ratingRow}>
                <Star
                  size={16}
                  color={theme.colors.warning}
                  fill={theme.colors.warning}
                />
                <Text style={[styles.rating, { color: theme.colors.text }]}>
                  {professional.rating}
                </Text>
                <Text
                  style={[styles.callCount, { color: theme.colors.textMuted }]}
                >
                  ({professional.totalCalls} calls)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.badges}>
            {professional.badges.map((badge, index) => (
              <View
                key={index}
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: theme.colors.primary }]}
                >
                  {badge}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Clock size={16} color={theme.colors.textMuted} />
              <Text
                style={[
                  styles.quickStatText,
                  { color: theme.colors.textMuted },
                ]}
              >
                {professional.responseTime}
              </Text>
            </View>
            <View style={styles.quickStat}>
              <MapPin size={16} color={theme.colors.textMuted} />
              <Text
                style={[
                  styles.quickStatText,
                  { color: theme.colors.textMuted },
                ]}
              >
                {professional.languages.join(', ')}
              </Text>
            </View>
          </View>
        </Card>

        {/* About */}
        <Card style={styles.aboutCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            About
          </Text>
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
            {professional.bio}
          </Text>
        </Card>

        {/* Specialties */}
        <Card style={styles.specialtiesCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
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
                    borderColor: theme.colors.border,
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

        {/* Pricing */}
        <Card style={styles.pricingCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Pricing
          </Text>
          <View style={styles.pricingInfo}>
            <View style={styles.priceMain}>
              <Text style={[styles.price, { color: theme.colors.warning }]}>
                ${professional.ratePerMinute}
              </Text>
              <Text
                style={[styles.priceUnit, { color: theme.colors.textMuted }]}
              >
                per minute
              </Text>
            </View>
            <Text style={[styles.pricingNote, { color: theme.colors.success }]}>
              First 2 minutes are always free for new connections
            </Text>
          </View>
        </Card>

        {/* Recent Reviews */}
        <Card style={styles.reviewsCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Recent Reviews
          </Text>
          <View
            style={[styles.review, { borderBottomColor: theme.colors.divider }]}
          >
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <Text
                  style={[styles.reviewerName, { color: theme.colors.text }]}
                >
                  Sarah M.
                </Text>
                <View style={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      color={theme.colors.warning}
                      fill={theme.colors.warning}
                    />
                  ))}
                </View>
              </View>
              <Text
                style={[styles.reviewDate, { color: theme.colors.textMuted }]}
              >
                2 days ago
              </Text>
            </View>
            <Text
              style={[styles.reviewText, { color: theme.colors.textSecondary }]}
            >
              "Incredible session! Dr. Chen provided exactly the guidance I
              needed for my career transition. Highly recommend!"
            </Text>
          </View>

          <View
            style={[styles.review, { borderBottomColor: theme.colors.divider }]}
          >
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <Text
                  style={[styles.reviewerName, { color: theme.colors.text }]}
                >
                  Michael R.
                </Text>
                <View style={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      color={theme.colors.warning}
                      fill={theme.colors.warning}
                    />
                  ))}
                </View>
              </View>
              <Text
                style={[styles.reviewDate, { color: theme.colors.textMuted }]}
              >
                1 week ago
              </Text>
            </View>
            <Text
              style={[styles.reviewText, { color: theme.colors.textSecondary }]}
            >
              "Professional, insightful, and genuinely helpful. Worth every
              minute!"
            </Text>
          </View>
        </Card>

        {/* CV / Resume Section */}
        <Card style={styles.cvCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            CV / Resume
          </Text>
          <TouchableOpacity
            style={[
              styles.cvPreview,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setCvModalVisible(true)}
          >
            <FileText size={24} color={theme.colors.primary} />
            <View style={styles.cvPreviewText}>
              <Text
                style={[styles.cvPreviewTitle, { color: theme.colors.text }]}
              >
                View Professional CV
              </Text>
              <Text
                style={[
                  styles.cvPreviewSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Experience, Education & Skills
              </Text>
            </View>
            <ArrowLeft
              size={20}
              color={theme.colors.textMuted}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* CV Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cvModalVisible}
        onRequestClose={() => setCvModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <Pressable
            style={styles.modalOverlayPressable}
            onPress={() => setCvModalVisible(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Professional CV
              </Text>
              <TouchableOpacity
                onPress={() => setCvModalVisible(false)}
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <X size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Experience Section */}
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
                    { borderLeftColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={[styles.cvItemTitle, { color: theme.colors.text }]}
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
                    { borderLeftColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={[styles.cvItemTitle, { color: theme.colors.text }]}
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

              {/* Education Section */}
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
                    { borderLeftColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={[styles.cvItemTitle, { color: theme.colors.text }]}
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
                    { borderLeftColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={[styles.cvItemTitle, { color: theme.colors.text }]}
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

              {/* Skills Section */}
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
                          borderColor: theme.colors.border,
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Call Actions */}
      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.callActionsWrapper,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[
            styles.callActions,
            {
              shadowColor: '#000',
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

            <TouchableOpacity
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
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.callTypeButton,
                styles.scheduleCallButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => console.log('Schedule call')}
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
    // background: theme.colors.background
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // background: theme.colors.surface
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
    // background: theme.colors.surface
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    // border: theme.colors.border
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    borderWidth: 3,
    // border: theme.colors.card
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textSecondary
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
    marginLeft: 6,
    marginRight: 8,
  },
  callCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textMuted
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  badge: {
    // background: theme.colors.surface
    // border: theme.colors.border
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.primary
  },
  quickStats: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStatText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textMuted
    marginLeft: 6,
  },
  aboutCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textSecondary
    lineHeight: 22,
  },
  specialtiesCard: {
    marginBottom: 16,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    // background: theme.colors.surface
    // border: theme.colors.border
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    // color: theme.colors.primary
  },
  pricingCard: {
    marginBottom: 16,
  },
  pricingInfo: {
    alignItems: 'center',
  },
  priceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.warning
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textMuted
    marginLeft: 6,
  },
  pricingNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.success
    textAlign: 'center',
  },
  reviewsCard: {
    marginBottom: 16,
  },
  review: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    // border: theme.colors.divider
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    // color: theme.colors.text
    marginRight: 8,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textMuted
  },
  reviewText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textSecondary
    lineHeight: 20,
  },
  cvCard: {
    marginBottom: 16,
  },
  cvPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    // background: theme.colors.surface
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    // border: theme.colors.border
  },
  cvPreviewText: {
    flex: 1,
    marginLeft: 12,
  },
  cvPreviewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
    marginBottom: 4,
  },
  cvPreviewSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textMuted
  },
  modalOverlay: {
    flex: 1,
    // background: theme.colors.overlay
    justifyContent: 'flex-end',
  },
  modalOverlayPressable: {
    flex: 1,
  },
  modalContent: {
    // background: theme.colors.card
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    // border: theme.colors.border
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // background: theme.colors.surface
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cvSection: {
    marginBottom: 24,
  },
  cvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cvSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
    marginLeft: 10,
  },
  cvItem: {
    paddingLeft: 16,
    paddingBottom: 16,
    marginBottom: 16,
    borderLeftWidth: 2,
    // border: theme.colors.border
  },
  cvItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.text
    marginBottom: 4,
  },
  cvItemSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    // color: theme.colors.textSecondary
    marginBottom: 4,
  },
  cvItemDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textMuted
    marginBottom: 8,
  },
  cvItemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // color: theme.colors.textSecondary
    lineHeight: 20,
  },
  cvSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cvSkillTag: {
    // background: theme.colors.surface
    // border: theme.colors.border
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cvSkillText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    // color: theme.colors.primary
  },
  callActionsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // background: theme.colors.surface
  },
  callActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    // Shiny upward shadow to match tabs (no divider)
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px -8px 16px rgba(0,0,0,0.08)' }
      : {
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 8,
        }),
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
    // background: theme.colors.warning (voice) / theme.colors.primary (video)
    paddingVertical: 12,
    borderRadius: 12,
  },
  scheduleCallButton: {
    borderWidth: 1.5,
    // background: theme.colors.surface
    // border: theme.colors.primary
  },
  callTypeText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    // color: theme.colors.surface or theme.colors.primary for schedule
    marginLeft: 6,
  },
});
