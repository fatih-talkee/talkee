import React from 'react';
import { ViewStyle } from 'react-native';
import { PrimaryHeader } from '@/components/ui/headers/PrimaryHeader';
import { DetailHeader } from '@/components/ui/headers/DetailHeader';
import { useRouter } from 'expo-router';

interface HeaderProps {
  showLogo?: boolean;
  rightButton?: React.ReactNode; // legacy single button prop
  rightButtons?: React.ReactNode | React.ReactNode[]; // new multi-button prop
  containerStyle?: ViewStyle;
  onLogoPress?: () => void;
  // If title is provided, use DetailHeader instead of PrimaryHeader
  title?: string;
  leftButton?: React.ReactNode;
  // back handling
  showBack?: boolean;
  backRoute?: string;
  backPosition?: 'left' | 'right';
}

export function Header({
  showLogo = true,
  rightButton,
  rightButtons,
  containerStyle,
  onLogoPress,
  title,
  leftButton,
  showBack,
  backRoute,
  backPosition,
}: HeaderProps) {
  const router = useRouter();
  
  const normalizedRight =
    rightButtons !== undefined
      ? rightButtons
      : rightButton !== undefined
      ? rightButton
      : undefined;

  const handleBack = () => {
    if (backRoute) {
      router.push(backRoute);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  // If title is provided, use DetailHeader
  if (title !== undefined) {
    return (
      <DetailHeader
        title={title}
        onBack={showBack ? handleBack : undefined}
        rightButtons={normalizedRight}
        containerStyle={containerStyle}
        backPosition={backPosition || 'left'}
      />
    );
  }

  // Otherwise use PrimaryHeader
  return (
    <PrimaryHeader
      showLogo={showLogo}
      rightButtons={normalizedRight}
      containerStyle={containerStyle}
      onLogoPress={onLogoPress}
      showBack={showBack}
      backRoute={backRoute}
      backPosition={backPosition}
    />
  );
}
