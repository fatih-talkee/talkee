import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { useToast } from '@/lib/toastService';
import { PageLoading } from '@/components/ui/PageLoading';

// ✅ API HOOKS
import { useFavorites, useRemoveFavorite } from '@/hooks/useFavorites';

// ✅ TYPES
import type { ProfessionalWithRelations } from '@/types/database.types';

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Fetch favorites from API
  const { data: favorites = [], isLoading, error } = useFavorites();

  // ✅ Remove favorite mutation
  const removeFavoriteMutation = useRemoveFavorite();

  // ✅ Client-side search filter
  const filteredFavorites = useMemo(() => {
    if (!searchQuery) return favorites;

    const query = searchQuery.toLowerCase();
    return favorites.filter(
      (professional: ProfessionalWithRelations) => {
        const userName = professional.users?.name || '';
        const title = professional.title || '';
        const categoryName = professional.categories?.name || '';
        const specialties = professional.specialties || [];

        return (
          userName.toLowerCase().includes(query) ||
          title.toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query) ||
          specialties.some((s) => s.toLowerCase().includes(query))
        );
      }
    );
  }, [favorites, searchQuery]);

  const handleUnfavorite = async (professionalId: string) => {
    if (!professionalId) {
      console.error('❌ Invalid professional ID');
      return;
    }

    try {
      await removeFavoriteMutation.mutateAsync(professionalId);
      toast.success({
        title: 'Removed from Favorites',
        message: 'This professional has been removed from your favorites',
      });
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
      toast.error({
        title: 'Error',
        message: 'Failed to remove from favorites',
      });
    }
  };

  // ✅ Render individual item
  const renderItem = ({ item }: { item: ProfessionalWithRelations }) => {
    // Validate item has required fields
    if (!item?.id) {
      console.error('❌ Invalid professional item:', item);
      return null;
    }

    return (
      <View style={styles.cardWrapper}>
        <ProfessionalCard professional={item} />
        <TouchableOpacity
          style={[
            styles.favoriteButton,
            {
              backgroundColor:
                theme.name === 'dark' ? '#000000' : theme.colors.surface,
              borderWidth: theme.name === 'dark' ? 1 : 0,
              borderColor:
                theme.name === 'dark'
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'transparent',
            },
          ]}
          onPress={() => handleUnfavorite(item.id)}
          disabled={removeFavoriteMutation.isPending}
        >
          <Heart
            size={20}
            color={
              theme.name === 'dark'
                ? theme.colors.error
                : theme.name === 'light'
                ? '#dc2626'
                : theme.colors.primary
            }
            fill={
              theme.name === 'dark'
                ? theme.colors.error
                : theme.name === 'light'
                ? '#dc2626'
                : theme.colors.primary
            }
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search favorites..."
        showResultsCount={true}
        resultsCount={filteredFavorites.length}
        resultsCountLabel={`${filteredFavorites.length} favorite professional${
          filteredFavorites.length !== 1 ? 's' : ''
        }`}
      />

      {isLoading ? (
        <PageLoading message="Loading favorites..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Error loading favorites
          </Text>
          <Text
            style={[styles.errorSubtext, { color: theme.colors.textMuted }]}
          >
            {error instanceof Error ? error.message : 'Please try again later'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={(item) => item?.id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Heart
                size={48}
                color={theme.colors.textMuted}
                strokeWidth={1.5}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {searchQuery ? 'No favorites found' : 'No favorites yet'}
              </Text>
              <Text
                style={[styles.emptyText, { color: theme.colors.textMuted }]}
              >
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Add professionals to your favorites to quickly find them later'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  listContent: {
    padding: 24,
  },
  cardWrapper: {
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 22,
    right: 130,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    paddingHorizontal: 40,
  },
});
