// hooks/useProfile.ts
// React Query hooks for profile and professional settings

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { usersService, professionalsService } from '@/services/supabase';
import type {
  ProfessionalBasicInfo,
  ProfessionalPricing,
  ProfessionalFinancial,
  CallCriteriaSettings,
  ProfessionalCV,
  Recording,
  PrivacySettings,
  Device,
} from '@/types';

/**
 * Get professional basic info
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalBasicInfo() {
  return useQuery({
    queryKey: ['professional', 'basic-info'],
    queryFn: async (): Promise<ProfessionalBasicInfo | null> => {
      try {
        const user = await usersService.getCurrentUser();
        if (!user) return null;

        // TODO: Replace with actual API call to get professional basic info
        logger.info('Fetching professional basic info');
        return {
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          about: user.bio || '',
        };
      } catch (error) {
        handleError(error, 'Failed to fetch professional basic info');
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Update professional basic info
 */
export function useUpdateProfessionalBasicInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfessionalBasicInfo) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating professional basic info', data);
        
        // Update user profile as fallback
        await usersService.updateProfile({
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          bio: data.about,
        });

        return data;
      } catch (error) {
        handleError(error, 'Failed to update professional basic info');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Get professional pricing settings
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalPricing() {
  return useQuery({
    queryKey: ['professional', 'pricing'],
    queryFn: async (): Promise<ProfessionalPricing | null> => {
      try {
        const user = await usersService.getCurrentUser();
        if (!user) return null;

        // Get professional profile
        const professionals = await professionalsService.getProfessionals(
          { searchQuery: user.id },
          1,
          0
        );
        const professional = professionals[0];

        if (!professional) return null;

        // TODO: Replace with actual API call
        logger.info('Fetching professional pricing');
        return {
          ratePerMinute: professional.rate_per_minute || 0,
          minCallDuration: 5, // Default, should come from API
          acceptingCalls: professional.is_available || false,
        };
      } catch (error) {
        handleError(error, 'Failed to fetch professional pricing');
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Update professional pricing settings
 */
export function useUpdateProfessionalPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfessionalPricing) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating professional pricing', data);
        return data;
      } catch (error) {
        handleError(error, 'Failed to update professional pricing');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional'] });
    },
  });
}

/**
 * Get professional financial overview
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalFinancial() {
  return useQuery({
    queryKey: ['professional', 'financial'],
    queryFn: async (): Promise<ProfessionalFinancial | null> => {
      try {
        const user = await usersService.getCurrentUser();
        if (!user) return null;

        // TODO: Replace with actual API call
        logger.info('Fetching professional financial overview');
        return {
          accountBalance: user.wallet_balance || 0,
          lastPayout: undefined, // Should come from API
          totalEarnings: 0, // Should come from API
          pendingEarnings: 0, // Should come from API
        };
      } catch (error) {
        handleError(error, 'Failed to fetch professional financial overview');
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (financial data changes frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get call criteria settings
 * TODO: Replace with actual service when backend is ready
 */
export function useCallCriteriaSettings() {
  return useQuery({
    queryKey: ['professional', 'call-criteria'],
    queryFn: async (): Promise<CallCriteriaSettings> => {
      // TODO: Replace with actual API call
      logger.info('Fetching call criteria settings');
      return {
        onlyVerifiedUsers: true,
        paymentRequiredUpfront: true,
        noAnonymousCallers: false,
        acceptNewUsers: true,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Update call criteria settings
 */
export function useUpdateCallCriteriaSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CallCriteriaSettings) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating call criteria settings', data);
        return data;
      } catch (error) {
        handleError(error, 'Failed to update call criteria settings');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional', 'call-criteria'] });
    },
  });
}

/**
 * Get professional CV (experiences and education)
 * TODO: Replace with actual service when backend is ready
 */
export function useProfessionalCV() {
  return useQuery({
    queryKey: ['professional', 'cv'],
    queryFn: async (): Promise<ProfessionalCV> => {
      // TODO: Replace with actual API call
      logger.info('Fetching professional CV');
      return {
        experiences: [],
        education: [],
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Update professional CV
 */
export function useUpdateProfessionalCV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfessionalCV) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating professional CV', data);
        return data;
      } catch (error) {
        handleError(error, 'Failed to update professional CV');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional', 'cv'] });
    },
  });
}

/**
 * Get recordings
 * TODO: Replace with actual service when backend is ready
 */
export function useRecordings() {
  return useQuery({
    queryKey: ['recordings'],
    queryFn: async (): Promise<Recording[]> => {
      // TODO: Replace with actual API call
      logger.info('Fetching recordings');
      return [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get user devices
 * TODO: Replace with actual service when backend is ready
 */
export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: async (): Promise<Device[]> => {
      // TODO: Replace with actual API call
      logger.info('Fetching devices');
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Remove device
 */
export function useRemoveDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Removing device', deviceId);
        return deviceId;
      } catch (error) {
        handleError(error, 'Failed to remove device');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

/**
 * Get privacy settings
 * TODO: Replace with actual service when backend is ready
 */
export function usePrivacySettings() {
  return useQuery({
    queryKey: ['privacy-settings'],
    queryFn: async (): Promise<PrivacySettings> => {
      // TODO: Replace with actual API call
      logger.info('Fetching privacy settings');
      return {
        showProfilePublicly: true,
        showOnlineStatus: true,
        allowMessageRequests: false,
        twoFactorAuth: false,
        loginAlerts: true,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Update privacy settings
 */
export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PrivacySettings>) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating privacy settings', data);
        return data;
      } catch (error) {
        handleError(error, 'Failed to update privacy settings');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
    },
  });
}

/**
 * Request data download
 */
export function useRequestDataDownload() {
  return useMutation({
    mutationFn: async () => {
      try {
        // TODO: Replace with actual API call
        logger.info('Requesting data download');
        return { success: true };
      } catch (error) {
        handleError(error, 'Failed to request data download');
        throw error;
      }
    },
  });
}

