import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Search, Filter, X, Star } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { useTheme } from '@/contexts/ThemeContext';
import { FilterModal } from '@/components/filters/FilterModal';
import {
  useInfiniteProfessionals,
  useInfiniteSearchProfessionals,
} from '@/hooks/useProfessionals';
import { useFavorites } from '@/hooks/useFavorites';
import type { ProfessionalWithRelations } from '@/types/database.types';
import { useDebounce } from '@/hooks/useDebounce';
import { useCategories } from '@/hooks/useCategories';

interface FilterState {
  priceRange: [number, number];
  availability: 'all' | 'online' | 'urgent-call';
  categories: string[];
  featured: boolean;
  languages: string[];
  specialties: string[];
  skills: string[];
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 100] as [number, number],
    availability: 'all',
    categories: [] as string[],
    featured: false,
    languages: [] as string[],
    specialties: [] as string[],
    skills: [] as string[],
  });

  // Debounce search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get categories for displaying category names in filter chips
  const { data: categories = [] } = useCategories();
  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.name])),
    [categories]
  );

  // Determine if we should show search results
  const isSearching = debouncedSearchQuery.trim().length > 0;

  // Fetch professionals with infinite scroll (initial load - featured first)
  const {
    data: professionalsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingProfessionals,
  } = useInfiniteProfessionals();

  // Fetch search results with infinite scroll (when searching)
  const {
    data: searchData,
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
    isLoading: isLoadingSearch,
  } = useInfiniteSearchProfessionals(debouncedSearchQuery);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) count++;
    if (filters.availability !== 'all') count++;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.featured) count++;
    if (filters.languages.length > 0) count += filters.languages.length;
    if (filters.specialties.length > 0) count += filters.specialties.length;
    if (filters.skills.length > 0) count += filters.skills.length;
    return count;
  }, [filters]);

  // Flatten pages into a single array and remove duplicates
  const allProfessionals = useMemo(() => {
    let professionals: ProfessionalWithRelations[] = [];
    if (isSearching) {
      professionals = searchData?.pages.flat() || [];
    } else {
      professionals = professionalsData?.pages.flat() || [];
    }

    // Remove duplicates by professional ID
    const uniqueMap = new Map<string, ProfessionalWithRelations>();
    professionals.forEach((prof) => {
      if (!uniqueMap.has(prof.id)) {
        uniqueMap.set(prof.id, prof);
      }
    });

    return Array.from(uniqueMap.values());
  }, [isSearching, professionalsData, searchData]);

  // Apply filters to professionals
  const filteredProfessionals = useMemo(() => {
    let filtered = allProfessionals;

    // Filter by availability
    if (filters.availability === 'online') {
      filtered = filtered.filter((p) => p.is_active && p.is_available);
    } else if (filters.availability === 'urgent-call') {
      // Urgent call means available and active
      filtered = filtered.filter((p) => p.is_active && p.is_available);
  }
  
    // Filter by price range
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) {
      filtered = filtered.filter((p) => {
        const rate = p.rate_per_minute || 0;
        return rate >= filters.priceRange[0] && rate <= filters.priceRange[1];
      });
    }

    // Filter by categories
  if (filters.categories.length > 0) {
      filtered = filtered.filter((p) =>
        filters.categories.includes(p.category_id)
      );
  }

    // Filter by languages
    if (filters.languages.length > 0) {
      filtered = filtered.filter((p) => {
        const professionalLanguages = p.languages || [];
        return filters.languages.some((lang) =>
          professionalLanguages.includes(lang)
        );
      });
    }

    // Filter by specialties
    if (filters.specialties.length > 0) {
      filtered = filtered.filter((p) => {
        const professionalSpecialties = p.specialties || [];
        return filters.specialties.some((spec) =>
          professionalSpecialties.includes(spec)
        );
      });
    }

    // Filter by skills
    if (filters.skills.length > 0) {
      filtered = filtered.filter((p) => {
        const professionalSkills = p.skills_certifications || [];
        return filters.skills.some((skill) =>
          professionalSkills.includes(skill)
        );
      });
    }

    // Filter by featured
    if (filters.featured) {
      filtered = filtered.filter((p) => p.is_featured === true);
    }

    return filtered;
  }, [allProfessionals, filters]);

  const isLoading = isSearching ? isLoadingSearch : isLoadingProfessionals;
  const isFetchingMore = isSearching
    ? isFetchingNextSearchPage
    : isFetchingNextPage;
  const hasMore = isSearching ? hasNextSearchPage : hasNextPage;

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      if (isSearching) {
        fetchNextSearchPage();
      } else {
        fetchNextPage();
      }
    }
  }, [
    hasMore,
    isFetchingMore,
    isSearching,
    fetchNextPage,
    fetchNextSearchPage,
  ]);

  const handleApplyFilters = (modalFilters: Omit<FilterState, 'featured'>) => {
    setFilters({
      ...modalFilters,
      featured: filters.featured, // Keep current featured state
    });
  };

  const handleClearAllFilters = () => {
    setFilters({
      priceRange: [0, 100] as [number, number],
      availability: 'all',
      categories: [],
      featured: false,
      languages: [],
      specialties: [],
      skills: [],
    });
  };

  const getInitialFiltersForModal = useMemo(
    () => ({
    priceRange: filters.priceRange,
      availability: filters.availability,
    categories: filters.categories,
      languages: filters.languages,
      specialties: filters.specialties,
      skills: filters.skills,
    }),
    [
      filters.priceRange,
      filters.availability,
      filters.categories,
      filters.languages,
      filters.specialties,
      filters.skills,
    ]
  );

  const renderProfessional = useCallback(
    ({ item }: { item: ProfessionalWithRelations }) => (
      <ProfessionalCard professional={item} />
    ),
    []
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
          Loading more...
        </Text>
      </View>
    );
  }, [isFetchingMore, theme]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.name === 'dark' ? '#000000' : theme.colors.background,
        },
      ]}
    >
      <Header
        showLogo={true}
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
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* Search Section */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search professionals..."
        showResultsCount={true}
        resultsCount={filteredProfessionals.length}
        resultsCountLabel={`${filteredProfessionals.length} professional${
          filteredProfessionals.length !== 1 ? 's' : ''
        } found`}
      />

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <View
          style={[
            styles.activeFiltersContainer,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            {filters.availability !== 'all' && (
              <View
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#000000' }]}>
                  {filters.availability === 'online'
                    ? 'Online Now'
                    : 'Urgent Call'}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters({ ...filters, availability: 'all' })
                  }
                  style={styles.filterChipClose}
                >
                  <X size={14} color="#000000" />
                </TouchableOpacity>
              </View>
            )}
            {filters.featured && (
              <View
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Star size={14} color="#000000" fill="#000000" />
                <Text style={[styles.filterChipText, { color: '#000000' }]}>
                  Featured
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters({ ...filters, featured: false })}
                  style={styles.filterChipClose}
                >
                  <X size={14} color="#000000" />
                </TouchableOpacity>
              </View>
            )}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100) && (
              <View
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#000000' }]}>
                  ${filters.priceRange[0]}-${filters.priceRange[1]}/min
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters({ ...filters, priceRange: [0, 100] })
                  }
                  style={styles.filterChipClose}
                >
                  <X size={14} color="#000000" />
                </TouchableOpacity>
              </View>
            )}
            {filters.categories.map((categoryId) => {
              const categoryName = categoryMap.get(categoryId) || 'Category';
              return (
                <View
                  key={categoryId}
                  style={[
                    styles.filterChip,
                    { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: '#000000' }]}>
                    {categoryName}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setFilters({
                        ...filters,
                        categories: filters.categories.filter(
                          (id) => id !== categoryId
                        ),
                      })
                    }
                    style={styles.filterChipClose}
                  >
                    <X size={14} color="#000000" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {filters.languages.map((language) => (
              <View
                key={language}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#000000' }]}>
                  {language}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters({
                      ...filters,
                      languages: filters.languages.filter(
                        (lang) => lang !== language
                      ),
                    })
                  }
                  style={styles.filterChipClose}
                >
                  <X size={14} color="#000000" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.specialties.map((specialty) => (
              <View
                key={specialty}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#000000' }]}>
                  {specialty}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters({
                      ...filters,
                      specialties: filters.specialties.filter(
                        (spec) => spec !== specialty
                      ),
                    })
                  }
                  style={styles.filterChipClose}
                >
                  <X size={14} color="#000000" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.skills.map((skill) => (
              <View
                key={skill}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#000000' }]}>
                  {skill}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters({
                      ...filters,
                      skills: filters.skills.filter((s) => s !== skill),
                    })
                  }
                  style={styles.filterChipClose}
                >
                  <X size={14} color="#000000" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={handleClearAllFilters}
              style={[
                styles.clearAllButton,
                { borderColor: theme.colors.border },
              ]}
            >
              <Text
                style={[styles.clearAllText, { color: theme.colors.textMuted }]}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Results Section */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            {isSearching ? 'Searching...' : 'Loading professionals...'}
          </Text>
        </View>
      ) : filteredProfessionals.length > 0 ? (
        <FlatList
          data={filteredProfessionals}
          keyExtractor={(item) => item.id}
          renderItem={renderProfessional}
          contentContainerStyle={[
            styles.resultsContainer,
            activeFilterCount > 0 && styles.resultsContainerWithFilters,
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Search size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            {isSearching
              ? 'No professionals found'
              : 'No professionals available'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {isSearching
              ? 'Try adjusting your search terms or filters'
              : 'Check back later for new professionals'}
          </Text>
        </View>
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={getInitialFiltersForModal}
        featured={filters.featured}
        onFeaturedChange={(value) =>
          setFilters({ ...filters, featured: value })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  resultsContainerWithFilters: {
    paddingTop: 0,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  activeFiltersContainer: {
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  activeFiltersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  filterChipClose: {
    marginLeft: 2,
    padding: 2,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 4,
  },
  clearAllText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
});
