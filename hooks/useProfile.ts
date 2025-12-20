import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { clearUserCache, invalidateUserQueries } from '@/lib/cacheUtils';

export function useProfile() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Get current user from Supabase session
  useEffect(() => {
    isMountedRef.current = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const getCurrentUser = async () => {
      if (!isMountedRef.current) return;
      setIsSessionLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMountedRef.current) return;
      const newUserId = session?.user?.id || null;
      setUserId(newUserId);
      previousUserIdRef.current = newUserId;
      setIsSessionLoading(false);
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Immediately check mount status - if unmounted, don't proceed
      if (!isMountedRef.current) return;

      const newUserId = session?.user?.id || null;
      const previousUserId = previousUserIdRef.current;

      // Update state synchronously - React will batch these updates
      // Use functional updaters to ensure we have latest mount status
      setUserId((prevUserId) => {
        if (!isMountedRef.current) return prevUserId;
        previousUserIdRef.current = newUserId;
        return newUserId;
      });

      setIsSessionLoading((prev) => {
        if (!isMountedRef.current) return prev;
        return false;
      });

      // Handle cache operations asynchronously (non-blocking)
      // Use setTimeout(0) to defer cache operations to next event loop tick
      // This ensures state updates complete before cache operations
      setTimeout(() => {
        if (!isMountedRef.current) return;

        if (previousUserId !== newUserId) {
          if (previousUserId && !newUserId) {
            // Logout: Clear all cache
            console.log('🔄 User logged out, clearing cache...');
            clearUserCache(queryClient).catch((err) => {
              console.error(
                '[useProfile] Error clearing cache on logout:',
                err
              );
            });
          } else if (
            previousUserId &&
            newUserId &&
            previousUserId !== newUserId
          ) {
            // User switched: Clear cache for previous user
            console.log('🔄 User switched, clearing previous user cache...');
            clearUserCache(queryClient).catch((err) => {
              console.error(
                '[useProfile] Error clearing cache on user switch:',
                err
              );
            });
          } else if (!previousUserId && newUserId) {
            // New login: Invalidate to ensure fresh data
            console.log('🔄 New user logged in, invalidating cache...');
            invalidateUserQueries(queryClient, newUserId);
          }
        }
      }, 0);
    });

    subscription = authSubscription;

    return () => {
      isMountedRef.current = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [queryClient]);

  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => {
      if (!userId) {
        console.warn('⚠️ [useProfile] userId is null, skipping profile fetch');
        return null;
      }
      return ProfileService.getProfileData(userId);
    },
    enabled: !!userId && userId !== 'null' && userId !== 'undefined',
    ...CACHE_CONFIG.USER_PROFILE,
  });

  const updatePreferences = async (preferences: {
    theme_preference?: 'light' | 'dark' | 'system';
    language_preference?: 'en' | 'tr' | 'fr' | 'es' | 'de';
  }) => {
    if (!userId) return false;

    const success = await ProfileService.updatePreferences(userId, preferences);

    if (success) {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    }

    return success;
  };

  const updateAvatar = async (avatarUrl: string) => {
    if (!userId) return false;

    const success = await ProfileService.updateAvatar(userId, avatarUrl);

    if (success) {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    }

    return success;
  };

  const signOut = async () => {
    const success = await ProfileService.signOut();
    if (success) {
      // Clear all cache (memory + persisted)
      await clearUserCache(queryClient);
      console.log('✅ Logout successful, cache cleared');
    }
    return success;
  };

  // Combined loading state: session loading OR profile loading
  const combinedIsLoading = isSessionLoading || (userId && isLoading);

  return {
    profileData,
    user: profileData?.user,
    stats: profileData?.stats,
    isProfessional: profileData?.is_professional || false,
    professional: profileData?.professional,
    isLoading: combinedIsLoading,
    error,
    refetch,
    updatePreferences,
    updateAvatar,
    signOut,
  };
}
