import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { ChevronRight, CheckCircle, Circle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ProfessionalWithRelations } from '@/types/database.types';

interface PeopleListItemProps {
  professional: ProfessionalWithRelations;
  isEditMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onToggleSelection?: () => void;
}

export function PeopleListItem({
  professional,
  isEditMode,
  isSelected,
  onPress,
  onToggleSelection,
}: PeopleListItemProps) {
  const { theme } = useTheme();
  
  const isOnline = professional.is_online || false;
  const avatarUrl = professional.users?.avatar_url;
  const name = professional.users?.name || 'Unknown';
  const title = professional.title || professional.categories?.name || 'Professional';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: isEditMode && isSelected ? theme.colors.surface : theme.colors.background,
        },
      ]}
      onPress={isEditMode ? onToggleSelection : onPress}
      activeOpacity={0.7}
    >
      {/* Selection Indicator (Edit Mode) */}
      {isEditMode && (
        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <CheckCircle size={24} color={theme.colors.pinkTwo || theme.colors.primary} />
          ) : (
            <Circle size={24} color={theme.colors.textMuted} />
          )}
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.avatarText, { color: theme.colors.text }]}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Chevron (Normal Mode) */}
      {!isEditMode && (
        <ChevronRight size={20} color={theme.colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  selectionIndicator: {
    marginRight: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
