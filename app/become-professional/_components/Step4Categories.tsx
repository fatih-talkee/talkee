import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { Briefcase, Check, Search, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategoriesGrouped } from '@/hooks/useCategories';
import { SectionLoading } from '@/components/ui/SectionLoading';

interface Step4CategoriesProps {
  selectedCategories: string[];
  searchQuery: string;
  onCategoryToggle: (categoryId: string) => void;
  onSearchChange: (query: string) => void;
}

export function Step4Categories({
  selectedCategories,
  searchQuery,
  onCategoryToggle,
  onSearchChange,
}: Step4CategoriesProps) {
  const { theme } = useTheme();
  const { data: categoriesGrouped, isLoading: categoriesLoading } = useCategoriesGrouped();

  // Filter categories based on search query
  const filteredGroups = useMemo(() => {
    if (!categoriesGrouped) return [];

    if (!searchQuery.trim()) {
      return categoriesGrouped;
    }

    const query = searchQuery.toLowerCase();

    return categoriesGrouped
      .map((group) => ({
        ...group,
        categories: group.categories.filter(
          (cat) =>
            cat.name.toLowerCase().includes(query) ||
            cat.description?.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.categories.length > 0);
  }, [categoriesGrouped, searchQuery]);

  return (
    <View style={[styles.stepContent, styles.stepContentCompact]}>
      <View
        style={[
          styles.iconContainerCompact,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[
            styles.iconCircleCompact,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Briefcase
            size={20}
            color={theme.colors.surface}
            strokeWidth={2.5}
          />
        </View>
      </View>

      <Text style={[styles.titleCompact, { color: theme.colors.text }]}>
        Select Categories
      </Text>
      <Text
        style={[
          styles.subtitleCompact,
          { color: theme.colors.textSecondary },
        ]}
      >
        Choose one or more categories where you can provide expertise
      </Text>

      {categoriesLoading ? (
        <SectionLoading />
      ) : (
        <>
          {/* Search Bar - Full Width with Enhanced Design */}
          <View style={styles.searchBarWrapper}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  ...(Platform.OS === 'web'
                    ? { boxShadow: `0px 0px 8px ${theme.colors.text}20` }
                    : { shadowColor: theme.colors.text }),
                },
              ]}
            >
              <Search size={20} color={theme.colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search categories..."
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, { color: theme.colors.text }]}
                autoFocus={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => onSearchChange('')}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Selected Count / Warning */}
          {selectedCategories.length > 0 ? (
            <View style={styles.selectedCountContainer}>
              <Text
                style={[
                  styles.selectedCountText,
                  { color: theme.colors.primary },
                ]}
              >
                {selectedCategories.length}{' '}
                {selectedCategories.length === 1 ? 'category' : 'categories'}{' '}
                selected
              </Text>
            </View>
          ) : (
            <View style={styles.warningContainer}>
              <Text
                style={[
                  styles.warningText,
                  { color: theme.colors.error || '#ef4444' },
                ]}
              >
                Please select at least one category to continue
              </Text>
            </View>
          )}

          {/* Grouped Categories */}
          <ScrollView
            style={styles.categoriesScroll}
            showsVerticalScrollIndicator={false}
          >
            {filteredGroups.map((group) => (
              <View key={group.id} style={styles.categoryGroup}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <Text style={styles.groupEmoji}>{group.emoji}</Text>
                  <Text
                    style={[styles.groupName, { color: theme.colors.text }]}
                  >
                    {group.name}
                  </Text>
                  <Text
                    style={[
                      styles.groupCount,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    ({group.categories.length})
                  </Text>
                </View>

                {/* Categories Grid */}
                <View style={styles.categoriesGrid}>
                  {group.categories.map((category) => {
                    const isSelected = selectedCategories.includes(
                      category.id
                    );
                    return (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => onCategoryToggle(category.id)}
                        style={[
                          styles.categoryCard,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Check
                              size={12}
                              color={theme.colors.surface}
                              strokeWidth={3}
                            />
                          </View>
                        )}
                        <Text style={styles.categoryEmoji}>
                          {category.emoji || '⭐'}
                        </Text>
                        <Text
                          style={[
                            styles.categoryName,
                            {
                              color: isSelected
                                ? theme.colors.surface
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {filteredGroups.length === 0 && (
              <View style={styles.emptySearchContainer}>
                <Search size={48} color={theme.colors.textMuted} />
                <Text
                  style={[
                    styles.emptySearchText,
                    { color: theme.colors.text },
                  ]}
                >
                  No categories found
                </Text>
                <Text
                  style={[
                    styles.emptySearchSubtext,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Try searching with different keywords
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    alignItems: 'center',
  },
  stepContentCompact: {
    alignItems: 'flex-start',
    width: '100%',
  },
  iconContainerCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  iconCircleCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCompact: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
    textAlign: 'left',
  },
  subtitleCompact: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 20,
  },
  searchBarWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
      : {
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  clearButton: {
    padding: 4,
  },
  selectedCountContainer: {
    marginBottom: 12,
  },
  selectedCountText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  warningContainer: {
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  categoriesScroll: {
    flex: 1,
    width: '100%',
  },
  categoryGroup: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  groupEmoji: {
    fontSize: 20,
  },
  groupName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  groupCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  emptySearchContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptySearchText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});

// Default export to prevent Expo Router from treating this as a route
export default null;
