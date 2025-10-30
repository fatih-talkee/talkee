import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface PrimaryHeaderProps {
  rightButtons?: React.ReactNode | React.ReactNode[];
  showLogo?: boolean;
  containerStyle?: ViewStyle;
  onLogoPress?: () => void;
}

export function PrimaryHeader({
  rightButtons,
  showLogo = true,
  containerStyle,
  onLogoPress,
}: PrimaryHeaderProps) {
  const { theme } = useTheme();

  const logo =
    theme.name === 'dark'
      ? require('../../../assets/images/talkee_logoF.png')
      : require('../../../assets/images/talkee_logoM.png');

  const renderRight = Array.isArray(rightButtons) ? rightButtons : rightButtons ? [rightButtons] : [];

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
        },
        containerStyle,
      ]}
    >
      <View style={styles.leftSection}>
        {showLogo ? (
          <TouchableOpacity disabled={!onLogoPress} onPress={onLogoPress}>
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.centerSection} />

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
  logoImage: {
    width: 120,
    height: 40,
  },
});


