import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ChevronRight, BadgeCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { CharityOrganization, getCategoryDisplayName } from '@/mockData/charities';

interface OrganizationCardProps {
  organization: CharityOrganization;
  onPress: () => void;
  selected?: boolean;
}

export function OrganizationCard({ organization, onPress, selected = false }: OrganizationCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: selected ? theme.colors.pinkTwo : theme.colors.border,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Left: Logo */}
      <Image
        source={{ uri: organization.logo }}
        style={styles.logo}
      />

      {/* Center: Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.name,
              { color: theme.colors.text },
              selected && { color: theme.colors.pinkTwo },
            ]}
            numberOfLines={1}
          >
            {organization.name}
          </Text>
          {organization.verified && (
            <BadgeCheck size={16} color={theme.colors.pinkTwo} strokeWidth={2} />
          )}
        </View>

        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {organization.shortDescription}
        </Text>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.categoryText, { color: theme.colors.pinkTwo }]}>
              {getCategoryDisplayName(organization.category)}
            </Text>
          </View>
          <Text style={[styles.country, { color: theme.colors.textMuted }]}>
            {organization.country}
          </Text>
        </View>
      </View>

      {/* Right: Arrow */}
      <ChevronRight size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  country: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
});
