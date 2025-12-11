// utils/typeAdapters.ts
// ✅ SAFE VERSION - All fields have safe defaults

import { ProfessionalWithRelations } from '@/types/database.types';

/**
 * UI-friendly professional type for components
 */
export interface UIProfessional {
  id: string;
  name: string;
  title: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  languages: string[];
  bio: string;
  ratePerMinute: number;
  totalCalls: number;
  totalMinutes: number;
  responseTime: string;
  isOnline: boolean;
  isVerified: boolean;
  isFeatured: boolean; // ✅ Featured flag
  categoryId: string;
  categoryName?: string;
}

/**
 * Convert database professional to UI format
 * ✅ SAFE: All fields have fallback defaults
 */
export function adaptProfessional(
  dbProfessional: ProfessionalWithRelations
): UIProfessional {
  // Get user data
  const user = dbProfessional.users;
  const userName = user?.name || 'Unknown Professional';
  const userAvatar = user?.avatar_url || 'https://via.placeholder.com/150';

  // Get category data
  const category = dbProfessional.categories;
  const categoryId = dbProfessional.category_id || category?.id || '';
  const categoryName = category?.name || '';

  // Default response time
  const responseTime = 'N/A';

  // ✅ SAFE: Ensure ratePerMinute is always a valid number
  const ratePerMinute = dbProfessional.rate_per_minute
    ? Number(dbProfessional.rate_per_minute)
    : 0;

  return {
    id: dbProfessional.id,
    name: userName,
    title: dbProfessional.profession || dbProfessional.title || 'Professional',
    avatar: userAvatar,
    rating: 0, // Default rating
    reviewCount: 0, // Default review count
    specialties: dbProfessional.specialties || [],
    languages: dbProfessional.languages || [],
    bio: dbProfessional.bio || '',
    ratePerMinute: ratePerMinute, // ✅ SAFE: Always a number
    totalCalls: dbProfessional.total_calls || 0,
    totalMinutes: dbProfessional.total_minutes || 0,
    responseTime,
    isOnline: dbProfessional.is_available || false,
    isVerified: dbProfessional.is_verified || false,
    isFeatured: dbProfessional.is_featured || false, // ✅ Featured flag
    categoryId,
    categoryName,
  };
}

/**
 * Convert array of database professionals to UI format
 */
export function adaptProfessionals(
  dbProfessionals: ProfessionalWithRelations[]
): UIProfessional[] {
  if (!Array.isArray(dbProfessionals)) {
    return [];
  }
  return dbProfessionals.map(adaptProfessional);
}
