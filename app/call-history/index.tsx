import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import { useInfiniteCallHistory, useCallHistoryCount } from '@/hooks/useCalls';
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

export default function CallHistoryScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'completed' | 'missed' | 'cancelled'
  >('all');

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
  } = useInfiniteCallHistory(
    filterStatus ? { status: filterStatus } : undefined
  );

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
    return [
      { key: 'all', label: 'All Calls', count: allCount },
      { key: 'completed', label: 'Completed', count: completedCount },
      { key: 'missed', label: 'Missed', count: missedCount },
      { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
    ];
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

  // ✅ React Query best practice: isLoading means initial load with no data
  // Show loading screen only during initial load (isLoading = true means no data exists yet)
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading call history..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Failed to load call history
          </Text>
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
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Clock size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No call history
              </Text>
              <Text
                style={[styles.emptyText, { color: theme.colors.textMuted }]}
              >
                Your call history will appear here once you start connecting
                with professionals
              </Text>
            </View>
          )
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
