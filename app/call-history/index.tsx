import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import { useCallHistory } from '@/hooks/useCalls';
import {
  useBlockedUsers,
  useBlockUser,
  useUnblockUser,
} from '@/hooks/useBlockedUsers';
import { CallHistoryCard } from '@/components/listings/CallHistoryCard';
import { useToast } from '@/lib/toastService';
import type { CallWithRelations } from '@/types/database.types';
import { CallStatus } from '@/types/database.types';

export default function CallHistoryScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'completed' | 'missed' | 'cancelled'
  >('all');

  // Fetch ALL call history for counts (no filter)
  const { data: allCallHistory = [], isLoading: isLoadingAll } = useCallHistory(
    undefined,
    100,
    0
  );

  // Fetch call history with filter for display
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

  const {
    data: callHistory = [],
    isLoading,
    error,
  } = useCallHistory(
    filterStatus ? { status: filterStatus } : undefined,
    100,
    0
  );

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

  // Filter call history by search query
  const filteredHistory = useMemo(() => {
    return callHistory.filter((call) => {
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
  }, [callHistory, searchQuery]);

  // Calculate filter counts from ALL call history (not filtered)
  const filters = useMemo(() => {
    const allCount = allCallHistory.length;
    const completedCount = allCallHistory.filter(
      (c) => c.status === 'completed'
    ).length;
    const missedCount = allCallHistory.filter(
      (c) => c.status === 'missed'
    ).length;
    const cancelledCount = allCallHistory.filter(
      (c) => c.status === 'cancelled'
    ).length;

    return [
      { key: 'all', label: 'All Calls', count: allCount },
      { key: 'completed', label: 'Completed', count: completedCount },
      { key: 'missed', label: 'Missed', count: missedCount },
      { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
    ];
  }, [allCallHistory]);

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

  if (isLoading || isLoadingAll) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading call history...
          </Text>
        </View>
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
        onTabSelect={(key) => setSelectedFilter(key as any)}
      />

      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
});
