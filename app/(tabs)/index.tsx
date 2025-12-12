import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { CategoryGrid } from '@/components/listings/CategoryGrid';
import { PromotionCarousel } from '@/components/carousel/PromotionCarousel';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { Header } from '@/components/ui/Header';

// ✅ API HOOKS
import { useFeaturedProfessionals } from '@/hooks/useProfessionals';
import { usePopularCategories } from '@/hooks/useCategories';
import { useFeaturedPromotions } from '@/hooks/usePromotions';
import { useProfile } from '@/hooks/useProfile';
import { ProfessionalWithRelations } from '@/types/database.types';

// ✅ TYPE ADAPTERS (not needed here, ProfessionalCard uses ProfessionalWithRelations directly)

export default function HomeScreen() {
  const { theme } = useTheme();

  // ✅ Get user profile to check if professional
  const { isProfessional } = useProfile();

  // ✅ Fetch featured professionals (is_featured = true from database)
  const {
    data: professionalsData = [],
    isLoading: professionalsLoading,
    error: professionalsError,
  } = useFeaturedProfessionals(4);

  // ✅ Fetch popular categories (top 8 by professional count, fallback to sort_order)
  const { data: categoriesData = [], isLoading: categoriesLoading } =
    usePopularCategories(8);

  // ✅ Fetch promotions
  const { data: promotionsData = [] } = useFeaturedPromotions(5);

  // ✅ Use professionals data directly (no need to adapt, ProfessionalCard uses ProfessionalWithRelations)
  const professionals = professionalsData;
  const categories = categoriesData;
  const promotions = promotionsData;

  // ✅ Dummy unread notification count (will be replaced with real data later)
  const unreadNotificationCount = 3;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo={true}
        rightButton={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? theme.colors.surface
                      : theme.name === 'light'
                      ? theme.colors.brandPink
                      : '#000000',
                },
              ]}
              onPress={() => router.push('/notifications/index' as any)}
            >
              <Bell size={20} color="#FFFFFF" />
              {unreadNotificationCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: theme.colors.error || '#EF4444',
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {unreadNotificationCount > 99
                      ? '99+'
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Promotion Carousel */}
        {promotions.length > 0 && (
          <View style={styles.carouselSection}>
            <PromotionCarousel
              promotions={promotions}
              isProfessional={isProfessional}
            />
          </View>
        )}

        {/* Browse by Category */}
        {categoriesLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : categories.length > 0 ? (
          <View style={styles.section}>
            <CategoryGrid categories={categories as unknown as any[]} />
          </View>
        ) : null}

        {/* Featured Professionals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Featured Professionals
            </Text>
            <Link href="/search" asChild>
              <TouchableOpacity>
                <Text
                  style={[styles.seeAllText, { color: theme.colors.primary }]}
                >
                  See All
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {professionalsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[styles.loadingText, { color: theme.colors.textMuted }]}
              >
                Loading featured professionals...
              </Text>
            </View>
          ) : professionalsError ? (
            <View style={styles.errorContainer}>
              <Text
                style={[styles.errorText, { color: theme.colors.textMuted }]}
              >
                Unable to load featured professionals
              </Text>
            </View>
          ) : professionals.length > 0 ? (
            <View style={styles.professionalsGrid}>
              {professionals.map((professional: ProfessionalWithRelations) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyText, { color: theme.colors.textMuted }]}
              >
                No featured professionals available yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  carouselSection: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  professionalsGrid: {
    paddingHorizontal: 20,
  },
  loadingSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
