import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { useCategoriesGrouped } from '@/hooks/useCategories';
import { Search, X } from 'lucide-react-native';

export default function CategoriesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profileData, professional, isLoading: profileLoading } = useProfile();
  const { data: categoriesGrouped, isLoading: categoriesLoading } =
    useCategoriesGrouped();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (profileData?.user?.id && profileData?.professional?.id) {
        try {
          setLoading(true);
          const result = await professionalsService.getProfessionalByUserId(
            profileData.user.id
          );

          if (result.success && result.professional) {
            const prof = result.professional;
            if (prof.categories && Array.isArray(prof.categories)) {
              setSelectedCategories(prof.categories.map((cat: any) => cat.id));
            } else {
              setSelectedCategories([]);
            }
          } else {
            toast.error({
              title: 'Error',
              message: result.error || 'Failed to load professional data',
            });
          }
        } catch (error: any) {
          console.error('Error loading data:', error);
          toast.error({
            title: 'Error',
            message: 'Failed to load categories',
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadData();
  }, [profileData]);

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

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSave = async () => {
    if (!profileData?.professional?.id || !professional?.id) {
      toast.error({
        title: 'Error',
        message: 'Professional data not found',
      });
      return;
    }

    // Validation
    if (selectedCategories.length === 0) {
      toast.error({
        title: 'Validation Error',
        message: 'Please select at least one category',
      });
      return;
    }

    setSaving(true);

    try {
      const result = await professionalsService.updateProfessionalCategories(
        professional.id,
        selectedCategories
      );

      if (!result.success) {
        toast.error({
          title: 'Error',
          message: result.error || 'Failed to update categories',
        });
        setSaving(false);
        return;
      }

      toast.success({
        title: 'Success',
        message: 'Categories updated successfully',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving categories:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to save categories',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading || categoriesLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header showLogo={false} title="Call Criteria" showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading categories..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo={false} title="Call Criteria" showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
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
              onChangeText={setSearchQuery}
              placeholder="Search categories..."
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.searchInput, { color: theme.colors.text }]}
              autoFocus={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
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
              Please select at least one category
            </Text>
          </View>
        )}

        {/* Categories as Pills - Flattened List from all groups */}
        <View style={styles.categoriesGrid}>
          {filteredGroups.length > 0 ? (
            filteredGroups.flatMap((group) =>
              group.categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => handleCategoryToggle(category.id)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.pinkTwo
                          : 'transparent',
                        borderColor: isSelected
                          ? theme.colors.pinkTwo
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
            )
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

      </ScrollView>

      {/* Footer with Save Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 60),
          },
        ]}
      >
        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving || selectedCategories.length === 0}
          style={[styles.saveButton, { backgroundColor: theme.colors.pinkTwo }]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
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
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
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
    width: '100%',
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
  footer: {
    padding: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
  },
});
