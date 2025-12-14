import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SectionLoadingProps {
  size?: 'small' | 'large';
  style?: any;
}

/**
 * Small loading indicator for sections within a page
 * Used when a specific section is loading while the rest of the page is visible
 */
export function SectionLoading({ size = 'small', style }: SectionLoadingProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

