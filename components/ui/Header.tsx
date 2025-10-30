import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  showLogo?: boolean;
  leftButton?: React.ReactNode;
  rightButton?: React.ReactNode;
  title?: string;
}

export function Header({
  showLogo = false,
  title,
  leftButton,
  rightButton,
}: HeaderProps) {
  const { theme } = useTheme();

  // Select logo based on current theme
  const logo =
    theme.name === 'dark'
      ? require('../../assets/images/talkee_logoF.png') // Dark theme logo
      : require('../../assets/images/talkee_logoM.png'); // Light theme logo

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
      <View style={styles.leftSection}>
        {leftButton ? (
          leftButton
        ) : showLogo ? (
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        ) : null}
      </View>

      <View style={styles.centerSection}>
        {title && (
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>{rightButton}</View>
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
  },
  logo: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
});
