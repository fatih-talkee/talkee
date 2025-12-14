// utils/googleAuth.ts
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

// WebBrowser'ı auth için hazırla
WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth with modal presentation (in-app browser)
 */
export async function signInWithGoogle() {
  try {
    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          Platform.OS === 'web'
            ? `${window?.location?.origin ?? ''}/auth/callback`
            : 'talkee://auth/callback',
        // Skip native Google Sign-In, use web flow
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) {
      console.error('OAuth URL error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'No OAuth URL returned' };
    }

    // Mobile: Open in-app browser (modal style)
    if (Platform.OS !== 'web') {
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'talkee://auth/callback',
          {
            // iOS presentation style
            preferEphemeralSession: true, // Don't save cookies
            ...(Platform.OS === 'ios' && {
              presentationStyle:
                WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
              controlsColor: '#007AFF',
              toolbarColor: '#FFFFFF',
            }),
            // Android options
            ...(Platform.OS === 'android' && {
              showTitle: true,
              toolbarColor: '#FFFFFF',
              enableBarCollapsing: false,
            }),
          }
        );

        if (result.type === 'success') {
          // Extract token from URL
          try {
            const url = new URL(result.url);
            const hash = url.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              // Set session
              const { data: { session }, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                console.error('Session error:', sessionError);
                return { success: false, error: sessionError.message };
              }

              // Verify session is established and wait for it to be fully ready
              if (session?.user) {
                // Wait a bit for session to be fully established
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Verify session is still valid
                const { data: { session: verifiedSession } } = await supabase.auth.getSession();
                if (verifiedSession?.user) {
                  return { success: true, session: verifiedSession };
                }
              }

              return { success: false, error: 'Session not established' };
            } else {
              // No tokens in URL - might be a redirect that needs callback handler
              // Return success to let callback handler process it
              return { success: true, needsCallback: true };
            }
          } catch (urlError: any) {
            console.error('URL parsing error:', urlError);
            // If URL parsing fails, might still be a valid redirect
            // Let callback handler process it
            return { success: true, needsCallback: true };
          }
        } else if (result.type === 'cancel') {
          return { success: false, cancelled: true };
        } else {
          // Other result types (dismiss, locked, etc.)
          return { success: false, cancelled: true };
        }
      } catch (browserError: any) {
        console.error('Browser error:', browserError);
        return { success: false, error: browserError.message || 'Failed to open browser' };
      }
    }

    // Web: Normal flow - redirect will happen automatically
    return { success: true, needsCallback: true };
  } catch (error: any) {
    console.error('Google auth error:', error);
    return { success: false, error: error?.message || 'Unknown error occurred' };
  }
}

/**
 * Alternative: Native Google Sign-In (requires @react-native-google-signin/google-signin)
 * Daha native bir deneyim ama ekstra setup gerektirir
 */
export async function signInWithGoogleNative() {
  // Bu gelişmiş versiyon - gerekirse implement ederiz
  throw new Error('Not implemented - use signInWithGoogle instead');
}
