import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useFonts } from 'expo-font';
import { ToastStack } from '@/components/ui/ToastStack';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { initI18n } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

// Toast stack component is now handled by ToastStack component

export default function RootLayout() {
  useFrameworkReady();
  const [i18nReady, setI18nReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });

  // Add timeout to prevent infinite hang
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!i18nReady) {
        console.warn('Initialization timeout - forcing ready state');
        setI18nReady(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [i18nReady]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[App] Starting i18n initialization...');
        await initI18n();
        console.log('[App] i18n initialized successfully');
        if (mounted) setI18nReady(true);
      } catch (error) {
        console.error('[App] Failed to initialize i18n:', error);
        setInitError(error instanceof Error ? error : new Error(String(error)));
        // Still set ready to prevent app from hanging
        if (mounted) setI18nReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    console.log('[App] State check - fontsLoaded:', fontsLoaded, 'fontError:', fontError, 'i18nReady:', i18nReady);
    if ((fontsLoaded || fontError) && i18nReady) {
      console.log('[App] All initialization complete, hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.error('[App] Error hiding splash screen:', error);
      });
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="become-professional" />
        <Stack.Screen name="appointments-calendar" />
        <Stack.Screen name="call-review/[id]" />
        <Stack.Screen name="credit-selection" />
        <Stack.Screen name="purchase" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="wallet-history" />
        <Stack.Screen name="invoices" />
        <Stack.Screen name="blocked-users" />
        <Stack.Screen name="how-it-works" />
        <Stack.Screen name="help" />
        <Stack.Screen name="settings/theme" />
        <Stack.Screen name="settings/language" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/change-password" />
        <Stack.Screen name="settings/availability" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="profile/professional-settings" />
        <Stack.Screen name="profile/privacy-security" />
        <Stack.Screen name="profile/devices" />
        <Stack.Screen name="schedule-call/[id]" />
      </Stack>
      <StatusBar style="auto" translucent={false} />
      <ToastStack />
    </ThemeProvider>
  );
}
