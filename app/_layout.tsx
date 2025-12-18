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
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAutoAvailability } from '../hooks/useAutoAvailability';
import { useProfile } from '../hooks/useProfile';
import { logger } from '../lib/logger';
import { setupGlobalErrorHandlers } from '../lib/globalErrorHandler';
import * as Sentry from '@sentry/react-native';
import { SentryAdapter } from '../lib/sentryAdapter';
import { notificationsService } from '../services';
import { twilioVoiceService } from '../services/twilioVoice.service';
import { IncomingCallHandler } from '../components/call/Incomingcallhandler';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { StripeProvider } from '@stripe/stripe-react-native';

// Initialize Sentry (make it idempotent; Fast Refresh / re-evaluation can re-run this module)
try {
  const g = globalThis as any;
  if (!g.__talkeeSentryInitialized) {
    Sentry.init({
      dsn: 'https://18e1c6ac9df262bbd98c89fd2db05f06@o4510523149647872.ingest.de.sentry.io/4510523154563152',
      debug: __DEV__,
    });
    g.__talkeeSentryInitialized = true;
  }
} catch (e) {
  console.error('Sentry.init failed (continuing without Sentry)', e);
}

try {
  // Register adapter immediately to catch early boot errors
  logger.registerRemoteLogger(new SentryAdapter());
  logger.info('Sentry adapter registered');
} catch (e) {
  console.error('Failed to register Sentry adapter', e);
}

SplashScreen.preventAutoHideAsync();

// Create AsyncStorage persister for React Query cache
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime: 1000,
});

// Create a QueryClient instance with offline support
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes('network') ||
          error?.message?.includes('fetch')
        ) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes('network') ||
          error?.message?.includes('fetch')
        ) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
    },
  },
});

// Setup network status listener for React Query
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    const handleOnline = () => {
      queryClient.refetchQueries();
    };
    (window as any).addEventListener('online', handleOnline);
  }
} else {
  NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      queryClient.refetchQueries();
    }
  });
}

// Auto Availability Wrapper Component
function AutoAvailabilityWrapper({ children }: { children: React.ReactNode }) {
  const { isProfessional } = useProfile();

  // 🟢 AUTO ONLINE/OFFLINE
  useAutoAvailability({
    enabled: isProfessional,
    setOnlineOnForeground: true,
    setOfflineOnBackground: true,
    backgroundDelay: 30000,
  });

  return <>{children}</>;
}

// Twilio Voice Initialization Component
function TwilioVoiceInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useProfile();
  const [twilioReady, setTwilioReady] = useState(false);

  useEffect(() => {
    // Only initialize Twilio if user is authenticated
    if (!user) {
      setTwilioReady(false);
      return;
    }

    let mounted = true;

    const initializeTwilio = async () => {
      try {
        logger.info('[Twilio] Initializing Voice SDK...');

        await twilioVoiceService.initialize();
        await twilioVoiceService.register();

        if (mounted) {
          setTwilioReady(true);
          logger.info(
            '[Twilio] Voice SDK initialized and registered successfully'
          );
        }
      } catch (error) {
        logger.error('[Twilio] Initialization error:', error);
        // Don't block app if Twilio fails
        if (mounted) {
          setTwilioReady(false);
        }
      }
    };

    initializeTwilio();

    // Cleanup on unmount or user logout
    return () => {
      mounted = false;
      if (twilioReady) {
        twilioVoiceService.cleanup().catch((error) => {
          logger.error('[Twilio] Cleanup error:', error);
        });
      }
    };
  }, [user]);

  return <>{children}</>;
}

export default function RootLayout() {
  useFrameworkReady();
  const [i18nReady, setI18nReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Initialize logger and error handlers
  useEffect(() => {
    // Configure logger for production
    const forceConsoleLogs = process.env.EXPO_PUBLIC_DEBUG_LOGS === '1';
    logger.configure({
      enableRemoteLogging: !__DEV__,
      logLevel: __DEV__ || forceConsoleLogs ? 'debug' : 'error',
      enableConsoleInProd: forceConsoleLogs,
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
    }, 10000);

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

  // Stripe publishable key from environment
  const stripePublishableKey =
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24,
        buster: '',
      }}
    >
      <StripeProvider
        publishableKey={stripePublishableKey}
        merchantIdentifier="merchant.net.talkee.app"
        urlScheme="talkee"
      >
        <ThemeProvider>
          <TwilioVoiceInitializer>
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
                <Stack.Screen name="settings/test-push" />
                <Stack.Screen name="settings/change-password" />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="profile/professional-settings" />
                <Stack.Screen name="profile/privacy-policy" />
                <Stack.Screen name="profile/devices" />
              </Stack>
              <StatusBar style="auto" translucent={false} />
              <OfflineBanner />
              <ToastStack />
              {/* Incoming Call Handler - Shows modal when receiving calls */}
              <IncomingCallHandler />
            </AutoAvailabilityWrapper>
          </TwilioVoiceInitializer>
        </ThemeProvider>
        {__DEV__ && Platform.OS === 'web' && __DEV__ ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : (
          <></>
        )}
      </StripeProvider>
    </PersistQueryClientProvider>
  );
}
