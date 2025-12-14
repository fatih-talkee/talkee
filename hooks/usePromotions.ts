// hooks/usePromotions.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  promotionsService,
  Promotion,
} from '@/services/supabase/promotions.service';
import { CACHE_CONFIG } from '@/lib/cacheConfig';

/**
 * Get all active promotions
 * Cache: 5 minutes (promotions change infrequently)
 */
export function usePromotions() {
  return useQuery<Promotion[]>({
    queryKey: ['promotions'],
    queryFn: () => promotionsService.getActivePromotions(),
    ...CACHE_CONFIG.PROMOTIONS,
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
    ...CACHE_CONFIG.PROMOTIONS,
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
    ...CACHE_CONFIG.PROMOTION_DETAIL,
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
