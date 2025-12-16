import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { clearUserCache, invalidateUserQueries } from '@/lib/cacheUtils';

export function useProfile() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  // Get current user from Supabase session
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const newUserId = session?.user?.id || null;
      setUserId(newUserId);
      previousUserIdRef.current = newUserId;
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUserId = session?.user?.id || null;
      const previousUserId = previousUserIdRef.current;

      // If user changed (logout or login with different user), clear cache
      if (previousUserId !== newUserId) {
        if (previousUserId && !newUserId) {
          // Logout: Clear all cache
          console.log('🔄 User logged out, clearing cache...');
          await clearUserCache(queryClient);
        } else if (previousUserId && newUserId && previousUserId !== newUserId) {
          // User switched: Clear cache for previous user
          console.log('🔄 User switched, clearing previous user cache...');
          await clearUserCache(queryClient);
        } else if (!previousUserId && newUserId) {
          // New login: Invalidate to ensure fresh data
          console.log('🔄 New user logged in, invalidating cache...');
          invalidateUserQueries(queryClient, newUserId);
        }
      }

      setUserId(newUserId);
      previousUserIdRef.current = newUserId;
    });

    return () => subscription.unsubscribe();
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

  return {
    profileData,
    user: profileData?.user,
    stats: profileData?.stats,
    isProfessional: profileData?.is_professional || false,
    professional: profileData?.professional,
    isLoading,
    error,
    refetch,
    updatePreferences,
    updateAvatar,
    signOut,
  };
}
