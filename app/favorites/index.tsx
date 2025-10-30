import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Grid2x2 as Grid, List } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { Input } from '@/components/ui/Input';
import { mockProfessionals } from '@/mockData/professionals';

export default function FavoritesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Mock favorites (first 4 professionals)
  const favoritesProfessionals = mockProfessionals.slice(0, 4);

  const filteredFavorites = favoritesProfessionals.filter(professional =>
    professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    professional.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Favorites"
        leftButton={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
        }
        rightButton={
          <TouchableOpacity 
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? (
              <Grid size={20} color="#64748b" />
            ) : (
              <List size={20} color="#64748b" />
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.searchSection}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search favorites..."
          leftIcon={<Search size={20} color="#64748b" />}
          style={styles.searchInput}
        />
        <Text style={styles.resultsCount}>
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
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>
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
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    marginBottom: 12,
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