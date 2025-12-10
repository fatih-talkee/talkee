import { supabase } from '@/lib/supabase';
import type {
  Professional,
  ProfessionalWithRelations,
  Category,
  ProfessionalEducationInsert,
  ProfessionalExperienceInsert,
} from '@/types/database.types';

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ProfessionalsService {
  /**
   * Get all professionals with related data
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
          users!inner(id, name, avatar_url, is_verified),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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
        .order('created_at', { ascending: false });

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
   * Search professionals by name or title
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
        .order('created_at', { ascending: false });

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
   * Get featured professionals (most calls, high activity)
   */
  async getFeaturedProfessionals(
    limit: number = 10
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
        .eq('is_available', true)
        .order('total_calls', { ascending: false })
        .order('total_minutes', { ascending: false })
        .limit(limit);

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

  // ============================================================================
  // BECOME PROFESSIONAL - CREATE/UPDATE METHODS
  // ============================================================================

  /**
   * Create a new professional profile
   */
  async createProfessional(data: {
    full_name: string;
    email: string;
    bio: string;
    specialties: string[];
    languages: string[];
    skills_certifications: string[];
    educations?: Array<Omit<ProfessionalEducationInsert, 'professional_id'>>;
    experiences?: Array<Omit<ProfessionalExperienceInsert, 'professional_id'>>;
    category_ids: string[];
    availabilities: Array<{
      available_at: 'every' | 'specific';
      days?: string[] | null;
      date?: string | null;
      start_hour: string;
      end_hour: string;
      currency?: string;
      price_per_minute: number;
    }>;
    is_available: boolean;
    is_public: boolean;
  }): Promise<{
    success: boolean;
    professional?: Professional;
    error?: string;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user ID from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user:', userError);
        return { success: false, error: 'User not found in database' };
      }

      // Validate required fields
      if (!data.category_ids || data.category_ids.length === 0) {
        return { success: false, error: 'At least one category is required' };
      }

      if (!data.availabilities || data.availabilities.length === 0) {
        return {
          success: false,
          error: 'At least one availability is required',
        };
      }

      // 1. Prepare professional data
      const professionalData = {
        user_id: userData.id,
        title:
          data.specialties && data.specialties.length > 0
            ? data.specialties[0]
            : 'Professional',
        profession:
          data.specialties && data.specialties.length > 0
            ? data.specialties[0]
            : 'Professional',
        bio: data.bio,
        specialties: data.specialties || [],
        languages: data.languages || [],
        skills_certifications: data.skills_certifications || [],
        category_id: data.category_ids[0],
        rate_per_minute: data.availabilities[0]?.price_per_minute || 0,
        is_available: data.is_available,
        is_public: data.is_public,
        is_active: true,
        total_calls: 0,
        total_minutes: 0,
      };

      // Insert professional
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .insert(professionalData)
        .select()
        .single();

      if (profError) {
        console.error('Error creating professional:', profError);
        return { success: false, error: profError.message };
      }

      // 2. Link categories
      if (data.category_ids.length > 0) {
        const categoryLinks = data.category_ids.map((cat_id) => ({
          professional_id: professional.id,
          category_id: cat_id,
        }));

        const { error: catError } = await supabase
          .from('professional_categories')
          .insert(categoryLinks);

        if (catError) {
          console.error('Error linking categories:', catError);
        }
      }

      // 3. Insert educations
      if (data.educations && data.educations.length > 0) {
        const educationsData = data.educations.map((edu, index) => ({
          professional_id: professional.id,
          degree_level: edu.degree_level,
          institution: edu.institution || null,
          field_of_study: edu.field_of_study || null,
          start_year: edu.start_year || null,
          end_year: edu.end_year || null,
          is_current: edu.is_current || false,
          description: edu.description || null,
          sort_order: edu.sort_order !== undefined ? edu.sort_order : index,
        }));

        const { error: educationsError } = await supabase
          .from('professional_educations')
          .insert(educationsData);

        if (educationsError) {
          console.error('Error inserting educations:', educationsError);
        }
      }

      // 4. Insert experiences
      if (data.experiences && data.experiences.length > 0) {
        const experiencesData = data.experiences.map((exp, index) => ({
          professional_id: professional.id,
          title: exp.title || null,
          company: exp.company || null,
          location: exp.location || null,
          start_date: exp.start_date || null,
          end_date: exp.end_date || null,
          is_current: exp.is_current || false,
          description: exp.description || null,
          sort_order: exp.sort_order !== undefined ? exp.sort_order : index,
        }));

        const { error: experiencesError } = await supabase
          .from('professional_experiences')
          .insert(experiencesData);

        if (experiencesError) {
          console.error('Error inserting experiences:', experiencesError);
        }
      }

      // 5. Create availabilities
      if (data.availabilities && data.availabilities.length > 0) {
        const availabilityInserts = data.availabilities.map((av) => ({
          professional_id: professional.id,
          available_at: av.available_at,
          days: av.days || null,
          date: av.date || null,
          start_hour: av.start_hour,
          end_hour: av.end_hour,
          currency: av.currency || 'USD',
          price_per_minute: av.price_per_minute,
        }));

        const { error: availError } = await supabase
          .from('availabilities')
          .insert(availabilityInserts);

        if (availError) {
          console.error('Error creating availabilities:', availError);
        }
      }

      // 6. Update user profile
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          name: data.full_name,
          primary_email: data.email,
          bio: data.bio,
        })
        .eq('auth_id', user.id);

      if (userUpdateError) {
        console.error('Error updating user:', userUpdateError);
      }

      return { success: true, professional };
    } catch (error: any) {
      console.error('Error in createProfessional:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get professional profile by user ID
   */
  async getProfessionalByUserId(userId: string): Promise<{
    success: boolean;
    professional?: any;
    error?: string;
  }> {
    try {
      const { data: professional, error: professionalError } = await supabase
        .from('professionals')
        .select(
          `
          *,
          professional_categories (
            category:categories (
              id,
              name,
              emoji
            )
          ),
          availabilities (*),
          professional_educations (*),
          professional_experiences (*)
        `
        )
        .eq('user_id', userId)
        .single();

      if (professionalError) {
        if (professionalError.code === 'PGRST116') {
          return { success: false, error: 'No professional profile found' };
        }
        console.error('Error fetching professional:', professionalError);
        return { success: false, error: professionalError.message };
      }

      const transformedProfessional = {
        ...professional,
        categories:
          professional.professional_categories?.map((pc: any) => pc.category) ||
          [],
        availabilities: professional.availabilities || [],
        educations: professional.professional_educations || [],
        experiences: professional.professional_experiences || [],
      };

      delete (transformedProfessional as any).professional_categories;

      // Log for debugging
      console.log('[getProfessionalByUserId] Raw data:', {
        hasEducations: !!professional.professional_educations,
        educationsCount: professional.professional_educations?.length || 0,
        hasExperiences: !!professional.professional_experiences,
        experiencesCount: professional.professional_experiences?.length || 0,
      });

      return { success: true, professional: transformedProfessional };
    } catch (error: any) {
      console.error('Error in getProfessionalByUserId:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if user is a professional
   */
  async isProfessional(userId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('professionals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking professional status:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error in isProfessional:', error);
      return false;
    }
  }

  // ============================================================================
  // EDUCATION & EXPERIENCE METHODS
  // ============================================================================

  async getProfessionalEducations(professionalId: string) {
    try {
      const { data, error } = await supabase
        .from('professional_educations')
        .select('*')
        .eq('professional_id', professionalId)
        .order('sort_order', { ascending: true })
        .order('start_year', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching educations:', error);
      throw error;
    }
  }

  async getProfessionalExperiences(professionalId: string) {
    try {
      const { data, error } = await supabase
        .from('professional_experiences')
        .select('*')
        .eq('professional_id', professionalId)
        .order('is_current', { ascending: false })
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching experiences:', error);
      throw error;
    }
  }

  async addEducation(data: ProfessionalEducationInsert) {
    try {
      const { data: education, error } = await supabase
        .from('professional_educations')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return education;
    } catch (error) {
      console.error('Error adding education:', error);
      throw error;
    }
  }

  async addExperience(data: ProfessionalExperienceInsert) {
    try {
      const { data: experience, error } = await supabase
        .from('professional_experiences')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return experience;
    } catch (error) {
      console.error('Error adding experience:', error);
      throw error;
    }
  }

  async updateEducation(
    educationId: string,
    data: Partial<ProfessionalEducationInsert>
  ) {
    try {
      const { data: education, error } = await supabase
        .from('professional_educations')
        .update(data)
        .eq('id', educationId)
        .select()
        .single();

      if (error) throw error;
      return education;
    } catch (error) {
      console.error('Error updating education:', error);
      throw error;
    }
  }

  async updateExperience(
    experienceId: string,
    data: Partial<ProfessionalExperienceInsert>
  ) {
    try {
      const { data: experience, error } = await supabase
        .from('professional_experiences')
        .update(data)
        .eq('id', experienceId)
        .select()
        .single();

      if (error) throw error;
      return experience;
    } catch (error) {
      console.error('Error updating experience:', error);
      throw error;
    }
  }

  async deleteEducation(educationId: string) {
    try {
      const { error } = await supabase
        .from('professional_educations')
        .delete()
        .eq('id', educationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting education:', error);
      throw error;
    }
  }

  async deleteExperience(experienceId: string) {
    try {
      const { error } = await supabase
        .from('professional_experiences')
        .delete()
        .eq('id', experienceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting experience:', error);
      throw error;
    }
  }

  async updatePublicVisibility(
    professionalId: string,
    isPublic: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_public: isPublic })
        .eq('id', professionalId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating public visibility:', error);
      throw error;
    }
  }

  async updateProfessional(
    professionalId: string,
    data: {
      title?: string;
      bio?: string;
      specialties?: string[];
      languages?: string[];
      skills_certifications?: string[];
      rate_per_minute?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('professionals')
        .update(data)
        .eq('id', professionalId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating professional:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const professionalsService = new ProfessionalsService();
