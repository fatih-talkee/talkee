// hooks/useCategories.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/supabase';
import { Category } from '@/types/database.types';

/**
 * Get all active categories
 * Cache: 10 minutes (categories rarely change)
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
}

/**
 * Get single category by ID
 */
export function useCategory(id: string) {
  return useQuery<Category | null>({
    queryKey: ['category', id],
    queryFn: () => categoriesService.getCategoryById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Get category by slug
 */
export function useCategoryBySlug(slug: string) {
  return useQuery<Category | null>({
    queryKey: ['category', 'slug', slug],
    queryFn: () => categoriesService.getCategoryBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Invalidate categories cache
 */
export function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };
}

