/**
 * OAuth Callback Handler
 * app/auth/callback.tsx
 *
 * Handles OAuth redirects from Google/Facebook/LinkedIn
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../lib/toastService';

export default function AuthCallbackScreen() {
  const toast = useToast();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get session from Supabase (it should be auto-set after OAuth)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('OAuth callback error:', error);
        toast.error({
          title: 'Authentication Failed',
          message: error.message || 'Failed to complete sign in',
        });
        router.replace('/auth/login');
        return;
      }

      if (session) {
        // Check if user profile exists
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', session.user.id)
          .single();

        if (!user) {
          // Create user profile for OAuth users
          const { error: profileError } = await supabase.from('users').insert({
            auth_id: session.user.id,
            email: session.user.email!,
            name:
              session.user.user_metadata?.name ||
              session.user.email!.split('@')[0],
            avatar_url: session.user.user_metadata?.avatar_url || null,
          });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }

        toast.success({
          title: 'Welcome!',
          message: 'Sign in successful',
        });

        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        // No session - redirect to login
        toast.error({
          title: 'Authentication Failed',
          message: 'No session found',
        });
        router.replace('/auth/login');
      }
    } catch (error: any) {
      console.error('Unexpected callback error:', error);
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2e2461" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
