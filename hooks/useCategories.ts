/**
 * Categories React Query Hooks
 * Provides data fetching for categories
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { categoriesService } from '@/services/supabase/categories.service';
import { Category } from '@/types/database.types';

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
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook: Get popular categories (most professionals, fallback to sort_order)
 */
export function usePopularCategories(limit: number = 8): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: [...categoriesKeys.lists(), 'popular', limit],
    queryFn: () => categoriesService.getPopularCategories(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });
}
