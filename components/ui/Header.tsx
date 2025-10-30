import React from 'react';
import { ViewStyle } from 'react-native';
import { PrimaryHeader } from '@/components/ui/headers/PrimaryHeader';

interface HeaderProps {
  showLogo?: boolean;
  rightButton?: React.ReactNode; // legacy single button prop
  rightButtons?: React.ReactNode | React.ReactNode[]; // new multi-button prop
  containerStyle?: ViewStyle;
  onLogoPress?: () => void;
  // legacy props below are intentionally ignored to match PrimaryHeader layout
  title?: string;
  leftButton?: React.ReactNode;
}

export function Header({
  showLogo = true,
  rightButton,
  rightButtons,
  containerStyle,
  onLogoPress,
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
    />
  );
}
