import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Search, Filter } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { useTheme } from '@/contexts/ThemeContext';
import { FilterModal } from '@/components/filters/FilterModal';

// ✅ API HOOKS - No mock data
import { useProfessionals } from '@/hooks/useProfessionals';
import { ProfessionalFilters } from '@/types/database.types';

// ✅ TYPE ADAPTERS
import { adaptProfessionals } from '@/utils/typeAdapters';

interface FilterState {
  priceRange: [number, number];
  rating: number;
  availability: 'all' | 'online' | 'offline' | 'quick-response';
  categories: string[];
  verifiedOnly: boolean;
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 100] as [number, number],
    rating: 0,
    availability: 'all',
    categories: [] as string[],
    verifiedOnly: false,
  });

  // ✅ Build API filters from UI state
  const apiFilters: ProfessionalFilters = {};
  
  if (filters.availability === 'online' || filters.availability === 'quick-response') {
    apiFilters.isOnline = true;
  } else if (filters.availability === 'offline') {
    apiFilters.isOnline = false;
  }
  
  if (filters.rating > 0) {
    apiFilters.minRating = filters.rating;
  }
  
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) {
    apiFilters.minRate = filters.priceRange[0];
    apiFilters.maxRate = filters.priceRange[1];
  }
  
  if (filters.verifiedOnly) {
    apiFilters.isVerified = true;
  }
  
  if (filters.categories.length > 0) {
    apiFilters.categoryId = filters.categories[0];
  }

  // ✅ FETCH FROM API
  const { data: apiProfessionals = [] } = useProfessionals(apiFilters, 100);
  
  // ✅ Convert API types
  const professionals = adaptProfessionals(apiProfessionals);

  // ✅ Client-side search filtering (for text search)
  const filteredProfessionals = professionals.filter((professional) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchesName = professional.name?.toLowerCase().includes(query);
    const matchesTitle = professional.title?.toLowerCase().includes(query);
    const matchesCategory = professional.category?.toLowerCase().includes(query);
    const matchesBio = professional.bio?.toLowerCase().includes(query);

    return matchesName || matchesTitle || matchesCategory || matchesBio;
  });

  const handleApplyFilters = (modalFilters: {
    priceRange: [number, number];
    rating: number;
    availability: 'all' | 'online' | 'quick-response';
    categories: string[];
  }) => {
    setFilters({
      ...modalFilters,
      verifiedOnly: filters.verifiedOnly,
    });
  };

  const getInitialFiltersForModal = () => ({
    priceRange: filters.priceRange,
    rating: filters.rating,
    availability:
      filters.availability === 'offline'
        ? 'all'
        : (filters.availability as 'all' | 'online' | 'quick-response'),
    categories: filters.categories,
  });

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
        resultsCountLabel={`${filteredProfessionals.length} professionals found`}
      />

      {/* Results Section */}
      {filteredProfessionals.length > 0 ? (
        <FlatList
          data={filteredProfessionals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ProfessionalCard professional={item} />}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Search size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No professionals found
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Try adjusting your search terms or filters
          </Text>
        </View>
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={getInitialFiltersForModal()}
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
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
});
