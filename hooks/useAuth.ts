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
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false); // ✅ Stop loading after initial check
      }
    };

    checkAuth();

    // ✅ Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);

      // ✅ Auto-redirect on sign out
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login' as Href<'/(auth)/login'>);
      }
    });

    return () => subscription.unsubscribe();
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
      // Still redirect even if error
      router.replace('/auth/login' as Href<'/(auth)/login'>);
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
