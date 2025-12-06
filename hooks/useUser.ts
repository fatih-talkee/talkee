// hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/supabase';
import { User, UserUpdate } from '@/types/database.types';

/**
 * Get current authenticated user
 * Cache: 5 minutes (user data changes infrequently)
 */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['user', 'current'],
    queryFn: () => usersService.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
  });
}

/**
 * Get user by ID
 */
export function useUser(userId: string) {
  return useQuery<User | null>({
    queryKey: ['user', userId],
    queryFn: () => usersService.getUserById(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * Update current user profile
 * Optimistic update: immediately update UI
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserUpdate) => usersService.updateUser(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'current'] });

      const previousUser = queryClient.getQueryData(['user', 'current']);

      // Optimistically update
      queryClient.setQueryData(['user', 'current'], (old: User | null) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      return { previousUser };
    },
    onError: (err, data, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', 'current'], context.previousUser);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'current'] });
    },
  });
}

/**
 * Get wallet balance
 * Cache: 1 minute (financial data should be relatively fresh)
 */
export function useWalletBalance() {
  return useQuery<number>({
    queryKey: ['wallet', 'balance'],
    queryFn: () => usersService.getWalletBalance(),
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
  });
}

/**
 * Get wallet transactions
 * Cache: 30 seconds (transactions change frequently)
 */
export function useWalletTransactions(limit: number = 10, offset: number = 0) {
  return useQuery({
    queryKey: ['wallet', 'transactions', limit, offset],
    queryFn: () => usersService.getTransactions(limit, offset),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Invalidate user cache
 */
export function useInvalidateUser() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };
}

/**
 * Invalidate wallet cache
 */
export function useInvalidateWallet() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };
}

