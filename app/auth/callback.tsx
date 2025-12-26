/**
 * Auth Callback Handler - OAuth Sign-In/Sign-Up
 * Handles Google, Facebook, LinkedIn OAuth callbacks
 */

import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { logger } from '@/lib/logger';

export default function AuthCallback() {
  const toast = useToast();
  const [status, setStatus] = useState('Completing sign in...');
  const hasProcessedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current || hasNavigatedRef.current) return; // Prevent duplicate processing

    // Listen for auth state changes in case session is set asynchronously
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'SIGNED_IN' &&
        session &&
        !hasProcessedRef.current &&
        !hasNavigatedRef.current
      ) {
        logger.info(
          '[Callback] 🔔 Auth state changed to SIGNED_IN, processing...'
        );
        handleOAuthCallback(session);
      }
    });

    // Also try immediately
    handleOAuthCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleOAuthCallback = async (providedSession?: any) => {
    if (hasProcessedRef.current || hasNavigatedRef.current) return; // Prevent duplicate processing

    const callbackStartTime = Date.now();

    try {
      logger.info('[Callback] 🚀 Starting OAuth callback handling', {
        timestamp: new Date().toISOString(),
        hasProvidedSession: !!providedSession,
      });
      setStatus('Verifying authentication...');

      // Use provided session or fetch it
      let session = providedSession;

      if (!session) {
        // Wait for session to be available (deep link handler sets it)
        // Retry up to 5 times with 1 second delay between attempts
        let sessionError = null;
        const maxRetries = 5;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          logger.info(
            `[Callback] 🔍 Getting session (attempt ${attempt}/${maxRetries})...`
          );

          try {
            const {
              data: { session: currentSession },
              error: currentError,
            } = await supabase.auth.getSession();

            if (currentError) {
              sessionError = currentError;
              logger.warn(
                `[Callback] ⚠️ Session error on attempt ${attempt}:`,
                {
                  error: currentError.message,
                }
              );
            } else if (currentSession) {
              session = currentSession;
              logger.info(`[Callback] ✅ Session found on attempt ${attempt}`);
              break;
            } else {
              logger.info(
                `[Callback] ℹ️ No session yet (attempt ${attempt}/${maxRetries})`
              );
            }
          } catch (error: any) {
            logger.warn(
              `[Callback] ⚠️ Session fetch error on attempt ${attempt}:`,
              {
                error: error?.message,
              }
            );
          }

          // If no session yet, wait before retrying
          if (!session && attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session) {
          throw new Error(
            'No session found after OAuth (max retries exceeded)'
          );
        }
      }

      hasProcessedRef.current = true; // Mark as processed to prevent duplicate calls

      const sessionAcquiredTime = Date.now();
      const sessionAcquisitionDuration =
        sessionAcquiredTime - callbackStartTime;

      logger.info('[Callback] ✅ Session found', {
        userId: session.user.id?.substring(0, 8) + '...',
        email: session.user.email,
        provider: session.user.app_metadata?.provider,
        sessionAcquisitionDuration: `${sessionAcquisitionDuration}ms`,
        timestamp: new Date().toISOString(),
      });

      setStatus('Setting up your account...');

      // Check if user profile exists with timeout
      logger.info('[Callback] 🔍 Checking if user exists in database...', {
        authId: session.user.id?.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
      });

      const queryStartTime = Date.now();
      const queryPromiseStartTime = Date.now();

      // Optimized query: first check if user exists (minimal query - only essential fields)
      // This is faster than selecting all columns
      const profileQueryPromise = supabase
        .from('users')
        .select(
          'id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email'
        )
        .eq('auth_id', session.user.id)
        .is('deleted_at', null) // Only get non-deleted users
        .maybeSingle(); // Use maybeSingle instead of single (returns null if not found, doesn't throw)

      const queryPromiseCreatedTime = Date.now();
      logger.info('[Callback] 📊 Profile query promise created', {
        promiseCreationTime: `${
          queryPromiseCreatedTime - queryPromiseStartTime
        }ms`,
        timestamp: new Date().toISOString(),
      });

      // Track query execution (for debugging)
      profileQueryPromise
        .then((result) => {
          logger.info(
            '[Callback] ✅ Profile query promise resolved (outside race)',
            {
              hasData: !!result?.data,
              hasError: !!result?.error,
              timestamp: new Date().toISOString(),
            }
          );
        })
        .catch((error) => {
          logger.warn(
            '[Callback] ⚠️ Profile query promise rejected (outside race)',
            {
              error: error?.message || String(error),
              timestamp: new Date().toISOString(),
            }
          );
        });

      let existingProfile = null;
      let profileQueryTimedOut = false;

      // Retry logic for profile query (handles network issues)
      const maxRetries = 2;
      const attemptTimeoutMs = 10000; // 10 seconds per attempt (reduced from 20s for faster retries)
      let queryResult: any = null;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const attemptStartTime = Date.now();
          const elapsedSinceStart = attemptStartTime - queryStartTime;

          if (attempt > 0) {
            logger.info(
              `[Callback] 🔄 Retrying profile query (attempt ${attempt + 1}/${
                maxRetries + 1
              })`,
              {
                timestamp: new Date().toISOString(),
                elapsedSinceStart: `${elapsedSinceStart}ms`,
                attemptTimeout: `${attemptTimeoutMs}ms`,
              }
            );
            // Exponential backoff: wait 500ms * attempt
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          } else {
            logger.info(
              '[Callback] 🏁 Starting Promise.race (query vs timeout)',
              {
                timestamp: new Date().toISOString(),
                attemptTimeout: `${attemptTimeoutMs}ms`,
              }
            );
          }

          // Create a new timeout promise for this attempt (fixed timeout per attempt)
          const attemptTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => {
              const timeoutElapsed = Date.now() - attemptStartTime;
              const timeoutError = new Error('Profile query timeout');
              logger.error(
                `[Callback] ⏱️ Profile query TIMEOUT (attempt ${attempt + 1})`,
                timeoutError,
                {
                  elapsedTime: `${timeoutElapsed}ms`,
                  attemptTimeout: `${attemptTimeoutMs}ms`,
                  totalElapsed: `${Date.now() - queryStartTime}ms`,
                  timestamp: new Date().toISOString(),
                }
              );
              reject(timeoutError);
            }, attemptTimeoutMs);

            // Store timeout ID for cleanup (though we can't clear it from here)
            // This is just for reference
          });

          // Create query promise (new one for retries)
          const queryPromise =
            attempt === 0
              ? profileQueryPromise
              : supabase
                  .from('users')
                  .select(
                    'id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email'
                  )
                  .eq('auth_id', session.user.id)
                  .is('deleted_at', null)
                  .maybeSingle();

          queryResult = await Promise.race([queryPromise, attemptTimeout]);

          // If we got here, query succeeded
          logger.info(
            `[Callback] ✅ Profile query succeeded (attempt ${attempt + 1})`,
            {
              duration: `${Date.now() - attemptStartTime}ms`,
              totalDuration: `${Date.now() - queryStartTime}ms`,
            }
          );
          break;
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || String(error);
          const isTimeout =
            errorMessage.includes('timeout') ||
            errorMessage.includes('TIMEOUT');
          const isNetworkError =
            errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            error?.name === 'AbortError' ||
            error?.name === 'TypeError';

          logger.warn(
            `[Callback] ⚠️ Profile query failed (attempt ${attempt + 1})`,
            {
              error: errorMessage,
              isTimeout,
              isNetworkError,
              willRetry: attempt < maxRetries && (isTimeout || isNetworkError),
            }
          );

          // If it's a timeout/network error and we have retries left, retry
          if (attempt < maxRetries && (isTimeout || isNetworkError)) {
            // Will retry in next iteration
            continue;
          }

          // If no more retries or not a retryable error, throw
          throw error;
        }
      }

      // If queryResult is still null after all retries, we have a problem
      if (!queryResult && lastError) {
        throw lastError;
      }

      // Process query result
      if (!queryResult) {
        // This should not happen if retry logic worked correctly
        throw new Error('Profile query returned null after all retries');
      }

      try {
        const raceEndTime = Date.now();
        const queryDuration = Date.now() - queryStartTime;

        logger.info('[Callback] ⏱️ Profile query completed', {
          totalDuration: `${queryDuration}ms`,
          promiseCreationToRace: `${raceStartTime - queryPromiseCreatedTime}ms`,
          timestamp: new Date().toISOString(),
        });

        const { data, error: profileError } = queryResult as any;

        if (profileError) {
          // Real error (maybeSingle doesn't throw PGRST116, but other errors are possible)
          throw new Error(`Profile check error: ${profileError.message}`);
        } else if (data) {
          // User found
          existingProfile = data;
          logger.info('[Callback] ✅ User found', {
            userId: existingProfile.id,
            userName: existingProfile.name,
          });
        } else {
          // User not found (maybeSingle returns null, not an error)
          logger.info('[Callback] ℹ️ User not found (new user)');
          existingProfile = null;
        }
      } catch (error: any) {
        const errorTime = Date.now();
        const totalElapsed = errorTime - queryStartTime;

        if (error?.message?.includes('timeout')) {
          profileQueryTimedOut = true;
          logger.warn(
            '[Callback] ⚠️ Profile query timeout - session exists, will navigate to home and sync profile in background',
            {
              totalElapsed: `${totalElapsed}ms`,
              timeoutLimit: '20000ms',
              timestamp: new Date().toISOString(),
            }
          );
          // Don't set existingProfile to null - we'll navigate anyway since session exists
        } else {
          logger.error('[Callback] ❌ Profile query error (non-timeout)', {
            error: error?.message,
            errorCode: error?.code,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
          throw error;
        }
      }

      // If profile query timed out but session exists, navigate to home anyway
      // Profile will sync in background via useProfile hook
      if (profileQueryTimedOut) {
        logger.info(
          '[Callback] ⚠️ Profile query timed out, but session exists - navigating to home'
        );
        logger.info(
          '[Callback] ℹ️ Profile will sync in background via useProfile hook'
        );

        setStatus('Redirecting...');
        hasNavigatedRef.current = true;
        logger.info(
          '[Callback] 🧭 Navigating to home (timeout - session exists)'
        );

        await new Promise((resolve) => setTimeout(resolve, 300));
        router.replace('/(tabs)');
        logger.info(
          '[Callback] ✅ Navigation to home completed (timeout case)'
        );
        return;
      }

      if (existingProfile) {
        // ✅ Profile exists - Sign-In
        logger.info('[Callback] Existing user sign-in');

        toast.success({
          title: 'Welcome Back!',
          message: `Good to see you, ${existingProfile.name}`,
        });

        setStatus('Redirecting...');
        hasNavigatedRef.current = true; // Mark as navigated
        logger.info('[Callback] 🧭 Navigating to home (existing user)');

        // Small delay to ensure state updates complete before navigation
        await new Promise((resolve) => setTimeout(resolve, 300));

        router.replace('/(tabs)');
        logger.info('[Callback] ✅ Navigation to home completed');
        return; // Exit early after navigation
      } else {
        // ✅ New user - Create profile
        logger.info('[Callback] New user sign-up, creating profile', {
          timestamp: new Date().toISOString(),
        });

        const createStartTime = Date.now();
        const createPromiseStartTime = Date.now();

        const createPromise = supabase.from('users').insert({
          auth_id: session.user.id,
          email: session.user.email,
          phone: session.user.phone,
          primary_email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User',
          avatar_url: session.user.user_metadata?.avatar_url,
          oauth_providers: [session.user.app_metadata?.provider || 'unknown'],
          oauth_emails: {
            [session.user.app_metadata?.provider || 'unknown']:
              session.user.email,
          },
          role: 'user',
        });

        const createPromiseCreatedTime = Date.now();
        logger.info('[Callback] 📊 User creation promise created', {
          promiseCreationTime: `${
            createPromiseCreatedTime - createPromiseStartTime
          }ms`,
          timestamp: new Date().toISOString(),
        });

        // Increased timeout to 20 seconds (database queries can be slow)
        const createTimeout = new Promise((_, reject) =>
          setTimeout(() => {
            const timeoutElapsed = Date.now() - createStartTime;
            logger.error('[Callback] ⏱️ User creation TIMEOUT triggered', {
              elapsedTime: `${timeoutElapsed}ms`,
              timeoutLimit: '20000ms',
              timestamp: new Date().toISOString(),
            });
            reject(new Error('User creation timeout'));
          }, 20000)
        );

        let createError: any = null;
        let createTimedOut = false;

        try {
          const createRaceStartTime = Date.now();
          logger.info(
            '[Callback] 🏁 Starting Promise.race (create vs timeout)',
            {
              timestamp: new Date().toISOString(),
            }
          );

          const result = (await Promise.race([
            createPromise,
            createTimeout,
          ])) as any;

          const createRaceEndTime = Date.now();
          const createTotalDuration = Date.now() - createStartTime;
          const createRaceDuration = createRaceEndTime - createRaceStartTime;

          logger.info('[Callback] ⏱️ User creation completed', {
            totalDuration: `${createTotalDuration}ms`,
            raceDuration: `${createRaceDuration}ms`,
            promiseCreationToRace: `${
              createRaceStartTime - createPromiseCreatedTime
            }ms`,
            timestamp: new Date().toISOString(),
          });

          createError = result.error;
        } catch (error: any) {
          const createErrorTime = Date.now();
          const createTotalElapsed = createErrorTime - createStartTime;

          if (error?.message?.includes('timeout')) {
            createTimedOut = true;
            logger.warn(
              '[Callback] ⚠️ User creation timed out - session exists, will navigate to home',
              {
                totalElapsed: `${createTotalElapsed}ms`,
                timeoutLimit: '20000ms',
                timestamp: new Date().toISOString(),
              }
            );
            logger.info(
              '[Callback] ℹ️ User may already exist, profile will sync in background'
            );
          } else {
            logger.error('[Callback] ❌ User creation error (non-timeout)', {
              error: error?.message,
              errorCode: error?.code,
              totalElapsed: `${createTotalElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
            throw error;
          }
        }

        // If creation timed out, navigate to home anyway (session exists)
        if (createTimedOut) {
          setStatus('Redirecting...');
          hasNavigatedRef.current = true;
          logger.info(
            '[Callback] 🧭 Navigating to home (creation timeout - session exists)'
          );

          await new Promise((resolve) => setTimeout(resolve, 300));
          router.replace('/(tabs)');
          logger.info(
            '[Callback] ✅ Navigation to home completed (creation timeout)'
          );
          return;
        }

        if (createError) {
          // Check for unique constraint (user already exists)
          if (createError.code === '23505') {
            logger.info(
              '[Callback] ℹ️ User already exists (unique constraint) - fetching user...',
              {
                errorCode: createError.code,
                timestamp: new Date().toISOString(),
              }
            );

            const fetchStartTime = Date.now();

            // Fetch existing user with timeout (optimized query)
            const fetchPromise = supabase
              .from('users')
              .select(
                'id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email'
              )
              .eq('auth_id', session.user.id)
              .is('deleted_at', null) // Only get non-deleted users
              .maybeSingle(); // Use maybeSingle for safety

            const fetchTimeout = new Promise((_, reject) =>
              setTimeout(() => {
                const fetchTimeoutElapsed = Date.now() - fetchStartTime;
                logger.error(
                  '[Callback] ⏱️ Fetch existing user TIMEOUT triggered',
                  {
                    elapsedTime: `${fetchTimeoutElapsed}ms`,
                    timeoutLimit: '10000ms',
                    timestamp: new Date().toISOString(),
                  }
                );
                reject(new Error('Fetch existing user timeout'));
              }, 10000)
            );

            try {
              logger.info(
                '[Callback] 🏁 Starting Promise.race (fetch vs timeout)',
                {
                  timestamp: new Date().toISOString(),
                }
              );

              const { data: existingUserData, error: fetchError } =
                (await Promise.race([fetchPromise, fetchTimeout])) as any;

              const fetchDuration = Date.now() - fetchStartTime;
              logger.info('[Callback] ⏱️ Fetch existing user completed', {
                duration: `${fetchDuration}ms`,
                timestamp: new Date().toISOString(),
              });

              if (fetchError || !existingUserData) {
                // Even if fetch fails, navigate to home (session exists)
                logger.warn(
                  '[Callback] ⚠️ Failed to fetch existing user after unique constraint, but session exists - navigating to home'
                );
                setStatus('Redirecting...');
                hasNavigatedRef.current = true;
                await new Promise((resolve) => setTimeout(resolve, 300));
                router.replace('/(tabs)');
                return;
              }

              // User exists - treat as existing user
              logger.info(
                '[Callback] ✅ Existing user found after unique constraint'
              );

              toast.success({
                title: 'Welcome Back!',
                message: `Good to see you, ${existingUserData.name}`,
              });

              setStatus('Redirecting...');
              hasNavigatedRef.current = true;
              logger.info(
                '[Callback] 🧭 Navigating to home (existing user from unique constraint)'
              );

              await new Promise((resolve) => setTimeout(resolve, 300));
              router.replace('/(tabs)');
              logger.info('[Callback] ✅ Navigation to home completed');
              return;
            } catch (fetchTimeoutError: any) {
              // Fetch timed out, but session exists - navigate anyway
              const fetchErrorTime = Date.now();
              const fetchTotalElapsed = fetchErrorTime - fetchStartTime;

              logger.warn(
                '[Callback] ⚠️ Fetch existing user timed out, but session exists - navigating to home',
                {
                  totalElapsed: `${fetchTotalElapsed}ms`,
                  timeoutLimit: '10000ms',
                  timestamp: new Date().toISOString(),
                }
              );
              setStatus('Redirecting...');
              hasNavigatedRef.current = true;
              await new Promise((resolve) => setTimeout(resolve, 300));
              router.replace('/(tabs)');
              return;
            }
          }

          throw new Error(`Profile creation error: ${createError.message}`);
        }

        logger.info('[Callback] Profile created successfully');

        toast.success({
          title: 'Welcome to Talkee!',
          message: 'Your account has been created',
        });

        setStatus('Redirecting...');

        // Navigate to setup account screen for additional info
        hasNavigatedRef.current = true; // Mark as navigated
        logger.info('[Callback] 🧭 Navigating to setup account (new user)');

        // Small delay to ensure state updates complete before navigation
        await new Promise((resolve) => setTimeout(resolve, 300));

        router.replace('/auth/setup-account');
        logger.info('[Callback] ✅ Navigation to setup account completed');
        return; // Exit early after navigation
      }
    } catch (error: any) {
      const callbackEndTime = Date.now();
      const totalCallbackDuration = callbackEndTime - callbackStartTime;

      logger.error('[Callback] OAuth callback error:', {
        error: error?.message,
        errorCode: error?.code,
        totalCallbackDuration: `${totalCallbackDuration}ms`,
        timestamp: new Date().toISOString(),
        stack: error?.stack,
      });

      setStatus('Sign-in failed');

      toast.error({
        title: 'Sign-In Failed',
        message: error.message || 'Please try again',
      });

      // Wait a bit before redirecting to show error
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666',
    textAlign: 'center',
  },
});
