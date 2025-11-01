import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export interface TabOption {
  key: string;
  label: string;
  count?: number;
}

interface TabButtonsProps {
  options: TabOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  showWrapper?: boolean;
  wrapperStyle?: ViewStyle;
  containerStyle?: ViewStyle;
}

export function TabButtons({
  options,
  selectedKey,
  onSelect,
  showWrapper = true,
  wrapperStyle,
  containerStyle,
}: TabButtonsProps) {
  const { theme } = useTheme();

  const wrapperBackground =
    theme.name === 'dark' ? '#000000' : theme.colors.surface;
  const selectedBackground =
    theme.name === 'dark'
      ? theme.colors.accent
      : theme.name === 'light'
      ? theme.colors.brandPink
      : theme.colors.primary;
  const selectedBorderColor = selectedBackground;
  const selectedTextColor = theme.name === 'light' ? '#FFFFFF' : '#000000';
  const unselectedBorderColor =
    theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme.colors.border;

  const renderButtons = () => (
    <View style={[styles.filters, containerStyle]}>
      {options.map((option) => {
        const isSelected = selectedKey === option.key;

        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.tabButton,
              {
                backgroundColor: theme.colors.background,
                borderColor: unselectedBorderColor,
              },
              isSelected && {
                backgroundColor: selectedBackground,
                borderColor: selectedBorderColor,
              },
            ]}
            onPress={() => onSelect(option.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.colors.textSecondary },
                isSelected && {
                  color: selectedTextColor,
                },
              ]}
            >
              {option.label}
              {option.count !== undefined && ` (${option.count})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (showWrapper) {
    return (
      <View
        style={[
          styles.wrapper,
          { backgroundColor: wrapperBackground },
          wrapperStyle,
        ]}
      >
        {renderButtons()}
      </View>
    );
  }

  return renderButtons();
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
