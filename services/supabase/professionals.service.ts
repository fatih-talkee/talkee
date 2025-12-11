import { supabase } from '@/lib/supabase';
import type {
  Professional,
  ProfessionalWithRelations,
  Category,
  ProfessionalEducationInsert,
  ProfessionalExperienceInsert,
  Availability,
} from '@/types/database.types';

// ============================================================================
// PROFESSIONALS SERVICE - UPDATED WITH is_featured ONLY
// ============================================================================

class ProfessionalsService {
  /**
   * Get all professionals with related data
   * ✅ UPDATED: Orders by is_featured first, then total_calls
   */
  async getProfessionals(
    categoryId?: string
  ): Promise<ProfessionalWithRelations[]> {
    try {
      let query = supabase
        .from('professionals')
        .select(
          `
          *,
          users(id, name, avatar_url, is_verified),
          categories(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .order('is_featured', { ascending: false }) // ✅ Featured first
        .order('total_calls', { ascending: false }); // ✅ Then by popularity

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching professionals:', error);
        throw error;
      }

      return (data || []) as ProfessionalWithRelations[];
    } catch (error) {
      console.error('Error in getProfessionals:', error);
      throw error;
    }
  }

  /**
   * Get available professionals (for immediate calls)
   * ✅ UPDATED: Orders by is_featured first, then total_calls
   */
  async getAvailableProfessionals(
    categoryId?: string
  ): Promise<ProfessionalWithRelations[]> {
    try {
      let query = supabase
        .from('professionals')
        .select(
          `
          *,
          users!inner(id, name, avatar_url),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .eq('is_available', true)
        .order('is_featured', { ascending: false }) // ✅ Featured first
        .order('total_calls', { ascending: false }); // ✅ Then by popularity

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available professionals:', error);
        throw error;
      }

      return (data || []) as ProfessionalWithRelations[];
    } catch (error) {
      console.error('Error in getAvailableProfessionals:', error);
      throw error;
    }
  }

  /**
   * Get a single professional by ID
   */
  async getProfessional(id: string): Promise<ProfessionalWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select(
          `
          *,
          users!inner(id, name, avatar_url),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching professional:', error);
        throw error;
      }

      return data as ProfessionalWithRelations;
    } catch (error) {
      console.error('Error in getProfessional:', error);
      throw error;
    }
  }

  /**
   * Search professionals by name or title
   * ✅ UPDATED: Orders by is_featured first, then total_calls
   */
  async searchProfessionals(
    query: string
  ): Promise<ProfessionalWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select(
          `
          *,
          users!inner(id, name, avatar_url),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .or(`title.ilike.%${query}%,users.name.ilike.%${query}%`)
        .order('is_featured', { ascending: false }) // ✅ Featured first
        .order('total_calls', { ascending: false }); // ✅ Then by popularity

      if (error) {
        console.error('Error searching professionals:', error);
        throw error;
      }

      return (data || []) as ProfessionalWithRelations[];
    } catch (error) {
      console.error('Error in searchProfessionals:', error);
      throw error;
    }
  }

  /**
   * Get featured professionals from database
   * ✅ UPDATED: Uses database is_featured flag
   */
  async getFeaturedProfessionals(
    limit: number = 10,
    categoryId?: string
  ): Promise<ProfessionalWithRelations[]> {
    try {
      let query = supabase
        .from('professionals')
        .select(
          `
          *,
          users(id, name, avatar_url, is_verified),
          categories(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .eq('is_featured', true) // ✅ Only featured
        .order('total_calls', { ascending: false }) // ✅ Order by popularity
        .limit(limit);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching featured professionals:', error);
        throw error;
      }

      return (data || []) as ProfessionalWithRelations[];
    } catch (error) {
      console.error('Error in getFeaturedProfessionals:', error);
      throw error;
    }
  }

  /**
   * Update professional availability status
   */
  async updateAvailability(
    professionalId: string,
    isAvailable: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_available: isAvailable })
        .eq('id', professionalId);

      if (error) {
        console.error('Error updating availability:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAvailability:', error);
      throw error;
    }
  }

  /**
   * Toggle featured status
   * ✅ NEW: Set/unset featured flag
   */
  async updateFeaturedStatus(
    professionalId: string,
    isFeatured: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_featured: isFeatured })
        .eq('id', professionalId);

      if (error) {
        console.error('Error updating featured status:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in updateFeaturedStatus:', error);
      throw error;
    }
  }

  /**
   * Get availabilities for a professional
   */
  async getProfessionalAvailabilities(
    professionalId: string
  ): Promise<Availability[]> {
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching availabilities:', error);
        throw error;
      }

      return (data || []) as Availability[];
    } catch (error) {
      console.error('Error in getProfessionalAvailabilities:', error);
      throw error;
    }
  }

  // ============================================================================
  // REST OF THE SERVICE METHODS
  // ============================================================================
  // Add your other methods here (createProfessional, getProfessionalByUserId, etc.)
  // They remain unchanged from your original service
}

export const professionalsService = new ProfessionalsService();
