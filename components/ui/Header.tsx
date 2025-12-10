import React from 'react';
import { ViewStyle } from 'react-native';
import { PrimaryHeader } from '@/components/ui/headers/PrimaryHeader';
import { useRouter } from 'expo-router';

interface HeaderProps {
  showLogo?: boolean;
  rightButton?: React.ReactNode; // legacy single button prop
  rightButtons?: React.ReactNode | React.ReactNode[]; // new multi-button prop
  containerStyle?: ViewStyle;
  onLogoPress?: () => void;
  // back handling
  showBack?: boolean;
  backRoute?: string;
  onBackPress?: () => void;
}

export function Header({
  showLogo = true,
  rightButton,
  rightButtons,
  containerStyle,
  onLogoPress,
  showBack,
  backRoute,
  onBackPress,
}: HeaderProps) {
  const normalizedRight =
    rightButtons !== undefined
      ? rightButtons
      : rightButton !== undefined
      ? rightButton
      : undefined;

  return (
    <PrimaryHeader
      showLogo={showLogo}
      rightButtons={normalizedRight}
      containerStyle={containerStyle}
      onLogoPress={onLogoPress}
      showBack={showBack}
      backRoute={backRoute}
      onBackPress={onBackPress}
    />
  );
}
