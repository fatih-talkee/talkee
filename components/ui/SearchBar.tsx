import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { TabButtons, TabOption } from '@/components/ui/TabButtons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  showResultsCount?: boolean;
  resultsCount?: number;
  resultsCountLabel?: string;
  showTabButtons?: boolean;
  tabOptions?: TabOption[];
  selectedTabKey?: string;
  onTabSelect?: (key: string) => void;
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  resultsCountStyle?: TextStyle;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  showResultsCount = false,
  resultsCount,
  resultsCountLabel,
  showTabButtons = false,
  tabOptions = [],
  selectedTabKey,
  onTabSelect,
  children,
  containerStyle,
  inputStyle,
  resultsCountStyle,
}: SearchBarProps) {
  const { theme } = useTheme();

  const wrapperBackground = theme.name === 'dark' ? '#000000' : theme.colors.surface;

  return (
    <View style={[styles.container, { backgroundColor: wrapperBackground }, containerStyle]}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        leftIcon={<Search size={20} color={theme.colors.textMuted} />}
        style={[
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
          inputStyle,
        ]}
      />

      {showTabButtons && tabOptions.length > 0 && selectedTabKey && onTabSelect && (
        <TabButtons
          options={tabOptions}
          selectedKey={selectedTabKey}
          onSelect={onTabSelect}
          showWrapper={false}
          containerStyle={styles.tabButtonsContainer}
        />
      )}

      {showResultsCount && resultsCount !== undefined && (
        <View style={styles.resultsHeader}>
          <Text
            style={[
              styles.resultsCount,
              { color: theme.colors.textMuted },
              resultsCountStyle,
            ]}
          >
            {resultsCountLabel || `${resultsCount} results`}
          </Text>
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  tabButtonsContainer: {
    marginTop: 0,
  },
  resultsHeader: {
    marginTop: 12,
  },
  resultsCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});

