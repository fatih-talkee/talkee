import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { Search } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { Input } from '@/components/ui/Input';
import { mockProfessionals } from '@/mockData/professionals';

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Mock favorites (first 4 professionals)
  const favoritesProfessionals = mockProfessionals.slice(0, 4);

  const filteredFavorites = favoritesProfessionals.filter(
    (professional) =>
      professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <View
        style={[
          styles.searchInputContainer,
          {
            backgroundColor:
              theme.name === 'dark' ? '#000000' : theme.colors.surface,
          },
        ]}
      >
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search favorites..."
          leftIcon={<Search size={20} color={theme.colors.textMuted} />}
          style={[
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        />
        <Text style={[styles.resultsCount, { color: theme.colors.textMuted }]}>
          {filteredFavorites.length} favorite professionals
        </Text>
      </View>

      <FlatList
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProfessionalCard professional={item} />}
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
  searchInputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  resultsCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  listContent: {
    padding: 24,
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
