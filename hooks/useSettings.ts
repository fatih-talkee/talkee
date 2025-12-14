// hooks/useSettings.ts
// React Query hooks for settings pages

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { usersService } from '@/services/supabase';
import type {
  AccountSettings,
  ProfessionalAvailability,
  NotificationSettings,
} from '@/types';

/**
 * Get account settings
 */
export function useAccountSettings() {
  return useQuery({
    queryKey: ['account-settings'],
    queryFn: async (): Promise<AccountSettings> => {
      try {
        const user = await usersService.getCurrentUser();
        if (!user) {
          throw new Error('User not found');
        }

        // TODO: Replace with actual API call to get account settings
        logger.info('Fetching account settings');
        return {
          fullName: user.name || '',
          email: user.email || '',
          phone: user.phone || undefined,
          memberSince: user.created_at
            ? new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })
            : undefined,
          accountType: 'Standard', // Should come from API
          totalCalls: 0, // Should come from API
          accountId: user.id,
        };
      } catch (error) {
        handleError(error, 'Failed to fetch account settings');
        throw error;
      }
    },
    ...CACHE_CONFIG.ACCOUNT_SETTINGS,
  });
}

/**
 * Update account settings
 */
export function useUpdateAccountSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AccountSettings>) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating account settings', data);

        // Update user profile as fallback
        await usersService.updateProfile({
          name: data.fullName,
          phone: data.phone,
        });

        return data;
      } catch (error) {
        handleError(error, 'Failed to update account settings');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Delete account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        // TODO: Replace with actual API call
        logger.info('Deleting account');
        return { success: true };
      } catch (error) {
        handleError(error, 'Failed to delete account');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all cache on account deletion
    },
  });
}

/**
 * Get availability settings
 */
export function useAvailabilitySettings() {
  return useQuery({
    queryKey: ['availability-settings'],
    queryFn: async (): Promise<{
      availabilities: ProfessionalAvailability[];
      urgentCallEnabled: boolean;
      urgentCallPrice: number;
      urgentCallCurrency: 'USD' | 'TRY' | 'EUR';
    }> => {
      try {
        // TODO: Replace with actual API call
        logger.info('Fetching availability settings');
        return {
          availabilities: [],
          urgentCallEnabled: false,
          urgentCallPrice: 0,
          urgentCallCurrency: 'USD',
        };
      } catch (error) {
        handleError(error, 'Failed to fetch availability settings');
        throw error;
      }
    },
    ...CACHE_CONFIG.AVAILABILITY_SETTINGS,
  });
}

/**
 * Update availability settings
 */
export function useUpdateAvailabilitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      availabilities: ProfessionalAvailability[];
      urgentCallEnabled: boolean;
      urgentCallPrice: number;
      urgentCallCurrency: 'USD' | 'TRY' | 'EUR';
    }) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Updating availability settings', data);
        return data;
      } catch (error) {
        handleError(error, 'Failed to update availability settings');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-settings'] });
    },
  });
}

/**
 * Change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Changing password');
        return { success: true };
      } catch (error) {
        handleError(error, 'Failed to change password');
        throw error;
      }
    },
  });
}

// Note: Notification settings hooks are already implemented in useNotifications.ts
// Import them directly from there
export {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from './useNotifications';
