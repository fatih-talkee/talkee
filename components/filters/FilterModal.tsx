import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { X, DollarSign, Clock, Star } from 'lucide-react-native';
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
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Filters</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.resetText, { color: theme.colors.accent }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={theme.colors.accent} />
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
                      styles.option,
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
                        color: isSelected ? '#ffffff' : theme.colors.text,
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
              <Star size={20} color={theme.colors.accent} />
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
                      <Star size={16} color={theme.colors.accent} fill={rating > 0 ? theme.colors.accent : "transparent"} />
                      <Text style={[
                        styles.ratingText,
                        {
                          color: isSelected ? '#ffffff' : theme.colors.text,
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
              <Clock size={20} color={theme.colors.accent} />
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
                        color: isSelected ? '#ffffff' : theme.colors.text,
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
                        color: isSelected ? '#ffffff' : theme.colors.text,
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

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
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
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  resetText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingOptions: {
    gap: 8,
  },
  ratingOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  availabilityOptions: {
    gap: 8,
  },
  availabilityOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
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