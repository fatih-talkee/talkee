// hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/supabase';
import { User, UserUpdate } from '@/types/database.types';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

// Query Keys Factory Pattern
export const userKeys = {
  all: ['user'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  detail: (userId: string) => [...userKeys.all, userId] as const,
  wallet: () => [...userKeys.all, 'wallet'] as const,
  balance: () => [...userKeys.wallet(), 'balance'] as const,
  transactions: (limit?: number, offset?: number) =>
    [...userKeys.wallet(), 'transactions', limit, offset] as const,
};

/**
 * Get current authenticated user
 * Cache: 5 minutes (user data changes infrequently)
 */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: userKeys.current(),
    queryFn: () => usersService.getCurrentUser(),
    ...CACHE_CONFIG.USER_CURRENT,
    retry: 1,
  });
}

/**
 * Get user by ID
 */
export function useUser(userId: string) {
  return useQuery<User | null>({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersService.getUserById(userId),
    enabled: !!userId,
    ...CACHE_CONFIG.USER_PROFILE,
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
      await queryClient.cancelQueries({ queryKey: userKeys.current() });

      const previousUser = queryClient.getQueryData(userKeys.current());

      // Optimistically update
      queryClient.setQueryData(userKeys.current(), (old: User | null) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      return { previousUser };
    },
    onError: (err, data, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.current(), context.previousUser);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
    },
  });
}

/**
 * Get wallet balance
 * Cache: 1 minute (financial data should be relatively fresh)
 */
export function useWalletBalance() {
  return useQuery<number>({
    queryKey: userKeys.balance(),
    queryFn: () => usersService.getWalletBalance(),
    ...CACHE_CONFIG.WALLET_BALANCE,
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
  });
}

/**
 * Get wallet transactions
 * Cache: 30 seconds (transactions change frequently)
 */
export function useWalletTransactions(limit: number = 10, offset: number = 0) {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user and listen to auth changes
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await usersService.getCurrentUser();
      setUserId(user?.id || null);
    };

    getCurrentUser();

    // Listen for auth changes to update userId when user switches
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Use session.user.id directly instead of calling getCurrentUser()
        // This avoids AuthSessionMissingError during logout transitions
        // We'll fetch the full user data when the query runs (if needed)
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return useQuery({
    queryKey: [...userKeys.transactions(limit, offset), userId],
    queryFn: () => usersService.getTransactions(limit, offset),
    enabled: !!userId,
    ...CACHE_CONFIG.TRANSACTIONS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Invalidate user cache
 */
export function useInvalidateUser() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
}

/**
 * Invalidate wallet cache
 */
export function useInvalidateWallet() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: userKeys.wallet() });
  };
}
