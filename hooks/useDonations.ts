// hooks/useDonations.ts
// React Query hooks for donation management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import type { CharityOrganization } from '@/types';

// Temporary type until backend is ready
type DonationOrganization = CharityOrganization;

// Temporary placeholder data
const mockDonationOrganizations: DonationOrganization[] = [];

/**
 * Get donation organizations for call donation selection
 * TODO: Replace with actual service when backend is ready
 */
export function useDonationOrganizations() {
  return useQuery({
    queryKey: ['donations', 'organizations'],
    queryFn: async (): Promise<DonationOrganization[]> => {
      // For now, return mock data
      // TODO: Replace with actual API call
      return Promise.resolve(mockDonationOrganizations);
    },
    ...CACHE_CONFIG.DONATION_ORGANIZATIONS,
  });
}

/**
 * Save donation selection for a call
 * TODO: Implement when backend is ready
 */
export function useSaveCallDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      organizationId,
    }: {
      callId: string;
      organizationId: string;
    }) => {
      // TODO: Implement actual API call
      logger.info('Save call donation', { callId, organizationId });
      return { callId, organizationId };
    },
    onSuccess: () => {
      // Invalidate call data
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to save donation selection' });
    },
  });
}
