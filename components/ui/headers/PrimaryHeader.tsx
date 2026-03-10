import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
  Platform,
  Text,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Require logos at module level for proper bundling
// Using relative paths because Metro bundler requires them for native platforms
const logoDark = require('../../../assets/images/talkee_logoF.png');
const logoLight = require('../../../assets/images/talkee_logoM.png');

interface PrimaryHeaderProps {
  leftButtons?: React.ReactNode | React.ReactNode[];
  rightButtons?: React.ReactNode | React.ReactNode[];
  showLogo?: boolean;
  title?: string;
  titleColor?: string;
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
  onLogoPress?: () => void;
  showBack?: boolean;
  backRoute?: string;
  onBackPress?: () => void;
}

export function PrimaryHeader({
  leftButtons,
  rightButtons,
  showLogo = true,
  title,
  titleColor,
  children,
  containerStyle,
  onLogoPress,
  showBack = false,
  backRoute,
  onBackPress,
}: PrimaryHeaderProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const logo = theme.name === 'dark' ? logoDark : logoLight;

  const renderLeft = Array.isArray(leftButtons)
    ? leftButtons
    : leftButtons
    ? [leftButtons]
    : [];

  const renderRight = Array.isArray(rightButtons)
    ? rightButtons
    : rightButtons
    ? [rightButtons]
    : [];

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
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
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 56 : 0);

  // Header background adapts to theme
  const headerBackground =
    theme.name === 'dark' ? '#1C1C1E' : theme.colors.surface;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: headerBackground }}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: headerBackground,
          },
          containerStyle,
        ]}
      >
        <View style={styles.leftSection}>
        {showBack && (
          <View style={styles.leftButtonWrapper}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={theme.colors.pinkTwo} />
            </TouchableOpacity>
          </View>
        )}
        {renderLeft.map((btn, idx) => (
          <View key={idx} style={styles.leftButtonWrapper}>
            {btn}
          </View>
        ))}
        {showLogo && !title ? (
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

      {title && (
        <View style={styles.centerSectionAbsolute}>
          <Text style={[styles.titleText, { color: titleColor || theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}

      {!title && children && (
        <View style={styles.centerSection}>
          {children}
        </View>
      )}

      <View style={styles.rightSection}>
        {renderRight.map((btn, idx) => (
          <View key={idx} style={styles.rightButtonWrapper}>
            {btn}
          </View>
        ))}
      </View>
    </View>
    </SafeAreaView>
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 16px rgba(0,0,0,0.08)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }),
  },
  leftSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  leftButtonWrapper: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSectionAbsolute: {
    position: 'absolute',
    top: 10,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  titleText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
  rightSection: {
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
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logoImage: {
    width: 120,
    height: 40,
    flexShrink: 0,
    flexGrow: 0,
    opacity: 1,
  },
});
