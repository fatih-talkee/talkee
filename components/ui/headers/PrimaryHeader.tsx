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

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: '#000000',
          paddingTop: 24,
        },
        containerStyle,
      ]}
    >
      <View style={styles.leftSection}>
        {backPosition === 'left' && showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : showLogo ? (
          <TouchableOpacity disabled={!onLogoPress} onPress={onLogoPress}>
            <Image
              source={logo}
              style={styles.logoImage}
              resizeMode="contain"
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
              style={[
                styles.iconButton,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
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
