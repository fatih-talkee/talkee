import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Star, Badge, Clock } from 'lucide-react-native';
import { Professional } from '@/mockData/professionals';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfessionalCardProps {
  professional: Professional;
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    router.push(`/professional/${professional.id}`);
  };

  const handleProfilePress = (event: any) => {
    event.stopPropagation();
    router.push(`/professional/${professional.id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.container}>
      <View style={[
        styles.card,
        {
          // theme.colors.card → card background
          backgroundColor: theme.colors.card,
          // theme.colors.border → card border
          borderColor: theme.colors.border,
          // theme.colors.text → shadow color (reduced opacity)
          shadowColor: theme.colors.text,
        }
      ]}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: professional.avatar }} style={styles.avatar} />
            {professional.isOnline && (
              <View style={[
                styles.onlineIndicator,
                {
                  // theme.colors.success → online status
                  backgroundColor: theme.colors.success,
                }
              ]} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={[
                styles.name,
                {
                  // theme.colors.text → main title
                  color: theme.colors.text,
                }
              ]} numberOfLines={1}>{professional.name}</Text>
              {professional.isVerified && (
                <Badge size={14} color={theme.colors.primary} strokeWidth={2} />
              )}
            </View>
            <Text style={[
              styles.title,
              {
                // theme.colors.textSecondary → subtitle
                color: theme.colors.textSecondary,
              }
            ]} numberOfLines={1}>{professional.title}</Text>
            <View style={styles.ratingRow}>
              {/* theme.colors.accent → star color */}
              <Star size={12} color={theme.colors.accent} fill={theme.colors.accent} />
              <Text style={[
                styles.rating,
                {
                  // theme.colors.text → rating number
                  color: theme.colors.text,
                }
              ]}>{professional.rating}</Text>
              <Text style={[
                styles.callCount,
                {
                  // theme.colors.textMuted → call count
                  color: theme.colors.textMuted,
                }
              ]}>({professional.totalCalls})</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.priceSection}>
            <Text style={[
              styles.price,
              {
                // theme.colors.pinkTwo → price highlight
                color: theme.colors.pinkTwo,
              }
            ]}>${professional.ratePerMinute}</Text>
            <Text style={[
              styles.priceUnit,
              {
                // theme.colors.textMuted → price unit
                color: theme.colors.textMuted,
              }
            ]}>/min</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.profileButton,
              {
                // theme.colors.surface → bg (Light) / theme.colors.primaryLight → bg (Dark)
                backgroundColor: theme.name === 'light' ? theme.colors.surface : theme.colors.primaryLight,
                // theme.colors.primary → border (Light only)
                borderColor: theme.name === 'light' ? theme.colors.pinkTwo : 'transparent',
                borderWidth: theme.name === 'light' ? 1 : 0,
              }
            ]}
            onPress={handleProfilePress}
          >
            <Text style={[
              styles.profileButtonText,
              {
                // theme.colors.primary → text (Light) / theme.colors.surface → text (Dark)
                color: theme.name === 'light' ? theme.colors.pinkTwo : theme.colors.surface,
              }
            ]}>Profile Page</Text>
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'transparent',
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
  },
  rating: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
    marginRight: 4,
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
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
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