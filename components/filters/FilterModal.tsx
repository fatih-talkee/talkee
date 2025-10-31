import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { X, DollarSign, Clock, Star, RotateCcw } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';

interface FilterState {
  priceRange: [number, number];
  rating: number;
  availability: 'all' | 'online' | 'quick-response';
  categories: string[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    priceRange: [0, 100],
    rating: 0,
    availability: 'all',
    categories: [],
  });

  const priceRanges = [
    { label: 'Under $5', value: [0, 5] },
    { label: '$5 - $10', value: [5, 10] },
    { label: '$10 - $20', value: [10, 20] },
    { label: '$20+', value: [20, 100] },
  ];

  const availabilityOptions = [
    { label: 'All Professionals', value: 'all' },
    { label: 'Online Now', value: 'online' },
    { label: 'Quick Response', value: 'quick-response' },
  ];

  const categories = ['Business', 'Technology', 'Health', 'Finance', 'Lifestyle', 'Education'];

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      priceRange: [0, 100],
      rating: 0,
      availability: 'all',
      categories: [],
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#000000' }]}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Filters</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleReset}
              style={[
                styles.resetButton,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <RotateCcw size={20} color="#FFFFFF" />
              <Text style={[styles.resetText, { color: '#FFFFFF' }]}>
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Price Range</Text>
            </View>
            <View style={styles.optionsGrid}>
              {priceRanges.map((range, index) => {
                const isSelected = filters.priceRange[0] === range.value[0] && 
                                  filters.priceRange[1] === range.value[1];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.card,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => setFilters({...filters, priceRange: range.value as [number, number]})}
                  >
                    <Text style={[
                      styles.optionText,
                      {
                        color: isSelected ? '#000000' : theme.colors.text,
                      }
                    ]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Minimum Rating</Text>
            </View>
            <View style={styles.ratingOptions}>
              {[0, 3, 4, 4.5].map((rating) => {
                const isSelected = filters.rating === rating;
                return (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingOption,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.card,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => setFilters({...filters, rating})}
                  >
                    <View style={styles.ratingRow}>
                      <Star 
                        size={16} 
                        color={isSelected ? '#000000' : theme.colors.accent} 
                        fill={rating > 0 && isSelected ? '#000000' : rating > 0 ? theme.colors.accent : 'transparent'} 
                      />
                      <Text style={[
                        styles.ratingText,
                        {
                          color: isSelected ? '#000000' : theme.colors.text,
                        }
                      ]}>
                        {rating === 0 ? 'Any' : `${rating}+ stars`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Availability</Text>
            </View>
            <View style={styles.availabilityOptions}>
              {availabilityOptions.map((option) => {
                const isSelected = filters.availability === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.availabilityOption,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.card,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => setFilters({...filters, availability: option.value as any})}
                  >
                    <Text style={[
                      styles.optionText,
                      {
                        color: isSelected ? '#000000' : theme.colors.text,
                      }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const isSelected = filters.categories.includes(category);
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.card,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      }
                    ]}
                    onPress={() => {
                      const newCategories = filters.categories.includes(category)
                        ? filters.categories.filter(c => c !== category)
                        : [...filters.categories, category];
                      setFilters({...filters, categories: newCategories});
                    }}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? '#000000' : theme.colors.text,
                      }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <Button
            title="Apply Filters"
            onPress={handleApply}
            style={styles.applyButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  ratingOptions: {
    gap: 12,
  },
  ratingOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  availabilityOptions: {
    gap: 12,
  },
  availabilityOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
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
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  applyButton: {
    width: '100%',
  },
});
