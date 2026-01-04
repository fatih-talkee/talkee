import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useInfiniteCallHistory,
  useCallHistoryCount,
  useInvalidateCallHistory,
} from '@/hooks/useCalls';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import {
  useBlockedUsers,
  useBlockUser,
  useUnblockUser,
} from '@/hooks/useBlockedUsers';
import { CallHistoryCard } from '@/components/listings/CallHistoryCard';
import { useToast } from '@/lib/toastService';
import type { CallWithRelations } from '@/types/database.types';
import { CallStatus } from '@/types/database.types';
import { PageLoading } from '@/components/ui/PageLoading';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';

export default function CallHistoryScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidateCallHistory = useInvalidateCallHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'completed' | 'missed' | 'cancelled'
  >('all');

  // ✅ FIX: Track last focus time to prevent excessive refetches
  const lastFocusTimeRef = useRef<number>(0);
  const lastRefetchTimeRef = useRef<number>(0);
  const MIN_REFETCH_INTERVAL_MS = 10000; // 10 seconds minimum between refetches (increased from 5s)
  const STALE_TIME_MS = 1000 * 60 * 2; // 2 minutes - data is considered stale after this

  // ✅ FIX: Listen to call state changes to invalidate cache when calls complete
  const { callState } = useTwilioVoice();
  const previousCallStatusRef = useRef<string | null>(null);

  // Fetch call history counts using optimized count queries
  const { data: allCount = 0 } = useCallHistoryCount(undefined);
  const { data: completedCount = 0 } = useCallHistoryCount({
    status: CallStatus.COMPLETED,
  });
  const { data: missedCount = 0 } = useCallHistoryCount({
    status: CallStatus.MISSED,
  });
  const { data: cancelledCount = 0 } = useCallHistoryCount({
    status: CallStatus.CANCELLED,
  });

  // ✅ BEST PRACTICE: Use infinite query for pagination
  const filterStatus = useMemo(() => {
    if (selectedFilter === 'all') return undefined;
    // Map filter to CallStatus enum
    const statusMap: Record<string, CallStatus> = {
      completed: CallStatus.COMPLETED,
      missed: CallStatus.MISSED,
      cancelled: CallStatus.CANCELLED,
    };
    return statusMap[selectedFilter];
  }, [selectedFilter]);

  // ✅ useInfiniteQuery automatically handles pagination, data merging, and cache
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
    refetch: refetchHistory,
  } = useInfiniteCallHistory(
    filterStatus ? { status: filterStatus } : undefined
  );

  // ✅ FIX: Manual refetch function with throttling
  const handleManualRefetch = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefetch = now - lastRefetchTimeRef.current;

    if (timeSinceLastRefetch < MIN_REFETCH_INTERVAL_MS) {
      logger.debug('[CallHistoryScreen] ⏭️ Skipping refetch (too soon)', {
        timeSinceLastRefetch: `${timeSinceLastRefetch}ms`,
        minInterval: `${MIN_REFETCH_INTERVAL_MS}ms`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    lastRefetchTimeRef.current = now;
    logger.debug('[CallHistoryScreen] 🔄 Manual refetch triggered', {
      timestamp: new Date().toISOString(),
    });

    // Refetch all count queries and history
    queryClient.refetchQueries({ queryKey: ['calls', 'history'] });
  }, [queryClient]);

  // ✅ FIX: Refetch on screen focus (with throttling and stale check)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTimeRef.current;
      lastFocusTimeRef.current = now;

      logger.debug('[CallHistoryScreen] 📱 Screen focused', {
        timeSinceLastFocus: `${timeSinceLastFocus}ms`,
        timestamp: new Date().toISOString(),
      });

      // Check if enough time has passed since last refetch
      const timeSinceLastRefetch = now - lastRefetchTimeRef.current;
      if (timeSinceLastRefetch < MIN_REFETCH_INTERVAL_MS) {
        logger.debug(
          '[CallHistoryScreen] ⏭️ Skipping refetch (too soon after last refetch)',
          {
            timeSinceLastRefetch: `${timeSinceLastRefetch}ms`,
            minInterval: `${MIN_REFETCH_INTERVAL_MS}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      // Only refetch if data is stale (older than STALE_TIME_MS)
      // Use the same query key format as useInfiniteCallHistory
      const filterKey = filterStatus
        ? JSON.stringify({ status: String(filterStatus) })
        : 'all';
      const queryState = queryClient.getQueryState([
        'calls',
        'history',
        'infinite',
        filterKey,
      ]);
      const isStale = queryState?.dataUpdatedAt
        ? Date.now() - queryState.dataUpdatedAt > STALE_TIME_MS
        : true;

      if (isStale) {
        logger.debug('[CallHistoryScreen] 🔄 Data is stale, refetching', {
          dataUpdatedAt: queryState?.dataUpdatedAt
            ? new Date(queryState.dataUpdatedAt).toISOString()
            : 'never',
          age: queryState?.dataUpdatedAt
            ? `${Date.now() - queryState.dataUpdatedAt}ms`
            : 'N/A',
          staleThreshold: `${STALE_TIME_MS}ms`,
          timestamp: new Date().toISOString(),
        });
        handleManualRefetch();
      } else {
        logger.debug('[CallHistoryScreen] ✅ Data is fresh, skipping refetch', {
          dataUpdatedAt: queryState?.dataUpdatedAt
            ? new Date(queryState.dataUpdatedAt).toISOString()
            : 'never',
          age: queryState?.dataUpdatedAt
            ? `${Date.now() - queryState.dataUpdatedAt}ms`
            : 'N/A',
          timestamp: new Date().toISOString(),
        });
      }
    }, [handleManualRefetch, queryClient, filterStatus])
  );

  // ✅ FIX: Listen to app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          logger.debug('[CallHistoryScreen] 📱 App became active', {
            timestamp: new Date().toISOString(),
          });
          // Don't auto-refetch on app state change - let useFocusEffect handle it
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // ✅ FIX: Invalidate cache when call completes (status changes from 'connected' to 'idle')
  useEffect(() => {
    const currentStatus = callState.status;
    const previousStatus = previousCallStatusRef.current;

    // If call just completed (was connected, now idle), invalidate cache
    if (previousStatus === 'connected' && currentStatus === 'idle') {
      logger.debug(
        '[CallHistoryScreen] 📞 Call completed, invalidating cache',
        {
          previousStatus,
          currentStatus,
          timestamp: new Date().toISOString(),
        }
      );

      // Invalidate cache after a short delay to allow webhook to process
      setTimeout(() => {
        invalidateCallHistory();
        logger.debug(
          '[CallHistoryScreen] ✅ Cache invalidated after call completion',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }, 2000); // 2 seconds delay to allow webhook to update DB
    }

    // Update previous status
    previousCallStatusRef.current = currentStatus;
  }, [callState.status, invalidateCallHistory]);

  // ✅ Flatten pages into a single array (useInfiniteQuery provides pages array)
  // React Query best practice: Only depend on infiniteData, not isFetching
  // This prevents unnecessary re-renders when isFetching changes
  const allCalls = useMemo(() => {
    if (!infiniteData?.pages) {
      return [];
    }
    return infiniteData.pages.flat();
  }, [infiniteData]);

  // ✅ Load more function
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ✅ FIX: Manual refresh handler with cache invalidation
  const handleRefresh = useCallback(async () => {
    logger.debug('[CallHistoryScreen] 🔄 Manual refresh triggered', {
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ FIX: Clear cache first to ensure fresh data (helps if cache is stuck)
      queryClient.removeQueries({ queryKey: ['calls', 'history'] });

      // Invalidate cache first
      invalidateCallHistory();

      // Then refetch all queries
      await Promise.all([
        refetchHistory(),
        queryClient.refetchQueries({ queryKey: ['calls', 'history', 'count'] }),
      ]);

      logger.debug('[CallHistoryScreen] ✅ Refresh completed', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[CallHistoryScreen] ❌ Refresh failed', error, {
        timestamp: new Date().toISOString(),
      });
    }
  }, [invalidateCallHistory, refetchHistory, queryClient]);

  // Fetch blocked users
  const { data: blockedUsers = [] } = useBlockedUsers();
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();

  // Create a set of blocked user IDs for quick lookup
  // Note: blockedUsers has blocked_id field, not id
  const blockedUserIds = useMemo(
    () => new Set(blockedUsers.map((u) => u.blocked_id)),
    [blockedUsers]
  );

  // Filter call history by search query (client-side filtering)
  const filteredHistory = useMemo(() => {
    if (!allCalls || !Array.isArray(allCalls)) {
      return [];
    }
    return allCalls.filter((call) => {
      const professionalName =
        call.professional?.users?.name?.toLowerCase() || '';
      const categoryName =
        call.professional?.categories?.name?.toLowerCase() || '';
      const searchLower = searchQuery.toLowerCase();

      return (
        professionalName.includes(searchLower) ||
        categoryName.includes(searchLower)
      );
    });
  }, [allCalls, searchQuery]);

  // Calculate filter counts from count queries (optimized)
  const filters = useMemo(() => {
    const result = [
      { key: 'all', label: 'All Calls', count: Number(allCount) || 0 },
      {
        key: 'completed',
        label: 'Completed',
        count: Number(completedCount) || 0,
      },
      { key: 'missed', label: 'Missed', count: Number(missedCount) || 0 },
      {
        key: 'cancelled',
        label: 'Cancelled',
        count: Number(cancelledCount) || 0,
      },
    ];
    // Ensure all filters have required fields and valid types
    return result.filter(
      (f) => f && typeof f.key === 'string' && typeof f.label === 'string'
    );
  }, [allCount, completedCount, missedCount, cancelledCount]);

  // Handle block/unblock user
  const handleToggleBlock = async (userId: string, shouldBlock: boolean) => {
    try {
      if (shouldBlock) {
        await blockUserMutation.mutateAsync(userId);
        toast.success({
          title: 'User Blocked',
          message: 'This user can no longer contact you',
        });
      } else {
        await unblockUserMutation.mutateAsync(userId);
        toast.success({
          title: 'User Unblocked',
          message: 'This user can now contact you',
        });
      }
    } catch (error) {
      toast.error({
        title: 'Error',
        message: 'Failed to update block status',
      });
    }
  };

  // Check if a user is blocked
  const isUserBlocked = (userId: string | undefined): boolean => {
    if (!userId) return false;
    return blockedUserIds.has(userId);
  };

  const renderCallItem = ({ item }: { item: CallWithRelations }) => {
    const professionalUserId = item.professional?.users?.id;
    const isBlocked = isUserBlocked(professionalUserId);

    return (
      <CallHistoryCard
        call={item}
        isBlocked={isBlocked}
        onToggleBlock={handleToggleBlock}
      />
    );
  };

  // ✅ FIX: Use same loading pattern as notifications page - early return with Header + PageLoading
  // Only show loading when we have no data AND are loading (not when just fetching/refreshing)
  // isLoading is only true on initial load, not on refetch/refresh
  const hasData = infiniteData?.pages && infiniteData.pages.length > 0;
  if (isLoading && !hasData) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading call history..." />
      </SafeAreaView>
    );
  }

  // ✅ FIX: Error handling like notifications page - early return with Header + Error
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.emptyState}>
          <Clock size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.error }]}>
            Error Loading Call History
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {error instanceof Error
              ? error.message
              : 'Failed to load call history'}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: '#fff' }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search call history..."
        showTabButtons={true}
        tabOptions={filters}
        selectedTabKey={selectedFilter}
        onTabSelect={(key) =>
          setSelectedFilter(key as 'all' | 'completed' | 'missed' | 'cancelled')
        }
      />

      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={isFetching && !isLoading}
        onRefresh={handleRefresh}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No call history
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Your call history will appear here once you start connecting with
              professionals
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                style={[
                  styles.footerLoaderText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Loading more...
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
