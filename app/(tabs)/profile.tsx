import React, { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/ui/Header';
import { StandardProfileView } from '@/components/profile/StandardProfileView';
import { ProfessionalProfileView } from '@/components/profile/ProfessionalProfileView';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const {
    user,
    isProfessional,
    isLoading,
    refetch,
  } = useProfile();

  // Screen focus olduğunda veriyi yenile
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo={true} />
        <PageLoading />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo={true} />
        <PageLoading />
      </SafeAreaView>
    );
  }

  // Kullanıcı tipine göre render
  if (isProfessional) {
    return <ProfessionalProfileView />;
  }

  return <StandardProfileView />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
