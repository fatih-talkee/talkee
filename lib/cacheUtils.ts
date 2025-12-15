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
 */
export function invalidateUserQueries(queryClient: QueryClient, userId?: string | null) {
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

  // Invalidate all matching queries
  userQueryKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });

  // Also remove from cache
  userQueryKeys.forEach((key) => {
    queryClient.removeQueries({ queryKey: key });
  });
}

