import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CharityBadgeProps {
  charityName: string;
  charityLogo: string;
  donationPercentage: number;
  onPress?: () => void;
}

export function CharityBadge({
  charityName,
  charityLogo,
  donationPercentage,
  onPress,
}: CharityBadgeProps) {
  const { theme } = useTheme();

  const BadgeContent = () => (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.success,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Heart size={16} color={theme.colors.success} fill={theme.colors.success} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          Donating {donationPercentage}% to
        </Text>
        <View style={styles.charityRow}>
          <Image source={{ uri: charityLogo }} style={styles.logo} />
          <Text
            style={[styles.charityName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {charityName}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  return <BadgeContent />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginVertical: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  charityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  charityName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
});
