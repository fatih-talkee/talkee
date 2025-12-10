import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Filter } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { FilterModal } from '@/components/filters/FilterModal';
import { useTheme } from '@/contexts/ThemeContext';

// ✅ API HOOKS
import { useProfessionals } from '@/hooks/useProfessionals';
import { useCategory } from '@/hooks/useCategories';

// ✅ TYPE ADAPTERS
import { adaptProfessionals, UIProfessional } from '@/utils/typeAdapters';
import { ProfessionalWithRelations } from '@/types/database.types';

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: [0, 100] as [number, number],
    rating: 0,
    availability: 'all' as 'all' | 'online' | 'quick-response',
    categories: [] as string[],
  });

  // ✅ Fetch category details
  const { data: categoryData } = useCategory(id as string);
  const categoryName = (name as string) || categoryData?.name || 'Category';

  // ✅ Fetch all professionals (will filter by category)
  const {
    data: professionalsData = [],
    isLoading: professionalsLoading,
    error: professionalsError,
  } = useProfessionals(id as string);

  // ✅ Convert to UI format
  const professionals = useMemo(
    () =>
      adaptProfessionals(
        professionalsData as unknown as ProfessionalWithRelations[]
      ),
    [professionalsData]
  );

  // ✅ Apply client-side filters (search, price, rating, availability)
  const filteredProfessionals = useMemo(() => {
    return professionals.filter((professional: UIProfessional) => {
      // Search filter
      const matchesSearch =
        professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        professional.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        professional.specialties.some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Price filter
      const matchesPrice =
        professional.ratePerMinute >= filters.priceRange[0] &&
        professional.ratePerMinute <= filters.priceRange[1];

      // Rating filter
      const matchesRating = professional.rating >= filters.rating;

      // Availability filter
      const matchesAvailability =
        filters.availability === 'all' ||
        (filters.availability === 'online' && professional.isOnline) ||
        (filters.availability === 'quick-response' &&
          professional.responseTime.includes('< 5'));

      return (
        matchesSearch && matchesPrice && matchesRating && matchesAvailability
      );
    });
  }, [professionals, searchQuery, filters]);

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
        resultsCount={filteredProfessionals.length}
        resultsCountLabel={`${
          filteredProfessionals.length
        } ${categoryName.toLowerCase()} professionals`}
      />

      {professionalsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading professionals...
          </Text>
        </View>
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
      ) : (
        <FlatList
          data={filteredProfessionals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProfessionalCard professional={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No professionals found
              </Text>
              <Text
                style={[styles.emptyText, { color: theme.colors.textMuted }]}
              >
                {searchQuery ||
                filters.rating > 0 ||
                filters.availability !== 'all'
                  ? `Try adjusting your search or filters to find more ${categoryName.toLowerCase()} professionals`
                  : `No ${categoryName.toLowerCase()} professionals available yet`}
              </Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
  },
});
