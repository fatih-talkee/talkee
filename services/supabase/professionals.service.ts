import { supabase } from '../../lib/supabase';
import type {
  ProfessionalWithRelations,
  ProfessionalFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../types/database.types';

class ProfessionalsService {
  /**
   * Get all professionals with optional filters and pagination
   */
  async getProfessionals(
    filters?: ProfessionalFilters,
    pagination?: PaginationParams
  ): Promise<
    ProfessionalWithRelations[] | PaginatedResponse<ProfessionalWithRelations>
  > {
    let query = supabase.from('professionals').select(
      `
        *,
        users!inner(id, name, avatar_url),
        categories!inner(id, name, slug, icon_name)
      `,
      pagination ? { count: 'exact' } : undefined
    );

    // Apply filters
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.minRating !== undefined) {
      query = query.gte('average_rating', filters.minRating);
    }

    if (filters?.maxRatePerMinute !== undefined) {
      query = query.lte('rate_per_minute', filters.maxRatePerMinute);
    }

    if (filters?.isAvailable !== undefined) {
      query = query.eq('is_available', filters.isAvailable);
    }

    if (filters?.isVerified !== undefined) {
      query = query.eq('is_verified', filters.isVerified);
    }

    if (filters?.languages && filters.languages.length > 0) {
      query = query.contains('languages', filters.languages);
    }

    // Full-text search on bio (if searchQuery provided)
    if (filters?.searchQuery) {
      query = query.ilike('bio', `%${filters.searchQuery}%`);
    }

    // Apply pagination
    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);
    }

    // Default sorting
    query = query.order('average_rating', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch professionals: ${error.message}`);
    }

    // Return paginated response if pagination params provided
    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const total = count || 0;

      return {
        data: (data || []) as ProfessionalWithRelations[],
        total,
        page,
        limit,
        hasMore: total > page * limit,
      };
    }

    // Return plain array if no pagination
    return (data || []) as ProfessionalWithRelations[];
  }

  /**
   * Get single professional by ID with full details including reviews
   */
  async getProfessional(id: string): Promise<ProfessionalWithRelations | null> {
    // Get professional with user and category
    const { data: professional, error: professionalError } = await supabase
      .from('professionals')
      .select(
        `
        *,
        users!inner(id, name, avatar_url, email),
        categories!inner(id, name, slug, icon_name)
      `
      )
      .eq('id', id)
      .single();

    if (professionalError) {
      console.error('Error fetching professional:', professionalError);
      throw new Error(
        `Failed to fetch professional: ${professionalError.message}`
      );
    }

    if (!professional) {
      return null;
    }

    // Get reviews separately with reviewer info
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        users!reviewer_id(name, avatar_url)
      `
      )
      .eq('professional_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
    }

    return {
      ...professional,
      reviews: reviews || [],
    } as ProfessionalWithRelations;
  }

  /**
   * Get featured professionals (verified, high rating, available)
   */
  async getFeaturedProfessionals(
    limit: number = 10
  ): Promise<ProfessionalWithRelations[]> {
    const { data, error } = await supabase
      .from('professionals')
      .select(
        `
        *,
        users!inner(id, name, avatar_url),
        categories!inner(id, name, slug, icon_name)
      `
      )
      .eq('is_verified', true)
      .gte('average_rating', 4.5)
      .eq('is_available', true)
      .order('average_rating', { ascending: false })
      .order('total_calls', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured professionals:', error);
      throw new Error(
        `Failed to fetch featured professionals: ${error.message}`
      );
    }

    return (data || []) as ProfessionalWithRelations[];
  }

  /**
   * Search professionals by query (searches in bio and name)
   */
  async searchProfessionals(
    query: string,
    limit: number = 20
  ): Promise<ProfessionalWithRelations[]> {
    const searchFilters: ProfessionalFilters = {
      searchQuery: query,
    };

    const result = await this.getProfessionals(searchFilters, {
      limit,
      page: 1,
    });

    // If result is paginated, return data array
    if ('data' in result) {
      return result.data;
    }

    return result;
  }

  /**
   * Check if professional is available for calls
   */
  async checkAvailability(professionalId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('professionals')
      .select('is_available')
      .eq('id', professionalId)
      .single();

    if (error) {
      console.error('Error checking availability:', error);
      return false;
    }

    return data?.is_available || false;
  }

  /**
   * Get total professionals count (for pagination info)
   */
  async getTotalCount(filters?: ProfessionalFilters): Promise<number> {
    let query = supabase
      .from('professionals')
      .select('*', { count: 'exact', head: true });

    // Apply same filters as getProfessionals
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.minRating !== undefined) {
      query = query.gte('average_rating', filters.minRating);
    }

    if (filters?.maxRatePerMinute !== undefined) {
      query = query.lte('rate_per_minute', filters.maxRatePerMinute);
    }

    if (filters?.isAvailable !== undefined) {
      query = query.eq('is_available', filters.isAvailable);
    }

    if (filters?.isVerified !== undefined) {
      query = query.eq('is_verified', filters.isVerified);
    }

    if (filters?.languages && filters.languages.length > 0) {
      query = query.contains('languages', filters.languages);
    }

    if (filters?.searchQuery) {
      query = query.ilike('bio', `%${filters.searchQuery}%`);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get professionals by category
   */
  async getProfessionalsByCategory(
    categoryId: string,
    limit: number = 20
  ): Promise<ProfessionalWithRelations[]> {
    const result = await this.getProfessionals(
      { categoryId },
      { limit, page: 1 }
    );

    if ('data' in result) {
      return result.data;
    }

    return result;
  }

  /**
   * Get online professionals (available now)
   */
  async getOnlineProfessionals(
    limit: number = 20
  ): Promise<ProfessionalWithRelations[]> {
    const result = await this.getProfessionals(
      { isAvailable: true },
      { limit, page: 1 }
    );

    if ('data' in result) {
      return result.data;
    }

    return result;
  }

  /**
   * Get verified professionals
   */
  async getVerifiedProfessionals(
    limit: number = 20
  ): Promise<ProfessionalWithRelations[]> {
    const result = await this.getProfessionals(
      { isVerified: true },
      { limit, page: 1 }
    );

    if ('data' in result) {
      return result.data;
    }

    return result;
  }

  /**
   * Get professional's review statistics
   */
  async getProfessionalStats(professionalId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }> {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('professional_id', professionalId);

    if (error) {
      throw new Error(`Failed to fetch review stats: ${error.message}`);
    }

    const totalReviews = reviews?.length || 0;

    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate average rating
    const averageRating =
      reviews.reduce(
        (sum: number, r: { rating: number }) => sum + r.rating,
        0
      ) / totalReviews;

    // Calculate rating distribution
    const ratingDistribution = reviews.reduce(
      (acc: Record<number, number>, review: { rating: number }) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    // Ensure all ratings 1-5 are present
    [1, 2, 3, 4, 5].forEach((rating) => {
      if (!ratingDistribution[rating]) {
        ratingDistribution[rating] = 0;
      }
    });

    return {
      averageRating: Number(averageRating.toFixed(2)),
      totalReviews,
      ratingDistribution,
    };
  }
}

// Export singleton instance
export const professionalsService = new ProfessionalsService();
