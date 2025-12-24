import { useEffect, useRef, useState } from 'react';
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
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { StripeProvider } from '@stripe/stripe-react-native';
// ✅ ADD THIS IMPORT!
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
  const twilioReadyRef = useRef(false);

  useEffect(() => {
    // Only initialize Twilio if user is authenticated
    if (!user) {
      twilioReadyRef.current = false;
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
          twilioReadyRef.current = true;
          setTwilioReady(true);
          logger.info(
            '[Twilio] Voice SDK initialized and registered successfully'
          );
        }
      } catch (error) {
        logger.error('[Twilio] Initialization error:', error);
        // Don't block app if Twilio fails
        if (mounted) {
          twilioReadyRef.current = false;
          setTwilioReady(false);
        }
      }
    };

    initializeTwilio();

    // Cleanup on unmount or user logout
    return () => {
      mounted = false;
      // Always attempt cleanup when leaving an authenticated session.
      // Use a ref to avoid stale-closure issues (twilioReady state can be outdated in cleanup).
      if (twilioReadyRef.current || twilioVoiceService.isSdkInitialized()) {
        twilioReadyRef.current = false;
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
  const [fontForcedReady, setFontForcedReady] = useState(false);

  // Debug: Log when app starts
  useEffect(() => {
    console.log('🚀 [_layout] App started, JavaScript loaded!');
  }, []);

  // Initialize logger and error handlers
  useEffect(() => {
    console.log('🔧 [_layout] Initializing app...');
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

  // Debug: Log font and i18n status
  useEffect(() => {
    console.log('📊 [_layout] Status:', {
      fontsLoaded,
      fontError: !!fontError,
      i18nReady,
    });
  }, [fontsLoaded, fontError, i18nReady]);

  // Best Practice: Progressive loading with graceful degradation
  // Don't block app startup - fonts and i18n can load in background
  // Maximum wait time: 2 seconds (reasonable UX threshold)
  useEffect(() => {
    const MAX_WAIT_TIME = 2000; // 2 seconds max wait
    const startTime = Date.now();

    const checkAndHide = () => {
      const elapsed = Date.now() - startTime;
      const fontsReady = fontsLoaded || fontError || fontForcedReady;

      // Hide splash screen when both are ready OR max wait time reached
      if ((fontsReady && i18nReady) || elapsed >= MAX_WAIT_TIME) {
        if (elapsed >= MAX_WAIT_TIME && (!fontsReady || !i18nReady)) {
          logger.warn('[App] Max wait time reached, hiding splash screen', {
            fontsReady,
            i18nReady,
            elapsed: `${elapsed}ms`,
          });
          // Force ready states if timeout reached
          if (!fontsReady) setFontForcedReady(true);
          if (!i18nReady) setI18nReady(true);
        }

        // Small delay for smooth transition
        setTimeout(() => {
          SplashScreen.hideAsync().catch((error) => {
            logger.error('[App] Error hiding splash screen', error);
          });
        }, 100);
      }
    };

    // Check immediately and on state changes
    checkAndHide();
    const interval = setInterval(checkAndHide, 100); // Check every 100ms

    // Force hide after max wait time (safety net)
    const forceHideTimeout = setTimeout(() => {
      clearInterval(interval);
      logger.warn('[App] Force hiding splash screen after max wait time');
      SplashScreen.hideAsync().catch((error) => {
        logger.error('[App] Error force hiding splash screen', error);
      });
    }, MAX_WAIT_TIME + 500); // Extra 500ms buffer

    return () => {
      clearInterval(interval);
      clearTimeout(forceHideTimeout);
    };
  }, [fontsLoaded, fontError, fontForcedReady, i18nReady]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    (async () => {
      try {
        // Add timeout to i18n initialization to prevent infinite hang
        const initPromise = initI18n();
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('i18n initialization timeout after 3 seconds'));
          }, 3000);
        });

        await Promise.race([initPromise, timeoutPromise]);
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          setI18nReady(true);
          logger.info('[App] i18n initialized successfully');
        }
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        logger.error('[App] Failed to initialize i18n', error);
        logger.warn('[App] Continuing without i18n initialization');
        setInitError(error instanceof Error ? error : new Error(String(error)));
        if (mounted) setI18nReady(true); // Set ready even on error to prevent hang
      }
    })();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Log font errors (but don't block app - graceful degradation)
  useEffect(() => {
    if (fontError) {
      logger.error('[App] Font loading error', fontError);
      logger.warn(
        '[App] App will continue with system fonts (graceful degradation)'
      );
    }
  }, [fontError]);

  // Show loading screen while fonts and i18n are loading
  // This prevents white screen on startup
  // Consider fonts ready if loaded, error, or forced ready
  const fontsReady = fontsLoaded || fontError || fontForcedReady;
  if (!fontsReady || !i18nReady) {
    console.log('⏸️ [_layout] Showing loading screen...', {
      fontsReady,
      i18nReady,
    });
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  console.log('🎉 [_layout] Rendering main app!');

  // Stripe publishable key from environment
  const stripePublishableKey =
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
});
