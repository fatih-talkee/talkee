import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Dimensions,
  Image,
} from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { FilterModal } from '@/components/filters/FilterModal';
import { PageLoading } from '@/components/ui/PageLoading';
import { SectionLoading } from '@/components/ui/SectionLoading';
import {
  useInfiniteProfessionals,
  useInfiniteSearchProfessionals,
} from '@/hooks/useProfessionals';
import { useRouter } from 'expo-router';
import { useCategories } from '@/hooks/useCategories';
import type { ProfessionalWithRelations } from '@/types/database.types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 3; // Match backup density (3 items)

interface FilterState {
  priceRange: [number, number];
  availability: 'all' | 'online' | 'urgent-call';
  categories: string[];
  featured: boolean;
  languages: string[];
  specialties: string[];
  skills: string[];
}

type TabType = 'categories' | 'interests' | 'trending';

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 100],
    availability: 'all',
    categories: [],
    featured: false,
    languages: [],
    specialties: [],
    skills: [],
  });
  // Mock user interests for now (simulating user preferences)
  const userInterests = ['Technology', 'Business', 'Health'];
  // Get categories
  const { data: categories = [] } = useCategories();

  // Fetch professionals
  const {
    data: professionalsData,
    isLoading: isLoadingProfessionals,
  } = useInfiniteProfessionals();

  // Flatten professionals
  const allProfessionals = useMemo(() => {
    return professionalsData?.pages.flat() || [];
  }, [professionalsData]);

  // Filter logic (to be expanded)
  const filteredProfessionals = useMemo(() => {
    // DEBUG: Log data availability
    return allProfessionals.filter(p => {
      const matchesSearch = !searchQuery || 
        p.users?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedCategory === 'All') return matchesSearch;

      const selectedCategoryObj = categories.find(c => c.name === selectedCategory);
      if (!selectedCategoryObj) return false;

      // Check match by ID or fallback to joined object
      const matchesCategory = (p.category_id === selectedCategoryObj.id) || 
                             (p.categories && 'id' in p.categories && p.categories.id === selectedCategoryObj.id);

      return matchesSearch && matchesCategory;
    });
  }, [allProfessionals, searchQuery, selectedCategory, categories, selectedTab]);

  const handleApplyFilters = (modalFilters: Omit<FilterState, 'featured'>) => {
    const updatedFilters = { ...modalFilters, featured: filters.featured };
    setFilters(updatedFilters);
    setFilterVisible(false);
    
    // Auto-navigate to global search results on apply filters
    router.push({
      pathname: '/search-results',
      params: {
        query: searchQuery,
        filters: JSON.stringify(updatedFilters)
      }
    });
  };

  const getInitialFiltersForModal = useMemo(() => ({
    priceRange: filters.priceRange,
    availability: filters.availability,
    categories: filters.categories,
    languages: filters.languages,
    specialties: filters.specialties,
    skills: filters.skills,
  }), [filters]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : theme.colors.background },
      ]}
    >
      <Header
        showLogo={false}
        title="Search Lists"
        leftButtons={<View style={styles.headerSpacer} />}
        rightButtons={
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal size={24} color={theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Floating Search Bar */}
      <View style={[styles.searchWrapper, { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : theme.colors.background }]}>
        <View style={[
          styles.searchContainer, 
          { 
            backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA'
          }
        ]}>
          <Search size={20} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search skills, names, or professions..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                router.push({
                  pathname: '/search-results',
                  params: { query: searchQuery }
                });
              }
            }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
        {(['categories', 'interests', 'trending'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              { color: selectedTab === tab ? theme.colors.text : theme.colors.textMuted },
              selectedTab === tab && styles.tabTextActive
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {selectedTab === tab && (
              <View style={[styles.tabIndicator, {
                backgroundColor: theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary
              }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>



      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'categories' && (
          <View style={styles.tabContentContainer}>
            {/* Category Chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.chipsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedCategory === 'All' && { backgroundColor: theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary, borderColor: 'transparent' }
                ]}
                onPress={() => setSelectedCategory('All')}
              >
                <Text style={[
                  styles.chipText,
                  selectedCategory === 'All' && { color: '#FFFFFF' }
                ]}>All</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    selectedCategory === cat.name && { backgroundColor: theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary, borderColor: 'transparent' }
                  ]}
                  onPress={() => setSelectedCategory(cat.name)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedCategory === cat.name && { color: '#FFFFFF' }
                  ]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sections */}
            <View style={styles.sectionsContainer}>
              {(selectedCategory === 'All' ? categories : categories.filter(c => c.name === selectedCategory)).map(cat => {
                // Modified filter: Use category_id OR categories object from relation
                const categoryProfessionals = filteredProfessionals.filter(p => {
                    if (p.category_id === cat.id) return true;
                    // Fallback to joined category object
                    if (p.categories && 'id' in p.categories && p.categories.id === cat.id) return true;
                    return false;
                });
                
                if (categoryProfessionals.length === 0) return null;

                return (
                  <View key={cat.id} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Top {cat.name} Experts
                      </Text>
                      <TouchableOpacity onPress={() => router.push(`/category/${cat.id}?name=${encodeURIComponent(cat.name)}` as any)}>
                        <Text style={[styles.seeAllText, { color: theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary }]}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={categoryProfessionals.slice(0, 10)}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.professionalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                          onPress={() => router.push(`/professional/${item.id}` as any)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cardImageContainer}>
                            <Image source={{ uri: item.users?.avatar_url || 'https://via.placeholder.com/150' }} style={styles.cardAvatar} />
                            {(item.is_active && item.is_available) && <View style={styles.onlineIndicator} />}
                          </View>
                          <View style={styles.cardContent}>
                            <Text numberOfLines={1} style={[styles.cardName, { color: theme.colors.text }]}>
                              {item.users?.name}
                            </Text>
                            <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>
                              {item.profession}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      keyExtractor={item => item.id}
                      ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                      snapToInterval={CARD_WIDTH + 12}
                      snapToAlignment="start"
                      decelerationRate="fast"
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {selectedTab === 'interests' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionsContainer}>
               {userInterests.map(interestName => {
                 // Try to find the category object if available
                 const categoryObj = categories.find(c => c.name === interestName);
                 const interestCatId = categoryObj?.id;

                 // Filter professionals for this interest
                 const interestProfessionals = filteredProfessionals.filter(p => {
                    // Check by ID if we found the category object
                    if (interestCatId && p.category_id === interestCatId) return true;
                    // Fallback to joined category object name match
                    if (p.categories && 'name' in p.categories && p.categories.name === interestName) return true;
                    return false;
                 });

                 if (interestProfessionals.length === 0) return null;

                 return (
                  <View key={`interest-${interestName}`} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Top {interestName} Experts
                      </Text>
                      {categoryObj && (
                        <TouchableOpacity onPress={() => router.push(`/category/${categoryObj.id}?name=${encodeURIComponent(categoryObj.name)}` as any)}>
                          <Text style={[styles.seeAllText, { color: theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.primary }]}>See All</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <FlatList
                      data={interestProfessionals.slice(0, 10)}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.professionalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                          onPress={() => router.push(`/professional/${item.id}` as any)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cardImageContainer}>
                            <Image source={{ uri: item.users?.avatar_url || 'https://via.placeholder.com/150' }} style={styles.cardAvatar} />
                            {(item.is_active && item.is_available) && <View style={styles.onlineIndicator} />}
                          </View>
                          <View style={styles.cardContent}>
                            <Text numberOfLines={1} style={[styles.cardName, { color: theme.colors.text }]}>
                              {item.users?.name}
                            </Text>
                            <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>
                              {item.profession}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      keyExtractor={item => item.id}
                      ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                      snapToInterval={CARD_WIDTH + 12}
                      snapToAlignment="start"
                      decelerationRate="fast"
                    />
                  </View>
                 );
               })}
                {/* Empty State for Interests if no data found matches any interest */}
                 {userInterests.every(interestName => {
                    const categoryObj = categories.find(c => c.name === interestName);
                    const interestCatId = categoryObj?.id;
                     return !filteredProfessionals.some(p => 
                        (interestCatId && p.category_id === interestCatId) ||
                        (p.categories && 'name' in p.categories && p.categories.name === interestName)
                     );
                 }) && (
                   <View style={styles.emptyState}>
                     <Search size={48} color={theme.colors.textMuted} />
                     <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Matches Found</Text>
                     <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                       We couldn't find professionals matching your interests right now.
                     </Text>
                   </View>
                 )}
            </View>
          </View>
        )}

        {selectedTab === 'trending' && (
          <View style={[styles.tabContentContainer, styles.gridContainer]}>
            {filteredProfessionals.slice(0, 12).map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.professionalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 12 }]}
                onPress={() => router.push(`/professional/${item.id}` as any)}
              >
                 <View style={styles.cardImageContainer}>
                  <Image source={{ uri: item.users?.avatar_url || 'https://via.placeholder.com/150' }} style={styles.cardAvatar} />
                  {(item.is_active && item.is_available) && <View style={styles.onlineIndicator} />}
                </View>
                <Text numberOfLines={1} style={[styles.cardName, { color: theme.colors.text }]}>
                  {item.users?.name}
                </Text>
                <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>
                  {item.profession}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={getInitialFiltersForModal}
        featured={filters.featured}
        onFeaturedChange={(val) => setFilters(prev => ({ ...prev, featured: val }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 10,
  },
  searchContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    padding: 0, // Remove default padding
  },
  filterIconButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  tabTextActive: {
    fontFamily: 'Inter-Bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
  },
  tabContentContainer: {
    paddingVertical: 16,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA', // Default border
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93', // Default text color
  },
  sectionsContainer: {
    marginTop: 16,
    gap: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  seeAllText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  horizontalList: {
    paddingLeft: 16,
    paddingRight: 32,
  },
  cardSeparator: {
    width: 12,
  },
  professionalCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  cardImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: (CARD_WIDTH - 60) / 2 - 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
});
