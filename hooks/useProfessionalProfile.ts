// hooks/useProfessionalProfile.ts
// React Query hooks for professional profile data

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { professionalsService } from '@/services/supabase';
import { useFavorites, useIsFavorite } from './useFavorites';

/**
 * Get professional profile by ID
 */
export function useProfessionalProfile(professionalId: string) {
  return useQuery({
    queryKey: ['professionals', professionalId],
    queryFn: async () => {
      try {
        const professional = await professionalsService.getProfessional(professionalId);
        if (!professional) {
          throw new Error('Professional not found');
        }
        return professional;
      } catch (error) {
        handleError(error, 'Failed to fetch professional profile');
        throw error;
      }
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 5, // 5 minutes (profiles don't change often)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Get professional availability
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalAvailability(professionalId: string) {
  return useQuery({
    queryKey: ['professionals', professionalId, 'availability'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      logger.info('Fetching professional availability', { professionalId });
      return Promise.resolve([]);
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Get professional posts/feed
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalPosts(professionalId: string) {
  return useQuery({
    queryKey: ['professionals', professionalId, 'posts'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      logger.info('Fetching professional posts', { professionalId });
      return Promise.resolve([]);
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 2, // 2 minutes (posts can change)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get professional charity settings
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalCharitySettings(professionalId: string) {
  return useQuery({
    queryKey: ['professionals', professionalId, 'charity'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      logger.info('Fetching professional charity settings', { professionalId });
      return Promise.resolve({
        enabled: false,
        showPublicBadge: false,
        charities: [],
      });
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Combined hook for professional profile page
 * Includes profile, favorite status, availability, posts, and charity settings
 */
export function useProfessionalProfileData(professionalId: string) {
  const profile = useProfessionalProfile(professionalId);
  const isFavorite = useIsFavorite(professionalId);
  const availability = useProfessionalAvailability(professionalId);
  const posts = useProfessionalPosts(professionalId);
  const charitySettings = useProfessionalCharitySettings(professionalId);

  return {
    profile,
    isFavorite,
    availability,
    posts,
    charitySettings,
    isLoading: profile.isLoading || isFavorite.isLoading || availability.isLoading || posts.isLoading || charitySettings.isLoading,
    isError: profile.isError || isFavorite.isError || availability.isError || posts.isError || charitySettings.isError,
  };
}

