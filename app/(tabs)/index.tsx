import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { CategoryGrid } from '@/components/listings/CategoryGrid';
import { PromotionCarousel } from '@/components/carousel/PromotionCarousel';
import { useTheme } from '@/contexts/ThemeContext';
import { SectionLoading } from '@/components/ui/SectionLoading';
import { InlineLoading } from '@/components/ui/InlineLoading';
import { HomeHeaderSection } from '@/components/home/HomeHeaderSection';
import { FilterModal } from '@/components/filters/FilterModal';
import { VideoCallTest } from '@/components/video/VideoCallTest';

// ✅ API HOOKS
import { useFeaturedProfessionals } from '@/hooks/useProfessionals';
import { usePopularCategories } from '@/hooks/useCategories';
import { useFeaturedPromotions } from '@/hooks/usePromotions';
import { useProfile } from '@/hooks/useProfile';
import { ProfessionalWithRelations } from '@/types/database.types';
import { logger } from '@/lib/logger';
import { useEffect } from 'react';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  // Local state for header interactions
  const [searchValue, setSearchValue] = useState('');
  const [twilioVideoStatus, setTwilioVideoStatus] = useState<string | null>(null);
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

    // --- DEBUG: Access Token ---
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          console.log('\\n====================================');
          console.log('🔑 [DEBUG] SUPABASE ACCESS TOKEN:');
          console.log(data.session.access_token);
          console.log('====================================\\n');
        }
      });
    });
    // ---------------------------

    // --- DEBUG: Twilio Video SDK Smoke Test ---
    import('@twilio/video-react-native-sdk')
      .then((TwilioVideo) => {
        console.log('\\n====================================');
        console.log('🎥 [DEBUG] TWILIO VIDEO SDK LOADED');
        console.log('Exports:', Object.keys(TwilioVideo));
        console.log('Native Module exists:', !!TwilioVideo.default);
        console.log('====================================\\n');
        setTwilioVideoStatus('✅ Twilio Video SDK API Loaded (See Console)');
      })
      .catch((error) => {
        console.error('\\n====================================');
        console.error('❌ [DEBUG] TWILIO VIDEO SDK ERROR');
        console.error(error);
        console.error('====================================\\n');
        setTwilioVideoStatus(`❌ Twilio Video Error: ${error.message}`);
      });
    // ------------------------------------------
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
    // Debounce search logic would go here or navigate to search page
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
    
    // Launch global search with new filters applying current search text
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
      {/* 
        ✅ NEW HEADER integration 
        Note: Removed SafeAreaView top edge locally because the header handles its own safe area padding
        to allow the background color to extend to the top of the screen.
      */}
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

      {/* --- DEBUG BANNER --- */}
      {twilioVideoStatus && (
        <View style={{ backgroundColor: twilioVideoStatus.includes('Error') ? '#fee2e2' : '#dcfce7', padding: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: twilioVideoStatus.includes('Error') ? '#991b1b' : '#166534', fontFamily: 'Inter-Medium' }}>
            {twilioVideoStatus}
          </Text>
        </View>
      )}
      {/* ------------------ */}

      {/* --- MVP VIDEO TEST --- */}
      <VideoCallTest />

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
    marginTop: 16, // Added spacing since header is different
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