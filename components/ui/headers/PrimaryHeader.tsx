import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
  Platform,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const logo =
    theme.name === 'dark'
      ? require('../../../assets/images/talkee_logoF.png')
      : require('../../../assets/images/talkee_logoM.png');

  const renderRight = Array.isArray(rightButtons)
    ? rightButtons
    : rightButtons
    ? [rightButtons]
    : [];

  const handleBack = () => {
    if (backRoute) {
      router.push(backRoute as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  // Ensure proper top padding for Android status bar
  // Android status bars can be taller on some devices, use a safe minimum
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 56 : 0);

  // Header background adapts to theme
  // For dark theme: black, for other themes: use surface color (lighter backgrounds)
  const headerBackground =
    theme.name === 'dark' ? '#000000' : theme.colors.surface;

  // Button background adapts to theme
  // For dark theme: use surface (dark gray), for light theme: use brandPink from theme
  // For other themes (green, blue): use black for contrast
  const buttonBackground =
    theme.name === 'dark'
      ? theme.colors.surface
      : theme.name === 'light'
      ? theme.colors.brandPink
      : '#000000';

  // Icon color adapts to theme
  // Always white for good contrast against all backgrounds
  const iconColor = '#FFFFFF';

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: headerBackground,
          paddingTop: 24,
        },
        containerStyle,
      ]}
    >
      <View style={styles.leftSection}>
        {backPosition === 'left' && showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.iconButton, { backgroundColor: buttonBackground }]}
          >
            <ArrowLeft size={20} color={iconColor} />
          </TouchableOpacity>
        ) : showLogo ? (
          <TouchableOpacity 
            disabled={!onLogoPress} 
            onPress={onLogoPress}
            style={styles.logoContainer}
            activeOpacity={onLogoPress ? 0.7 : 1}
          >
            <Image
              source={logo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Talkee Logo"
            />
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
        {backPosition === 'right' && showBack && (
          <View style={styles.rightButtonWrapper}>
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.iconButton, { backgroundColor: buttonBackground }]}
            >
              <ArrowLeft size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        )}
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
    flex: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 120,
    width: 120,
    marginRight: 8,
  },
  logoContainer: {
    flexShrink: 0,
    flexGrow: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 120,
    height: 40,
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
    flexShrink: 0,
    flexGrow: 0,
  },
});
