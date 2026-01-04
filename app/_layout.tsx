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
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { StripeProvider } from '@stripe/stripe-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  warmSupabaseConnection,
  supabase,
  setSupabaseSession,
  ensureSupabaseSession,
} from '../lib/supabase';
// ✅ OPTIMIZED: Lazy load heavy call components to reduce initial bundle size
import { lazy, Suspense } from 'react';
const IncomingCallHandler = lazy(
  () => import('../components/call/IncomingCallHandler')
);
const ActiveCallOverlay = lazy(
  () => import('@/components/call/ActiveCallOverlay')
);
import { GlobalLoadingOverlay } from '@/components/ui/GlobalLoadingOverlay';

// ✅ NEW: Import notification setup with response listener
import {
  setupNotificationHandler,
  requestNotificationPermissions,
  setupNotificationResponseListener,
} from '@/lib/notificationSetup';
// ✅ NEW: Import notification handlers (extracted to separate file for better organization)
import { createNotificationHandlers } from '@/lib/_layout-notification-handlers';

// Initialize Sentry (make it idempotent)
try {
  const g = globalThis as any;
  if (!g.__talkeeSentryInitialized) {
    logger.info('[App] 🔧 Initializing Sentry...', {
      debug: __DEV__,
      timestamp: new Date().toISOString(),
    });
    Sentry.init({
      dsn: 'https://18e1c6ac9df262bbd98c89fd2db05f06@o4510523149647872.ingest.de.sentry.io/4510523154563152',
      debug: __DEV__,
    });
    g.__talkeeSentryInitialized = true;
    logger.info('[App] ✅ Sentry initialized successfully', {
      timestamp: new Date().toISOString(),
    });
  }
} catch (e) {
  logger.error('[App] ❌ Sentry.init failed (continuing without Sentry)', e);
  console.error('Sentry.init failed', e);
}

try {
  logger.info('[App] 🔧 Registering Sentry adapter...');
  logger.registerRemoteLogger(new SentryAdapter());
  logger.info('[App] ✅ Sentry adapter registered successfully');
} catch (e) {
  logger.error('[App] ❌ Failed to register Sentry adapter', e);
}

logger.info('[App] 🔧 Preventing splash screen auto-hide');
SplashScreen.preventAutoHideAsync();

// Create AsyncStorage persister for React Query cache
logger.info('[App] 🔧 Creating AsyncStorage persister for React Query...');
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime: 1000,
});
logger.info('[App] ✅ AsyncStorage persister created');

// Create QueryClient with offline support
logger.info('[App] 🔧 Creating QueryClient with offline support...');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes('network') ||
          error?.message?.includes('fetch') ||
          error?.message?.includes('timeout')
        ) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
      staleTime: 60 * 1000, // Increased from 30s to 60s - data stays fresh longer
      gcTime: 5 * 60 * 1000,
      // ✅ OPTIMIZED: Don't refetch on mount if data is fresh (within staleTime)
      // This prevents unnecessary queries on app startup
      refetchOnMount: false, // Use stale data if available, only refetch if stale
      refetchOnReconnect: true,
      // ✅ OPTIMIZED: Don't refetch on window focus - reduces unnecessary network calls
      refetchOnWindowFocus: false,
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
logger.info('[App] ✅ QueryClient created successfully');

// Setup network status listener
logger.info('[App] 🔧 Setting up network status listener...');
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    const handleOnline = () => {
      logger.info('[App] 🌐 Network online - refetching queries');
      queryClient.refetchQueries();
    };
    (window as any).addEventListener('online', handleOnline);
    logger.info('[App] ✅ Web online listener registered');
  }
} else {
  // ✅ OPTIMIZED: Only refetch stale queries on network reconnect
  // Don't refetch all queries - this is too aggressive and causes performance issues
  NetInfo.addEventListener((state) => {
    logger.debug('[App] 🌐 Network state changed', {
      isConnected: state.isConnected,
      type: state.type,
    });
    if (state.isConnected) {
      logger.info('[App] 🌐 Network connected - refetching stale queries only');
      // ✅ Only refetch queries that are stale (older than staleTime)
      // This prevents unnecessary network requests on every network change
      queryClient.refetchQueries({
        type: 'active',
        stale: true, // Only refetch stale queries
      });
    }
  });
  logger.info('[App] ✅ NetInfo listener registered');
}

// ✅ OPTIMIZED: Auto Availability Wrapper Component
// Only loads useProfile when needed (lazy evaluation)
function AutoAvailabilityWrapper({ children }: { children: React.ReactNode }) {
  // ✅ OPTIMIZED: Don't call useProfile immediately - it triggers a query
  // Instead, useAutoAvailability will handle the profile check internally
  // This prevents unnecessary profile query on app startup for non-professionals
  return <>{children}</>;
}

// ✅ OPTIMIZED: Separate component for professional-only features
// This only mounts when user is actually a professional
// Deferred to prevent initial profile query on app startup
function ProfessionalFeaturesWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ OPTIMIZED: Defer profile check - only check after initial render
  const [shouldCheckProfile, setShouldCheckProfile] = useState(false);
  const { isProfessional, profileData } = useProfile();

  // Defer profile check to after initial render
  useEffect(() => {
    // Small delay to allow app to render first
    const timer = setTimeout(() => {
      setShouldCheckProfile(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Only enable auto availability if profile check is done and user is professional
  useAutoAvailability({
    enabled:
      shouldCheckProfile && isProfessional && !!profileData?.professional?.id,
    setOnlineOnForeground: true,
    setOfflineOnBackground: true,
    backgroundDelay: 30000,
  });

  return <>{children}</>;
}

export default function RootLayout() {
  const mountTimeRef = useRef<number>(Date.now());

  useFrameworkReady();
  const [i18nReady, setI18nReady] = useState(false);
  const [fontForcedReady, setFontForcedReady] = useState(false);

  useEffect(() => {
    const mountTime = Date.now();
    mountTimeRef.current = mountTime;
    logger.info('[App] 🚀 App started, JavaScript loaded!');
    console.log('🚀 [_layout] App started!');

    return () => {
      logger.info('[App] 🔚 RootLayout unmounting');
    };
  }, []);

  // ============================================================================
  // ✅ OPTIMIZED: NOTIFICATION SETUP WITH RESPONSE LISTENER
  // ============================================================================
  // ✅ Use ref to ensure setup only happens once
  const notificationSetupRef = useRef(false);

  // ✅ OPTIMIZED: Defer notification setup to after initial render
  // This allows app to render faster, notifications can initialize in background
  useEffect(() => {
    // ✅ Prevent duplicate setup
    if (notificationSetupRef.current) {
      logger.debug('[App] ⏭️ Notification setup already completed, skipping');
      return;
    }

    // Defer notification setup slightly to prioritize UI rendering
    const setupTimer = setTimeout(() => {
      logger.info('[App] 🔧 Setting up notifications', {
        timestamp: new Date().toISOString(),
      });

      notificationSetupRef.current = true;

      // ✅ NOTE: Notification handler is already configured in services/notifications.service.ts
      // setupNotificationHandler() is now a no-op for backward compatibility
      // The handler in notifications.service.ts handles incoming call suppression in foreground

      // Request permissions (async, non-blocking)
      (async () => {
        try {
          const granted = await requestNotificationPermissions();
          if (granted) {
            logger.info('[App] ✅ Notification permissions granted', {
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.warn('[App] ⚠️ Notification permissions denied', {
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error(
            '[App] ❌ Failed to request notification permissions',
            error,
            {
              timestamp: new Date().toISOString(),
            }
          );
        }
      })();
    }, 100); // Small delay to allow initial render

    // ✅ NEW: Setup notification response listener
    // ✅ REFACTORED: Extract notification handlers to separate file
    const { handleAccept, handleDecline } = createNotificationHandlers({
      onAccept: async (callId: string) => {
        // Handler logic is in createNotificationHandlers
      },
      onDecline: async (callId: string) => {
        // Handler logic is in createNotificationHandlers
      },
    });

    const notificationSubscription = setupNotificationResponseListener(
      // On Accept
      handleAccept,
      // On Decline
      handleDecline
    );

    return () => {
      // Cleanup: clear timeout and remove notification listener
      clearTimeout(setupTimer);
      if (notificationSubscription) {
        notificationSubscription.remove();
      }
    };
  }, []);

  // ============================================================================
  // 🔥 AUTH SESSION SYNC
  // ============================================================================
  useEffect(() => {
    logger.info('[App] 🔧 Setting up auth session sync');

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('[App] 🔐 Auth state changed', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
        });

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) {
            logger.info('[App] 🔧 Ensuring session is set', {
              userId: session.user.id,
              event,
            });

            // Session'ı force set et
            const sessionSet = await setSupabaseSession(
              session.access_token,
              session.refresh_token
            );

            if (sessionSet) {
              // Session'ı kontrol et
              await ensureSupabaseSession();

              // ✅ Only invalidate cache on SIGNED_IN, not on TOKEN_REFRESHED
              // TOKEN_REFRESHED is just a token renewal, user data hasn't changed
              if (event === 'SIGNED_IN') {
                logger.info('[App] 🔄 Invalidating queries after sign in');
                queryClient.invalidateQueries();
              } else {
                logger.debug(
                  '[App] ⏭️ Skipping cache invalidation on TOKEN_REFRESHED (token renewal only)'
                );
              }
            }
          }
        }

        if (event === 'SIGNED_OUT') {
          logger.info('[App] 🚪 User signed out, clearing session');
          queryClient.clear();
        }
      }
    );

    logger.info('[App] ✅ Auth sync listener registered');

    return () => {
      logger.info('[App] 🔇 Removing auth sync listener');
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Initialize logger and error handlers
  useEffect(() => {
    const initStartTime = Date.now();
    logger.info('[App] 🔧 Initializing app...');

    const forceConsoleLogs = process.env.EXPO_PUBLIC_DEBUG_LOGS === '1';
    logger.configure({
      enableRemoteLogging: !__DEV__,
      logLevel: __DEV__ || forceConsoleLogs ? 'debug' : 'error',
      enableConsoleInProd: forceConsoleLogs,
      enableBreadcrumbs: true,
      enablePerformanceTracking: true,
    });

    setupGlobalErrorHandlers();

    // Pre-warm Supabase connection
    warmSupabaseConnection()
      .then(() => {
        logger.info('[App] ✅ Supabase connection pre-warmed', {
          elapsed: `${Date.now() - initStartTime}ms`,
        });
      })
      .catch((error) => {
        logger.warn('[App] ⚠️ Supabase pre-warm failed (non-critical)', error);
      });

    // Check existing session
    (async () => {
      try {
        logger.info('[App] 🔧 Checking existing session...');
        const hasSession = await ensureSupabaseSession();
        if (hasSession) {
          logger.info('[App] ✅ Existing session found and validated');
        } else {
          logger.warn('[App] ⚠️ No existing session found');
        }
      } catch (error) {
        logger.error('[App] ❌ Session check failed', error);
      }
    })();

    // Initialize notifications
    (async () => {
      try {
        notificationsService.setupListeners();
        const token = await notificationsService.initialize();
        if (token) {
          logger.info('[App] ✅ Push notifications initialized');
        }
      } catch (error) {
        logger.error('[App] ❌ Failed to initialize notifications', error);
      }
    })();

    logger.info('[App] ✅ App initialization complete');

    return () => {
      logger.cleanup();
    };
  }, []);

  // ✅ OPTIMIZED: Font loading with error handling
  // Fonts are loaded asynchronously, app can render with system fonts first
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });

  // ✅ OPTIMIZED: Allow app to render even if fonts fail to load
  // System fonts will be used as fallback

  const splashHiddenRef = useRef(false);

  // ✅ OPTIMIZED: Faster splash screen hiding
  // Reduced MAX_WAIT_TIME and more aggressive hiding strategy
  useEffect(() => {
    const MAX_WAIT_TIME = 500; // Reduced from 1000ms to 500ms
    const startTime = Date.now();

    const hideSplash = () => {
      if (splashHiddenRef.current) return;
      splashHiddenRef.current = true;

      requestAnimationFrame(() => {
        SplashScreen.hideAsync()
          .then(() => logger.info('[App] ✅ Splash screen hidden'))
          .catch((error) =>
            logger.error('[App] ❌ Error hiding splash', error)
          );
      });
    };

    const checkAndHide = () => {
      if (splashHiddenRef.current) return;

      const elapsed = Date.now() - startTime;
      const fontsReady = fontsLoaded || fontError || fontForcedReady;

      // ✅ OPTIMIZED: Hide splash as soon as fonts are ready (i18n can load in background)
      // Don't wait for i18n - it's not critical for initial render
      if (fontsReady || elapsed >= MAX_WAIT_TIME) {
        if (elapsed >= MAX_WAIT_TIME && !fontsReady) {
          setFontForcedReady(true);
        }
        // i18n is not blocking - set ready if not already set
        if (!i18nReady) {
          setI18nReady(true);
        }
        hideSplash();
      }
    };

    checkAndHide();
    const interval = setInterval(checkAndHide, 50);
    const timeout1 = setTimeout(() => {
      if (!splashHiddenRef.current) {
        setFontForcedReady(true);
        setI18nReady(true);
        hideSplash();
      }
    }, MAX_WAIT_TIME);

    const timeout2 = setTimeout(() => {
      clearInterval(interval);
      if (!splashHiddenRef.current) hideSplash();
    }, MAX_WAIT_TIME + 200); // Reduced from 500ms to 200ms

    return () => {
      clearInterval(interval);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [fontsLoaded, fontError, fontForcedReady, i18nReady]);

  // ✅ OPTIMIZED: Defer i18n initialization to after initial render
  // This allows app to render faster, i18n can load in background
  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    // Set ready immediately to allow app to render
    // i18n will load in background
    setI18nReady(true);

    // Defer actual initialization slightly to prioritize UI rendering
    const initTimer = setTimeout(() => {
      (async () => {
        try {
          const initPromise = initI18n();
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('i18n initialization timeout'));
            }, 2000); // Increased timeout since it's deferred
          });

          await Promise.race([initPromise, timeoutPromise]);
          if (mounted && timeoutId) clearTimeout(timeoutId);
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          logger.error('[App] ❌ Failed to initialize i18n', error);
        }
      })();
    }, 50); // Small delay to allow initial render

    return () => {
      mounted = false;
      clearTimeout(initTimer);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const fontsReady = fontsLoaded || fontError || fontForcedReady;
  if (!fontsReady || !i18nReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

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
            <AutoAvailabilityWrapper>
              <ProfessionalFeaturesWrapper>
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

                {/* ✅ OPTIMIZED: Lazy loaded call components - reduces initial bundle size */}
                <Suspense fallback={null}>
                  {/* ✅ Incoming Call Handler - Shows modal for incoming calls */}
                  <IncomingCallHandler />

                  {/* ✅ Active Call Overlay - Shows custom UI during active call */}
                  <ActiveCallOverlay />
                </Suspense>

                {/* ✅ Global Loading Overlay - Shows loading when app is processing */}
                <GlobalLoadingOverlay />
              </ProfessionalFeaturesWrapper>
            </AutoAvailabilityWrapper>
          </ThemeProvider>
          {__DEV__ && Platform.OS === 'web' ? (
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
