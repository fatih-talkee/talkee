// hooks/useCalls.ts
// React Query hooks for call management

import { useQuery } from '@tanstack/react-query';
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

/**
 * Get call history for current user
 * Used in: Call History Screen
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
