/**
 * Auth Callback Handler - OAuth Sign-In/Sign-Up
 * Handles Google, Facebook, LinkedIn OAuth callbacks
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { logger } from '@/lib/logger';

export default function AuthCallback() {
  const toast = useToast();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      logger.info('[Callback] 🚀 Starting OAuth callback handling');
      setStatus('Verifying authentication...');

      // Get current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 5000)
      );

      const {
        data: { session },
        error: sessionError,
      } = (await Promise.race([sessionPromise, sessionTimeout])) as any;

      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error('No session found after OAuth');
      }

      logger.info('[Callback] ✅ Session found', {
        userId: session.user.id?.substring(0, 8) + '...',
        email: session.user.email,
        provider: session.user.app_metadata?.provider,
      });

      setStatus('Setting up your account...');

      // Check if user profile exists with timeout
      logger.info('[Callback] 🔍 Checking if user exists in database...');

      const profileQueryPromise = supabase
        .from('users')
        .select(
          'id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email'
        )
        .eq('auth_id', session.user.id)
        .single();

      const profileTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile query timeout')), 5000)
      );

      let existingProfile = null;
      try {
        const { data, error: profileError } = (await Promise.race([
          profileQueryPromise,
          profileTimeout,
        ])) as any;

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // User not found - this is OK
            logger.info('[Callback] ℹ️ User not found (new user)');
            existingProfile = null;
          } else {
            // Real error
            throw new Error(`Profile check error: ${profileError.message}`);
          }
        } else {
          existingProfile = data;
          logger.info('[Callback] ✅ User found', {
            userId: existingProfile.id,
          });
        }
      } catch (error: any) {
        if (error?.message?.includes('timeout')) {
          logger.warn(
            '[Callback] ⚠️ Profile query timeout - will attempt user creation'
          );
          existingProfile = null;
        } else {
          throw error;
        }
      }

      if (existingProfile) {
        // ✅ Profile exists - Sign-In
        logger.info('[Callback] Existing user sign-in');

        toast.success({
          title: 'Welcome Back!',
          message: `Good to see you, ${existingProfile.name}`,
        });

        setStatus('Redirecting...');
        router.replace('/(tabs)');
      } else {
        // ✅ New user - Create profile
        logger.info('[Callback] New user sign-up, creating profile');

        const { error: createError } = await supabase.from('users').insert({
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

        if (createError) {
          throw new Error(`Profile creation error: ${createError.message}`);
        }

        logger.info('[Callback] Profile created successfully');

        toast.success({
          title: 'Welcome to Talkee!',
          message: 'Your account has been created',
        });

        setStatus('Redirecting...');

        // Navigate to setup account screen for additional info
        router.replace('/auth/setup-account');
      }
    } catch (error: any) {
      logger.error('[Callback] OAuth callback error:', error);

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
