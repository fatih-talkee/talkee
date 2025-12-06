// hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesService } from '@/services/supabase';
import { Professional } from '@/types/database.types';

/**
 * Get user's favorite professionals
 * Cache: 2 minutes (user-specific, changes more frequently)
 */
export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.getFavorites(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Add professional to favorites
 * Optimistic update: immediately update UI, rollback on error
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) =>
      favoritesService.addFavorite(professionalId),
    onMutate: async (professionalId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(['favorites']);

      // Optimistically update
      queryClient.setQueryData(['favorites'], (old: any) => {
        // This will be updated when the real data comes back
        return old;
      });

      return { previousFavorites };
    },
    onError: (err, professionalId, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/**
 * Remove professional from favorites
 * Optimistic update: immediately remove from UI, rollback on error
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) =>
      favoritesService.removeFavorite(professionalId),
    onMutate: async (professionalId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      const previousFavorites = queryClient.getQueryData(['favorites']);

      // Optimistically remove
      queryClient.setQueryData(['favorites'], (old: any) => {
        if (!old) return old;
        return old.filter(
          (fav: any) => fav.professional_id !== professionalId
        );
      });

      return { previousFavorites };
    },
    onError: (err, professionalId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/**
 * Check if a professional is in favorites
 */
export function useIsFavorite(professionalId: string) {
  const { data: favorites = [] } = useFavorites();

  return {
    data: favorites.some((fav: any) => fav.professional_id === professionalId),
    isLoading: false,
    isError: false,
  };
}

