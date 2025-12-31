// hooks/useCalls.ts
// React Query hooks for call management

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { callsService } from '@/services';
import type { Call } from '@/types';

export interface CallFilters {
  status?: Call['status'];
  callType?: Call['call_type'];
  startDate?: Date;
  endDate?: Date;
  professionalId?: string;
}
import { handleError } from '@/lib/errorHandler';
import { CallFilters as CallFiltersType } from '@/types/database.types';
import type { CallWithRelations } from '@/types/database.types';

/**
 * Get call history for current user (with pagination)
 * Used in: Call History Screen
 * @deprecated Use useInfiniteCallHistory for better performance with pagination
 */
export function useCallHistory(
  filters?: CallFilters,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: [
      'calls',
      'history',
      filters as unknown as CallFiltersType,
      limit,
      offset,
    ],
    queryFn: async () => {
      try {
        const history = await callsService.getCallHistory(
          filters as unknown as CallFiltersType,
          limit,
          offset
        );
        return history;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch call history' });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get call history with infinite scroll (BEST PRACTICE)
 * ✅ Uses useInfiniteQuery for automatic pagination
 * ✅ Better cache management
 * ✅ Less boilerplate code
 * Used in: Call History Screen
 */
export function useInfiniteCallHistory(filters?: CallFilters) {
  const PAGE_SIZE = 20;

  return useInfiniteQuery<CallWithRelations[]>({
    queryKey: [
      'calls',
      'history',
      'infinite',
      filters as unknown as CallFiltersType,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const history = await callsService.getCallHistory(
          filters as unknown as CallFiltersType,
          PAGE_SIZE,
          (pageParam as number) * PAGE_SIZE
        );
        return history;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch call history' });
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer items than PAGE_SIZE, we've reached the end
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes - cache retention
    refetchOnMount: false, // Don't refetch on mount (prevents loops, use manual refetch if needed)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    placeholderData: undefined, // Don't use placeholder data
  });
}

/**
 * Get total count of calls for current user
 * Used in: Call History Screen (for filter counts)
 */
export function useCallHistoryCount(filters?: CallFilters) {
  return useQuery({
    queryKey: [
      'calls',
      'history',
      'count',
      filters as unknown as CallFiltersType,
    ],
    queryFn: async () => {
      try {
        const count = await callsService.getCallHistoryCount(
          filters as unknown as CallFiltersType
        );
        return count;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch call history count' });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get a single call by ID
 * Reserved for future use (call details screen)
 */
export function useCall(callId: string) {
  return useQuery({
    queryKey: ['calls', callId],
    queryFn: async () => {
      try {
        const call = await callsService.getCall(callId);
        return call;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch call details' });
        throw error;
      }
    },
    enabled: !!callId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
