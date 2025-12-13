import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useFonts } from 'expo-font';
import { ToastStack } from '../components/ui/ToastStack';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { initI18n } from '../lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAutoAvailability } from '../hooks/useAutoAvailability';
import { useProfile } from '../hooks/useProfile';
import { logger } from '../lib/logger';
import { setupGlobalErrorHandlers } from '../lib/globalErrorHandler';
import * as Sentry from '@sentry/react-native';
import { SentryAdapter } from '../lib/sentryAdapter';
import { notificationsService } from '../services';

// Initialize Sentry
Sentry.init({
  dsn: 'https://18e1c6ac9df262bbd98c89fd2db05f06@o4510523149647872.ingest.de.sentry.io/4510523154563152', // Sentry panelinden aldığınız DSN'i buraya yapıştırın
  debug: __DEV__, // Geliştirme ortamında debug modunu açar
});

try {
  // Register adapter immediately to catch early boot errors
  logger.registerRemoteLogger(new SentryAdapter());
  logger.info('Sentry adapter registered');
} catch (e) {
  console.error('Failed to register Sentry adapter', e);
}

SplashScreen.preventAutoHideAsync();

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auto Availability Wrapper Component
function AutoAvailabilityWrapper({ children }: { children: React.ReactNode }) {
  const { isProfessional } = useProfile();

  // 🟢 AUTO ONLINE/OFFLINE
  // Automatically manages professional availability based on app state
  useAutoAvailability({
    enabled: isProfessional,
    setOnlineOnForeground: true,
    setOfflineOnBackground: true,
    backgroundDelay: 30000, // 30 seconds delay before going offline
  });

  return <>{children}</>;
}

export default function RootLayout() {
  useFrameworkReady();
  const [i18nReady, setI18nReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Initialize logger and error handlers
  useEffect(() => {
    // Configure logger for production
    logger.configure({
      enableRemoteLogging: !__DEV__,
      logLevel: __DEV__ ? 'debug' : 'error',
      enableBreadcrumbs: true,
      enablePerformanceTracking: true,
    });

    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Initialize notifications service
    (async () => {
      try {
        // Setup notification listeners first
        notificationsService.setupListeners();

        // Then initialize (request permissions and get token)
        const token = await notificationsService.initialize();
        if (token) {
          logger.info('Push notifications initialized', {
            token: token.substring(0, 20) + '...',
          });
        } else {
          logger.warn(
            'Push notifications not available (permissions denied or web platform)'
          );
        }
      } catch (error) {
        logger.error('Failed to initialize notifications', error);
      }
    })();

    // Cleanup on unmount
    return () => {
      logger.cleanup();
    };
  }, []);

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
        await initI18n();
        if (mounted) setI18nReady(true);
      } catch (error) {
        logger.error('[App] Failed to initialize i18n', error);
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
    if (fontError) {
      logger.error('[App] Font loading error', fontError);
      logger.warn('[App] App will continue with system fonts');
    }

    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync().catch((error) => {
        logger.error('[App] Error hiding splash screen', error);
      });
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AutoAvailabilityWrapper>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="become-professional/index" />
            <Stack.Screen name="credit-selection" />
            <Stack.Screen name="purchase" />
            <Stack.Screen name="notifications/index" />
            <Stack.Screen name="wallet-history" />
            <Stack.Screen name="blocked-users" />
            <Stack.Screen name="how-it-works" />
            <Stack.Screen name="help" />
            <Stack.Screen name="settings/theme" />
            <Stack.Screen name="settings/language" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/change-password" />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="profile/professional-settings" />
            <Stack.Screen name="profile/privacy-policy" />
            <Stack.Screen name="profile/devices" />
          </Stack>
          <StatusBar style="auto" translucent={false} />
          <ToastStack />
        </AutoAvailabilityWrapper>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
