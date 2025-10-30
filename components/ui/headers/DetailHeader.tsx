import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

interface DetailHeaderProps {
  title: string;
  onBack?: () => void;
  rightButtons?: React.ReactNode | React.ReactNode[];
  containerStyle?: ViewStyle;
  backPosition?: 'left' | 'right';
}

export function DetailHeader({ title, onBack, rightButtons, containerStyle, backPosition = 'left' }: DetailHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const renderRight = Array.isArray(rightButtons) ? rightButtons : rightButtons ? [rightButtons] : [];

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          paddingTop: insets.top,
        },
        containerStyle,
      ]}
    >
      <View style={styles.leftSection}>
        {backPosition === 'left' ? (
          <TouchableOpacity
            onPress={onBack}
            disabled={!onBack}
            style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          >
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.centerSection}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {backPosition === 'right' && (
          <View style={styles.rightButtonWrapper}>
            <TouchableOpacity
              onPress={onBack}
              disabled={!onBack}
              style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
            >
              <ArrowLeft size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}
        {renderRight.map((btn, idx) => (
          <View key={idx} style={styles.rightButtonWrapper}>
            {btn}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 60,
    // shiny shadow/elevation (no divider)
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  leftSection: {
    flex: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  rightButtonWrapper: {
    marginLeft: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
});


