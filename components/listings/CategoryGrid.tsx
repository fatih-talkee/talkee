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
  BookOpen,
  Palette,
  Music,
  Activity,
  Car,
  Camera,
  Gamepad2,
  Rocket,
  TrendingUp,
  Sparkles,
  PiggyBank,
  Brain,
  Dumbbell,
  Apple,
  GraduationCap,
  Target,
  Users,
  Zap,
  Coffee,
  Home,
  ShoppingBag,
  Wrench,
  Code,
  Paintbrush,
  Video,
  Mic,
  Image as ImageIcon,
  GamepadIcon,
  Plane,
  UtensilsCrossed,
  Shirt,
  Baby,
  Dog,
  Flower2,
  TreePine,
  Waves,
  Mountain,
  Sun,
  Moon,
  Cloud,
  Droplet,
  Flame,
  Snowflake,
  Leaf
} from 'lucide-react-native';
import { Category } from '@/types/database.types';

interface CategoryGridProps {
  categories: Category[];
}

// Icon mapping: supports both kebab-case (DB seed) and PascalCase (actual DB)
// Also supports category names and slugs for fallback
const iconMap: Record<string, React.ComponentType<any>> = {
  // Kebab-case (seed data format)
  'briefcase': Briefcase,
  'smartphone': Smartphone,
  'heart': Heart,
  'dollar-sign': DollarSign,
  'dollarsign': DollarSign,
  'star': Star,
  'book': BookOpen,
  'book-open': BookOpen,
  'palette': Palette,
  'music': Music,
  'activity': Activity,
  'car': Car,
  'camera': Camera,
  'gamepad-2': Gamepad2,
  'gamepad': Gamepad2,
  'gamepad2': Gamepad2,
  'brain': Brain,
  'dumbbell': Dumbbell,
  'apple': Apple,
  'graduation-cap': GraduationCap,
  'target': Target,
  'users': Users,
  'zap': Zap,
  'coffee': Coffee,
  'home': Home,
  'shopping-bag': ShoppingBag,
  'wrench': Wrench,
  'code': Code,
  'paintbrush': Paintbrush,
  'video': Video,
  'mic': Mic,
  'image': ImageIcon,
  'plane': Plane,
  'utensils-crossed': UtensilsCrossed,
  'shirt': Shirt,
  'baby': Baby,
  'dog': Dog,
  'flower-2': Flower2,
  'tree-pine': TreePine,
  'waves': Waves,
  'mountain': Mountain,
  'sun': Sun,
  'moon': Moon,
  'cloud': Cloud,
  'droplet': Droplet,
  'flame': Flame,
  'snowflake': Snowflake,
  'leaf': Leaf,
  
  // PascalCase (actual DB format)
  'Briefcase': Briefcase,
  'Smartphone': Smartphone,
  'Heart': Heart,
  'DollarSign': DollarSign,
  'Star': Star,
  'Book': BookOpen,
  'BookOpen': BookOpen,
  'Palette': Palette,
  'Music': Music,
  'Activity': Activity,
  'Car': Car,
  'Camera': Camera,
  'Gamepad2': Gamepad2,
  'Gamepad': Gamepad2,
  'Rocket': Rocket,
  'TrendingUp': TrendingUp,
  'Sparkles': Sparkles,
  'PiggyBank': PiggyBank,
  'Brain': Brain,
  'Dumbbell': Dumbbell,
  'Apple': Apple,
  'GraduationCap': GraduationCap,
  'Target': Target,
  'Users': Users,
  'Zap': Zap,
  'Coffee': Coffee,
  'Home': Home,
  'ShoppingBag': ShoppingBag,
  'Wrench': Wrench,
  'Code': Code,
  'Paintbrush': Paintbrush,
  'Video': Video,
  'Mic': Mic,
  'Image': ImageIcon,
  'Plane': Plane,
  'UtensilsCrossed': UtensilsCrossed,
  'Shirt': Shirt,
  'Baby': Baby,
  'Dog': Dog,
  'Flower2': Flower2,
  'TreePine': TreePine,
  'Waves': Waves,
  'Mountain': Mountain,
  'Sun': Sun,
  'Moon': Moon,
  'Cloud': Cloud,
  'Droplet': Droplet,
  'Flame': Flame,
  'Snowflake': Snowflake,
  'Leaf': Leaf,
  
  // Category name/slug fallbacks
  'business': Briefcase,
  'technology': Smartphone,
  'health': Heart,
  'finance': DollarSign,
  'lifestyle': Star,
  'education': BookOpen,
  'design': Palette,
  'entertainment': Music,
  'sports': Activity,
  'automotive': Car,
  'photography': Camera,
  'gaming': Gamepad2,
  'entrepreneurship': Rocket,
  'marketing': TrendingUp,
  'sales': TrendingUp,
  'mental': Brain,
  'mental-health': Brain,
  'fitness': Dumbbell,
  'nutrition': Apple,
  'career': GraduationCap,
  'career-development': GraduationCap,
  'coaching': Users,
  'consulting': Briefcase,
  'legal': Briefcase,
  'real-estate': Home,
  'travel': Plane,
  'food': UtensilsCrossed,
  'fashion': Shirt,
  'beauty': Sparkles,
  'pets': Dog,
  'home': Home,
  'shopping': ShoppingBag,
  'tools': Wrench,
  'code': Code,
  'art': Paintbrush,
  'video': Video,
  'audio': Mic,
  'image': ImageIcon,
  'game': Gamepad2,
};

const { width } = Dimensions.get('window');

// Fixed color palette for category cards (8 colors, assigned by index)
// Colors are assigned based on the category's position in the list (0-7)
const CATEGORY_COLORS = [
  '#007AFF', // Blue - 1st category
  '#5856D6', // Purple - 2nd category
  '#30D158', // Green - 3rd category
  '#FFD60A', // Yellow - 4th category
  '#FF9F0A', // Orange - 5th category
  '#64D2FF', // Light Blue - 6th category
  '#BF5AF2', // Purple-Pink - 7th category
  '#FF375F', // Red-Pink - 8th category
];

const getCategoryColor = (index: number): string => {
  // Use modulo to cycle through colors if there are more than 8 categories
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

export function CategoryGrid({ categories }: CategoryGridProps) {
  const { theme } = useTheme();

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    router.push(`/category/${categoryId}?name=${encodeURIComponent(categoryName)}`);
  };

  const renderCategory = ({ item, index }: { item: Category; index: number }) => {
    // Normalize icon_name to handle different formats (PascalCase, kebab-case, lowercase)
    const iconKey = item.icon_name?.toLowerCase().replace(/-/g, '') || '';
    const pascalKey = item.icon_name || '';
    const kebabKey = item.icon_name?.toLowerCase() || '';
    
    // Try multiple formats
    const IconComponent = 
      iconMap[pascalKey] || 
      iconMap[kebabKey] || 
      iconMap[iconKey] || 
      iconMap[item.icon_name as string] || 
      iconMap[item.slug?.toLowerCase() || ''] ||
      Briefcase;
    
    // Debug: Log if icon not found
    if (IconComponent === Briefcase && item.icon_name !== 'briefcase' && item.icon_name !== 'Briefcase') {
      console.log(`[CategoryGrid] Icon not found for: ${item.name} (icon_name: ${item.icon_name}, slug: ${item.slug})`);
    }
    
    // Get color based on index position (0-7)
    const categoryColor = getCategoryColor(index);
    
    
    return (
      <TouchableOpacity 
        style={[
          styles.categoryItem, 
          { 
            backgroundColor: categoryColor + '30',
            borderColor: theme.colors.border,
            borderWidth: 1
          }
        ]}
        onPress={() => handleCategoryPress(item.id, item.name)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '25' }]}>
          <IconComponent size={20} color={categoryColor} strokeWidth={2.5} />
        </View>
        <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Browse by Category</Text>
      </View>
      <FlatList
        data={categories}
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