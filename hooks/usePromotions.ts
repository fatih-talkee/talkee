/**
 * Promotions React Query Hooks
 * Provides data fetching for promotional content
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  promotionsService,
  Promotion,
} from '@/services/supabase/promotions.service';

// Query Keys
export const promotionsKeys = {
  all: ['promotions'] as const,
  active: () => [...promotionsKeys.all, 'active'] as const,
  featured: (limit: number) =>
    [...promotionsKeys.all, 'featured', limit] as const,
  detail: (id: string) => [...promotionsKeys.all, 'detail', id] as const,
};

/**
 * Hook: Get all active promotions
 */
export function usePromotions(): UseQueryResult<Promotion[]> {
  return useQuery({
    queryKey: promotionsKeys.active(),
    queryFn: () => promotionsService.getActivePromotions(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook: Get promotion by ID
 */
export function usePromotion(
  id: string | undefined,
  enabled: boolean = true
): UseQueryResult<Promotion | null> {
  return useQuery({
    queryKey: promotionsKeys.detail(id || ''),
    queryFn: () => promotionsService.getPromotionById(id!),
    enabled: !!id && enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook: Get featured promotions
 */
export function useFeaturedPromotions(
  limit: number = 5
): UseQueryResult<Promotion[]> {
  return useQuery({
    queryKey: promotionsKeys.featured(limit),
    queryFn: () => promotionsService.getFeaturedPromotions(limit),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
