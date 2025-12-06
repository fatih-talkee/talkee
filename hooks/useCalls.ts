// hooks/useCalls.ts
// React Query hooks for call management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { logger } from '@/lib/logger';

/**
 * Get call history for current user
 */
export function useCallHistory(
  filters?: CallFilters,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['calls', 'history', filters, limit, offset],
    queryFn: async () => {
      try {
        const history = await callsService.getCallHistory(filters, limit, offset);
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
        queryClient.setQueryData(['calls', data.id], data);
        // Invalidate call history
        queryClient.invalidateQueries({ queryKey: ['calls', 'history'] });
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
        queryClient.setQueryData(['calls', data.id], data);
        // Invalidate call history
        queryClient.invalidateQueries({ queryKey: ['calls', 'history'] });
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
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      // TODO: Implement block user service method
      // For now, this is handled locally in the component
      logger.info('Block user mutation called', { userId, isBlocked });
      return { userId, isBlocked };
    },
    onSuccess: () => {
      // Invalidate call history to refresh
      queryClient.invalidateQueries({ queryKey: ['calls', 'history'] });
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to update block status' });
    },
  });
}

