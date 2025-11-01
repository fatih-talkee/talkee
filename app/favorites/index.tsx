import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Search, Heart } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { mockProfessionals } from '@/mockData/professionals';
import { useToast } from '@/lib/toastService';

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [favoritesProfessionals, setFavoritesProfessionals] = useState(
    mockProfessionals.slice(0, 4)
  );

  const filteredFavorites = favoritesProfessionals.filter(
    (professional) =>
    professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    professional.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnfavorite = (professionalId: string) => {
    setFavoritesProfessionals((prev) =>
      prev.filter((p) => p.id !== professionalId)
    );
    toast.success({
      title: 'Removed from Favorites',
      message: 'This professional has been removed from your favorites',
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search favorites..."
        showResultsCount={true}
        resultsCount={filteredFavorites.length}
        resultsCountLabel={`${filteredFavorites.length} favorite professionals`}
        />

      <FlatList
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
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
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No favorites yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Add professionals to your favorites to quickly find them later
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
