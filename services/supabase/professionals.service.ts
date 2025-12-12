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
   * ✅ UPDATED: Supports pagination with limit and offset
   */
  async getProfessionals(
    categoryId?: string,
    limit?: number,
    offset?: number
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

      // Apply pagination
      if (limit !== undefined) {
        if (offset !== undefined) {
          query = query.range(offset, offset + limit - 1);
        } else {
          query = query.limit(limit);
        }
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
   * ✅ UPDATED: Includes educations and experiences
   */
  async getProfessional(id: string): Promise<ProfessionalWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select(
          `
          *,
          users!inner(id, name, avatar_url, is_verified),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching professional:', error);
        throw error;
      }

      // Fetch educations
      const { data: educations } = await supabase
        .from('professional_educations')
        .select('*')
        .eq('professional_id', id)
        .order('sort_order', { ascending: true })
        .order('end_year', { ascending: false, nullsFirst: false })
        .order('start_year', { ascending: false });

      // Fetch experiences
      const { data: experiences } = await supabase
        .from('professional_experiences')
        .select('*')
        .eq('professional_id', id)
        .order('sort_order', { ascending: true })
        .order('end_date', { ascending: false, nullsFirst: false })
        .order('start_date', { ascending: false });

      return {
        ...data,
        educations: educations || [],
        experiences: experiences || [],
      } as ProfessionalWithRelations;
    } catch (error) {
      console.error('Error in getProfessional:', error);
      throw error;
    }
  }

  /**
   * Search professionals by name or title
   * ✅ UPDATED: Orders by is_featured first, then total_calls
   * ✅ UPDATED: Supports pagination with limit and offset
   */
  async searchProfessionals(
    query: string,
    limit?: number,
    offset?: number
  ): Promise<ProfessionalWithRelations[]> {
    try {
      // Escape special characters for ilike pattern (%, _)
      const escapedQuery = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const searchPattern = `%${escapedQuery}%`;

      // PostgREST or filter syntax issue: % wildcards in ilike patterns within or() filters
      // Workaround: Make two separate queries and combine results (removing duplicates)
      // This is less efficient but works reliably

      // Query 1: Search by title
      const { data: titleData, error: titleError } = await supabase
        .from('professionals')
        .select(
          `
          *,
          users!inner(id, name, avatar_url),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .ilike('title', searchPattern)
        .order('is_featured', { ascending: false })
        .order('total_calls', { ascending: false });

      if (titleError) {
        console.error('Error searching professionals by title:', titleError);
        throw titleError;
      }

      // Query 2: Search by user name
      // First, find users with matching names
      const { data: matchingUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .ilike('name', searchPattern);

      if (usersError) {
        console.error('Error searching users by name:', usersError);
        throw usersError;
      }

      const matchingUserIds = (matchingUsers || []).map((u) => u.id);

      // Then, get professionals for those users
      let nameResults: any[] = [];
      if (matchingUserIds.length > 0) {
        const { data: nameData, error: nameError } = await supabase
          .from('professionals')
          .select(
            `
            *,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, slug, icon_name)
          `
          )
          .eq('is_active', true)
          .in('user_id', matchingUserIds)
          .order('is_featured', { ascending: false })
          .order('total_calls', { ascending: false });

        if (nameError) {
          console.error(
            'Error searching professionals by user name:',
            nameError
          );
          throw nameError;
        }

        nameResults = nameData || [];
      }

      const titleResults = titleData || [];

      // Combine results and remove duplicates by professional id
      const combinedResults = [...titleResults, ...nameResults];
      const uniqueResults = Array.from(
        new Map(combinedResults.map((item) => [item.id, item])).values()
      );

      // Sort combined results
      uniqueResults.sort((a, b) => {
        // Featured first
        if (a.is_featured !== b.is_featured) {
          return a.is_featured ? -1 : 1;
        }
        // Then by total calls
        return (b.total_calls || 0) - (a.total_calls || 0);
      });

      // Apply pagination manually
      let paginatedResults = uniqueResults;
      if (limit !== undefined) {
        const start = offset || 0;
        const end = start + limit;
        paginatedResults = uniqueResults.slice(start, end);
      }

      return paginatedResults as ProfessionalWithRelations[];
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

  /**
   * Get professional by user ID
   */
  async getProfessionalByUserId(userId: string): Promise<{
    success: boolean;
    professional?: ProfessionalWithRelations;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select(
          `
          *,
          users!inner(id, name, avatar_url, is_verified, primary_email),
          categories(id, name, slug, icon_name)
        `
        )
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return { success: false, error: 'Professional not found' };
        }
        console.error('Error fetching professional by user ID:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Professional not found' };
      }

      // Fetch educations
      const { data: educations } = await supabase
        .from('professional_educations')
        .select('*')
        .eq('professional_id', data.id)
        .order('sort_order', { ascending: true })
        .order('end_year', { ascending: false, nullsFirst: false })
        .order('start_year', { ascending: false });

      // Fetch experiences
      const { data: experiences } = await supabase
        .from('professional_experiences')
        .select('*')
        .eq('professional_id', data.id)
        .order('sort_order', { ascending: true })
        .order('end_date', { ascending: false, nullsFirst: false })
        .order('start_date', { ascending: false });

      // Fetch categories
      const { data: categoryLinks } = await supabase
        .from('professional_categories')
        .select('category_id, categories(id, name, slug, icon_name)')
        .eq('professional_id', data.id);

      const categories =
        categoryLinks?.map((link: any) => link.categories).filter(Boolean) ||
        [];

      // Fetch availabilities
      const { data: availabilities } = await supabase
        .from('availabilities')
        .select('*')
        .eq('professional_id', data.id)
        .order('created_at', { ascending: true });

      const professional: ProfessionalWithRelations & {
        availabilities?: Availability[];
      } = {
        ...data,
        educations: educations || [],
        experiences: experiences || [],
        categories: categories,
        availabilities: availabilities || [],
      };

      return { success: true, professional };
    } catch (error: any) {
      console.error('Error in getProfessionalByUserId:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update professional bio
   */
  async updateProfessionalBio(
    professionalId: string,
    bio: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!bio || bio.trim().length < 50) {
        return { success: false, error: 'Bio must be at least 50 characters' };
      }

      if (bio.length > 500) {
        return { success: false, error: 'Bio must be at most 500 characters' };
      }

      const { error } = await supabase
        .from('professionals')
        .update({ bio: bio.trim() })
        .eq('id', professionalId);

      if (error) {
        console.error('Error updating professional bio:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProfessionalBio:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update professional about me (specialties, languages, skills)
   */
  async updateProfessionalAboutMe(
    professionalId: string,
    data: {
      specialties: string[];
      languages: string[];
      skills_certifications: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate languages (required)
      if (!data.languages || data.languages.length === 0) {
        return {
          success: false,
          error: 'At least one language is required',
        };
      }

      // Validate max lengths
      if (data.specialties.length > 10) {
        return {
          success: false,
          error: 'Maximum 10 specialties allowed',
        };
      }

      if (data.languages.length > 8) {
        return {
          success: false,
          error: 'Maximum 8 languages allowed',
        };
      }

      if (data.skills_certifications.length > 15) {
        return {
          success: false,
          error: 'Maximum 15 skills/certifications allowed',
        };
      }

      const { error } = await supabase
        .from('professionals')
        .update({
          specialties: data.specialties,
          languages: data.languages,
          skills_certifications: data.skills_certifications,
        })
        .eq('id', professionalId);

      if (error) {
        console.error('Error updating professional about me:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProfessionalAboutMe:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update professional educations and experiences
   */
  async updateProfessionalEducationExperience(
    professionalId: string,
    data: {
      educations: Array<{
        id?: string;
        degree_level: string;
        institution?: string | null;
        field_of_study?: string | null;
        start_year?: number | null;
        end_year?: number | null;
        is_current: boolean;
        description?: string | null;
      }>;
      experiences: Array<{
        id?: string;
        title?: string | null;
        company?: string | null;
        location?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        is_current: boolean;
        description?: string | null;
      }>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete existing educations and experiences
      await supabase
        .from('professional_educations')
        .delete()
        .eq('professional_id', professionalId);

      await supabase
        .from('professional_experiences')
        .delete()
        .eq('professional_id', professionalId);

      // Insert new educations
      if (data.educations.length > 0) {
        const educationsToInsert = data.educations.map((edu, index) => ({
          professional_id: professionalId,
          degree_level: edu.degree_level,
          institution: edu.institution || null,
          field_of_study: edu.field_of_study || null,
          start_year: edu.start_year || null,
          end_year: edu.is_current ? null : edu.end_year || null,
          is_current: edu.is_current,
          description: edu.description || null,
          sort_order: index,
        }));

        const { error: eduError } = await supabase
          .from('professional_educations')
          .insert(educationsToInsert);

        if (eduError) {
          console.error('Error inserting educations:', eduError);
          return { success: false, error: eduError.message };
        }
      }

      // Insert new experiences
      if (data.experiences.length > 0) {
        const experiencesToInsert = data.experiences.map((exp, index) => ({
          professional_id: professionalId,
          title: exp.title || null,
          company: exp.company || null,
          location: exp.location || null,
          start_date: exp.start_date || null,
          end_date: exp.is_current ? null : exp.end_date || null,
          is_current: exp.is_current,
          description: exp.description || null,
          sort_order: index,
        }));

        const { error: expError } = await supabase
          .from('professional_experiences')
          .insert(experiencesToInsert);

        if (expError) {
          console.error('Error inserting experiences:', expError);
          return { success: false, error: expError.message };
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProfessionalEducationExperience:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update professional categories
   */
  async updateProfessionalCategories(
    professionalId: string,
    categoryIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate at least one category
      if (!categoryIds || categoryIds.length === 0) {
        return {
          success: false,
          error: 'At least one category is required',
        };
      }

      // Delete existing category links
      const { error: deleteError } = await supabase
        .from('professional_categories')
        .delete()
        .eq('professional_id', professionalId);

      if (deleteError) {
        console.error('Error deleting existing categories:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Insert new category links
      const categoryLinks = categoryIds.map((categoryId) => ({
        professional_id: professionalId,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabase
        .from('professional_categories')
        .insert(categoryLinks);

      if (insertError) {
        console.error('Error inserting categories:', insertError);
        return { success: false, error: insertError.message };
      }

      // Update primary category_id in professionals table (use first category)
      const { error: updateError } = await supabase
        .from('professionals')
        .update({ category_id: categoryIds[0] })
        .eq('id', professionalId);

      if (updateError) {
        console.error('Error updating primary category:', updateError);
        // Don't fail the whole operation if this fails
        console.warn('Warning: Failed to update primary category_id');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProfessionalCategories:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update professional availabilities
   */
  async updateProfessionalAvailabilities(
    professionalId: string,
    availabilities: Array<{
      id?: string;
      available_at: 'every' | 'specific' | 'urgent';
      days?: string[] | null;
      date?: string | null;
      start_hour?: string | null;
      end_hour?: string | null;
      price_per_minute: number;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate at least one availability
      if (!availabilities || availabilities.length === 0) {
        return {
          success: false,
          error: 'At least one availability is required',
        };
      }

      // Delete existing availabilities
      const { error: deleteError } = await supabase
        .from('availabilities')
        .delete()
        .eq('professional_id', professionalId);

      if (deleteError) {
        console.error('Error deleting existing availabilities:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Insert new availabilities
      const availabilitiesToInsert = availabilities.map((av) => ({
        professional_id: professionalId,
        available_at: av.available_at,
        days: av.available_at === 'urgent' ? null : av.days || null,
        date: av.available_at === 'urgent' ? null : av.date ? av.date : null,
        start_hour: av.available_at === 'urgent' ? null : av.start_hour || null,
        end_hour: av.available_at === 'urgent' ? null : av.end_hour || null,
        currency: 'USD',
        price_per_minute: av.price_per_minute,
      }));

      const { error: insertError } = await supabase
        .from('availabilities')
        .insert(availabilitiesToInsert);

      if (insertError) {
        console.error('Error inserting availabilities:', insertError);
        return { success: false, error: insertError.message };
      }

      // Update rate_per_minute in professionals table (use first availability's price)
      const { error: updateError } = await supabase
        .from('professionals')
        .update({ rate_per_minute: availabilities[0].price_per_minute })
        .eq('id', professionalId);

      if (updateError) {
        console.error('Error updating rate_per_minute:', updateError);
        // Don't fail the whole operation if this fails
        console.warn('Warning: Failed to update rate_per_minute');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProfessionalAvailabilities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update professional status and visibility
   */
  async updateProfessionalStatus(
    professionalId: string,
    data: {
      is_available: boolean;
      is_public: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          is_available: data.is_available,
          is_public: data.is_public,
        })
        .eq('id', professionalId);

      if (error) {
        console.error('Error updating professional status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProfessionalStatus:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete professional profile (soft delete)
   * This removes all professional data but keeps the user account active
   */
  async deleteProfessional(
    professionalId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting professional profile:', professionalId);

      // Delete related data first (cascading deletes)
      // 1. Delete professional feeds
      const { error: feedsError } = await supabase
        .from('professional_feeds')
        .delete()
        .eq('professional_id', professionalId);

      if (feedsError) {
        console.error('Error deleting feeds:', feedsError);
        return { success: false, error: feedsError.message };
      }

      // 2. Delete availabilities
      const { error: availabilitiesError } = await supabase
        .from('availabilities')
        .delete()
        .eq('professional_id', professionalId);

      if (availabilitiesError) {
        console.error('Error deleting availabilities:', availabilitiesError);
        return { success: false, error: availabilitiesError.message };
      }

      // 3. Delete professional categories
      const { error: categoriesError } = await supabase
        .from('professional_categories')
        .delete()
        .eq('professional_id', professionalId);

      if (categoriesError) {
        console.error('Error deleting categories:', categoriesError);
        return { success: false, error: categoriesError.message };
      }

      // 4. Delete professional educations
      const { error: educationsError } = await supabase
        .from('professional_educations')
        .delete()
        .eq('professional_id', professionalId);

      if (educationsError) {
        console.error('Error deleting educations:', educationsError);
        return { success: false, error: educationsError.message };
      }

      // 5. Delete professional experiences
      const { error: experiencesError } = await supabase
        .from('professional_experiences')
        .delete()
        .eq('professional_id', professionalId);

      if (experiencesError) {
        console.error('Error deleting experiences:', experiencesError);
        return { success: false, error: experiencesError.message };
      }

      // 6. Finally, delete the professional record
      const { error: professionalError } = await supabase
        .from('professionals')
        .delete()
        .eq('id', professionalId);

      if (professionalError) {
        console.error('Error deleting professional:', professionalError);
        return { success: false, error: professionalError.message };
      }

      console.log('✅ Professional profile deleted successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteProfessional:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // REST OF THE SERVICE METHODS
  // ============================================================================
  // Add your other methods here (createProfessional, etc.)
  // They remain unchanged from your original service
}

export const professionalsService = new ProfessionalsService();
