// hooks/useProfessionals.ts
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { professionalsService } from '@/services/supabase/professionals.service';
import { ProfessionalWithRelations } from '@/types/database.types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { logger } from '@/lib/logger';

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
    queryFn: async () => {
      logger.info('[useFeaturedProfessionals] 🔍 Starting fetch', {
        limit,
        categoryId,
        timestamp: new Date().toISOString(),
      });
      const startTime = Date.now();
      try {
        const result = await professionalsService.getFeaturedProfessionals(
          limit,
          categoryId
        );
        const duration = Date.now() - startTime;
        logger.info('[useFeaturedProfessionals] ✅ Fetch completed', {
          duration: `${duration}ms`,
          count: result?.length || 0,
          limit,
          categoryId,
        });
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        // ✅ FIX: Enhanced error serialization
        let detailedError = '';
        try {
          detailedError = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : String(error);
        } catch (e) {
          detailedError = String(error);
        }

        logger.error('[useFeaturedProfessionals] ❌ Fetch failed', error, {
          detailed: detailedError,
          duration: `${duration}ms`,
          limit,
          categoryId,
        });
        throw error;
      }
    },
    ...CACHE_CONFIG.PROFESSIONAL_FEATURED,
    // Use stale data if available, only refetch if stale
    refetchOnMount: false,
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });
}

/**
 * Get single professional by ID with full details
 * Cache: 5 minutes (individual profiles change infrequently)
 *
 * ✅ FIXED: Now accepts optional options parameter to control enabled state
 * This prevents "Rendered fewer hooks than expected" error when used conditionally
 *
 * @param id - Professional ID to fetch
 * @param options - Query options
 * @param options.enabled - Override default enabled behavior (default: !!id)
 */
export function useProfessional(id: string, options?: { enabled?: boolean }) {
  return useQuery<ProfessionalWithRelations | null>({
    queryKey: professionalsKeys.detail(id),
    queryFn: () => professionalsService.getProfessional(id),
    enabled: options?.enabled ?? !!id,
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
        (pageParam as number) * PAGE_SIZE
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
        (pageParam as number) * PAGE_SIZE
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
