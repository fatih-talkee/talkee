import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface DetailHeaderProps {
  title: string;
  onBack?: () => void;
  rightButtons?: React.ReactNode | React.ReactNode[];
  containerStyle?: ViewStyle;
}

export function DetailHeader({ title, onBack, rightButtons, containerStyle }: DetailHeaderProps) {
  const { theme } = useTheme();

  const renderRight = Array.isArray(rightButtons) ? rightButtons : rightButtons ? [rightButtons] : [];

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }, containerStyle]}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={onBack}
          disabled={!onBack}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
        >
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerSection}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.rightSection}>
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
    paddingVertical: 16,
    minHeight: 60,
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
    alignItems: 'flex-end',
    justifyContent: 'center',
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


