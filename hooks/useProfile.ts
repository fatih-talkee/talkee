import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function useProfile() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user from Supabase session
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => ProfileService.getProfileData(userId!),
    enabled: !!userId,
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
      queryClient.clear(); // Clear all queries on logout
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
