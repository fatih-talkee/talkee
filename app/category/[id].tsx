import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, Filter } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { FilterModal } from '@/components/filters/FilterModal';
import { Input } from '@/components/ui/Input';
import { mockProfessionals, mockCategories } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';

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

  // Find the category details
  const category = mockCategories.find((cat) => cat.id === id);
  const categoryName = (name as string) || category?.name || 'Category';

  // Filter professionals by category
  const categoryProfessionals = mockProfessionals.filter(
    (professional) => professional.category === categoryName
  );

  // Apply additional filters
  const filteredProfessionals = categoryProfessionals.filter((professional) => {
    const matchesSearch =
      professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPrice =
      professional.ratePerMinute >= filters.priceRange[0] &&
      professional.ratePerMinute <= filters.priceRange[1];

    const matchesRating = professional.rating >= filters.rating;

    const matchesAvailability =
      filters.availability === 'all' ||
      (filters.availability === 'online' && professional.isOnline) ||
      (filters.availability === 'quick-response' &&
        professional.responseTime.includes('< 5'));

    return (
      matchesSearch && matchesPrice && matchesRating && matchesAvailability
    );
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        backPosition="right"
        rightButtons={
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setFilterVisible(true)}
          >
            <Filter size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <View
        style={[
          styles.searchSection,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.searchRow}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${categoryName.toLowerCase()} professionals...`}
            leftIcon={<Search size={20} color={theme.colors.textMuted} />}
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                marginBottom: 0,
              },
            ]}
          />
        </View>

        <View style={styles.resultsHeader}>
          <Text
            style={[styles.resultsCount, { color: theme.colors.textMuted }]}
          >
            {filteredProfessionals.length} {categoryName.toLowerCase()}{' '}
            professionals
          </Text>
          {(filters.rating > 0 || filters.availability !== 'all') && (
            <TouchableOpacity
              onPress={() =>
                setFilters({
                  priceRange: [0, 100],
                  rating: 0,
                  availability: 'all',
                  categories: [],
                })
              }
            >
              <Text
                style={[styles.clearFilters, { color: theme.colors.accent }]}
              >
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Try adjusting your search or filters to find more{' '}
              {categoryName.toLowerCase()} professionals
            </Text>
          </View>
        }
      />

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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    marginRight: 0,
    marginBottom: 0,
  },
  filterButton: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  clearFilters: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#f59e0b',
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
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
