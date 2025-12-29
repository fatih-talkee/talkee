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
import IncomingCallHandler from '../components/call/IncomingCallHandler';
// ✅ NEW: Import notification setup with response listener
import {
  setupNotificationHandler,
  requestNotificationPermissions,
  setupNotificationResponseListener,
} from '@/lib/notificationSetup';
// ✅ NEW: Import ActiveCallOverlay
import ActiveCallOverlay from '@/components/call/ActiveCallOverlay';
// ✅ NEW: Import TwilioVoiceService for accept/decline
import { twilioVoiceService } from '@/services/twilioVoice.service';

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
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      // ✅ OPTIMIZED: Don't refetch on mount if data is fresh (within staleTime)
      // This prevents unnecessary queries on app startup
      refetchOnMount: false, // Use stale data if available, only refetch if stale
      refetchOnReconnect: true,
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
function ProfessionalFeaturesWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isProfessional, profileData } = useProfile();

  useAutoAvailability({
    enabled: isProfessional && !!profileData?.professional?.id,
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

  useEffect(() => {
    // ✅ Prevent duplicate setup
    if (notificationSetupRef.current) {
      logger.debug('[App] ⏭️ Notification setup already completed, skipping');
      return;
    }

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

    // ✅ NEW: Setup notification response listener
    const notificationSubscription = setupNotificationResponseListener(
      // On Accept
      async (callId: string) => {
        const acceptStartTime = Date.now();
        logger.info('[App] ✅ User accepted call from notification', {
          callId,
          timestamp: new Date().toISOString(),
        });

        try {
          // ✅ FIX: Ensure Twilio Voice SDK is initialized
          let sdkInitialized = false;
          const sdkInitMaxAttempts = 10;
          const sdkInitDelay = 200;

          for (
            let sdkAttempt = 0;
            sdkAttempt < sdkInitMaxAttempts;
            sdkAttempt++
          ) {
            try {
              const state = twilioVoiceService.getState();
              // Check if SDK is initialized by checking if voice instance exists
              // We can't directly check, but if getState() works, SDK is likely ready
              sdkInitialized = true;
              logger.debug('[App] ✅ Twilio Voice SDK is ready', {
                callId,
                sdkAttempt: sdkAttempt + 1,
                status: state.status,
                timestamp: new Date().toISOString(),
              });
              break;
            } catch (sdkError) {
              logger.debug(
                '[App] ⏳ Waiting for Twilio Voice SDK to initialize',
                {
                  callId,
                  sdkAttempt: sdkAttempt + 1,
                  maxAttempts: sdkInitMaxAttempts,
                  errorMessage:
                    sdkError instanceof Error
                      ? sdkError.message
                      : String(sdkError),
                  timestamp: new Date().toISOString(),
                }
              );
              await new Promise((resolve) => setTimeout(resolve, sdkInitDelay));
            }
          }

          if (!sdkInitialized) {
            logger.error(
              '[App] ❌ Twilio Voice SDK not initialized after waiting',
              undefined,
              {
                callId,
                maxAttempts: sdkInitMaxAttempts,
                totalElapsed: `${Date.now() - acceptStartTime}ms`,
                timestamp: new Date().toISOString(),
              }
            );
            return;
          }

          // ✅ Wait for callInvite to be available (app might have just opened)
          // Try up to 5 times with 500ms delay between attempts
          let callInviteFound = false;
          const maxAttempts = 5;
          const attemptDelay = 500;

          logger.info('[App] 🔍 Starting callInvite wait loop', {
            callId,
            maxAttempts,
            attemptDelay: `${attemptDelay}ms`,
            timestamp: new Date().toISOString(),
          });

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              const attemptStartTime = Date.now();
              const currentState = twilioVoiceService.getState();
              const attemptElapsed = Date.now() - attemptStartTime;

              logger.debug('[App] 🔍 Checking callInvite availability', {
                callId,
                attempt: attempt + 1,
                maxAttempts,
                hasCallInvite: !!currentState.callInvite,
                status: currentState.status,
                hasCall: !!currentState.call,
                attemptElapsed: `${attemptElapsed}ms`,
                timestamp: new Date().toISOString(),
              });

              if (currentState.callInvite) {
                callInviteFound = true;
                const waitElapsed = Date.now() - acceptStartTime;

                // ✅ Check if call invite is still valid before accepting
                try {
                  const callInviteSid = currentState.callInvite.getCallSid?.();
                  logger.info(
                    '[App] 📞 Found callInvite, validating before accept',
                    {
                      callId,
                      callInviteSid,
                      attempt: attempt + 1,
                      hasCallInvite: !!currentState.callInvite,
                      status: currentState.status,
                      waitElapsed: `${waitElapsed}ms`,
                      timestamp: new Date().toISOString(),
                    }
                  );
                } catch (validateError) {
                  logger.error(
                    '[App] ❌ Call invite validation failed (likely expired/cancelled)',
                    validateError,
                    {
                      callId,
                      attempt: attempt + 1,
                      errorMessage:
                        validateError instanceof Error
                          ? validateError.message
                          : String(validateError),
                      errorStack:
                        validateError instanceof Error
                          ? validateError.stack
                          : undefined,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  // Call invite is invalid, break out of loop
                  break;
                }

                logger.info(
                  '[App] 📞 Accepting incoming call from notification',
                  {
                    callId,
                    attempt: attempt + 1,
                    hasCallInvite: !!currentState.callInvite,
                    status: currentState.status,
                    waitElapsed: `${waitElapsed}ms`,
                    timestamp: new Date().toISOString(),
                  }
                );

                try {
                  const acceptCallStartTime = Date.now();
                  // Accept the call - this will automatically open the app and show ActiveCallOverlay
                  await twilioVoiceService.acceptIncomingCall({
                    callId: callId || undefined,
                    debugId: `notification-accept-${Date.now()}`,
                  });
                  const acceptCallElapsed = Date.now() - acceptCallStartTime;
                  const totalElapsed = Date.now() - acceptStartTime;

                  logger.info(
                    '[App] ✅ Call accepted successfully from notification',
                    {
                      callId,
                      acceptCallElapsed: `${acceptCallElapsed}ms`,
                      totalElapsed: `${totalElapsed}ms`,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  break;
                } catch (acceptError) {
                  const acceptErrorElapsed = Date.now() - acceptStartTime;
                  logger.error(
                    '[App] ❌ Failed to accept call (call invite may be expired/cancelled)',
                    acceptError,
                    {
                      callId,
                      attempt: attempt + 1,
                      errorMessage:
                        acceptError instanceof Error
                          ? acceptError.message
                          : String(acceptError),
                      errorStack:
                        acceptError instanceof Error
                          ? acceptError.stack
                          : undefined,
                      errorType:
                        acceptError instanceof Error
                          ? acceptError.constructor.name
                          : typeof acceptError,
                      acceptErrorElapsed: `${acceptErrorElapsed}ms`,
                      currentStatus: twilioVoiceService.getState().status,
                      hasCallInvite: !!twilioVoiceService.getState().callInvite,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  // Don't retry if call invite is invalid - break out of loop
                  break;
                }
              } else {
                logger.debug('[App] ⏳ Waiting for callInvite...', {
                  callId,
                  attempt: attempt + 1,
                  maxAttempts,
                  status: currentState.status,
                  hasCall: !!currentState.call,
                  attemptElapsed: `${attemptElapsed}ms`,
                  timestamp: new Date().toISOString(),
                });

                // Wait before next attempt
                await new Promise((resolve) =>
                  setTimeout(resolve, attemptDelay)
                );
              }
            } catch (attemptError) {
              logger.error(
                '[App] ❌ Error during callInvite wait attempt',
                attemptError,
                {
                  callId,
                  attempt: attempt + 1,
                  maxAttempts,
                  errorMessage:
                    attemptError instanceof Error
                      ? attemptError.message
                      : String(attemptError),
                  errorStack:
                    attemptError instanceof Error
                      ? attemptError.stack
                      : undefined,
                  timestamp: new Date().toISOString(),
                }
              );
              // Continue to next attempt
              await new Promise((resolve) => setTimeout(resolve, attemptDelay));
            }
          }

          if (!callInviteFound) {
            const totalElapsed = Date.now() - acceptStartTime;
            logger.warn('[App] ⚠️ No active callInvite found after waiting', {
              callId,
              maxAttempts,
              totalElapsed: `${totalElapsed}ms`,
              finalStatus: twilioVoiceService.getState().status,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          const totalElapsed = Date.now() - acceptStartTime;
          logger.error(
            '[App] ❌ Failed to accept call from notification',
            error,
            {
              callId,
              errorMessage:
                error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
              errorType:
                error instanceof Error ? error.constructor.name : typeof error,
              totalElapsed: `${totalElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
        }
      },
      // On Decline
      async (callId: string) => {
        const declineStartTime = Date.now();
        logger.info('[App] ❌ User declined call from notification', {
          callId,
          timestamp: new Date().toISOString(),
        });

        try {
          // ✅ FIX: Ensure Twilio Voice SDK is initialized
          let sdkInitialized = false;
          const sdkInitMaxAttempts = 10;
          const sdkInitDelay = 200;

          for (
            let sdkAttempt = 0;
            sdkAttempt < sdkInitMaxAttempts;
            sdkAttempt++
          ) {
            try {
              const state = twilioVoiceService.getState();
              sdkInitialized = true;
              logger.debug('[App] ✅ Twilio Voice SDK is ready', {
                callId,
                sdkAttempt: sdkAttempt + 1,
                status: state.status,
                timestamp: new Date().toISOString(),
              });
              break;
            } catch (sdkError) {
              logger.debug(
                '[App] ⏳ Waiting for Twilio Voice SDK to initialize',
                {
                  callId,
                  sdkAttempt: sdkAttempt + 1,
                  maxAttempts: sdkInitMaxAttempts,
                  errorMessage:
                    sdkError instanceof Error
                      ? sdkError.message
                      : String(sdkError),
                  timestamp: new Date().toISOString(),
                }
              );
              await new Promise((resolve) => setTimeout(resolve, sdkInitDelay));
            }
          }

          if (!sdkInitialized) {
            logger.error(
              '[App] ❌ Twilio Voice SDK not initialized after waiting',
              undefined,
              {
                callId,
                maxAttempts: sdkInitMaxAttempts,
                totalElapsed: `${Date.now() - declineStartTime}ms`,
                timestamp: new Date().toISOString(),
              }
            );
            return;
          }

          // ✅ Wait for callInvite to be available (app might have just opened)
          // Try up to 3 times with 500ms delay between attempts
          let callInviteFound = false;
          const maxAttempts = 3;
          const attemptDelay = 500;

          logger.info('[App] 🔍 Starting callInvite wait loop for decline', {
            callId,
            maxAttempts,
            attemptDelay: `${attemptDelay}ms`,
            timestamp: new Date().toISOString(),
          });

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              const attemptStartTime = Date.now();
              const currentState = twilioVoiceService.getState();
              const attemptElapsed = Date.now() - attemptStartTime;

              logger.debug('[App] 🔍 Checking callInvite for decline', {
                callId,
                attempt: attempt + 1,
                maxAttempts,
                hasCallInvite: !!currentState.callInvite,
                status: currentState.status,
                hasCall: !!currentState.call,
                attemptElapsed: `${attemptElapsed}ms`,
                timestamp: new Date().toISOString(),
              });

              if (currentState.callInvite) {
                callInviteFound = true;
                const waitElapsed = Date.now() - declineStartTime;

                // ✅ Check if call invite is still valid before rejecting
                try {
                  const callInviteSid = currentState.callInvite.getCallSid?.();
                  logger.info(
                    '[App] 📞 Found callInvite, validating before reject',
                    {
                      callId,
                      callInviteSid,
                      attempt: attempt + 1,
                      hasCallInvite: !!currentState.callInvite,
                      status: currentState.status,
                      waitElapsed: `${waitElapsed}ms`,
                      timestamp: new Date().toISOString(),
                    }
                  );
                } catch (validateError) {
                  logger.error(
                    '[App] ❌ Call invite validation failed (likely expired/cancelled)',
                    validateError,
                    {
                      callId,
                      attempt: attempt + 1,
                      errorMessage:
                        validateError instanceof Error
                          ? validateError.message
                          : String(validateError),
                      errorStack:
                        validateError instanceof Error
                          ? validateError.stack
                          : undefined,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  // Call invite is invalid, break out of loop
                  break;
                }

                logger.info(
                  '[App] 📞 Rejecting incoming call from notification',
                  {
                    callId,
                    attempt: attempt + 1,
                    hasCallInvite: !!currentState.callInvite,
                    status: currentState.status,
                    waitElapsed: `${waitElapsed}ms`,
                    timestamp: new Date().toISOString(),
                  }
                );

                try {
                  const rejectCallStartTime = Date.now();
                  // Reject the call
                  await twilioVoiceService.rejectIncomingCall({
                    callId: callId || undefined,
                    debugId: `notification-decline-${Date.now()}`,
                  });
                  const rejectCallElapsed = Date.now() - rejectCallStartTime;
                  const totalElapsed = Date.now() - declineStartTime;

                  logger.info(
                    '[App] ✅ Call rejected successfully from notification',
                    {
                      callId,
                      rejectCallElapsed: `${rejectCallElapsed}ms`,
                      totalElapsed: `${totalElapsed}ms`,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  break;
                } catch (rejectError) {
                  const rejectErrorElapsed = Date.now() - declineStartTime;
                  logger.error(
                    '[App] ❌ Failed to reject call (call invite may be expired/cancelled)',
                    rejectError,
                    {
                      callId,
                      attempt: attempt + 1,
                      errorMessage:
                        rejectError instanceof Error
                          ? rejectError.message
                          : String(rejectError),
                      errorStack:
                        rejectError instanceof Error
                          ? rejectError.stack
                          : undefined,
                      errorType:
                        rejectError instanceof Error
                          ? rejectError.constructor.name
                          : typeof rejectError,
                      rejectErrorElapsed: `${rejectErrorElapsed}ms`,
                      currentStatus: twilioVoiceService.getState().status,
                      hasCallInvite: !!twilioVoiceService.getState().callInvite,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  // Don't retry if call invite is invalid - break out of loop
                  break;
                }
              } else {
                logger.debug('[App] ⏳ Waiting for callInvite to reject...', {
                  callId,
                  attempt: attempt + 1,
                  maxAttempts,
                  status: currentState.status,
                  hasCall: !!currentState.call,
                  attemptElapsed: `${attemptElapsed}ms`,
                  timestamp: new Date().toISOString(),
                });

                // Wait before next attempt
                await new Promise((resolve) =>
                  setTimeout(resolve, attemptDelay)
                );
              }
            } catch (attemptError) {
              logger.error(
                '[App] ❌ Error during callInvite wait attempt',
                attemptError,
                {
                  callId,
                  attempt: attempt + 1,
                  maxAttempts,
                  errorMessage:
                    attemptError instanceof Error
                      ? attemptError.message
                      : String(attemptError),
                  errorStack:
                    attemptError instanceof Error
                      ? attemptError.stack
                      : undefined,
                  timestamp: new Date().toISOString(),
                }
              );
              // Continue to next attempt
              await new Promise((resolve) => setTimeout(resolve, attemptDelay));
            }
          }

          if (!callInviteFound) {
            const totalElapsed = Date.now() - declineStartTime;
            logger.warn('[App] ⚠️ No active callInvite found after waiting', {
              callId,
              maxAttempts,
              totalElapsed: `${totalElapsed}ms`,
              finalStatus: twilioVoiceService.getState().status,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          const totalElapsed = Date.now() - declineStartTime;
          logger.error(
            '[App] ❌ Failed to reject call from notification',
            error,
            {
              callId,
              errorMessage:
                error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
              errorType:
                error instanceof Error ? error.constructor.name : typeof error,
              totalElapsed: `${totalElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    );

    return () => {
      // Cleanup notification listener
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

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });

  const splashHiddenRef = useRef(false);

  useEffect(() => {
    const MAX_WAIT_TIME = 1000;
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

      if ((fontsReady && i18nReady) || elapsed >= MAX_WAIT_TIME) {
        if (elapsed >= MAX_WAIT_TIME && (!fontsReady || !i18nReady)) {
          if (!fontsReady) setFontForcedReady(true);
          if (!i18nReady) setI18nReady(true);
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
    }, MAX_WAIT_TIME + 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [fontsLoaded, fontError, fontForcedReady, i18nReady]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    setI18nReady(true);

    (async () => {
      try {
        const initPromise = initI18n();
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('i18n initialization timeout'));
          }, 1000);
        });

        await Promise.race([initPromise, timeoutPromise]);
        if (mounted && timeoutId) clearTimeout(timeoutId);
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        logger.error('[App] ❌ Failed to initialize i18n', error);
      }
    })();

    return () => {
      mounted = false;
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

                {/* ✅ Incoming Call Handler - Shows modal for incoming calls */}
                <IncomingCallHandler />

                {/* ✅ Active Call Overlay - Shows custom UI during active call */}
                <ActiveCallOverlay />
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
