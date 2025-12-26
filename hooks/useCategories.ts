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
        // Add additional timeout wrapper for React Query
        const queryPromise = categoriesService.getPopularCategories(limit);
        let queryTimeoutId: ReturnType<typeof setTimeout> | null = null;
        const queryTimeout = new Promise((_, reject) => {
          queryTimeoutId = setTimeout(() => {
            const timeoutElapsed = Date.now() - startTime;
            const timeoutError = new Error(
              'Popular categories query timeout in hook'
            );
            logger.error(
              '[usePopularCategories] ⏱️ Query TIMEOUT in React Query hook',
              timeoutError,
              {
                elapsedTime: `${timeoutElapsed}ms`,
                timeoutLimit: '25000ms',
                timestamp: new Date().toISOString(),
              }
            );
            reject(timeoutError);
          }, 25000);
        });

        const result = (await Promise.race([
          queryPromise,
          queryTimeout,
        ])) as any;

        // Clear timeout if query succeeded
        if (queryTimeoutId) {
          clearTimeout(queryTimeoutId);
        }

        const duration = Date.now() - startTime;
        logger.info('[usePopularCategories] ✅ Fetch completed', {
          duration: `${duration}ms`,
          count: result.length,
          limit,
        });
        return result;
      } catch (error: any) {
        // Clear timeout on error too
        if (queryTimeoutId) {
          clearTimeout(queryTimeoutId);
        }

        const duration = Date.now() - startTime;
        logger.error('[usePopularCategories] ❌ Fetch failed', {
          error: error?.message || String(error),
          duration: `${duration}ms`,
          limit,
        });
        throw error;
      }
    },
    ...CACHE_CONFIG.CATEGORIES,
    // Force refetch on mount to ensure fresh data
    refetchOnMount: true,
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
