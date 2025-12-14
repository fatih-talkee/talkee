// hooks/useCharity.ts
// React Query hooks for charity management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import type { CharityOrganization, DonationRecord } from '@/types';

// Temporary placeholder data until backend is ready
const mockCharities: CharityOrganization[] = [];
const mockDonations: DonationRecord[] = [];

// Helper functions
const getCharitiesByCategory = (category: string): CharityOrganization[] => {
  if (category === 'all') return mockCharities;
  return mockCharities.filter((c) => c.category === category);
};

const getTotalDonated = (donations: DonationRecord[]): number => {
  return donations.reduce((sum, d) => sum + d.amount, 0);
};

const getDonationsByCharity = (
  donations: DonationRecord[]
): Record<string, { name: string; total: number; count: number }> => {
  return donations.reduce((acc, donation) => {
    const charityId = donation.charityId;
    if (!acc[charityId]) {
      acc[charityId] = { name: `Charity ${charityId}`, total: 0, count: 0 };
    }
    acc[charityId].total += donation.amount;
    acc[charityId].count += 1;
    return acc;
  }, {} as Record<string, { name: string; total: number; count: number }>);
};

const getDonationsByPeriod = (
  donations: DonationRecord[],
  periodDays: number
): DonationRecord[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  return donations.filter((d) => new Date(d.date) >= cutoffDate);
};

const groupDonationsByMonth = (
  donations: DonationRecord[]
): Record<string, DonationRecord[]> => {
  return donations.reduce((acc, donation) => {
    const date = new Date(donation.date);
    const monthKey = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(donation);
    return acc;
  }, {} as Record<string, DonationRecord[]>);
};

/**
 * Get all charity organizations
 * TODO: Replace with actual service when backend is ready
 */
export function useCharityOrganizations(category?: string) {
  return useQuery({
    queryKey: ['charity', 'organizations', category],
    queryFn: async (): Promise<CharityOrganization[]> => {
      // For now, return mock data
      // TODO: Replace with actual API call
      if (category && category !== 'all') {
        return Promise.resolve(getCharitiesByCategory(category));
      }
      return Promise.resolve(mockCharities);
    },
    ...CACHE_CONFIG.CHARITY_ORGANIZATIONS,
  });
}

/**
 * Get charity donation history
 * TODO: Replace with actual service when backend is ready
 */
export function useDonationHistory(period?: number) {
  return useQuery({
    queryKey: ['charity', 'donations', 'history', period],
    queryFn: async (): Promise<DonationRecord[]> => {
      // For now, return mock data
      // TODO: Replace with actual API call
      if (period) {
        return Promise.resolve(getDonationsByPeriod(mockDonations, period));
      }
      return Promise.resolve(mockDonations);
    },
    ...CACHE_CONFIG.DONATION_HISTORY,
  });
}

/**
 * Get donation statistics
 */
export function useDonationStats(period?: number) {
  const { data: donations = [], isLoading } = useDonationHistory(period);

  return useMemo(() => {
    if (!donations.length) {
      return {
        totalDonated: 0,
        byCharity: {},
        groupedByMonth: {},
        isLoading,
      };
    }

    const totalDonated = getTotalDonated(donations);
    const byCharity = getDonationsByCharity(donations);
    const groupedByMonth = groupDonationsByMonth(donations);

    return {
      totalDonated,
      byCharity,
      groupedByMonth,
      isLoading,
    };
  }, [donations, isLoading]);
}

/**
 * Save charity settings
 * TODO: Implement when backend is ready
 */
export function useSaveCharitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: any) => {
      // TODO: Implement actual API call
      logger.info('Save charity settings', settings);
      return settings;
    },
    onSuccess: () => {
      // Invalidate charity-related queries
      queryClient.invalidateQueries({ queryKey: ['charity'] });
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to save charity settings' });
    },
  });
}
