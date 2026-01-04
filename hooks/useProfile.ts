// hooks/useProfile.ts
// Simplified Profile hook

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { useEffect, useState, useRef } from 'react';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { clearUserCache, invalidateUserQueries } from '@/lib/cacheUtils';
import { logger } from '@/lib/logger';
import { authStateManager } from '@/lib/authStateManager';

// ✅ FIX: Global processed users set (shared across all useProfile instances)
const processedUsersRef = new Set<string>();

// ✅ FIX: Global initialization flag (shared across all useProfile instances)
// This ensures we only fetch session once, even if multiple components use useProfile
let hasInitialized = false;

export function useProfile() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get current user from Supabase session
  useEffect(() => {
    isMountedRef.current = true;

    // ✅ FIX: Only fetch session once globally (prevents duplicate fetches across all components)
    const getCurrentUser = async () => {
      if (!isMountedRef.current) return;
      
      // If we've already initialized globally, skip fetching (auth state manager will handle updates)
      if (hasInitialized) {
        // ✅ FIX: Don't log every skip - too verbose. Only log on first skip per component instance
        setIsSessionLoading(false);
        // Still set userId from authStateManager if available (for this component instance)
        try {
          const { data: { session } } = await authStateManager.getSession();
          const newUserId = session?.user?.id || null;
          if (previousUserIdRef.current !== newUserId) {
            setUserId(newUserId);
            previousUserIdRef.current = newUserId;
          }
        } catch (error) {
          // Silent fail - auth state manager will handle it
        }
        return;
      }

      setIsSessionLoading(true);
      hasInitialized = true; // Mark as initialized BEFORE async call (prevents race conditions)

      try {
        const { data: { session } } = await authStateManager.getSession();

        if (!isMountedRef.current) return;

        const newUserId = session?.user?.id || null;
        
        // Only update state if userId actually changed
        if (previousUserIdRef.current !== newUserId) {
          setUserId(newUserId);
          previousUserIdRef.current = newUserId;
        }
        
        setIsSessionLoading(false);

        logger.info('[useProfile] Session loaded:', {
          authenticated: !!newUserId,
          userId: newUserId?.substring(0, 8),
        });
      } catch (error) {
        logger.error('[useProfile] Session error:', error);
        if (isMountedRef.current) {
          setIsSessionLoading(false);
        }
      }
    };

    getCurrentUser();

    // ✅ FIX: Use singleton auth state manager instead of creating new listener
    const unsubscribe = authStateManager.subscribe((event, session) => {
      if (!isMountedRef.current) return;

      const newUserId = session?.user?.id || null;
      const previousUserId = previousUserIdRef.current;

      logger.info('[useProfile] Auth changed:', {
        event,
        authenticated: !!newUserId,
        previousUserId: previousUserId?.substring(0, 8),
        newUserId: newUserId?.substring(0, 8),
      });

      // ✅ FIX: Only update state if userId actually changed
      if (previousUserId !== newUserId) {
        previousUserIdRef.current = newUserId;
        setUserId(newUserId);
      }
      
      setIsSessionLoading(false);

      // Handle cache operations
      // ✅ Don't invalidate cache on TOKEN_REFRESHED - it's just a token renewal
      // Only invalidate on actual user changes (login, logout, switch)
      setTimeout(() => {
        if (!isMountedRef.current) return;

        // Skip cache operations for TOKEN_REFRESHED - user hasn't changed
        if (event === 'TOKEN_REFRESHED') {
          logger.debug('[useProfile] ⏭️ Skipping cache operations on TOKEN_REFRESHED');
          return;
        }

        // ✅ FIX: Skip INITIAL_SESSION if user hasn't changed (most common case)
        if (event === 'INITIAL_SESSION' && previousUserId === newUserId && newUserId) {
          // Check if we already processed this user during this session
          if (processedUsersRef.has(newUserId)) {
            logger.debug('[useProfile] ⏭️ INITIAL_SESSION for already processed user, skipping cache invalidation', {
              userId: newUserId.substring(0, 8) + '...',
            });
            return;
          }
          // Mark as processed but don't invalidate cache (data is already fresh)
          processedUsersRef.add(newUserId);
          logger.debug('[useProfile] ⏭️ INITIAL_SESSION for same user, marking as processed (no invalidation)', {
            userId: newUserId.substring(0, 8) + '...',
          });
          return;
        }

        if (previousUserId !== newUserId) {
          if (previousUserId && !newUserId) {
            // Logout: Clear all cache
            logger.info('[useProfile] User logged out, clearing cache');
            clearUserCache(queryClient).catch((err) => {
              logger.error('[useProfile] Cache clear error:', err);
            });
            // Clear processed users on logout
            processedUsersRef.clear();
          } else if (
            previousUserId &&
            newUserId &&
            previousUserId !== newUserId
          ) {
            // User switched: Clear cache
            logger.info('[useProfile] User switched, clearing cache', {
              previousUserId: previousUserId.substring(0, 8) + '...',
              newUserId: newUserId.substring(0, 8) + '...',
            });
            clearUserCache(queryClient).catch((err) => {
              logger.error('[useProfile] Cache clear error:', err);
            });
            // Clear processed users on switch
            processedUsersRef.clear();
          } else if (!previousUserId && newUserId) {
            // New login: Invalidate to ensure fresh data (only once)
            // ✅ FIX: Check if we already processed this user to prevent duplicate invalidations
            if (!processedUsersRef.has(newUserId)) {
              logger.info('[useProfile] New user logged in, invalidating cache', {
                userId: newUserId.substring(0, 8) + '...',
              });
              // ✅ FIX: Exclude calls from invalidation to prevent call history refresh loops
              invalidateUserQueries(queryClient, newUserId, [['calls']]);
              processedUsersRef.add(newUserId);
            } else {
              logger.debug('[useProfile] ⏭️ Already processed this user, skipping cache invalidation', {
                userId: newUserId.substring(0, 8) + '...',
              });
            }
          }
        }
      }, 0);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
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
    enabled: !!userId && !isSessionLoading && userId !== 'null' && userId !== 'undefined',
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
