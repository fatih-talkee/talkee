import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Briefcase, 
  Smartphone, 
  Heart, 
  DollarSign, 
  Star, 
  BookOpen 
} from 'lucide-react-native';
import { Category } from '@/mockData/professionals';

interface CategoryGridProps {
  categories: Category[];
}

const iconMap = {
  briefcase: Briefcase,
  smartphone: Smartphone,
  heart: Heart,
  'dollar-sign': DollarSign,
  star: Star,
  book: BookOpen,
};

const { width } = Dimensions.get('window');

export function CategoryGrid({ categories }: CategoryGridProps) {
  const { theme } = useTheme();

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    router.push(`/category/${categoryId}?name=${encodeURIComponent(categoryName)}`);
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const IconComponent = iconMap[item.icon as keyof typeof iconMap] || Briefcase;
    
    return (
      <TouchableOpacity 
        style={[
          styles.categoryItem, 
          { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1
          }
        ]}
        onPress={() => handleCategoryPress(item.id, item.name)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <IconComponent size={20} color={item.color} strokeWidth={2.5} />
        </View>
        <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
      </View>
      <FlatList
        data={categories.slice(0, 8)}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        numColumns={4}
        scrollEnabled={false}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  gridContainer: {
    gap: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryItem: {
    width: (width - 40 - 36) / 4, // Account for padding and gaps
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
});