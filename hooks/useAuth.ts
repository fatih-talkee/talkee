// hooks/useAuth.ts
// Simplified Authentication hook

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Href, router, useSegments } from 'expo-router';
import { logger } from '@/lib/logger';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const segments = useSegments();

  // Check authentication status
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error('[useAuth] Session check error:', error);
          if (isMounted) {
            setIsAuthenticated(false);
          }
        } else if (isMounted) {
          setIsAuthenticated(!!session);

          // Log auth state for debugging
          logger.info('[useAuth] Auth state:', {
            authenticated: !!session,
            userId: session?.user?.id,
            phoneConfirmed: !!session?.user?.phone_confirmed_at,
          });
        }
      } catch (error) {
        logger.error('[useAuth] Auth check error:', error);
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      logger.info('[useAuth] Auth state changed:', {
        event,
        authenticated: !!session,
      });

      setIsAuthenticated(!!session);

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        // Defer navigation to prevent render loops
        setTimeout(() => {
          const currentPath = '/' + segments.join('/');
          if (!currentPath.includes('/auth/login')) {
            router.replace('/auth/login');
          }
        }, 0);
      }

      // Handle sign in (only for phone auth, OAuth handled by callback)
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if phone is confirmed
        if (session.user.phone && !session.user.phone_confirmed_at) {
          // Phone not confirmed → redirect to OTP
          setTimeout(() => {
            router.replace(
              `/auth/otp?phone=${encodeURIComponent(
                session.user.phone || ''
              )}&context=pending`
            );
          }, 0);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[useAuth] Sign in error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name?: string;
    }) => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        logger.error('[useAuth] Sign up error:', error);
        return { data: null, error };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // onAuthStateChange will handle redirect automatically
    } catch (error) {
      logger.error('[useAuth] Sign out error:', error);

      // Still redirect even if error
      setTimeout(() => {
        const currentPath = '/' + segments.join('/');
        if (!currentPath.includes('/auth/login')) {
          router.replace('/auth/login');
        }
      }, 0);

      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${
          process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081'
        }/reset-password`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      logger.error('[useAuth] Reset password error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated,
    loading,
  };
}
