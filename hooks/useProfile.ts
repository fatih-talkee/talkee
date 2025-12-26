// hooks/useProfile.ts
// Simplified Profile hook

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { clearUserCache, invalidateUserQueries } from '@/lib/cacheUtils';
import { logger } from '@/lib/logger';

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

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        const newUserId = session?.user?.id || null;
        setUserId(newUserId);
        previousUserIdRef.current = newUserId;

        logger.info('[useProfile] Session loaded:', {
          authenticated: !!newUserId,
          userId: newUserId?.substring(0, 8),
        });
      } catch (error) {
        logger.error('[useProfile] Session error:', error);
      } finally {
        if (isMountedRef.current) {
          setIsSessionLoading(false);
        }
      }
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return;

      const newUserId = session?.user?.id || null;
      const previousUserId = previousUserIdRef.current;

      logger.info('[useProfile] Auth changed:', {
        event,
        authenticated: !!newUserId,
      });

      // Defer state updates to avoid React hooks violations when called during async operations
      // Use setTimeout with a small delay to ensure updates happen after React's current render cycle
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        try {
          // Update state
          setUserId((prevUserId) => {
            if (!isMountedRef.current) return prevUserId;
            previousUserIdRef.current = newUserId;
            return newUserId;
          });

          setIsSessionLoading(false);
        } catch (error) {
          // Log error but don't throw - React will recover on next render
          logger.error('[useProfile] Error updating state in auth callback', error);
        }
      }, 0);

      // Handle cache operations
      setTimeout(() => {
        if (!isMountedRef.current) return;

        if (previousUserId !== newUserId) {
          if (previousUserId && !newUserId) {
            // Logout: Clear all cache
            logger.info('[useProfile] User logged out, clearing cache');
            clearUserCache(queryClient).catch((err) => {
              logger.error('[useProfile] Cache clear error:', err);
            });
          } else if (
            previousUserId &&
            newUserId &&
            previousUserId !== newUserId
          ) {
            // User switched: Clear cache
            logger.info('[useProfile] User switched, clearing cache');
            clearUserCache(queryClient).catch((err) => {
              logger.error('[useProfile] Cache clear error:', err);
            });
          } else if (!previousUserId && newUserId) {
            // New login: Invalidate to ensure fresh data
            logger.info('[useProfile] New user logged in, invalidating cache');
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
    queryFn: async () => {
      if (!userId) {
        logger.warn('[useProfile] ⚠️ userId is null, skipping profile fetch');
        return null;
      }

      logger.info('[useProfile] 🔍 Fetching profile', {
        userId: userId.substring(0, 8) + '...',
      });

      const startTime = Date.now();

      try {
        const result = await ProfileService.getProfileData(userId);
        const duration = Date.now() - startTime;

        logger.info('[useProfile] ✅ Profile fetch completed', {
          duration: `${duration}ms`,
          hasData: !!result,
        });

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;

        logger.error('[useProfile] ❌ Profile fetch failed', {
          error: error?.message || String(error),
          duration: `${duration}ms`,
        });

        throw error;
      }
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
      await clearUserCache(queryClient);
      logger.info('[useProfile] ✅ Logout successful, cache cleared');
    }

    return success;
  };

  // Combined loading state
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
