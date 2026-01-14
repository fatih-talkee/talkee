/**
 * Categories React Query Hooks
 * Provides data fetching for categories
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { categoriesService } from '@/services/supabase/categories.service';
import { Category } from '@/types/database.types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { logger } from '@/lib/logger';

// Query Keys
export const categoriesKeys = {
  all: ['categories'] as const,
  lists: () => [...categoriesKeys.all, 'list'] as const,
  detail: (id: string) => [...categoriesKeys.all, 'detail', id] as const,
};

/**
 * Hook: Get all categories
 */
export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: categoriesKeys.lists(),
    queryFn: () => categoriesService.getCategories(),
    ...CACHE_CONFIG.CATEGORIES,
  });
}

/**
 * Hook: Get popular categories (most professionals, fallback to sort_order)
 */
export function usePopularCategories(
  limit: number = 8
): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: [...categoriesKeys.lists(), 'popular', limit],
    queryFn: async () => {
      logger.info('[usePopularCategories] 🔍 Starting fetch', {
        limit,
        timestamp: new Date().toISOString(),
      });
      const startTime = Date.now();
      try {
        const result = await categoriesService.getPopularCategories(limit);
        const duration = Date.now() - startTime;
        
        logger.info('[usePopularCategories] ✅ Fetch completed', {
          duration: `${duration}ms`,
          count: result?.length || 0,
          limit,
        });
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        // Enhanced error serialization
        let detailedError = '';
        try {
          detailedError = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : String(error);
        } catch (e) {
          detailedError = String(error);
        }

        logger.error('[usePopularCategories] ❌ Fetch failed', error, {
          detailed: detailedError,
          duration: `${duration}ms`,
          limit,
        });
        throw error;
      }
    },
    ...CACHE_CONFIG.CATEGORIES,
    // Use stale data if available, only refetch if stale
    refetchOnMount: false, 
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });
}

/**
 * Hook: Get categories grouped by category groups
 */
export function useCategoriesGrouped(): UseQueryResult<
  Array<{
    id: string;
    name: string;
    emoji: string | null;
    slug: string;
    sort_order: number;
    categories: Category[];
  }>
> {
  return useQuery({
    queryKey: [...categoriesKeys.lists(), 'grouped'],
    queryFn: () => categoriesService.getCategoriesGrouped(),
    ...CACHE_CONFIG.CATEGORIES,
  });
}

/**
 * Hook: Get single category by ID
 */
export function useCategory(
  id: string | undefined,
  enabled: boolean = true
): UseQueryResult<Category | null> {
  return useQuery({
    queryKey: categoriesKeys.detail(id || ''),
    queryFn: () => categoriesService.getCategoryById(id!),
    enabled: !!id && enabled,
    ...CACHE_CONFIG.CATEGORIES,
  });
}
