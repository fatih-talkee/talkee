import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  DollarSign,
  Clock,
  RotateCcw,
  Tag,
  Star,
  Globe,
  Briefcase,
  Award,
  Wifi,
  Timer,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories } from '@/hooks/useCategories';

export interface FilterState {
  priceRange: [number, number];
  availability: 'all' | 'online' | 'urgent-call';
  categories: string[];
  featured: boolean;
  languages: string[];
  specialties: string[];
  skills: string[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: Omit<FilterState, 'featured'>) => void;
  initialFilters: Omit<FilterState, 'featured'>;
  featured?: boolean;
  onFeaturedChange?: (featured: boolean) => void;
}

export function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  featured = false,
  onFeaturedChange,
}: FilterModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: categoriesData = [] } = useCategories();
  const [filters, setFilters] = useState<FilterState>({
    ...initialFilters,
    featured,
  });

  // Calculate top padding for header (same logic as PrimaryHeader)
  const topPadding = Math.max(
    insets.top + (Platform.OS === 'android' ? 16 : 0),
    Platform.OS === 'android' ? 64 : 0
  );

  // Theme-aware selected state colors (matching backup design)
  const selectedBackground = theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary;
  const selectedTextColor = theme.name === 'light' ? '#FFFFFF' : '#1C1C1E';

  // Update filters when modal opens (sync with parent state)
  React.useEffect(() => {
    if (visible) {
      setFilters({
        ...initialFilters,
        featured,
      });
    }
  }, [visible, featured, initialFilters]);
  const [categorySearch, setCategorySearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  const priceRanges = [
    { label: 'Under $5', value: [0, 5] as [number, number] },
    { label: '$5 - $10', value: [5, 10] as [number, number] },
    { label: '$10 - $20', value: [10, 20] as [number, number] },
    { label: '$20 - $50', value: [20, 50] as [number, number] },
    { label: '$50+', value: [50, 100] as [number, number] },
  ];

  const availabilityOptions = [
    { label: 'All Professionals', value: 'all' as const, icon: Clock },
    { label: 'Online Now', value: 'online' as const, icon: Wifi },
    { label: 'Urgent Call', value: 'urgent-call' as const, icon: Timer },
  ];

  // Common languages
  const commonLanguages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic',
    'Turkish',
    'Russian',
  ];

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesData;
    const query = categorySearch.toLowerCase();
    return categoriesData.filter((cat) =>
      cat.name.toLowerCase().includes(query)
    );
  }, [categoriesData, categorySearch]);

  // Filter languages by search
  const filteredLanguages = useMemo(() => {
    if (!languageSearch.trim()) return commonLanguages;
    const query = languageSearch.toLowerCase();
    return commonLanguages.filter((lang) => lang.toLowerCase().includes(query));
  }, [languageSearch]);

  const handleApply = () => {
    const { featured, ...filtersToApply } = filters;
    onApply(filtersToApply);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      priceRange: [0, 100],
      availability: 'all',
      categories: [],
      featured: false,
      languages: [],
      specialties: [],
      skills: [],
    });
    setCategorySearch('');
    setLanguageSearch('');
    setSpecialtySearch('');
    setSkillSearch('');
  };

  const toggleCategory = (categoryId: string) => {
    setFilters({
      ...filters,
      categories: filters.categories.includes(categoryId)
        ? filters.categories.filter((id) => id !== categoryId)
        : [...filters.categories, categoryId],
    });
  };

  const toggleLanguage = (language: string) => {
    setFilters({
      ...filters,
      languages: filters.languages.includes(language)
        ? filters.languages.filter((lang) => lang !== language)
        : [...filters.languages, language],
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setFilters({
      ...filters,
      specialties: filters.specialties.includes(specialty)
        ? filters.specialties.filter((spec) => spec !== specialty)
        : [...filters.specialties, specialty],
    });
  };

  const toggleSkill = (skill: string) => {
    setFilters({
      ...filters,
      skills: filters.skills.includes(skill)
        ? filters.skills.filter((s) => s !== skill)
        : [...filters.skills, skill],
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['bottom', 'left', 'right']}
      >
        {/* Header */}
        <View style={[styles.header, {
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingTop: topPadding
        }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Filters</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleReset}
              style={[
                styles.resetButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <RotateCcw size={16} color={theme.colors.text} />
              <Text style={[styles.resetText, { color: theme.colors.text }]}>
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onClose} 
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Price Range
              </Text>
            </View>
            <View style={styles.optionsGrid}>
              {priceRanges.map((range, index) => {
                const isSelected =
                  filters.priceRange[0] === range.value[0] &&
                                  filters.priceRange[1] === range.value[1];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected
                          ? selectedBackground
                          : theme.colors.card,
                        borderColor: isSelected
                          ? selectedBackground
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters({ ...filters, priceRange: range.value })
                    }
                  >
                    <Text
                      style={[
                      styles.optionText,
                      {
                        color: isSelected ? selectedTextColor : theme.colors.text,
                        },
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={theme.colors.pinkTwo || theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Availability
              </Text>
            </View>
            <View style={styles.availabilityOptions}>
              {availabilityOptions.map((option) => {
                const isSelected = filters.availability === option.value;
                const IconComponent = option.icon;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.availabilityOption,
                      {
                        backgroundColor: isSelected
                          ? selectedBackground
                          : theme.colors.card,
                        borderColor: isSelected
                          ? selectedBackground
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters({ ...filters, availability: option.value })
                    }
                  >
                    <IconComponent size={18} color={isSelected ? selectedTextColor : theme.colors.textSecondary} />
                    
                    <Text
                      style={[
                      styles.optionText,
                      {
                        color: isSelected ? selectedTextColor : theme.colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Featured */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Featured Only
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={filters.featured}
                onValueChange={(value) => {
                  setFilters({ ...filters, featured: value });
                  onFeaturedChange?.(value);
                }}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
              />
              <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
                Show only featured professionals
              </Text>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Tag size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Categories
              </Text>
            </View>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Search categories..."
              placeholderTextColor={theme.colors.textMuted}
              value={categorySearch}
              onChangeText={setCategorySearch}
            />
            <View style={styles.categoryGrid}>
              {filteredCategories.slice(0, 20).map((category) => {
                const isSelected = filters.categories.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected
                          ? selectedBackground
                          : theme.colors.card,
                        borderColor: isSelected
                          ? selectedBackground
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text
                      style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? selectedTextColor : theme.colors.text,
                        },
                      ]}
                    >
                      {category.emoji ? `${category.emoji} ` : ''}
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredCategories.length > 20 && (
              <Text
                style={[styles.moreText, { color: theme.colors.textMuted }]}
              >
                +{filteredCategories.length - 20} more categories
              </Text>
            )}
          </View>

          {/* Languages */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Languages
              </Text>
            </View>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Search languages..."
              placeholderTextColor={theme.colors.textMuted}
              value={languageSearch}
              onChangeText={setLanguageSearch}
            />
            <View style={styles.tagGrid}>
              {filteredLanguages.map((language) => {
                const isSelected = filters.languages.includes(language);
                return (
                  <TouchableOpacity
                    key={language}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected
                          ? selectedBackground
                          : theme.colors.card,
                        borderColor: isSelected
                          ? selectedBackground
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => toggleLanguage(language)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        {
                          color: isSelected ? selectedTextColor : theme.colors.text,
                        },
                      ]}
                    >
                      {language}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Specialties */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Briefcase size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Specialties
              </Text>
            </View>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Type and press Enter to add..."
              placeholderTextColor={theme.colors.textMuted}
              value={specialtySearch}
              onChangeText={setSpecialtySearch}
              onSubmitEditing={() => {
                if (
                  specialtySearch.trim() &&
                  !filters.specialties.includes(specialtySearch.trim())
                ) {
                  toggleSpecialty(specialtySearch.trim());
                  setSpecialtySearch('');
                }
              }}
            />
            {filters.specialties.length > 0 && (
              <View style={styles.tagGrid}>
                {filters.specialties.map((specialty) => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: theme.colors.accent,
                        borderColor: theme.colors.accent,
                      },
                    ]}
                    onPress={() => toggleSpecialty(specialty)}
                  >
                    <Text style={[styles.tagChipText, { color: '#000000' }]}>
                      {specialty} <Text style={{ fontSize: 12 }}>×</Text>
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Skills & Certifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Skills & Certifications
              </Text>
            </View>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Type and press Enter to add..."
              placeholderTextColor={theme.colors.textMuted}
              value={skillSearch}
              onChangeText={setSkillSearch}
              onSubmitEditing={() => {
                if (
                  skillSearch.trim() &&
                  !filters.skills.includes(skillSearch.trim())
                ) {
                  toggleSkill(skillSearch.trim());
                  setSkillSearch('');
                }
              }}
            />
            {filters.skills.length > 0 && (
              <View style={styles.tagGrid}>
                {filters.skills.map((skill) => (
                  <TouchableOpacity
                    key={skill}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: theme.colors.accent,
                        borderColor: theme.colors.accent,
                      },
                    ]}
                    onPress={() => toggleSkill(skill)}
                  >
                    <Text style={[styles.tagChipText, { color: '#000000' }]}>
                      {skill} <Text style={{ fontSize: 12 }}>×</Text>
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 60),
            },
          ]}
        >
          <Button
            title="Apply Filters"
            onPress={handleApply}
            style={[styles.applyButton, { backgroundColor: theme.colors.pinkTwo || theme.colors.brandPink }]}
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
    paddingBottom: 16,
    minHeight: 60,
    // paddingTop will be set dynamically via inline style
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  availabilityOptions: {
    gap: 12,
  },
  availabilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
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
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tagChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  moreText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 0,
    borderTopWidth: 1,
  },
  applyButton: {
    width: '100%',
  },
});
