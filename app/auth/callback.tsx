/**
 * OAuth Callback Handler - WITH ACCOUNT LINKING (FINAL VERSION)
 * Handles OAuth redirects with multi-provider account linking support
 */

import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';

export default function AuthCallbackScreen() {
  const toast = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasRun.current) return;
    hasRun.current = true;

    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get session from Supabase
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
        const provider = session.user.app_metadata.provider || 'oauth';
        const oauthEmail = session.user.email;
        const oauthPhone = session.user.phone;

        console.log('OAuth callback:', {
          provider,
          email: oauthEmail,
          auth_id: session.user.id,
        });

        // Check if user profile exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, oauth_providers, oauth_emails')
          .eq('auth_id', session.user.id)
          .single();

        if (existingUser) {
          // ✅ User exists - Check if provider already linked
          const providers = existingUser.oauth_providers || [];
          const emails = existingUser.oauth_emails || {};

          if (!providers.includes(provider)) {
            // Link new provider
            const updatedProviders = [...providers, provider];
            const updatedEmails = { ...emails, [provider]: oauthEmail };

            await supabase
              .from('users')
              .update({
                oauth_providers: updatedProviders,
                oauth_emails: updatedEmails,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingUser.id);

            toast.success({
              title: `${provider} Linked!`,
              message: 'Your account has been linked successfully',
            });
          } else {
            toast.success({
              title: 'Welcome Back!',
              message: 'Sign in successful',
            });
          }

          // Navigate to main app
          router.replace('/(tabs)');
        } else {
          // ✅ New OAuth user - Create profile
          console.log('Creating new profile for OAuth user...');

          const { data: newUser, error: profileError } = await supabase
            .from('users')
            .insert({
              auth_id: session.user.id,
              phone: oauthPhone || null,
              primary_email: oauthEmail,
              name:
                session.user.user_metadata?.name ||
                session.user.user_metadata?.full_name ||
                oauthEmail?.split('@')[0] ||
                'OAuth User',
              avatar_url:
                session.user.user_metadata?.avatar_url ||
                session.user.user_metadata?.picture ||
                null,
              oauth_providers: [provider],
              oauth_emails: { [provider]: oauthEmail },
              role: 'user',
            })
            .select()
            .single();

          if (profileError) {
            console.error('Error creating profile:', profileError);
            console.error('Profile error details:', {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
            });

            // Check for RLS policy violation (42501)
            if (
              profileError.code === '42501' ||
              profileError.message.includes('row-level security')
            ) {
              toast.error({
                title: 'Permission Error',
                message:
                  'Database security policy error. Please contact support.',
              });

              // Log for debugging
              console.error('RLS POLICY ERROR:', {
                user_id: session.user.id,
                email: oauthEmail,
                provider,
                error_code: profileError.code,
              });

              router.replace('/auth/login');
              return;
            }

            // Check if it's a unique constraint error (account might exist with different auth_id)
            if (
              profileError.message.includes('unique') ||
              profileError.message.includes('duplicate')
            ) {
              toast.error({
                title: 'Account Exists',
                message:
                  'An account with this email or phone already exists. Please sign in with your original method.',
              });
              router.replace('/auth/login');
              return;
            }

            toast.error({
              title: 'Profile Creation Failed',
              message:
                profileError.message ||
                'Failed to create your profile. Please try again.',
            });
            router.replace('/auth/login');
            return;
          }

          console.log('Profile created successfully:', newUser);

          toast.success({
            title: 'Welcome!',
            message: 'Your account has been created',
          });

          // Navigate to main app
          router.replace('/(tabs)');
        }
      } else {
        // No session
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
      <Text style={styles.subtext}>This will only take a moment</Text>
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
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2e2461',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
