/**
 * Favorites React Query Hooks
 * Provides data fetching and mutations for favorites
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import { favoritesService } from '@/services/supabase/favorites.service';
import {
  FavoriteWithProfessional,
  ProfessionalWithRelations,
} from '@/types/database.types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';

// Query Keys
export const favoritesKeys = {
  all: ['favorites'] as const,
  lists: () => [...favoritesKeys.all, 'list'] as const,
  check: (professionalId: string) =>
    [...favoritesKeys.all, 'check', professionalId] as const,
};

/**
 * Hook: Get user's favorite professionals
 */
export function useFavorites(): UseQueryResult<ProfessionalWithRelations[]> {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: favoritesKeys.lists(),
    queryFn: async (): Promise<ProfessionalWithRelations[]> => {
      const favorites = await favoritesService.getFavorites();
      return favorites as unknown as ProfessionalWithRelations[];
    },
    ...CACHE_CONFIG.FAVORITES,
    refetchOnMount: 'always', // Always refetch when favorites page mounts
  });
}

/**
 * Hook: Check if professional is favorited
 */
export function useIsFavorite(professionalId: string) {
  return useQuery({
    queryKey: favoritesKeys.check(professionalId),
    queryFn: () => favoritesService.isFavorite(professionalId),
    enabled: !!professionalId,
    ...CACHE_CONFIG.FAVORITES,
  });
}

/**
 * Hook: Add to favorites
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) =>
      favoritesService.addFavorite(professionalId),
    onSuccess: (_, professionalId) => {
      // Invalidate favorites list with refetchType: 'all' to ensure all instances update
      queryClient.invalidateQueries({
        queryKey: favoritesKeys.lists(),
        refetchType: 'all',
      });
      // Update specific favorite check
      queryClient.setQueryData(favoritesKeys.check(professionalId), true);
      // Invalidate profile to update favorites_count in stats
      queryClient.invalidateQueries({
        queryKey: ['profile'],
        refetchType: 'all',
      });
    },
  });
}

/**
 * Hook: Remove from favorites
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) =>
      favoritesService.removeFavorite(professionalId),
    onSuccess: (_, professionalId) => {
      // Invalidate favorites list with refetchType: 'all' to ensure all instances update
      queryClient.invalidateQueries({
        queryKey: favoritesKeys.lists(),
        refetchType: 'all',
      });
      // Update specific favorite check
      queryClient.setQueryData(favoritesKeys.check(professionalId), false);
      // Invalidate profile to update favorites_count in stats
      queryClient.invalidateQueries({
        queryKey: ['profile'],
        refetchType: 'all',
      });
    },
  });
}

/**
 * Hook: Toggle favorite
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) =>
      favoritesService.toggleFavorite(professionalId),
    onSuccess: (_, professionalId) => {
      // Invalidate both favorites list and specific check with refetchType: 'all'
      queryClient.invalidateQueries({
        queryKey: favoritesKeys.lists(),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: favoritesKeys.check(professionalId),
        refetchType: 'all',
      });
      // Invalidate profile to update favorites_count in stats
      queryClient.invalidateQueries({
        queryKey: ['profile'],
        refetchType: 'all',
      });
    },
  });
}
