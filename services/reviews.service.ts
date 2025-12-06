import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import type {
  Review,
  ReviewWithUser,
  ReviewInsert,
  ReviewUpdate,
  CallStatus,
} from '../types/database.types';

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

class ReviewsService {
  /**
   * Get reviews for a professional
   */
  async getProfessionalReviews(
    professionalId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ReviewWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          *,
          users!reviewer_id(id, name, avatar_url)
        `
        )
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching reviews:', error);
        throw new Error(`Failed to fetch reviews: ${error.message}`);
      }

      return (data || []) as ReviewWithUser[];
    } catch (error) {
      console.error('Error in getProfessionalReviews:', error);
      return [];
    }
  }

  /**
   * Get user's reviews (reviews they've written)
   */
  async getUserReviews(
    limit: number = 20,
    offset: number = 0
  ): Promise<ReviewWithUser[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          *,
          users!reviewer_id(id, name, avatar_url)
        `
        )
        .eq('reviewer_id', currentUser.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching user reviews:', error);
        throw new Error(`Failed to fetch user reviews: ${error.message}`);
      }

      return (data || []) as ReviewWithUser[];
    } catch (error) {
      console.error('Error in getUserReviews:', error);
      return [];
    }
  }

  /**
   * Create a new review
   */
  async createReview(
    professionalId: string,
    callId: string,
    rating: number,
    comment?: string
  ): Promise<ReviewWithUser | null> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if user already reviewed this call
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('call_id', callId)
        .single();

      if (existingReview) {
        throw new Error('You have already reviewed this call');
      }

      // Verify the call belongs to the user and is completed
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('id, status, caller_id, professional_id')
        .eq('id', callId)
        .single();

      if (callError || !call) {
        throw new Error('Call not found');
      }

      if (call.caller_id !== currentUser.id) {
        throw new Error('You can only review your own calls');
      }

      if (call.status !== 'completed') {
        throw new Error('You can only review completed calls');
      }

      if (call.professional_id !== professionalId) {
        throw new Error('Professional ID mismatch');
      }

      const reviewData: ReviewInsert = {
        professional_id: professionalId,
        reviewer_id: currentUser.id,
        call_id: callId,
        rating,
        comment: comment || null,
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select(
          `
          *,
          users!reviewer_id(id, name, avatar_url)
        `
        )
        .single();

      if (error) {
        console.error('Error creating review:', error);
        throw new Error(`Failed to create review: ${error.message}`);
      }

      return data as ReviewWithUser;
    } catch (error) {
      console.error('Error in createReview:', error);
      throw error;
    }
  }

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    rating: number,
    comment?: string
  ): Promise<ReviewWithUser | null> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const updateData: ReviewUpdate = {
        rating,
        comment: comment || null,
      };

      const { data, error } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', reviewId)
        .eq('reviewer_id', currentUser.id) // Ensure user owns the review
        .select(
          `
          *,
          users!reviewer_id(id, name, avatar_url)
        `
        )
        .single();

      if (error) {
        console.error('Error updating review:', error);
        throw new Error(`Failed to update review: ${error.message}`);
      }

      return data as ReviewWithUser;
    } catch (error) {
      console.error('Error in updateReview:', error);
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', currentUser.id);

      if (error) {
        console.error('Error deleting review:', error);
        throw new Error(`Failed to delete review: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteReview:', error);
      throw error;
    }
  }

  /**
   * Get review statistics for a professional
   */
  async getReviewStats(professionalId: string): Promise<ReviewStats> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('professional_id', professionalId);

      if (error) {
        console.error('Error fetching review stats:', error);
        throw new Error(`Failed to fetch review stats: ${error.message}`);
      }

      const reviews = data || [];
      const totalReviews = reviews.length;

      if (totalReviews === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
          },
        };
      }

      const ratingDistribution = {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      };

      const averageRating =
        reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        ratingDistribution,
      };
    } catch (error) {
      console.error('Error in getReviewStats:', error);
      throw error;
    }
  }

  /**
   * Check if user can review a professional
   * (Must have completed a call with them and not reviewed it yet)
   */
  async canReview(professionalId: string, callId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return false;
      }

      // Check if call exists and is completed
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('id, status, caller_id, professional_id')
        .eq('id', callId)
        .eq('caller_id', currentUser.id)
        .eq('professional_id', professionalId)
        .eq('status', 'completed')
        .single();

      if (callError || !call) {
        return false;
      }

      // Check if already reviewed
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('call_id', callId)
        .single();

      return !existingReview;
    } catch (error) {
      console.error('Error in canReview:', error);
      return false;
    }
  }

  /**
   * Get review by call ID
   */
  async getReviewByCallId(callId: string): Promise<ReviewWithUser | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          *,
          users!reviewer_id(id, name, avatar_url)
        `
        )
        .eq('call_id', callId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        console.error('Error fetching review by call:', error);
      }

      return (data as ReviewWithUser) || null;
    } catch (error) {
      console.error('Error in getReviewByCallId:', error);
      return null;
    }
  }

  /**
   * Get average rating for a professional (quick lookup)
   */
  async getAverageRating(professionalId: string): Promise<number> {
    try {
      const stats = await this.getReviewStats(professionalId);
      return stats.averageRating;
    } catch (error) {
      console.error('Error in getAverageRating:', error);
      return 0;
    }
  }

  /**
   * Get total review count for a professional
   */
  async getReviewCount(professionalId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', professionalId);

      if (error) {
        console.error('Error getting review count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getReviewCount:', error);
      return 0;
    }
  }

  /**
   * Get recent reviews across all professionals (for admin/analytics)
   */
  async getRecentReviews(limit: number = 10): Promise<ReviewWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          *,
          users!reviewer_id(id, name, avatar_url)
        `
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent reviews:', error);
        return [];
      }

      return (data || []) as ReviewWithUser[];
    } catch (error) {
      console.error('Error in getRecentReviews:', error);
      return [];
    }
  }

  /**
   * Check if user has reviewed a specific professional (any call)
   */
  async hasReviewedProfessional(professionalId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return false;
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('professional_id', professionalId)
        .eq('reviewer_id', currentUser.id)
        .limit(1);

      if (error) {
        console.error('Error checking if reviewed:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error in hasReviewedProfessional:', error);
      return false;
    }
  }
}

// Export singleton instance
export const reviewsService = new ReviewsService();
