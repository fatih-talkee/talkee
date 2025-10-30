import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function Card({ children, style, padding = 'medium' }: CardProps) {
  const { theme } = useTheme();

  const baseStyles = [
    Platform.OS === 'web' ? styles.cardWeb : styles.cardNative,
    styles[padding],
    { backgroundColor: theme.colors.card, shadowColor: theme.colors.text },
    style,
  ];

  return <View style={baseStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  cardNative: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardWeb: {
    borderRadius: 16,
    // RN Web prefers boxShadow over shadow* props
    boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
  },
  none: {
    padding: 0,
  },
  small: {
    padding: 12,
  },
  medium: {
    padding: 16,
  },
  large: {
    padding: 20,
  },
});
