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

    if (error) throw error;

    // Mobile: Open in-app browser (modal style)
    if (Platform.OS !== 'web' && data?.url) {
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
        const url = new URL(result.url);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set session
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          return { success: true };
        }
      }

      return { success: false, cancelled: result.type === 'cancel' };
    }

    // Web: Normal flow
    return { success: true };
  } catch (error: any) {
    console.error('Google auth error:', error);
    return { success: false, error: error.message };
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
