/**
 * Cache Utilities
 * Provides safe cache clearing functions for logout and user switching
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all user-specific queries from cache
 * This should be called on logout or user switch
 */
export async function clearUserCache(queryClient: QueryClient) {
  // Clear all queries from memory
  queryClient.clear();

  // Clear persisted cache from AsyncStorage
  // React Query persists cache with key: 'REACT_QUERY_OFFLINE_CACHE'
  try {
    await AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    console.log('✅ Persisted cache cleared');
  } catch (error) {
    console.error('❌ Error clearing persisted cache:', error);
  }
}

/**
 * Invalidate all user-specific queries
 * Use this when user data might have changed but user is still logged in
 * @param excludeKeys - Query keys to exclude from invalidation (e.g., ['calls'] to avoid invalidating call history)
 */
export function invalidateUserQueries(
  queryClient: QueryClient,
  userId?: string | null,
  excludeKeys: string[][] = []
) {
  // Invalidate all user-related query keys
  const userQueryKeys = [
    ['profile'],
    ['wallet'],
    ['transactions'],
    ['invoices'],
    ['calls'],
    ['favorites'],
    ['notifications'],
    ['appointments'],
    ['professionals'],
  ];

  // If userId is provided, also invalidate specific user queries
  if (userId) {
    userQueryKeys.push(
      ['profile', userId],
      ['wallet', userId],
      ['transactions', userId],
      ['invoices', userId],
      ['calls', userId],
      ['favorites', userId],
      ['notifications', userId],
    );
  }

  // Filter out excluded keys
  const keysToInvalidate = userQueryKeys.filter((key) => {
    return !excludeKeys.some((excludeKey) => {
      // Check if the key matches the exclude pattern
      return excludeKey.every((part, index) => key[index] === part);
    });
  });

  // Invalidate all matching queries
  keysToInvalidate.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });

  // Also remove from cache
  keysToInvalidate.forEach((key) => {
    queryClient.removeQueries({ queryKey: key });
  });
}

