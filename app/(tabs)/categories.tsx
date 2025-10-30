import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Search } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { mockProfessionals, mockPromotions, mockCategories } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 3; // 3 cards visible with proper padding

interface ProfessionalSection {
  id: string;
  title: string;
  professionals: typeof mockProfessionals;
}

const professionalSections: ProfessionalSection[] = [
  {
    id: 'top-coaches',
    title: 'Top Life Coaches',
    professionals: [
      ...mockProfessionals.filter((p) => p.category === 'Lifestyle'),
      ...mockProfessionals.filter((p) => p.category === 'Health'),
      ...mockProfessionals.filter((p) => p.category === 'Business'),
      ...mockProfessionals.filter((p) => p.category === 'Finance'),
    ].slice(0, 10),
  },
  {
    id: 'mental-health',
    title: 'Mental Health Experts',
    professionals: [
      ...mockProfessionals.filter((p) => p.category === 'Health'),
      ...mockProfessionals.filter((p) => p.category === 'Lifestyle'),
      ...mockProfessionals.filter((p) => p.category === 'Technology'),
      ...mockProfessionals.filter((p) => p.category === 'Business'),
    ].slice(0, 10),
  },
  {
    id: 'business-advisors',
    title: 'Business Advisors',
    professionals: [
      ...mockProfessionals.filter((p) => p.category === 'Business'),
      ...mockProfessionals.filter((p) => p.category === 'Finance'),
      ...mockProfessionals.filter((p) => p.category === 'Technology'),
      ...mockProfessionals.filter((p) => p.category === 'Lifestyle'),
    ].slice(0, 10),
  },
  {
    id: 'tech-experts',
    title: 'Tech Innovators',
    professionals: [
      ...mockProfessionals.filter((p) => p.category === 'Technology'),
      ...mockProfessionals.filter((p) => p.category === 'Business'),
      ...mockProfessionals.filter((p) => p.category === 'Finance'),
      ...mockProfessionals.filter((p) => p.category === 'Health'),
    ].slice(0, 10),
  },
];

export default function CategoriesScreen() {
  const { theme } = useTheme();

  const renderPromotionBanner = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.bannerCard} activeOpacity={0.9}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <View style={styles.bannerOverlay}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
          <View style={styles.bannerCTA}>
            <Text style={styles.bannerCTAText}>{item.ctaText}</Text>
            <ArrowRight size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderProfessionalCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.professionalCard,
        {
          // theme.colors.card → card background
          backgroundColor: theme.colors.card,
          // theme.colors.border → card border
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => router.push(`/professional/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.avatar }} style={styles.cardAvatar} />
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.cardContent}>
        <Text
          style={[
            styles.cardName,
            {
              // theme.colors.text → professional name
              color: theme.colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[
            styles.cardTitle,
            {
              // theme.colors.textSecondary → professional role/title
              color: theme.colors.textSecondary,
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.rateContainer}>
            <Text
              style={[
                styles.rate,
                {
                  // theme.colors.pinkTwo → price highlight
                  color: theme.colors.pinkTwo,
                },
              ]}
            >
              ${item.ratePerMinute}
            </Text>
            <Text
              style={[
                styles.rateUnit,
                {
                  // theme.colors.textMuted → price unit
                  color: theme.colors.textMuted,
                },
              ]}
            >
              /min
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.profileButton,
              {
                // theme.colors.surface → bg (Light) / theme.colors.primaryLight → bg (Dark)
                backgroundColor:
                  theme.name === 'light'
                    ? theme.colors.surface
                    : theme.colors.primaryLight,
                // theme.colors.primary → border (Light only)
                borderColor:
                  theme.name === 'light' ? theme.colors.pinkTwo : 'transparent',
                borderWidth: theme.name === 'light' ? 1 : 0,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/professional/${item.id}`);
            }}
          >
            <Text
              style={[
                styles.profileButtonText,
                {
                  // theme.colors.primary → text (Light) / theme.colors.surface → text (Dark)
                  color:
                    theme.name === 'light'
                      ? theme.colors.pinkTwo
                      : theme.colors.surface,
                },
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section: ProfessionalSection) => (
    <View key={section.id} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            {
              // theme.colors.text → section title
              color: theme.colors.text,
            },
          ]}
        >
          {section.title}
        </Text>
        <TouchableOpacity
          onPress={() => {
            const inferredCategoryName = section.professionals[0]?.category || 'Technology';
            const category = mockCategories.find(c => c.name === inferredCategoryName) || mockCategories[1];
            router.push(`/category/${category.id}?name=${encodeURIComponent(category.name)}`);
          }}
        >
          <Text
            style={[
              styles.seeAllText,
              {
                // theme.colors.primary → see all link
                color: theme.colors.primary,
              },
            ]}
          >
            See All
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={section.professionals}
        renderItem={renderProfessionalCard}
        keyExtractor={(item) => `${section.id}-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        pagingEnabled={false}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          // theme.colors.background → screen background
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Header showLogo={true} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Promotional Banner Carousel */}
        <View style={styles.bannerSection}>
          <FlatList
            data={mockPromotions}
            renderItem={renderPromotionBanner}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width - 32}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerCarousel}
            ItemSeparatorComponent={() => (
              <View style={styles.bannerSeparator} />
            )}
          />
        </View>

        {/* Professional Sections */}
        <View style={styles.sectionsContainer}>
          {professionalSections.map(renderSection)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },

  // Banner Section
  bannerSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  bannerCarousel: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  bannerCard: {
    width: width - 32,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 16px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bannerContent: {
    padding: 20,
  },
  bannerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  bannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerCTAText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginRight: 6,
  },
  bannerSeparator: {
    width: 16,
  },

  // Sections
  sectionsContainer: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  seeAllText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  horizontalList: {
    paddingLeft: 16,
    paddingRight: 32,
  },
  cardSeparator: {
    width: 12,
  },

  // Professional Cards
  professionalCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.2)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }),
  },
  cardImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: (CARD_WIDTH - 60) / 2 - 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#30D158',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  cardFooter: {
    alignItems: 'center',
    gap: 8,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rate: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  rateUnit: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
