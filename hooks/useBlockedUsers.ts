// hooks/useBlockedUsers.ts
// React Query hooks for blocked users management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { usersService } from '@/services/supabase';
import { CACHE_CONFIG } from '@/lib/cacheConfig';

type BlockedUserWithDetails = Awaited<
  ReturnType<typeof usersService.getBlockedUsers>
>[number];

/**
 * Get blocked users
 */
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: async (): Promise<BlockedUserWithDetails[]> => {
      try {
        const blockedUsers = await usersService.getBlockedUsers();
        return blockedUsers;
      } catch (error) {
        handleError(error, { title: 'Failed to fetch blocked users' });
        throw error;
      }
    },
    ...CACHE_CONFIG.BLOCKED_USERS,
  });
}

/**
 * Block user
 */
export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        await usersService.blockUser(userId);
        return { success: true };
      } catch (error) {
        handleError(error, { title: 'Failed to block user' });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });
}

/**
 * Unblock user
 */
export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        await usersService.unblockUser(userId);
        return { success: true };
      } catch (error) {
        handleError(error, { title: 'Failed to unblock user' });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });
}

