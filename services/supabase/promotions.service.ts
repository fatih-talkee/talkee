/**
 * Promotions Service
 * Handles promotional banners and offers
 * ✅ OPTIMIZED: Logger integration, query optimization, proper date filtering
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Database promotion type
interface DBPromotion {
  id: string;
  title: string;
  subtitle: string;
  description: string | null;
  image_url: string;
  cta_text: string;
  cta_link: string | null; // ✅ Include cta_link
  gradient_start: string;
  gradient_end: string;
  is_active: boolean;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// UI promotion type (for components)
export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink?: string; // ✅ Include cta_link
  gradient: string[];
}

/**
 * Predefined gradient colors for promotions (in order: blue, yellow, green, purple)
 */
const PROMOTION_GRADIENTS = [
  ['#3B82F6', '#2563EB'], // Blue
  ['#FBBF24', '#F59E0B'], // Yellow
  ['#10B981', '#059669'], // Green
  ['#8B5CF6', '#7C3AED'], // Purple
];

/**
 * Convert database promotion to UI format
 * ✅ Gradient colors assigned by index (blue, yellow, green, purple)
 */
function adaptPromotion(dbPromo: DBPromotion, index: number = 0): Promotion {
  // Use predefined gradients based on index (cycles through colors)
  const gradientIndex = index % PROMOTION_GRADIENTS.length;
  const defaultGradient = PROMOTION_GRADIENTS[gradientIndex];
  
  return {
    id: dbPromo.id,
    title: dbPromo.title,
    subtitle: dbPromo.subtitle,
    image: dbPromo.image_url,
    ctaText: dbPromo.cta_text,
    ctaLink: dbPromo.cta_link || undefined, // ✅ Pass cta_link
    gradient: [
      dbPromo.gradient_start || defaultGradient[0],
      dbPromo.gradient_end || defaultGradient[1],
    ],
  };
}

class PromotionsService {
  /**
   * Get all active promotions ordered by display_order
   * ✅ OPTIMIZED: Fixed date filtering logic, added logger, better error handling
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const queryStartTime = Date.now();
    logger.debug('[PromotionsService] 🔍 Fetching active promotions', {
      timestamp: new Date().toISOString(),
    });

    try {
      const now = new Date().toISOString();

      // ✅ FIX: Correct date filtering logic
      // Promotion is active if:
      // 1. is_active = true
      // 2. (start_date IS NULL OR start_date <= now) - promotion has started
      // 3. (end_date IS NULL OR end_date >= now) - promotion hasn't ended
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('[PromotionsService] ❌ Error fetching promotions', error, {
          errorMessage: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        });
        return [];
      }

      const promotions = (data || []).map((promo, index) =>
        adaptPromotion(promo, index)
      );
      const queryElapsed = Date.now() - queryStartTime;

      logger.info('[PromotionsService] ✅ Active promotions fetched', {
        count: promotions.length,
        elapsed: `${queryElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return promotions;
    } catch (error) {
      const queryElapsed = Date.now() - queryStartTime;
      logger.error(
        '[PromotionsService] ❌ Unexpected error fetching promotions',
        error,
        {
          elapsed: `${queryElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return [];
    }
  }

  /**
   * Get promotion by ID
   * ✅ OPTIMIZED: Added logger, better error handling
   */
  async getPromotionById(id: string): Promise<Promotion | null> {
    const queryStartTime = Date.now();
    logger.debug('[PromotionsService] 🔍 Fetching promotion by ID', {
      promotionId: id,
      timestamp: new Date().toISOString(),
    });

    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.warn('[PromotionsService] ⚠️ Error fetching promotion', {
          promotionId: id,
          errorMessage: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      const queryElapsed = Date.now() - queryStartTime;
      if (data) {
        logger.info('[PromotionsService] ✅ Promotion fetched', {
          promotionId: id,
          title: data.title,
          elapsed: `${queryElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        return adaptPromotion(data, 0);
      }

      logger.debug('[PromotionsService] ℹ️ Promotion not found', {
        promotionId: id,
        elapsed: `${queryElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return null;
    } catch (error) {
      const queryElapsed = Date.now() - queryStartTime;
      logger.error(
        '[PromotionsService] ❌ Unexpected error fetching promotion',
        error,
        {
          promotionId: id,
          elapsed: `${queryElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
  }

  /**
   * Get featured promotions (top priority)
   * ✅ OPTIMIZED: Apply limit at database level instead of fetching all and slicing
   */
  async getFeaturedPromotions(limit: number = 5): Promise<Promotion[]> {
    const queryStartTime = Date.now();
    logger.debug('[PromotionsService] 🔍 Fetching featured promotions', {
      limit,
      timestamp: new Date().toISOString(),
    });

    try {
      const now = new Date().toISOString();

      // ✅ OPTIMIZED: Apply limit at database level for better performance
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true })
        .limit(limit);

      if (error) {
        logger.error(
          '[PromotionsService] ❌ Error fetching featured promotions',
          error,
          {
            limit,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          }
        );
        return [];
      }

      const promotions = (data || []).map((promo, index) =>
        adaptPromotion(promo, index)
      );
      const queryElapsed = Date.now() - queryStartTime;

      logger.info('[PromotionsService] ✅ Featured promotions fetched', {
        limit,
        count: promotions.length,
        elapsed: `${queryElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return promotions;
    } catch (error) {
      const queryElapsed = Date.now() - queryStartTime;
      logger.error(
        '[PromotionsService] ❌ Unexpected error fetching featured promotions',
        error,
        {
          limit,
          elapsed: `${queryElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return [];
    }
  }
}

// Export singleton instance
export const promotionsService = new PromotionsService();
