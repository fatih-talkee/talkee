import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { X, DollarSign, Clock, Star } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Price Range</Text>
            </View>
            <View style={styles.optionsGrid}>
              {priceRanges.map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    filters.priceRange[0] === range.value[0] && 
                    filters.priceRange[1] === range.value[1] && styles.optionSelected
                  ]}
                  onPress={() => setFilters({...filters, priceRange: range.value as [number, number]})}
                >
                  <Text style={[
                    styles.optionText,
                    filters.priceRange[0] === range.value[0] && 
                    filters.priceRange[1] === range.value[1] && styles.optionTextSelected
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
            </View>
            <View style={styles.ratingOptions}>
              {[0, 3, 4, 4.5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.ratingOption, filters.rating === rating && styles.optionSelected]}
                  onPress={() => setFilters({...filters, rating})}
                >
                  <View style={styles.ratingRow}>
                    <Star size={16} color="#f59e0b" fill={rating > 0 ? "#f59e0b" : "transparent"} />
                    <Text style={[
                      styles.ratingText,
                      filters.rating === rating && styles.optionTextSelected
                    ]}>
                      {rating === 0 ? 'Any' : `${rating}+ stars`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Availability</Text>
            </View>
            <View style={styles.availabilityOptions}>
              {availabilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.availabilityOption, filters.availability === option.value && styles.optionSelected]}
                  onPress={() => setFilters({...filters, availability: option.value as any})}
                >
                  <Text style={[
                    styles.optionText,
                    filters.availability === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    filters.categories.includes(category) && styles.categoryChipSelected
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
                    filters.categories.includes(category) && styles.categoryChipTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
  resetText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#f59e0b',
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
    color: '#1f2937',
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  ratingOptions: {
    gap: 8,
  },
  ratingOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 8,
  },
  availabilityOptions: {
    gap: 8,
  },
  availabilityOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applyButton: {
    width: '100%',
  },
});