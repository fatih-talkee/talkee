// hooks/useCalls.ts
// React Query hooks for call management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callsService } from '@/services';
import type { Call } from '@/types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

export interface CallFilters {
  status?: Call['status'];
  callType?: Call['call_type'];
  startDate?: Date;
  endDate?: Date;
  professionalId?: string;
}

// Query Keys Factory Pattern
export const callsKeys = {
  all: ['calls'] as const,
  lists: () => [...callsKeys.all, 'list'] as const,
  history: (filters?: CallFilters, limit?: number, offset?: number) =>
    [...callsKeys.lists(), 'history', filters, limit, offset] as const,
  details: () => [...callsKeys.all, 'detail'] as const,
  detail: (callId: string) => [...callsKeys.details(), callId] as const,
};

/**
 * Get call history for current user
 */
export function useCallHistory(
  filters?: CallFilters,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: callsKeys.history(filters, limit, offset),
    queryFn: async () => {
      try {
        const history = await callsService.getCallHistory(
          filters,
          limit,
          offset
        );
        return history;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch call history' });
        throw error;
      }
    },
    ...CACHE_CONFIG.CALLS_HISTORY,
  });
}

/**
 * Get a single call by ID
 */
export function useCall(callId: string) {
  return useQuery({
    queryKey: callsKeys.detail(callId),
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
    ...CACHE_CONFIG.CALL_DETAIL,
  });
}

/**
 * Start a call (when both parties connect)
 */
export function useStartCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      try {
        const call = await callsService.startCall(callId);
        return call;
      } catch (error) {
        handleError(error, { title: 'Failed to start call' });
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data) {
        // Update call in cache
        queryClient.setQueryData(callsKeys.detail(data.id), data);
        // Invalidate call history
        queryClient.invalidateQueries({ queryKey: callsKeys.lists() });
      }
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to start call' });
    },
  });
}

/**
 * End a call
 */
export function useEndCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      try {
        const call = await callsService.endCall(callId);
        return call;
      } catch (error) {
        handleError(error, { title: 'Failed to end call' });
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data) {
        // Update call in cache
        queryClient.setQueryData(callsKeys.detail(data.id), data);
        // Invalidate call history
        queryClient.invalidateQueries({ queryKey: callsKeys.lists() });
      }
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to end call' });
    },
  });
}

/**
 * Block/unblock user from call (for call history)
 * Note: This is different from useBlockUser in useBlockedUsers.ts
 * This one is specifically for blocking users from call history
 */
export function useBlockUserFromCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isBlocked,
    }: {
      userId: string;
      isBlocked: boolean;
    }) => {
      // TODO: Implement block user service method
      // For now, this is handled locally in the component
      logger.info('Block user mutation called', { userId, isBlocked });
      return { userId, isBlocked };
    },
    onSuccess: () => {
      // Invalidate call history to refresh
      queryClient.invalidateQueries({ queryKey: callsKeys.lists() });
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to update block status' });
    },
  });
}
