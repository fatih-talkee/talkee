import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { Bell, Calendar } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import { CategoryGrid } from '@/components/listings/CategoryGrid';
import { PromotionCarousel } from '@/components/carousel/PromotionCarousel';
import { useTheme } from '@/contexts/ThemeContext';
import { mockProfessionals, mockCategories, mockPromotions } from '@/mockData/professionals';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const featuredProfessionals = mockProfessionals.slice(0, 4);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        showLogo={true}
        rightButton={
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/appointments-calendar')}
            >
              <Calendar size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Promotion Carousel */}
        <View style={styles.carouselSection}>
          <PromotionCarousel promotions={mockPromotions} />
        </View>

        {/* Browse by Category */}
        <View style={styles.section}>
          <CategoryGrid categories={mockCategories} />
        </View>

        {/* Featured Professionals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Featured Professionals</Text>
            <Link href="/search" asChild>
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <View style={styles.professionalsGrid}>
            {featuredProfessionals.map((professional) => (
              <ProfessionalCard key={professional.id} professional={professional} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  carouselSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  seeAllText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  professionalsGrid: {
    paddingHorizontal: 20,
  },
});