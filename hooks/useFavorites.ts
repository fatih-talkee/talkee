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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
      // Invalidate favorites list
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
      // Update specific favorite check
      queryClient.setQueryData(favoritesKeys.check(professionalId), true);
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
      // Invalidate favorites list
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
      // Update specific favorite check
      queryClient.setQueryData(favoritesKeys.check(professionalId), false);
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
      // Invalidate both favorites list and specific check
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: favoritesKeys.check(professionalId),
      });
    },
  });
}
