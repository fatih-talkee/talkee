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

// ✅ FIX: Session yenileme için kullanılacak - logout sonrası sıfırlanır
export function resetProfileInitialization() {
  hasInitialized = false;
  processedUsersRef.clear();
}

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
      
      // Eğer globalde zaten başlatıldıysa, yeniden fetch etme (auth state manager güncellemeleri yönetir)
      if (hasInitialized) {
        // ✅ FIX: getSession() tamamlanmadan önce session loading'i false yapmıyoruz
        // Race condition önleme: userId null iken loading false olmasın
        try {
          const { data: { session } } = await authStateManager.getSession();
          const newUserId = session?.user?.id || null;
          if (previousUserIdRef.current !== newUserId) {
            setUserId(newUserId);
            previousUserIdRef.current = newUserId;
          }
        } catch (error) {
          // Silent fail - auth state manager handles updates via subscribe
        } finally {
          if (isMountedRef.current) {
            setIsSessionLoading(false);
          }
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

        // ✅ FIX: Skip INITIAL_SESSION if user hasn't changed
        if (event === 'INITIAL_SESSION' && previousUserId === newUserId && newUserId) {
          setIsSessionLoading(false);
          return;
        }

        if (previousUserId !== newUserId) {
          if (previousUserId && !newUserId) {
            // Logout: Tüm cache'i temizle ve hasInitialized'ı sıfırla
            logger.info('[useProfile] User logged out, clearing cache and resetting init flag');
            clearUserCache(queryClient).catch((err) => {
              logger.error('[useProfile] Cache clear error:', err);
            });
            // ✅ FIX: Logout sonrası hasInitialized sıfırlanıyor
            // Böylece tekrar login'de session doğru şekilde yeniden yüklenir
            hasInitialized = false;
            processedUsersRef.clear();
          } else if (
            previousUserId &&
            newUserId &&
            previousUserId !== newUserId
          ) {
            // Kullanıcı değişti: Cache temizle
            logger.info('[useProfile] User switched, clearing cache', {
              previousUserId: previousUserId.substring(0, 8) + '...',
              newUserId: newUserId.substring(0, 8) + '...',
            });
            clearUserCache(queryClient).catch((err) => {
              logger.error('[useProfile] Cache clear error:', err);
            });
            // ✅ FIX: Kullanıcı değişince de hasInitialized sıfırla
            hasInitialized = false;
            processedUsersRef.clear();
          } else if (!previousUserId && newUserId) {
            // Yeni giriş: Fresh data için invalidate (sadece bir kez)
            // ✅ FIX: Aynı kullanıcı için tekrar invalidation yapmayı önle
            if (!processedUsersRef.has(newUserId)) {
              logger.info('[useProfile] New user logged in, invalidating cache', {
                userId: newUserId.substring(0, 8) + '...',
              });
              // ✅ FIX: call history refresh loop'unu önlemek için calls hariç tut
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
      // ✅ OPTIMIZED: Use the userId we already have from the hook state/listener
      // Only fallback to session if really needed, to avoid hanging getSession calls
      let activeUserId = userId;
      
      if (!activeUserId) {
        const { data: { session } } = await authStateManager.getSession();
        activeUserId = session?.user?.id || null;
      }

      if (!activeUserId) {
        logger.warn('[useProfile] ⚠️ No userId available for fetch');
        return null;
      }

      logger.info('[useProfile] 🔍 Fetching profile', {
        userId: activeUserId.substring(0, 8) + '...',
      });

      const startTime = Date.now();

      try {
        const result = await ProfileService.getProfileData(activeUserId);
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

  // Birleşik yükleme durumu
  const combinedIsLoading = isSessionLoading || (!!userId && isLoading);

  return {
    profileData,
    user: profileData?.user,
    userId, // ✅ Export: Twilio kaydı için profile beklemeden userId'ye erişim
    stats: profileData?.stats,
    isProfessional: profileData?.is_professional || false,
    professional: profileData?.professional,
    isLoading: combinedIsLoading,
    isSessionLoading, // ✅ Export: Session yükleme durumuna ayrı erişim
    error,
    refetch,
    updatePreferences,
    updateAvatar,
    signOut,
  };
}
