/**
 * Type Adapters - Convert API types to UI-compatible types
 * Adapts database snake_case to component camelCase
 */

import {
  Professional as DBProfessional,
  Category as DBCategory,
  ProfessionalWithRelations,
} from '@/types/database.types';

// ============================================================================
// UI TYPES (Component-compatible format with camelCase)
// ============================================================================

export interface UIProfessional {
  id: string;
  name: string;
  title: string;
  category: string;
  ratePerMinute: number;
  avatar: string;
  bio: string;
  rating: number;
  totalCalls: number;
  isOnline: boolean;
  isVerified: boolean;
  specialties: string[];
  languages: string[];
  responseTime: string;
  badges: string[];
  isBlocked?: boolean;
}

export interface UICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  professionalCount: number;
}

export interface UIPromotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  gradient: string[];
}

// ============================================================================
// ADAPTER FUNCTIONS (API → UI)
// ============================================================================

/**
 * Convert API Professional to UI format
 * Handles both Professional and ProfessionalWithRelations
 */
export function adaptProfessional(
  dbProf: DBProfessional | ProfessionalWithRelations
): UIProfessional {
  // Check if it has relations (ProfessionalWithRelations)
  const hasRelations = 'users' in dbProf || 'categories' in dbProf;

  if (hasRelations) {
    const prof = dbProf as ProfessionalWithRelations;
    return {
      id: prof.id,
      name: prof.users?.name || 'Professional',
      title: prof.categories?.name || 'Expert',
      category: prof.categories?.name || 'General',
      ratePerMinute: prof.rate_per_minute || 0,
      avatar: prof.users?.avatar_url || 'https://via.placeholder.com/400',
      bio: prof.bio || '',
      rating: prof.average_rating || 0,
      totalCalls: prof.total_calls || 0,
      isOnline: prof.is_available || false,
      isVerified: prof.is_verified || false,
      specialties: prof.expertise_tags || [],
      languages: prof.languages || ['English'],
      responseTime: calculateResponseTime(prof.average_rating),
      badges: generateBadges(prof),
      isBlocked: false,
    };
  }

  // Plain Professional (no relations)
  return {
    id: dbProf.id,
    name: 'Professional',
    title: 'Expert',
    category: 'General',
    ratePerMinute: dbProf.rate_per_minute || 0,
    avatar: 'https://via.placeholder.com/400',
    bio: dbProf.bio || '',
    rating: dbProf.average_rating || 0,
    totalCalls: dbProf.total_calls || 0,
    isOnline: dbProf.is_available || false,
    isVerified: dbProf.is_verified || false,
    specialties: dbProf.expertise_tags || [],
    languages: dbProf.languages || ['English'],
    responseTime: calculateResponseTime(dbProf.average_rating),
    badges: generateBadges(dbProf),
    isBlocked: false,
  };
}

/**
 * Convert API Category to UI format
 */
export function adaptCategory(dbCat: DBCategory): UICategory {
  return {
    id: dbCat.id,
    name: dbCat.name || 'Category',
    icon: dbCat.icon_name || 'briefcase',
    color: generateColorFromName(dbCat.name),
    professionalCount: 0, // Fetched separately if needed
  };
}

/**
 * Convert API Promotion to UI format
 * Promotions come from service already adapted, but this ensures consistency
 */
export function adaptPromotion(apiPromo: any): UIPromotion {
  return {
    id: apiPromo.id,
    title: apiPromo.title,
    subtitle: apiPromo.subtitle,
    image: apiPromo.image || apiPromo.image_url || '',
    ctaText: apiPromo.ctaText || apiPromo.cta_text || 'Learn More',
    gradient: apiPromo.gradient || [
      apiPromo.gradient_start || '#667eea',
      apiPromo.gradient_end || '#764ba2',
    ],
  };
}

/**
 * Batch convert professionals
 */
export function adaptProfessionals(
  dbProfs: (DBProfessional | ProfessionalWithRelations)[]
): UIProfessional[] {
  return dbProfs.map(adaptProfessional);
}

/**
 * Batch convert categories
 */
export function adaptCategories(dbCats: DBCategory[]): UICategory[] {
  return dbCats.map(adaptCategory);
}

/**
 * Batch convert promotions
 */
export function adaptPromotions(apiPromos: any[]): UIPromotion[] {
  return apiPromos.map(adaptPromotion);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate response time based on rating
 */
function calculateResponseTime(rating: number): string {
  if (rating >= 4.8) return '< 1 min';
  if (rating >= 4.5) return '< 2 min';
  if (rating >= 4.0) return '< 5 min';
  if (rating >= 3.5) return '< 10 min';
  return '< 15 min';
}

/**
 * Generate badges based on professional attributes
 */
function generateBadges(
  prof: DBProfessional | ProfessionalWithRelations
): string[] {
  const badges: string[] = [];

  if (prof.is_verified) {
    badges.push('Verified');
  }

  if (prof.average_rating >= 4.9) {
    badges.push('Top Rated');
  }

  if (prof.total_calls >= 1000) {
    badges.push('Expert');
  }

  if (prof.average_rating >= 4.8) {
    badges.push('Quick Response');
  }

  return badges;
}

/**
 * Generate vibrant, consistent color based on category name
 * ✅ UPDATED: Vibrant colors matching old UI
 */
function generateColorFromName(name: string): string {
  const colors = [
    '#0EA5E9', // Bright Sky Blue (Business)
    '#A855F7', // Bright Purple (Technology)
    '#22C55E', // Bright Green (Health)
    '#FBBF24', // Bright Yellow/Amber (Finance)
    '#F97316', // Bright Orange (Lifestyle)
    '#06B6D4', // Bright Cyan (Education)
    '#C026D3', // Bright Fuchsia (Design)
    '#EC4899', // Bright Pink (Entertainment)
    '#EF4444', // Bright Red (Legal)
    '#10B981', // Bright Emerald (Sports)
    '#8B5CF6', // Bright Violet (Arts)
    '#14B8A6', // Bright Teal (Consulting)
  ];

  const hash = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
