import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FilterChip {
  id: string;
  label: string;
  hasDropdown: boolean;
  isCheckbox?: boolean;
}

interface HomeHeaderSectionProps {
  userName?: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  onFiltersPress: () => void;
  onCategoryPress: () => void;
  onAvailabilityPress: () => void;
  onLanguagePress: () => void;
  onVerifiedToggle: () => void;
  isVerifiedSelected: boolean;
  onSubmitEditing?: () => void;
}

export function HomeHeaderSection({
  userName = 'User',
  searchValue,
  onSearchChange,
  onFiltersPress,
  onCategoryPress,
  onAvailabilityPress,
  onLanguagePress,
  onVerifiedToggle,
  isVerifiedSelected = false,
  onSubmitEditing,
}: HomeHeaderSectionProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Purple gradient as requested (matches backup/design)
  const headerGradient = ['#682d6e', '#7e3885', '#8f4399'] as const;

  const filterChips: FilterChip[] = [
    { id: 'categories', label: 'Categories', hasDropdown: true },
    { id: 'availability', label: 'Availability', hasDropdown: true },
    { id: 'language', label: 'Language', hasDropdown: true },
    { id: 'verified', label: 'Verified', hasDropdown: false, isCheckbox: true },
  ];

  const handleFilterPress = (id: string) => {
    switch (id) {
      case 'categories':
        onCategoryPress();
        break;
      case 'availability':
        onAvailabilityPress();
        break;
      case 'language':
        onLanguagePress();
        break;
      case 'verified':
        onVerifiedToggle();
        break;
    }
  };

  return (
    <LinearGradient
      colors={headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === 'android' ? 20 : 10) }
      ]}
    >
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/talkee_logoF.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Greeting and Filters Row */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText}>Hi, {userName}</Text>
        <TouchableOpacity
          style={styles.filtersButton}
          onPress={onFiltersPress}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={20} color="#007AFF" />
          <Text style={styles.filtersButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Who Do You Want Talk?"
            placeholderTextColor="#9CA3AF"
            value={searchValue}
            onChangeText={onSearchChange}
            onSubmitEditing={onSubmitEditing}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Filter Chips Row */}
      <View style={styles.filterChipsRow}>
        {filterChips.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={styles.filterChip}
            onPress={() => handleFilterPress(chip.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                chip.isCheckbox && isVerifiedSelected && styles.filterChipTextSelected,
                chip.isCheckbox && !isVerifiedSelected && styles.filterChipTextUnselected,
              ]}
            >
              {chip.label}
            </Text>
            {chip.hasDropdown && (
              <ChevronDown size={14} color="#FFFFFF" style={styles.chipIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 40,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filtersButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'nowrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  filterChipTextUnselected: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chipIcon: {
    marginLeft: 2,
  },
});
