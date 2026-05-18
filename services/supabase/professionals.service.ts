import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type {
  Professional,
  ProfessionalWithRelations,
  Category,
  ProfessionalEducationInsert,
  ProfessionalExperienceInsert,
  Availability,
} from '@/types/database.types';
import type { FilterState } from '@/components/filters/FilterModal';

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
    const startTime = Date.now();
    logger.info('[ProfessionalsService] 🔍 getProfessionals started', {
      categoryId,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Only select fields needed for list display (not all professional data)
      let query = supabase
        .from('professionals')
        .select(
          `
          id,
          category_id,
          title,
          profession,
          rate_per_minute,
          is_featured,
          is_active,
          is_available,
          total_calls,
          specialties,
          users(id, name, avatar_url, is_verified),
          categories(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .eq('is_public', true) // ✅ Only show public profiles
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

      const queryStartTime = Date.now();
      const { data, error } = await query;
      const queryElapsed = Date.now() - queryStartTime;
      const totalDuration = Date.now() - startTime;

      if (error) {
        logger.error(
          '[ProfessionalsService] ❌ Error fetching professionals',
          error,
          {
            categoryId,
            limit,
            offset,
            duration: `${totalDuration}ms`,
            queryElapsed: `${queryElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw error;
      }

      logger.info('[ProfessionalsService] ✅ getProfessionals completed', {
        categoryId,
        limit,
        offset,
        duration: `${totalDuration}ms`,
        queryElapsed: `${queryElapsed}ms`,
        count: data?.length || 0,
        timestamp: new Date().toISOString(),
      });

      return (data || []) as unknown as ProfessionalWithRelations[];
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error(
        '[ProfessionalsService] ❌ Error in getProfessionals',
        error,
        {
          categoryId,
          limit,
          offset,
          duration: `${totalDuration}ms`,
          timestamp: new Date().toISOString(),
        }
      );
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
    const startTime = Date.now();
    logger.info('[ProfessionalsService] 🔍 getAvailableProfessionals started', {
      categoryId,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Only select fields needed for list display
      let query = supabase
        .from('professionals')
        .select(
          `
          id,
          category_id,
          title,
          profession,
          rate_per_minute,
          is_featured,
          is_active,
          is_available,
          total_calls,
          specialties,
          users!inner(id, name, avatar_url, is_verified),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .eq('is_available', true)
        .eq('is_public', true) // ✅ Only show public profiles
        .order('is_featured', { ascending: false }) // ✅ Featured first
        .order('total_calls', { ascending: false }); // ✅ Then by popularity

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const queryStartTime = Date.now();
      const { data, error } = await query;
      const queryElapsed = Date.now() - queryStartTime;
      const totalDuration = Date.now() - startTime;

      if (error) {
        logger.error(
          '[ProfessionalsService] ❌ Error fetching available professionals',
          error,
          {
            categoryId,
            duration: `${totalDuration}ms`,
            queryElapsed: `${queryElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw error;
      }

      logger.info(
        '[ProfessionalsService] ✅ getAvailableProfessionals completed',
        {
          categoryId,
          duration: `${totalDuration}ms`,
          queryElapsed: `${queryElapsed}ms`,
          count: data?.length || 0,
          timestamp: new Date().toISOString(),
        }
      );

      return (data || []) as unknown as ProfessionalWithRelations[];
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error(
        '[ProfessionalsService] ❌ Error in getAvailableProfessionals',
        error,
        {
          categoryId,
          duration: `${totalDuration}ms`,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Get a single professional by ID
   * ✅ OPTIMIZED: Fetches educations and experiences in parallel
   */
  async getProfessional(id: string): Promise<ProfessionalWithRelations | null> {
    const startTime = Date.now();
    logger.info('[ProfessionalsService] 🔍 getProfessional started', {
      professionalId: id,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Fetch all data in parallel including availabilities
      const [
        professionalResult,
        educationsResult,
        experiencesResult,
        categoryLinksResult,
        availabilitiesResult,
      ] = await Promise.all([
        supabase
          .from('professionals')
          .select(
            `
            *,
            users!inner(id, name, avatar_url, is_verified),
            categories!inner(id, name, slug, icon_name)
          `
          )
          .eq('id', id)
          .single(),
        supabase
          .from('professional_educations')
          .select('*')
          .eq('professional_id', id)
          .order('sort_order', { ascending: true })
          .order('end_year', { ascending: false, nullsFirst: false })
          .order('start_year', { ascending: false }),
        supabase
          .from('professional_experiences')
          .select('*')
          .eq('professional_id', id)
          .order('sort_order', { ascending: true })
          .order('end_date', { ascending: false, nullsFirst: false })
          .order('start_date', { ascending: false }),
        supabase
          .from('professional_categories')
          .select('category_id, categories(id, name, slug, icon_name)')
          .eq('professional_id', id),
        supabase
          .from('availabilities')
          .select('*')
          .eq('professional_id', id)
          .order('created_at', { ascending: true }),
      ]);

      const elapsed = Date.now() - startTime;

      if (professionalResult.error) {
        logger.error('[ProfessionalsService] Error fetching professional', {
          error: professionalResult.error.message,
          professionalId: id,
          elapsed: `${elapsed}ms`,
        });
        throw professionalResult.error;
      }

      // Transform categoryLinks to categories array
      const categories =
        categoryLinksResult.data
          ?.map((link: any) => link.categories)
          .filter(Boolean) || [];

      const result = {
        ...professionalResult.data,
        educations: educationsResult.data || [],
        experiences: experiencesResult.data || [],
        categories: categories,
        availabilities: (availabilitiesResult.data || []) as Availability[],
      } as ProfessionalWithRelations & { availabilities?: Availability[] };

      logger.info('[ProfessionalsService] ✅ getProfessional completed', {
        professionalId: id,
        elapsed: `${elapsed}ms`,
        hasEducations: (educationsResult.data || []).length > 0,
        hasExperiences: (experiencesResult.data || []).length > 0,
        hasCategories: categories.length > 0,
        hasAvailabilities: (availabilitiesResult.data || []).length > 0,
      });

      return result as ProfessionalWithRelations;
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      logger.error('[ProfessionalsService] Error in getProfessional', error, {
        error: error?.message || String(error),
        professionalId: id,
        elapsed: `${elapsed}ms`,
      });
      throw error;
    }
  }

  private applySearchFilters(queryBuilder: any, filters?: Partial<FilterState>) {
    if (!filters) return queryBuilder;
    let q = queryBuilder;
    if (filters.priceRange && filters.priceRange.length === 2) {
      q = q.gte('rate_per_minute', filters.priceRange[0]).lte('rate_per_minute', filters.priceRange[1]);
    }
    if (filters.availability === 'online' || filters.availability === 'urgent-call') {
      q = q.eq('is_available', true);
    }
    if (filters.featured) {
      q = q.eq('is_featured', true);
    }
    if (filters.categories && filters.categories.length > 0) {
      q = q.in('category_id', filters.categories);
    }
    if (filters.languages && filters.languages.length > 0) {
      q = q.contains('languages', filters.languages);
    }
    if (filters.specialties && filters.specialties.length > 0) {
      q = q.contains('specialties', filters.specialties);
    }
    if (filters.skills && filters.skills.length > 0) {
      q = q.contains('skills_certifications', filters.skills);
    }
    return q;
  }

  /**
   * Search professionals by name or title, and optional filters
   * ✅ OPTIMIZED: Parallel queries if string is passed
   * ✅ OPTIMIZED: Supports pagination with limit and offset
   */
  async searchProfessionals(
    query: string,
    filtersParam?: Partial<FilterState>,
    limit?: number,
    offset?: number
  ): Promise<ProfessionalWithRelations[]> {
    const startTime = Date.now();
    logger.info('[ProfessionalsService] 🔍 searchProfessionals started', {
      query: query.substring(0, 50),
      hasFilters: !!filtersParam,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!query.trim()) {
        let baseQuery = supabase
          .from('professionals')
          .select(
            `
            id,
            category_id,
            title,
            profession,
            rate_per_minute,
            is_featured,
            is_active,
            is_available,
            total_calls,
            specialties,
            users!inner(id, name, avatar_url, is_verified),
            categories!inner(id, name, slug, icon_name)
          `
          )
          .eq('is_active', true)
          .eq('is_public', true);
          
        baseQuery = this.applySearchFilters(baseQuery, filtersParam)
          .order('is_featured', { ascending: false })
          .order('total_calls', { ascending: false });

        if (limit !== undefined) {
          const start = offset || 0;
          baseQuery = baseQuery.range(start, start + limit - 1);
        }

        const { data, error } = await baseQuery;
        if (error) throw error;
        return (data || []) as unknown as ProfessionalWithRelations[];
      }

      const escapedQuery = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const searchPattern = `%${escapedQuery}%`;

      // Query 1: Search by title
      let titleQuery = supabase
        .from('professionals')
        .select(
          `
          id,
          category_id,
          title,
          profession,
          rate_per_minute,
          is_featured,
          is_active,
          is_available,
          total_calls,
          specialties,
          users!inner(id, name, avatar_url, is_verified),
          categories!inner(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .eq('is_public', true)
        .ilike('title', searchPattern);

      titleQuery = this.applySearchFilters(titleQuery, filtersParam)
        .order('is_featured', { ascending: false })
        .order('total_calls', { ascending: false });

      // Query 2: Search by user name (find matching users first)
      const usersQuery = supabase
        .from('users')
        .select('id')
        .ilike('name', searchPattern);

      const queryStartTime = Date.now();
      const [titleResult, usersResult] = await Promise.all([
        titleQuery,
        usersQuery,
      ]);
      const queryElapsed = Date.now() - queryStartTime;

      if (titleResult.error) {
        logger.error('[ProfessionalsService] ❌ Error searching by title', titleResult.error);
        throw titleResult.error;
      }

      if (usersResult.error) {
        logger.error('[ProfessionalsService] ❌ Error searching users', usersResult.error);
        throw usersResult.error;
      }

      const matchingUserIds = (usersResult.data || []).map((u) => u.id);
      const titleResults = titleResult.data || [];

      let nameResults: any[] = [];
      let nameQueryElapsed = 0;
      if (matchingUserIds.length > 0) {
        const nameQueryStartTime = Date.now();
        let nameQuery = supabase
          .from('professionals')
          .select(
            `
            id,
            category_id,
            title,
            profession,
            rate_per_minute,
            is_featured,
            is_active,
            is_available,
            total_calls,
            specialties,
            users!inner(id, name, avatar_url, is_verified),
            categories!inner(id, name, slug, icon_name)
          `
          )
          .eq('is_active', true)
          .eq('is_public', true)
          .in('user_id', matchingUserIds);

        nameQuery = this.applySearchFilters(nameQuery, filtersParam)
          .order('is_featured', { ascending: false })
          .order('total_calls', { ascending: false });

        const { data: nameData, error: nameError } = await nameQuery;
        nameQueryElapsed = Date.now() - nameQueryStartTime;

        if (nameError) {
          logger.error('[ProfessionalsService] ❌ Error searching by name', nameError);
          throw nameError;
        }

        nameResults = nameData || [];
      }

      const combinedResults = [...titleResults, ...nameResults];
      const uniqueResults = Array.from(
        new Map(combinedResults.map((item) => [item.id, item])).values()
      );

      uniqueResults.sort((a, b) => {
        if (a.is_featured !== b.is_featured) {
          return a.is_featured ? -1 : 1;
        }
        return (b.total_calls || 0) - (a.total_calls || 0);
      });

      let paginatedResults = uniqueResults;
      if (limit !== undefined) {
        const start = offset || 0;
        const end = start + limit;
        paginatedResults = uniqueResults.slice(start, end);
      }

      const totalDuration = Date.now() - startTime;
      logger.info('[ProfessionalsService] ✅ searchProfessionals completed', {
        query: query.substring(0, 50),
        duration: `${totalDuration}ms`,
        queryElapsed: `${queryElapsed}ms`,
        nameQueryElapsed: `${nameQueryElapsed}ms`,
        paginatedResultsCount: paginatedResults.length,
        timestamp: new Date().toISOString(),
      });

      return paginatedResults as unknown as ProfessionalWithRelations[];
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error(
        '[ProfessionalsService] ❌ Error in searchProfessionals',
        error,
        {
          query: query.substring(0, 50),
          duration: `${totalDuration}ms`,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Get featured professionals from database
   * ✅ OPTIMIZED: Removed timeout wrapper (Supabase client already has timeout)
   * ✅ OPTIMIZED: Uses proper indexes (requires migration)
   */
  async getFeaturedProfessionals(
    limit: number = 10,
    categoryId?: string
  ): Promise<ProfessionalWithRelations[]> {
    const startTime = Date.now();

    logger.info('[ProfessionalsService] 🔍 getFeaturedProfessionals started', {
      limit,
      categoryId,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Build query with proper filter order (matches index)
      // ✅ OPTIMIZED: Only select fields needed for list display (not all professional data)
      let query = supabase
        .from('professionals')
        .select(
          `
          id,
          category_id,
          title,
          profession,
          rate_per_minute,
          is_featured,
          is_active,
          is_available,
          total_calls,
          users(id, name, avatar_url, is_verified),
          categories(id, name, slug, icon_name)
        `
        )
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_featured', true)
        .order('total_calls', { ascending: false })
        .limit(limit);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      logger.info(
        '[ProfessionalsService] 📊 Executing featured professionals query...',
        {
          limit,
          categoryId,
          filters: {
            is_active: true,
            is_public: true,
            is_featured: true,
            ...(categoryId && { category_id: categoryId }),
          },
          orderBy: 'total_calls DESC',
          timestamp: new Date().toISOString(),
        }
      );

      const queryStartTime = Date.now();
      const { data, error } = await query;
      const queryElapsed = Date.now() - queryStartTime;

      const duration = Date.now() - startTime;

      if (error) {
        logger.error(
          '[ProfessionalsService] ❌ Error fetching featured professionals',
          error,
          {
            duration: `${duration}ms`,
            limit,
            categoryId,
          }
        );
        throw error;
      }

      logger.info(
        '[ProfessionalsService] ✅ getFeaturedProfessionals completed',
        {
          duration: `${duration}ms`,
          queryElapsed: `${queryElapsed}ms`,
          count: data?.length || 0,
          limit,
          categoryId,
          hasData: !!data,
          dataLength: data?.length || 0,
          timestamp: new Date().toISOString(),
        }
      );

      return (data || []) as unknown as ProfessionalWithRelations[];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(
        '[ProfessionalsService] ❌ Error in getFeaturedProfessionals',
        error,
        {
          duration: `${duration}ms`,
          limit,
          categoryId,
          errorMessage: error?.message || String(error),
          errorCode: (error as any)?.code,
          errorDetails: (error as any)?.details,
          errorHint: (error as any)?.hint,
          timestamp: new Date().toISOString(),
        }
      );
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

      // ✅ OPTIMIZED: Fetch all related data in parallel instead of sequential
      const [
        educationsResult,
        experiencesResult,
        categoryLinksResult,
        availabilitiesResult,
      ] = await Promise.all([
        supabase
          .from('professional_educations')
          .select('*')
          .eq('professional_id', data.id)
          .order('sort_order', { ascending: true })
          .order('end_year', { ascending: false, nullsFirst: false })
          .order('start_year', { ascending: false }),
        supabase
          .from('professional_experiences')
          .select('*')
          .eq('professional_id', data.id)
          .order('sort_order', { ascending: true })
          .order('end_date', { ascending: false, nullsFirst: false })
          .order('start_date', { ascending: false }),
        supabase
          .from('professional_categories')
          .select('category_id, categories(id, name, slug, icon_name)')
          .eq('professional_id', data.id),
        supabase
          .from('availabilities')
          .select('*')
          .eq('professional_id', data.id)
          .order('created_at', { ascending: true }),
      ]);

      const categories =
        categoryLinksResult.data
          ?.map((link: any) => link.categories)
          .filter(Boolean) || [];

      const professional: ProfessionalWithRelations & {
        availabilities?: Availability[];
      } = {
        ...data,
        educations: educationsResult.data || [],
        experiences: experiencesResult.data || [],
        categories: categories,
        availabilities: availabilitiesResult.data || [],
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
   * Calculate rate_per_minute from availabilities
   * Priority: 1) Lowest recurring (every) price, 2) Lowest specific date price, 3) Urgent price
   */
  private calculateRatePerMinute(
    availabilities: Array<{
      available_at: 'every' | 'specific' | 'urgent';
      price_per_minute: number;
    }>
  ): number {
    if (!availabilities || availabilities.length === 0) {
      return 0;
    }

    // Priority 1: Recurring (every) - lowest price (standard rate)
    const recurringPrices = availabilities
      .filter((av) => av.available_at === 'every')
      .map((av) => av.price_per_minute);

    // Priority 2: Specific date - lowest price
    const specificPrices = availabilities
      .filter((av) => av.available_at === 'specific')
      .map((av) => av.price_per_minute);

    // Priority 3: Urgent price (last resort)
    const urgentPrice = availabilities.find(
      (av) => av.available_at === 'urgent'
    )?.price_per_minute;

    if (recurringPrices.length > 0) {
      // Use lowest recurring price (standard rate)
      return Math.min(...recurringPrices);
    } else if (specificPrices.length > 0) {
      // Fallback to lowest specific date price
      return Math.min(...specificPrices);
    } else if (urgentPrice) {
      // Last resort: urgent price
      return urgentPrice;
    }

    // Fallback: first availability's price
    return availabilities[0].price_per_minute;
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
      video_call_enabled?: boolean;
      video_call_rate_per_minute?: number | null;
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
        video_call_enabled: av.video_call_enabled || false,
        video_call_rate_per_minute:
          av.video_call_enabled && av.video_call_rate_per_minute
            ? av.video_call_rate_per_minute
            : null,
      }));

      const { error: insertError } = await supabase
        .from('availabilities')
        .insert(availabilitiesToInsert);

      if (insertError) {
        console.error('Error inserting availabilities:', insertError);
        return { success: false, error: insertError.message };
      }

      // Calculate rate_per_minute using helper function
      const calculatedRatePerMinute =
        this.calculateRatePerMinute(availabilities);

      // Update rate_per_minute in professionals table
      const { error: updateError } = await supabase
        .from('professionals')
        .update({ rate_per_minute: calculatedRatePerMinute })
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

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteProfessional:', error);
      return { success: false, error: error.message };
    }
  }
}

export const professionalsService = new ProfessionalsService();
