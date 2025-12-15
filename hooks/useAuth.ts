// hooks/useAuth.ts
// Authentication hook for AuthContext

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Href, router } from 'expo-router';

export function useAuth() {
  const [loading, setLoading] = useState(true); // ✅ Start with true
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    let isMounted = true;
    let navigationTimeout: NodeJS.Timeout | null = null;

    const checkAuth = async () => {
      try {
        // Use getSession which is faster and uses cached session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Auth check error:', error);
          if (isMounted) {
            setIsAuthenticated(false);
          }
        } else if (isMounted) {
          setIsAuthenticated(!!session);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false); // ✅ Stop loading after initial check
        }
      }
    };

    checkAuth();

    // ✅ Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setIsAuthenticated(!!session);

      // ✅ Auto-redirect on sign out - defer navigation to prevent render loops
      if (event === 'SIGNED_OUT') {
        // Clear any pending navigation
        if (navigationTimeout) {
          clearTimeout(navigationTimeout);
        }
        // Defer navigation to next tick to avoid render loop
        navigationTimeout = setTimeout(() => {
          // Check if we're not already on the login page
          const currentPath = router.pathname || '';
          if (!currentPath.includes('/auth/login')) {
            router.replace('/auth/login' as Href<'/auth/login'>);
          }
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
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
      console.error('❌ Sign in error:', error);
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
        console.error('❌ Sign up error:', error);
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
      console.error('❌ Sign out error:', error);
      // Still redirect even if error - defer to prevent render loop
      setTimeout(() => {
        const currentPath = router.pathname || '';
        if (!currentPath.includes('/auth/login')) {
          router.replace('/auth/login' as Href<'/(auth)/login'>);
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
      console.error('❌ Reset password error:', error);
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
