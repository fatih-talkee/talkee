import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { CategoryGrid } from '@/components/listings/CategoryGrid';
import { PromotionCarousel } from '@/components/carousel/PromotionCarousel';
import { useTheme } from '@/contexts/ThemeContext';
import { SectionLoading } from '@/components/ui/SectionLoading';
import { InlineLoading } from '@/components/ui/InlineLoading';
import { HomeHeaderSection } from '@/components/home/HomeHeaderSection';
import { FilterModal } from '@/components/filters/FilterModal';

// ✅ API HOOKS
import { useFeaturedProfessionals } from '@/hooks/useProfessionals';
import { usePopularCategories } from '@/hooks/useCategories';
import { useFeaturedPromotions } from '@/hooks/usePromotions';
import { useProfile } from '@/hooks/useProfile';
import { ProfessionalWithRelations } from '@/types/database.types';
import { logger } from '@/lib/logger';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  // Local state for header interactions
  const [searchValue, setSearchValue] = useState('');
  const [isVerifiedSelected, setIsVerifiedSelected] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: [0, 100] as [number, number],
    availability: 'all' as 'all' | 'online' | 'urgent-call',
    categories: [] as string[],
    languages: [] as string[],
    specialties: [] as string[],
    skills: [] as string[],
  });

  // Log when home screen mounts
  useEffect(() => {
    logger.info('[Home] 🏠 Home screen mounted', {
      timestamp: new Date().toISOString(),
    });
  }, []);

  // ✅ Get user profile to check if professional
  const { isProfessional, user } = useProfile();
  
  // Get user's first name for greeting
  const userName = user?.name?.split(' ')[0] || 'User';

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

  // ✅ Use professionals data directly
  const professionals = professionalsData;
  const categories = categoriesData;
  const promotions = promotionsData;

  const handleSearchChange = (text: string) => {
    setSearchValue(text);
  };

  const handleFiltersPress = () => {
    setFilterModalVisible(true);
  };

  const handleSearchSubmit = () => {
    if (searchValue.trim() || Object.keys(filters).length > 0) {
      router.push({
        pathname: '/search-results',
        params: {
          query: searchValue,
          filters: JSON.stringify(filters)
        }
      });
    }
  };

  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
    
    router.push({
      pathname: '/search-results',
      params: {
        query: searchValue,
        filters: JSON.stringify(newFilters)
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <HomeHeaderSection
        userName={userName}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onFiltersPress={handleFiltersPress}
        onCategoryPress={() => console.log('Category filter pressed')}
        onAvailabilityPress={() => console.log('Availability filter pressed')}
        onLanguagePress={() => console.log('Language filter pressed')}
        onVerifiedToggle={() => setIsVerifiedSelected(!isVerifiedSelected)}
        isVerifiedSelected={isVerifiedSelected}
        onSubmitEditing={handleSearchSubmit}
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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
          <SectionLoading />
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
            <InlineLoading
              message="Loading featured professionals..."
              size="large"
            />
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

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        featured={isVerifiedSelected}
        onFeaturedChange={setIsVerifiedSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  carouselSection: {
    marginBottom: 16,
    marginTop: 16,
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