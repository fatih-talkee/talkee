// hooks/useReviews.ts
// React Query hooks for review management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsService, type Review } from '@/services';
import { handleError } from '@/lib/errorHandler';

/**
 * Get reviews for a professional
 */
export function useProfessionalReviews(
  professionalId: string,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['reviews', 'professional', professionalId, limit, offset],
    queryFn: async () => {
      try {
        const reviews = await reviewsService.getProfessionalReviews(
          professionalId,
          limit,
          offset
        );
        return reviews;
      } catch (error) {
        handleError(error, {
          showToast: true,
          title: 'Failed to fetch reviews',
        });
        throw error;
      }
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Create a new review
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      professionalId,
      rating,
      comment,
      callId,
    }: {
      professionalId: string;
      rating: number;
      comment: string;
      callId?: string;
    }) => {
      const review = await reviewsService.createReview(
        professionalId,
        rating,
        comment,
        callId
      );
      return review;
    },
    onSuccess: (data, variables) => {
      // Invalidate reviews for this professional
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'professional', variables.professionalId],
      });
      // Invalidate call if callId provided
      if (variables.callId) {
        queryClient.invalidateQueries({
          queryKey: ['calls', variables.callId],
        });
      }
    },
    onError: (error) => {
      handleError(error, { showToast: true, title: 'Failed to submit review' });
    },
  });
}

/**
 * Get user's reviews
 */
export function useUserReviews(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['reviews', 'user', limit, offset],
    queryFn: async () => {
      try {
        const reviews = await reviewsService.getUserReviews(limit, offset);
        return reviews;
      } catch (error) {
        handleError(error, {
          showToast: true,
          title: 'Failed to fetch your reviews',
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
