import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Filter, Search as SearchIcon, X } from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useInfiniteSearchProfessionals } from '@/hooks/useProfessionals';
import { FilterModal, FilterState } from '@/components/filters/FilterModal';
import { ProfessionalWithRelations } from '@/types/database.types';

export default function SearchResultsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string; filters?: string }>();

  const [searchInput, setSearchInput] = useState(params.query || '');
  
  const activeFilters: Partial<FilterState> | undefined = useMemo(() => {
    if (!params.filters) return undefined;
    try {
      return JSON.parse(params.filters);
    } catch (e) {
      return undefined;
    }
  }, [params.filters]);

  const [filterVisible, setFilterVisible] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteSearchProfessionals(params.query || '', activeFilters);

  const professionals = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  const handleSearchSubmit = () => {
    router.setParams({ query: searchInput, filters: params.filters || '' });
  };

  const handleApplyFilters = (newFilters: Omit<FilterState, 'featured'>) => {
    const updatedFilters = { ...newFilters, featured: activeFilters?.featured ?? false };
    router.setParams({ filters: JSON.stringify(updatedFilters) });
  };

  const clearSearch = () => {
    setSearchInput('');
    router.setParams({ query: '', filters: params.filters || '' });
  };

  const topPadding = Math.max(
    insets.top + (Platform.OS === 'android' ? 12 : 0),
    Platform.OS === 'android' ? 60 : 0
  );

  const renderItem = ({ item }: { item: ProfessionalWithRelations }) => (
    <TouchableOpacity
      style={[
        styles.professionalCard,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
      onPress={() => router.push(`/professional/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: item.users?.avatar_url || 'https://via.placeholder.com/150' }}
          style={styles.cardAvatar}
        />
        {item.is_active && item.is_available && <View style={styles.onlineIndicator} />}
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
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : theme.colors.surface,
            borderBottomColor: theme.colors.border,
            borderBottomWidth: 1,
            paddingTop: topPadding,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>

        <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
          <SearchIcon size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search professionals..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setFilterVisible(true)}
        >
          <Filter color={theme.colors.text} size={24} />
          {activeFilters && Object.keys(activeFilters).length > 0 && (
            <View style={[styles.filterDot, { backgroundColor: theme.colors.pinkTwo || '#FF4B4B' }]} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : professionals.length === 0 ? (
        <View style={styles.centerContainer}>
          <SearchIcon size={48} color={theme.colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Results Found</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Try adjusting your search query or filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={professionals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ margin: 16 }} />
            ) : null
          }
        />
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={
          (activeFilters as Omit<FilterState, 'featured'>) || {
            priceRange: [0, 100],
            availability: 'all',
            categories: [],
            languages: [],
            specialties: [],
            skills: [],
          }
        }
        featured={activeFilters?.featured ?? false}
        onFeaturedChange={(val) => {
          const newFilters = { ...(activeFilters || {}), featured: val };
          router.setParams({ filters: JSON.stringify(newFilters) });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  columnWrapper: {
    gap: 16,
  },
  professionalCard: {
    flex: 1,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5EA',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: '25%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardContent: {
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
