/**
 * OAuth Callback Handler - WITH ACCOUNT LINKING (FINAL VERSION)
 * Handles OAuth redirects with multi-provider account linking support
 * + Smart theme and language defaults
 */

import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { UserPreferencesService } from '@/services/supabase/userPreferences.service';
import { PageLoading } from '@/components/ui/PageLoading';

export default function AuthCallbackScreen() {
  const toast = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasRun.current) return;
    hasRun.current = true;

    // Wait a bit for router to be ready
    const timer = setTimeout(() => {
      handleCallback();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleCallback = async () => {
    try {
      // Wait for session to be ready (OAuth redirect can take a moment)
      let session = null;
      let retries = 0;
      const maxRetries = 10;

      while (!session && retries < maxRetries) {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error && retries === 0) {
          // Only show error on first attempt
          console.error('Session error:', error);
        }

        if (currentSession) {
          session = currentSession;
          break;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * (retries + 1))
        );
        retries++;
      }

      if (!session) {
        // Still no session after retries - check auth state change
        console.log('No session found, waiting for auth state change...');

        // Wait for auth state change (up to 3 seconds)
        const sessionPromise = new Promise<any>((resolve) => {
          const timeout = setTimeout(() => {
            resolve(null);
          }, 3000);

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession) {
              clearTimeout(timeout);
              subscription.unsubscribe();
              resolve(newSession);
            }
          });
        });

        session = await sessionPromise;
      }

      if (!session) {
        toast.error({
          title: 'Authentication Failed',
          message: 'Session not found. Please try again.',
        });
        router.replace('/auth/login');
        return;
      }

      if (session) {
        const provider = session.user.app_metadata.provider || 'oauth';
        const oauthEmail = session.user.email;
        const oauthPhone = session.user.phone;

        // Check if user profile exists (including deleted accounts)
        const { data: existingUser } = await supabase
          .from('users')
          .select(
            'id, oauth_providers, oauth_emails, deleted_at, name, primary_email'
          )
          .eq('auth_id', session.user.id)
          .single();

        if (existingUser) {
          // ✅ User exists - Check if account was deleted and restore if needed
          const { accountRestorationService } = await import(
            '@/services/supabase/accountRestoration.service'
          );

          const oauthName =
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            oauthEmail?.split('@')[0] ||
            'OAuth User';
          const oauthAvatar =
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            null;

          // Check if account is deleted (deleted_at is not null)
          if (existingUser.deleted_at) {
            console.log('🔄 [callback] Found deleted account, restoring...', {
              userId: existingUser.id,
              deletedAt: existingUser.deleted_at,
            });

            // Account was deleted, restore it
            const restored =
              await accountRestorationService.restoreDeletedAccount(
                session.user.id,
                oauthEmail || '',
                oauthName,
                oauthAvatar || undefined
              );

            if (restored) {
              console.log('✅ [callback] Account restored successfully');
              toast.show({
                type: 'success',
                title: 'Welcome Back!',
                message: 'Your account has been restored',
              });
              // Update existingUser reference to restored user
              existingUser.deleted_at = null;
              existingUser.name = restored.name;
              existingUser.primary_email = restored.primary_email;
            } else {
              console.error('❌ [callback] Failed to restore account');
              toast.error({
                title: 'Restoration Failed',
                message:
                  'Failed to restore your account. Please contact support.',
              });
              router.replace('/auth/login');
              return;
            }
          }

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

          // Navigate to main app (home page) - immediate navigation
          try {
            router.replace('/(tabs)');
          } catch (error) {
            // Fallback: try again after a short delay
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          }
        } else {
          // ✅ Check if there's a deleted account to restore
          const { accountRestorationService } = await import(
            '@/services/supabase/accountRestoration.service'
          );

          const oauthName =
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            oauthEmail?.split('@')[0] ||
            'OAuth User';
          const oauthAvatar =
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            null;

          // Try to restore deleted account first
          const restoredUser =
            await accountRestorationService.restoreDeletedAccount(
              session.user.id,
              oauthEmail || '',
              oauthName,
              oauthAvatar || undefined
            );

          let newUser;
          if (restoredUser) {
            // Account was restored
            newUser = restoredUser;
            console.log('✅ [callback] Account restored:', restoredUser.id);
            toast.show({
              type: 'success',
              title: 'Welcome Back!',
              message: 'Your account has been restored',
            });
          } else {
            // ✅ New OAuth user - Create profile with smart defaults
            // 🎨 Get smart defaults from device
            const defaultTheme = UserPreferencesService.getDefaultTheme();
            const defaultLanguage = UserPreferencesService.getDefaultLanguage();

            const { data: insertedUser, error: profileError } = await supabase
              .from('users')
              .insert({
                auth_id: session.user.id,
                phone: oauthPhone || null,
                primary_email: oauthEmail,
                name: oauthName,
                avatar_url: oauthAvatar,
                oauth_providers: [provider],
                oauth_emails: { [provider]: oauthEmail },

                // 🎨 Smart defaults based on device settings
                theme_preference: defaultTheme,
                language_preference: defaultLanguage,

                role: 'user',
              })
              .select()
              .single();

            if (profileError) {
              // Check for unique constraint violation (might be a deleted account)
              if (profileError.code === '23505') {
                // Unique constraint violation - might be a deleted account
                // Try to restore it
                const restored =
                  await accountRestorationService.restoreDeletedAccount(
                    session.user.id,
                    oauthEmail || '',
                    oauthName,
                    oauthAvatar || undefined
                  );

                if (restored) {
                  newUser = restored;
                  console.log(
                    '✅ [callback] Account restored after unique constraint error'
                  );
                } else {
                  throw new Error(
                    'Account already exists. Please try logging in instead of signing up.'
                  );
                }
              } else {
                // Other errors
                throw profileError;
              }
            } else {
              newUser = insertedUser;
            }
          }

          if (!newUser) {
            throw new Error('Failed to create or restore user account');
          }

          toast.success({
            title: 'Welcome!',
            message: 'Your account has been created',
          });

          // Navigate to main app (home page) - immediate navigation
          try {
            router.replace('/(tabs)');
          } catch (error) {
            // Fallback: try again after a short delay
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          }
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
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      <PageLoading message="Completing sign in..." size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
