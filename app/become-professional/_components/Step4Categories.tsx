import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
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
  const { data: categoriesGrouped, isLoading: categoriesLoading } =
    useCategoriesGrouped();

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
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Select Categories
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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
                  { color: theme.colors.pinkTwo },
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

          {/* Categories as Pills */}
          <View style={styles.groupsContainer}>
            {filteredGroups.length > 0 ? (
              <View style={styles.categoriesGrid}>
                {filteredGroups.flatMap((group) =>
                  group.categories.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => onCategoryToggle(category.id)}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.pinkTwo || theme.colors.primary
                              : 'transparent',
                            borderColor: isSelected
                              ? theme.colors.pinkTwo || theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            {
                              color: isSelected
                                ? theme.colors.surface
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                        <Text
                          style={[
                            styles.categoryPillIcon,
                            {
                              color: isSelected
                                ? theme.colors.surface
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {isSelected ? '✓' : '+'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : (
              <View style={styles.emptySearchContainer}>
                <Search size={48} color={theme.colors.textMuted} />
                <Text
                  style={[styles.emptySearchText, { color: theme.colors.text }]}
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
          </View>
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
    alignItems: 'center',
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
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
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
    paddingVertical: 2,
    borderRadius: 24,
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
  groupsContainer: {
    width: '100%',
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  categoryPillIcon: {
    fontSize: 14,
    fontWeight: 'bold',
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
export default Step4Categories;
