import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Star, ShieldCheck, Heart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsFavorite } from '@/hooks/useFavorites';
import type { ProfessionalWithRelations } from '@/types/database.types';

interface ProfessionalCardProps {
  professional: ProfessionalWithRelations;
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const { theme } = useTheme();

  // Check if favorited
  const { data: isFavorite = false } = useIsFavorite(professional.id);

  // Calculate online status
  const isOnline = professional.is_active && professional.is_available;

  // Get user data
  const userName = professional.users?.name || 'Unknown';
  const userAvatar =
    professional.users?.avatar_url || 'https://via.placeholder.com/150';
  const isVerified =
    professional.users?.is_verified || professional.is_verified;

  // Get category data
  const categoryName = professional.categories?.name || professional.title;

  // Check if featured
  const isFeatured = professional.is_featured || false;
  const totalCalls = professional.total_calls || 0;

  const handlePress = () => {
    router.push(`/professional/${professional.id}`);
  };

  const handleProfilePress = (event: any) => {
    event.stopPropagation();
    router.push(`/professional/${professional.id}`);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={styles.container}
    >
      <View
        style={[
          styles.card,
          Platform.OS === 'web'
            ? styles.cardShadowWeb
            : styles.cardShadowNative,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.text,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
            {isFavorite && (
              <View
                style={[
                  styles.favoriteIndicator,
                  {
                    backgroundColor: theme.colors.error,
                  },
                ]}
              >
                <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            )}
            {isOnline && (
              <View
                style={[
                  styles.onlineIndicator,
                  {
                    backgroundColor: theme.colors.success,
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  {
                    color: theme.colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {userName}
              </Text>
              {isVerified && (
                <ShieldCheck
                  size={20}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              )}
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {professional.profession || categoryName}
            </Text>
            <View style={styles.ratingRow}>
              {isFeatured && (
                <Star
                  size={12}
                  color={theme.colors.accent}
                  fill={theme.colors.accent}
                />
              )}
              <Text
                style={[
                  styles.callCount,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                ({totalCalls} calls)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.priceSection}>
            <Text
              style={[
                styles.price,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              ${(professional.rate_per_minute || 0).toFixed(2)}
            </Text>
            <Text
              style={[
                styles.priceUnit,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              /min
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.profileButton,
              {
                backgroundColor:
                  theme.name === 'light'
                    ? theme.colors.surface
                    : theme.colors.primaryLight,
                borderColor:
                  theme.name === 'light' ? theme.colors.primary : 'transparent',
                borderWidth: theme.name === 'light' ? 1 : 0,
              },
            ]}
            onPress={handleProfilePress}
          >
            <Text
              style={[
                styles.profileButtonText,
                {
                  color:
                    theme.name === 'light'
                      ? theme.colors.primary
                      : theme.colors.surface,
                },
              ]}
            >
              Profile Page
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardShadowNative: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cardShadowWeb: {
    boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  favoriteIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 6,
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callCount: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  profileButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
