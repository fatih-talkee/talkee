// hooks/useProfessionals.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  professionalsService,
  ProfessionalWithRelations,
} from '@/services/supabase/professionals.service';

/**
 * Get professionals list (optionally filtered by category)
 * Cache: 2 minutes (professionals list changes moderately)
 */
export function useProfessionals(categoryId?: string) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: ['professionals', categoryId],
    queryFn: () => professionalsService.getProfessionals(categoryId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get available professionals (for immediate calls)
 * Cache: 1 minute (availability changes frequently)
 */
export function useAvailableProfessionals(categoryId?: string) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: ['professionals', 'available', categoryId],
    queryFn: () => professionalsService.getAvailableProfessionals(categoryId),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get featured professionals (high rating, verified, most popular)
 * Cache: 5 minutes (featured list changes infrequently)
 */
export function useFeaturedProfessionals(limit: number = 10) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: ['professionals', 'featured', limit],
    queryFn: async () => {
      // Get all active professionals
      const professionals = await professionalsService.getProfessionals();

      // Filter and sort for featured
      return professionals
        .filter((p) => p.rating >= 4.5) // High rating only
        .sort((a, b) => {
          // Sort by rating desc, then by total_calls desc
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.total_calls - a.total_calls;
        })
        .slice(0, limit);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Get single professional by ID with full details
 * Cache: 5 minutes (individual profiles change infrequently)
 */
export function useProfessional(id: string) {
  return useQuery<ProfessionalWithRelations | null>({
    queryKey: ['professional', id],
    queryFn: () => professionalsService.getProfessional(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Search professionals by query string
 * Cache: 1 minute (search results should be fresh)
 */
export function useSearchProfessionals(query: string) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: ['professionals', 'search', query],
    queryFn: () => professionalsService.searchProfessionals(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Invalidate professionals cache
 */
export function useInvalidateProfessionals() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['professionals'] });
  };
}
