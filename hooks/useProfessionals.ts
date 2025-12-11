// hooks/useProfessionals.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { professionalsService } from '@/services/supabase/professionals.service';
import { ProfessionalWithRelations } from '@/types/database.types';

/**
 * Get professionals list (optionally filtered by category)
 * Cache: 2 minutes (professionals list changes moderately)
 * ✅ Already orders by is_featured DESC in service
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
 * ✅ Already orders by is_featured DESC in service
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
 * Get featured professionals from database
 * Cache: 5 minutes (featured list changes infrequently)
 * ✅ UPDATED: Now uses database is_featured flag instead of client-side filtering
 */
export function useFeaturedProfessionals(
  limit: number = 10,
  categoryId?: string
) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: ['professionals', 'featured', limit, categoryId],
    queryFn: () =>
      professionalsService.getFeaturedProfessionals(limit, categoryId),
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
 * ✅ Already orders by is_featured DESC in service
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
