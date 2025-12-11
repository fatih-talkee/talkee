/**
 * Promotions Service
 * Handles promotional banners and offers
 */

import { supabase } from '@/lib/supabase';

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
   */
  async getActivePromotions(): Promise<Promotion[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching promotions:', error);
        return [];
      }

      return (data || []).map((promo, index) => adaptPromotion(promo, index));
    } catch (error) {
      console.error('Error in getActivePromotions:', error);
      return [];
    }
  }

  /**
   * Get promotion by ID
   */
  async getPromotionById(id: string): Promise<Promotion | null> {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching promotion:', error);
        return null;
      }

      return data ? adaptPromotion(data, 0) : null;
    } catch (error) {
      console.error('Error in getPromotionById:', error);
      return null;
    }
  }

  /**
   * Get featured promotions (top priority)
   */
  async getFeaturedPromotions(limit: number = 5): Promise<Promotion[]> {
    try {
      const promotions = await this.getActivePromotions();
      return promotions.slice(0, limit);
    } catch (error) {
      console.error('Error in getFeaturedPromotions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const promotionsService = new PromotionsService();
