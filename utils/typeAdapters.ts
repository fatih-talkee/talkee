/**
 * TYPE ADAPTERS - Database to UI conversions
 * ✅ UPDATED: Removed rating field completely
 * ✅ Uses corrected Professional type with title, specialties
 */

import type {
  Professional,
  ProfessionalWithRelations,
  Category,
} from '@/types/database.types';

/**
 * UI-friendly professional type for components
 */
export interface UIProfessional {
  id: string;
  name: string;
  title: string;
  category: string;
  ratePerMinute: number;
  avatar: string;
  bio: string;
  totalCalls: number;
  isOnline: boolean;
  isVerified: boolean;
  specialties: string[];
  languages: string[];
  responseTime: string;
  badges: string[];
  isBlocked: boolean;
}

/**
 * Adapt Professional from database to UI format
 */
export function adaptProfessional(
  prof: Professional | ProfessionalWithRelations
): UIProfessional {
  const hasRelations = 'users' in prof || 'categories' in prof;

  if (hasRelations) {
    const professional = prof as ProfessionalWithRelations;

    return {
      id: professional.id,
      name: professional.users?.name || 'Professional',
      title: professional.title || professional.categories?.name || 'Expert',
      category: professional.categories?.name || 'General',
      ratePerMinute: professional.rate_per_minute || 0,
      avatar:
        professional.users?.avatar_url || 'https://via.placeholder.com/400',
      bio: professional.bio || '',
      totalCalls: professional.total_calls || 0,
      isOnline: professional.is_available || false,
      isVerified: professional.users?.is_verified || false,
      specialties: professional.expertise_tags || [],
      languages: professional.languages || ['English'],
      responseTime: calculateResponseTime(professional.total_calls),
      badges: generateBadges(professional),
      isBlocked: false,
    };
  }

  // Plain Professional (no relations)
  const professional = prof as Professional;

  return {
    id: professional.id,
    name: 'Professional',
    title: professional.title || 'Expert',
    category: 'General',
    ratePerMinute: professional.rate_per_minute || 0,
    avatar: 'https://via.placeholder.com/400',
    bio: professional.bio || '',
    totalCalls: professional.total_calls || 0,
    isOnline: professional.is_available || false,
    isVerified: professional.is_verified || false,
    specialties: professional.expertise_tags || [],
    languages: professional.languages || ['English'],
    responseTime: calculateResponseTime(professional.total_calls),
    badges: generateBadges(professional),
    isBlocked: false,
  };
}

/**
 * Batch adapt multiple professionals
 */
export function adaptProfessionals(
  professionals: (Professional | ProfessionalWithRelations)[]
): UIProfessional[] {
  return professionals.map(adaptProfessional);
}

/**
 * Adapt single category
 */
export function adaptCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon_name,
    description: category.description || '',
    isActive: category.is_active,
  };
}

/**
 * Batch adapt categories
 */
export function adaptCategories(categories: Category[]) {
  return categories.map(adaptCategory);
}

/**
 * Calculate response time based on total calls (experience)
 */
function calculateResponseTime(totalCalls: number): string {
  if (totalCalls >= 1000) return '< 1 min';
  if (totalCalls >= 500) return '< 2 min';
  if (totalCalls >= 100) return '< 5 min';
  if (totalCalls >= 50) return '< 10 min';
  return '< 15 min';
}

/**
 * Generate badges based on professional stats
 */
function generateBadges(
  prof: Professional | ProfessionalWithRelations
): string[] {
  const badges: string[] = [];

  // Check if user is verified (from users table if available)
  const isVerified =
    ('users' in prof && prof.users?.is_verified) || prof.is_verified;

  if (isVerified) {
    badges.push('Verified');
  }

  // Experience-based badges
  if (prof.total_calls >= 1000) {
    badges.push('Expert');
  } else if (prof.total_calls >= 500) {
    badges.push('Experienced');
  } else if (prof.total_calls >= 100) {
    badges.push('Professional');
  }

  // Quick response badge (based on experience)
  if (prof.total_calls >= 500) {
    badges.push('Quick Response');
  }

  return badges;
}
