// hooks/useCalls.ts
// React Query hooks for call management

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { callsService } from '@/services';
import type { Call } from '@/types';
import { handleError } from '@/lib/errorHandler';
import { CallFilters as CallFiltersType } from '@/types/database.types';
import type { CallWithRelations } from '@/types/database.types';
import { logger } from '@/lib/logger';

export interface CallFilters {
  status?: Call['status'];
  callType?: Call['call_type'];
  startDate?: Date;
  endDate?: Date;
  professionalId?: string;
}

/**
 * ✅ FIX: Serialize filters for consistent cache keys
 * Prevents cache key mismatches due to object reference differences
 */
function serializeFilters(filters?: CallFilters): string {
  if (!filters) return 'all';
  
  const serialized: Record<string, string | number> = {};
  if (filters.status) serialized.status = String(filters.status);
  if (filters.callType) serialized.callType = String(filters.callType);
  if (filters.professionalId) serialized.professionalId = String(filters.professionalId);
  if (filters.startDate) serialized.startDate = filters.startDate.toISOString();
  if (filters.endDate) serialized.endDate = filters.endDate.toISOString();
  
  return JSON.stringify(serialized);
}

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
  const filterKey = serializeFilters(filters);
  
  return useQuery({
    queryKey: ['calls', 'history', filterKey, limit, offset],
    queryFn: async () => {
      const startTime = Date.now();
      logger.debug('[useCallHistory] 🔍 Fetching call history', {
        filters: filterKey,
        limit,
        offset,
        timestamp: new Date().toISOString(),
      });
      
      try {
        const history = await callsService.getCallHistory(
          filters as unknown as CallFiltersType,
          limit,
          offset
        );
        
        const elapsed = Date.now() - startTime;
        logger.debug('[useCallHistory] ✅ Call history fetched', {
          count: history.length,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        
        return history;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        logger.error('[useCallHistory] ❌ Failed to fetch call history', error, {
          filters: filterKey,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        handleError(error, { title: 'Failed to fetch call history' });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: 'always', // Always refetch when call history page mounts
    refetchOnWindowFocus: false, // ✅ FIX: Prevent refresh loops
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
  const filterKey = serializeFilters(filters);

  return useInfiniteQuery<CallWithRelations[]>({
    queryKey: ['calls', 'history', 'infinite', filterKey],
    queryFn: async ({ pageParam = 0 }) => {
      const startTime = Date.now();
      const page = pageParam as number;
      
      logger.debug('[useInfiniteCallHistory] 🔍 Fetching page', {
        page,
        filters: filterKey,
        pageSize: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        timestamp: new Date().toISOString(),
      });
      
      try {
        const history = await callsService.getCallHistory(
          filters as unknown as CallFiltersType,
          PAGE_SIZE,
          page * PAGE_SIZE
        );
        
        const elapsed = Date.now() - startTime;
        logger.debug('[useInfiniteCallHistory] ✅ Page fetched', {
          page,
          count: history.length,
          elapsed: `${elapsed}ms`,
          hasMore: history.length === PAGE_SIZE,
          timestamp: new Date().toISOString(),
        });
        
        return history;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        logger.error('[useInfiniteCallHistory] ❌ Failed to fetch page', error, {
          page,
          filters: filterKey,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        handleError(error, { title: 'Failed to fetch call history' });
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer items than PAGE_SIZE, we've reached the end
      if (lastPage.length < PAGE_SIZE) {
        logger.debug('[useInfiniteCallHistory] 📄 Reached end of pages', {
          totalPages: allPages.length,
          lastPageSize: lastPage.length,
          timestamp: new Date().toISOString(),
        });
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes - cache retention
    refetchOnMount: 'always', // Always refetch when call history page mounts
    refetchOnWindowFocus: false, // ✅ FIX: Don't refetch on window focus
    refetchInterval: false, // ✅ FIX: Disable auto-refetch interval
    // ✅ FIX: Removed placeholderData to match invoices behavior - isLoading should be false when data exists
    retry: 1, // ✅ FIX: Only retry once on error
    retryOnMount: false, // ✅ FIX: Don't retry on mount if error exists
  });
}

/**
 * Get total count of calls for current user
 * Used in: Call History Screen (for filter counts)
 * ✅ FIX: Added refetch settings to prevent auto-refresh loops
 */
export function useCallHistoryCount(filters?: CallFilters) {
  const filterKey = serializeFilters(filters);
  
  return useQuery({
    queryKey: ['calls', 'history', 'count', filterKey],
    queryFn: async () => {
      const startTime = Date.now();
      logger.debug('[useCallHistoryCount] 🔍 Fetching count', {
        filters: filterKey,
        timestamp: new Date().toISOString(),
      });
      
      try {
        const count = await callsService.getCallHistoryCount(
          filters as unknown as CallFiltersType
        );
        
        const elapsed = Date.now() - startTime;
        logger.debug('[useCallHistoryCount] ✅ Count fetched', {
          count,
          filters: filterKey,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        
        return count;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        logger.error('[useCallHistoryCount] ❌ Failed to fetch count', error, {
          filters: filterKey,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        handleError(error, { title: 'Failed to fetch call history count' });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: 'always', // Always refetch when call history page mounts
    refetchOnWindowFocus: false, // ✅ FIX: Prevent refresh loops on focus
    refetchInterval: false, // ✅ FIX: Disable auto-refetch interval (prevents 3-5s refresh)
    placeholderData: (previousData) => previousData, // ✅ FIX: Keep previous data while refetching
    retry: 1, // ✅ FIX: Only retry once on error
    retryOnMount: false, // ✅ FIX: Don't retry on mount if error exists
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
      const startTime = Date.now();
      logger.debug('[useCall] 🔍 Fetching call', {
        callId,
        timestamp: new Date().toISOString(),
      });
      
      try {
        const call = await callsService.getCall(callId);
        
        const elapsed = Date.now() - startTime;
        logger.debug('[useCall] ✅ Call fetched', {
          callId,
          hasCall: !!call,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        
        return call;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        logger.error('[useCall] ❌ Failed to fetch call', error, {
          callId,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        handleError(error, { title: 'Failed to fetch call details' });
        throw error;
      }
    },
    enabled: !!callId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * ✅ FIX: Invalidate call history cache
 * Call this after creating, updating, or deleting a call
 */
export function useInvalidateCallHistory() {
  const queryClient = useQueryClient();
  
  return () => {
    logger.debug('[useInvalidateCallHistory] 🔄 Invalidating call history cache', {
      timestamp: new Date().toISOString(),
    });
    
    // Invalidate all call history queries
    queryClient.invalidateQueries({ queryKey: ['calls', 'history'] });
    
    logger.debug('[useInvalidateCallHistory] ✅ Cache invalidated', {
      timestamp: new Date().toISOString(),
    });
  };
}
