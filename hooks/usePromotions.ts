// hooks/usePromotions.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  promotionsService,
  Promotion,
} from '@/services/supabase/promotions.service';

/**
 * Get all active promotions
 * Cache: 5 minutes (promotions change infrequently)
 */
export function usePromotions() {
  return useQuery<Promotion[]>({
    queryKey: ['promotions'],
    queryFn: () => promotionsService.getActivePromotions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Get featured promotions (top priority)
 * Cache: 5 minutes
 */
export function useFeaturedPromotions(limit: number = 5) {
  return useQuery<Promotion[]>({
    queryKey: ['promotions', 'featured', limit],
    queryFn: () => promotionsService.getFeaturedPromotions(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Get single promotion by ID
 * Cache: 10 minutes (individual promotions rarely change)
 */
export function usePromotion(id: string) {
  return useQuery<Promotion | null>({
    queryKey: ['promotion', id],
    queryFn: () => promotionsService.getPromotionById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 20, // 20 minutes
  });
}

/**
 * Invalidate promotions cache
 */
export function useInvalidatePromotions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['promotions'] });
  };
}
