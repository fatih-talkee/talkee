import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Filter, Star } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { FilterModal } from '@/components/filters/FilterModal';
import { useTheme } from '@/contexts/ThemeContext';
import { PageLoading } from '@/components/ui/PageLoading';

// ✅ API HOOKS
import { useProfessionals } from '@/hooks/useProfessionals';
import { useCategory } from '@/hooks/useCategories';

// ✅ TYPE ADAPTERS (not needed here, ProfessionalCard uses ProfessionalWithRelations directly)
import { ProfessionalWithRelations } from '@/types/database.types';

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: [0, 100] as [number, number],
    rating: 0,
    availability: 'all' as 'all' | 'online' | 'urgent-call',
    categories: [] as string[],
    languages: [] as string[],
    specialties: [] as string[],
    skills: [] as string[],
  });

  // ✅ Fetch category details
  const { data: categoryData } = useCategory(id as string);
  const categoryName = (name as string) || categoryData?.name || 'Category';

  // ✅ Fetch all professionals (already sorted by is_featured in service)
  const {
    data: professionalsData = [],
    isLoading: professionalsLoading,
    error: professionalsError,
  } = useProfessionals(id as string);

  // ✅ Use professionals data directly (no need to adapt, ProfessionalCard uses ProfessionalWithRelations)
  const professionals = professionalsData;

  // ✅ Apply client-side filters and separate featured/regular
  const { featuredProfessionals, regularProfessionals, totalCount } =
    useMemo(() => {
      const filtered = professionals.filter(
        (professional: ProfessionalWithRelations) => {
          const userName = professional.users?.name || '';
          const title = professional.title || '';
          const specialties = professional.specialties || [];

          // Search filter
          const matchesSearch =
            userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            specialties.some((s) =>
              s.toLowerCase().includes(searchQuery.toLowerCase())
            );

          // Price filter
          const ratePerMinute = Number(professional.rate_per_minute) || 0;
          const matchesPrice =
            ratePerMinute >= filters.priceRange[0] &&
            ratePerMinute <= filters.priceRange[1];

          // Rating filter (calculate from reviews if available, otherwise 0)
          const reviews = professional.reviews || [];
          const rating =
            reviews.length > 0
              ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                reviews.length
              : 0;
          const matchesRating = rating >= filters.rating;

          // Availability filter
          const matchesAvailability =
            filters.availability === 'all' ||
            (filters.availability === 'online' && professional.is_available) ||
            (filters.availability === 'urgent-call' &&
              professional.is_available); // Simplified: urgent call = available

          return (
            matchesSearch &&
            matchesPrice &&
            matchesRating &&
            matchesAvailability
          );
        }
      );

      // Separate featured and regular professionals
      const featured = filtered.filter(
        (p: ProfessionalWithRelations) => p.is_featured
      );
      const regular = filtered.filter(
        (p: ProfessionalWithRelations) => !p.is_featured
      );

      return {
        featuredProfessionals: featured,
        regularProfessionals: regular,
        totalCount: filtered.length,
      };
    }, [professionals, searchQuery, filters]);

  // ✅ Prepare sections for SectionList
  const sections = useMemo(() => {
    const result = [];

    // Add featured section if there are featured professionals
    if (featuredProfessionals.length > 0) {
      result.push({
        title: 'Featured Professionals',
        data: featuredProfessionals,
        isFeatured: true,
      });
    }

    // Add regular section if there are regular professionals
    if (regularProfessionals.length > 0) {
      result.push({
        title: featuredProfessionals.length > 0 ? 'All Professionals' : '',
        data: regularProfessionals,
        isFeatured: false,
      });
    }

    return result;
  }, [featuredProfessionals, regularProfessionals]);

  const renderSectionHeader = ({ section }: any) => {
    if (!section.title) return null;

    return (
      <View style={styles.sectionHeader}>
        {section.isFeatured && (
          <View
            style={[
              styles.featuredBadge,
              { backgroundColor: theme.colors.brandPink },
            ]}
          >
            <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        )}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
          {section.data.length}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ProfessionalWithRelations }) => (
    <ProfessionalCard professional={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No professionals found
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
        {searchQuery || filters.rating > 0 || filters.availability !== 'all'
          ? `Try adjusting your search or filters to find more ${categoryName.toLowerCase()} professionals`
          : `No ${categoryName.toLowerCase()} professionals available yet`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        rightButtons={
          <TouchableOpacity
            style={[
              styles.headerIconButton,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? theme.colors.surface
                    : theme.name === 'light'
                    ? theme.colors.brandPink
                    : '#000000',
              },
            ]}
            onPress={() => setFilterVisible(true)}
          >
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search professionals..."
        showResultsCount={true}
        resultsCount={totalCount}
        resultsCountLabel={`${totalCount} ${categoryName.toLowerCase()} professional${
          totalCount !== 1 ? 's' : ''
        }`}
      />

      {professionalsLoading ? (
        <PageLoading message="Loading professionals..." />
      ) : professionalsError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Error loading professionals
          </Text>
          <Text
            style={[styles.errorSubtext, { color: theme.colors.textMuted }]}
          >
            Please try again later
          </Text>
        </View>
      ) : sections.length === 0 ? (
        renderEmptyState()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => (
            <View style={styles.sectionSeparator} />
          )}
        />
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(newFilters) => {
          // Preserve rating filter as FilterModal doesn't manage it
          setFilters({ ...newFilters, rating: filters.rating });
        }}
        initialFilters={filters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  listContent: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  featuredBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  separator: {
    height: 16,
  },
  sectionSeparator: {
    height: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
