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
import { mockProfessionals } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';
import { FilterModal } from '@/components/filters/FilterModal';

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

  const filteredProfessionals = mockProfessionals.filter((professional) => {
    const matchesSearch =
      professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPrice =
      professional.ratePerMinute >= filters.priceRange[0] &&
      professional.ratePerMinute <= filters.priceRange[1];

    const matchesRating = professional.rating >= filters.rating;

    const matchesAvailability =
      filters.availability === 'all' ||
      (filters.availability === 'online' && professional.isOnline) ||
      (filters.availability === 'offline' && !professional.isOnline) ||
      (filters.availability === 'quick-response' && professional.isOnline);

    const matchesCategories =
      filters.categories.length === 0 ||
      filters.categories.includes(professional.category);

    const matchesVerification =
      !filters.verifiedOnly || professional.isVerified;

    return (
      matchesSearch &&
      matchesPrice &&
      matchesRating &&
      matchesAvailability &&
      matchesCategories &&
      matchesVerification
    );
  });

  const handleApplyFilters = (modalFilters: {
    priceRange: [number, number];
    rating: number;
    availability: 'all' | 'online' | 'quick-response';
    categories: string[];
  }) => {
    setFilters({
      ...modalFilters,
      verifiedOnly: filters.verifiedOnly, // Keep verifiedOnly as is for now
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
              { backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.name === 'light' ? theme.colors.brandPink : '#000000' },
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
          <Text
            style={[styles.emptyText, { color: theme.colors.textMuted }]}
          >
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
