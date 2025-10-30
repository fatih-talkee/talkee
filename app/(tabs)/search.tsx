import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Search, Star, DollarSign, Clock, Shield } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { Input } from '@/components/ui/Input';
import { mockProfessionals, mockCategories } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';

interface FilterState {
  priceRange: [number, number];
  rating: number;
  availability: 'all' | 'online' | 'offline';
  categories: string[];
  verifiedOnly: boolean;
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 20] as [number, number],
    rating: 0,
    availability: 'all',
    categories: [] as string[],
    verifiedOnly: false,
  });

  const priceRanges = [
    { label: 'Under $5', value: [0, 5] },
    { label: '$5 - $10', value: [5, 10] },
    { label: '$10 - $15', value: [10, 15] },
    { label: '$15+', value: [15, 20] },
  ];

  const filteredProfessionals = mockProfessionals.filter(professional => {
    const matchesSearch = professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         professional.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         professional.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPrice = professional.ratePerMinute >= filters.priceRange[0] && 
                        professional.ratePerMinute <= filters.priceRange[1];
    
    const matchesRating = professional.rating >= filters.rating;
    
    const matchesAvailability = filters.availability === 'all' || 
                               (filters.availability === 'online' && professional.isOnline) ||
                               (filters.availability === 'offline' && !professional.isOnline);
    
    const matchesCategories = filters.categories.length === 0 || 
                             filters.categories.includes(professional.category);

    const matchesVerification = !filters.verifiedOnly || professional.isVerified;

    return matchesSearch && matchesPrice && matchesRating && matchesAvailability && 
           matchesCategories && matchesVerification;
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, 20],
      rating: 0,
      availability: 'all',
      categories: [],
      verifiedOnly: false,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        showLogo={true}
        rightButton={
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.overlay }]}>
            <Search size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Section */}
        <View style={[styles.searchSection, { backgroundColor: theme.colors.surface }]}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search professionals..."
            leftIcon={<Search size={20} color={theme.colors.textMuted} />}
            style={[styles.searchInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          />
          
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
              {filteredProfessionals.length} professionals found
            </Text>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={[styles.clearFilters, { color: theme.colors.primary }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters Section */}
        <View style={[styles.filtersSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.filtersTitle, { color: theme.colors.text }]}>Filters</Text>
          
          {/* Category Filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <View style={styles.categoryRow}>
                {mockCategories.slice(0, 6).map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      {
                        // theme.colors.card → chip background
                        backgroundColor: filters.categories.includes(category.name) ? theme.colors.pinkTwo : theme.colors.card,
                        // theme.colors.border → chip border
                        borderColor: filters.categories.includes(category.name) ? theme.colors.pinkTwo : theme.colors.border
                      }
                    ]}
                    onPress={() => {
                      const newCategories = filters.categories.includes(category.name)
                        ? filters.categories.filter(c => c !== category.name)
                        : [...filters.categories, category.name];
                      updateFilter('categories', newCategories);
                    }}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      {
                        // theme.colors.text → chip text / theme.colors.surface → selected chip text
                        color: filters.categories.includes(category.name) ? theme.colors.surface : theme.colors.text
                      }
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Price Range Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <DollarSign size={18} color={theme.colors.accent} />
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Price Range (per minute)</Text>
            </View>
            <View style={styles.priceGrid}>
              {priceRanges.map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.priceOption,
                    {
                      // theme.colors.card → price option background
                      backgroundColor: (filters.priceRange[0] === range.value[0] && filters.priceRange[1] === range.value[1]) ? theme.colors.pinkTwo : theme.colors.card,
                      // theme.colors.border → price option border
                      borderColor: (filters.priceRange[0] === range.value[0] && filters.priceRange[1] === range.value[1]) ? theme.colors.pinkTwo : theme.colors.border
                    }
                  ]}
                  onPress={() => updateFilter('priceRange', range.value as [number, number])}
                >
                  <Text style={[
                    styles.priceOptionText,
                    {
                      // theme.colors.text → price option text / theme.colors.surface → selected price option text
                      color: (filters.priceRange[0] === range.value[0] && filters.priceRange[1] === range.value[1]) ? theme.colors.surface : theme.colors.text
                    }
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <Star size={18} color={theme.colors.accent} />
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Minimum Rating</Text>
            </View>
            <View style={styles.ratingGrid}>
              {[0, 4.0, 4.5, 4.8].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingOption,
                    {
                      // theme.colors.card → rating option background
                      backgroundColor: filters.rating === rating ? theme.colors.pinkTwo : theme.colors.card,
                      // theme.colors.border → rating option border
                      borderColor: filters.rating === rating ? theme.colors.pinkTwo : theme.colors.border
                    }
                  ]}
                  onPress={() => updateFilter('rating', rating)}
                >
                  <View style={styles.ratingContent}>
                    <Star 
                      size={14} 
                      color={theme.colors.accent} 
                      fill={rating > 0 ? theme.colors.accent : "transparent"} 
                    />
                    <Text style={[
                      styles.ratingOptionText,
                      {
                        // theme.colors.text → rating option text / theme.colors.surface → selected rating option text
                        color: filters.rating === rating ? theme.colors.surface : theme.colors.text
                      }
                    ]}>
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Availability Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <Clock size={18} color={theme.colors.success} />
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Availability</Text>
            </View>
            <View style={styles.availabilityGrid}>
              {[
                { key: 'all', label: 'All' },
                { key: 'online', label: 'Online Now' },
                { key: 'offline', label: 'Offline' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.availabilityOption,
                    {
                      // theme.colors.card → availability option background
                      backgroundColor: filters.availability === option.key ? theme.colors.pinkTwo : theme.colors.card,
                      // theme.colors.border → availability option border
                      borderColor: filters.availability === option.key ? theme.colors.pinkTwo : theme.colors.border
                    }
                  ]}
                  onPress={() => updateFilter('availability', option.key)}
                >
                  <Text style={[
                    styles.availabilityOptionText,
                    {
                      // theme.colors.text → availability option text / theme.colors.surface → selected availability option text
                      color: filters.availability === option.key ? theme.colors.surface : theme.colors.text
                    }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Verification Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <Shield size={18} color={theme.colors.primary} />
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Verification</Text>
            </View>
            <TouchableOpacity
              style={styles.verificationToggle}
              onPress={() => updateFilter('verifiedOnly', !filters.verifiedOnly)}
            >
              <View style={[
                styles.checkbox,
                {
                  // theme.colors.border → checkbox border / theme.colors.primary → selected checkbox
                  backgroundColor: filters.verifiedOnly ? theme.colors.primary : 'transparent',
                  borderColor: filters.verifiedOnly ? theme.colors.primary : theme.colors.border
                }
              ]}>
                {filters.verifiedOnly && <Text style={[styles.checkmark, { color: theme.colors.surface }]}>✓</Text>}
              </View>
              <Text style={[styles.verificationText, { color: theme.colors.text }]}>Verified professionals only</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Section */}
        <View style={[styles.resultsSection, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>Results</Text>
          {filteredProfessionals.length > 0 ? (
            filteredProfessionals.map((professional) => (
              <ProfessionalCard key={professional.id} professional={professional} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Search size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No professionals found</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                Try adjusting your search terms or filters
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
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  searchInput: {
    marginBottom: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  clearFilters: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  filtersSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 8,
  },
  filtersTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
  },
  filterGroup: {
    marginBottom: 28,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  horizontalScroll: {
    marginHorizontal: -20,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  priceOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  ratingGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  availabilityGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  availabilityOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  availabilityOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  verificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  verificationText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  resultsTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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