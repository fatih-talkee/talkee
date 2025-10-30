import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface PrimaryHeaderProps {
  rightButtons?: React.ReactNode | React.ReactNode[];
  showLogo?: boolean;
  containerStyle?: ViewStyle;
  onLogoPress?: () => void;
  showBack?: boolean;
  backRoute?: string;
  backPosition?: 'left' | 'right';
}

export function PrimaryHeader({
  rightButtons,
  showLogo = true,
  containerStyle,
  onLogoPress,
  showBack = false,
  backRoute,
  backPosition = 'right',
}: PrimaryHeaderProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const logo =
    theme.name === 'dark'
      ? require('../../../assets/images/talkee_logoF.png')
      : require('../../../assets/images/talkee_logoM.png');

  const renderRight = Array.isArray(rightButtons) ? rightButtons : rightButtons ? [rightButtons] : [];

  const handleBack = () => {
    if (backRoute) {
      router.replace(backRoute);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

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
        {backPosition === 'left' && showBack ? (
          <TouchableOpacity onPress={handleBack} style={[styles.iconButton, { backgroundColor: theme.colors.card }]}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        ) : showLogo ? (
          <TouchableOpacity disabled={!onLogoPress} onPress={onLogoPress}>
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.centerSection} />

      <View style={styles.rightSection}>
        {backPosition === 'right' && showBack && (
          <View style={styles.rightButtonWrapper}>
            <TouchableOpacity onPress={handleBack} style={[styles.iconButton, { backgroundColor: theme.colors.card }]}>
              <ArrowLeft size={20} color={theme.colors.text} />
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 40,
  },
});


