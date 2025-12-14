// hooks/useProfessionals.ts
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { professionalsService } from '@/services/supabase/professionals.service';
import { ProfessionalWithRelations } from '@/types/database.types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';

// Query Keys Factory Pattern
export const professionalsKeys = {
  all: ['professionals'] as const,
  lists: () => [...professionalsKeys.all, 'list'] as const,
  list: (categoryId?: string) =>
    [...professionalsKeys.lists(), categoryId] as const,
  available: (categoryId?: string) =>
    [...professionalsKeys.all, 'available', categoryId] as const,
  featured: (limit?: number, categoryId?: string) =>
    [...professionalsKeys.all, 'featured', limit, categoryId] as const,
  details: () => [...professionalsKeys.all, 'detail'] as const,
  detail: (id: string) => [...professionalsKeys.details(), id] as const,
  search: (query: string) =>
    [...professionalsKeys.all, 'search', query] as const,
  infinite: (categoryId?: string) =>
    [...professionalsKeys.all, 'infinite', categoryId] as const,
  searchInfinite: (query: string) =>
    [...professionalsKeys.all, 'search-infinite', query] as const,
};

/**
 * Get professionals list (optionally filtered by category)
 * Cache: 2 minutes (professionals list changes moderately)
 * ✅ Already orders by is_featured DESC in service
 */
export function useProfessionals(categoryId?: string) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: professionalsKeys.list(categoryId),
    queryFn: () => professionalsService.getProfessionals(categoryId),
    ...CACHE_CONFIG.PROFESSIONALS_LIST,
  });
}

/**
 * Get available professionals (for immediate calls)
 * Cache: 1 minute (availability changes frequently)
 * ✅ Already orders by is_featured DESC in service
 */
export function useAvailableProfessionals(categoryId?: string) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: professionalsKeys.available(categoryId),
    queryFn: () => professionalsService.getAvailableProfessionals(categoryId),
    ...CACHE_CONFIG.PROFESSIONAL_AVAILABLE,
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
    queryKey: professionalsKeys.featured(limit, categoryId),
    queryFn: () =>
      professionalsService.getFeaturedProfessionals(limit, categoryId),
    ...CACHE_CONFIG.PROFESSIONAL_FEATURED,
  });
}

/**
 * Get single professional by ID with full details
 * Cache: 5 minutes (individual profiles change infrequently)
 */
export function useProfessional(id: string) {
  return useQuery<ProfessionalWithRelations | null>({
    queryKey: professionalsKeys.detail(id),
    queryFn: () => professionalsService.getProfessional(id),
    enabled: !!id,
    ...CACHE_CONFIG.PROFESSIONAL_DETAIL,
  });
}

/**
 * Search professionals by query string
 * Cache: 1 minute (search results should be fresh)
 * ✅ Already orders by is_featured DESC in service
 */
export function useSearchProfessionals(query: string) {
  return useQuery<ProfessionalWithRelations[]>({
    queryKey: professionalsKeys.search(query),
    queryFn: () => professionalsService.searchProfessionals(query),
    enabled: query.length > 0,
    ...CACHE_CONFIG.PROFESSIONAL_SEARCH,
  });
}

/**
 * Get professionals with infinite scroll
 * ✅ Orders by is_featured first, then total_calls
 * ✅ Supports pagination
 */
export function useInfiniteProfessionals(categoryId?: string) {
  const PAGE_SIZE = 20;

  return useInfiniteQuery<ProfessionalWithRelations[]>({
    queryKey: professionalsKeys.infinite(categoryId),
    queryFn: ({ pageParam = 0 }) => {
      return professionalsService.getProfessionals(
        categoryId,
        PAGE_SIZE,
        pageParam * PAGE_SIZE
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer items than PAGE_SIZE, we've reached the end
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    ...CACHE_CONFIG.PROFESSIONALS_LIST,
  });
}

/**
 * Search professionals with infinite scroll
 * ✅ Orders by is_featured first, then total_calls
 * ✅ Supports pagination
 */
export function useInfiniteSearchProfessionals(query: string) {
  const PAGE_SIZE = 20;

  return useInfiniteQuery<ProfessionalWithRelations[]>({
    queryKey: professionalsKeys.searchInfinite(query),
    queryFn: ({ pageParam = 0 }) => {
      return professionalsService.searchProfessionals(
        query,
        PAGE_SIZE,
        pageParam * PAGE_SIZE
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer items than PAGE_SIZE, we've reached the end
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: query.length > 0,
    ...CACHE_CONFIG.PROFESSIONAL_SEARCH,
  });
}

/**
 * Invalidate professionals cache
 */
export function useInvalidateProfessionals() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: professionalsKeys.all });
  };
}
