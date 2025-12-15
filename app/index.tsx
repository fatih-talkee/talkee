import { useEffect, useState } from 'react';
import { Redirect, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();

  useEffect(() => {
    // Don't interfere if we're on the callback page - let it handle its own flow
    const isOnCallback = segments[0] === 'auth' && segments[1] === 'callback';
    if (isOnCallback) {
      return;
    }

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Session check error:', error);
        setIsAuthenticated(false);
      }
    };

    checkSession();

    // Listen for auth changes, but only redirect if not on callback page
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't update state if we're on callback page - let callback handle it
      const isOnCallbackNow =
        segments[0] === 'auth' && segments[1] === 'callback';
      if (!isOnCallbackNow) {
        setIsAuthenticated(!!session);
      }
    });

    return () => subscription.unsubscribe();
  }, [segments]);

  // Don't redirect if we're on callback page
  const isOnCallback = segments[0] === 'auth' && segments[1] === 'callback';
  if (isOnCallback) {
    return null; // Let callback page handle its own rendering
  }

  // Show loading while checking session
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect based on authentication state
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/auth/login'} />;
}
