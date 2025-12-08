// hooks/useProfessionals.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { professionalsService } from '@/services/supabase';
import {
  ProfessionalFilters,
  Professional,
  ProfessionalWithRelations,
} from '@/types/database.types';

/**
 * Get professionals with filters and pagination
 * Cache: 2 minutes (professionals list changes moderately)
 */
export function useProfessionals(
  filters?: ProfessionalFilters,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: ['professionals', filters, limit, offset],
    queryFn: async () => {
      const page = Math.floor(offset / limit) + 1;
      const result = await professionalsService.getProfessionals(filters, {
        page,
        limit,
      });
      // Extract data array from paginated response
      if ('data' in result) {
        return result.data;
      }
      return result;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get single professional by ID with full details
 * Cache: 5 minutes (individual profiles change infrequently)
 */
export function useProfessional(id: string) {
  return useQuery<Professional | null>({
    queryKey: ['professional', id],
    queryFn: () => professionalsService.getProfessional(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Get featured professionals (verified, high rating)
 * Cache: 5 minutes (featured list changes infrequently)
 */
export function useFeaturedProfessionals(limit: number = 10) {
  return useQuery<Professional[]>({
    queryKey: ['professionals', 'featured', limit],
    queryFn: () => professionalsService.getFeaturedProfessionals(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
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
