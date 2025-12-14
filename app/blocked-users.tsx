import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { UserX } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import { useBlockedUsers, useUnblockUser } from '@/hooks/useBlockedUsers';
import { useToast } from '@/lib/toastService';
import { ProfessionalCard } from '@/components/listings/ProfessionalCard';
import type { ProfessionalWithRelations } from '@/types/database.types';
import { PageLoading } from '@/components/ui/PageLoading';

type BlockedUserItem = {
  id: string;
  blocked_id: string;
  created_at: string;
  professional: ProfessionalWithRelations | null;
};

export default function BlockedUsersScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: blockedUsers = [], isLoading, error } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  // Filter blocked users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return blockedUsers;

    const query = searchQuery.toLowerCase();
    return blockedUsers.filter((item: BlockedUserItem) => {
      if (!item.professional) return false;

      const userName = item.professional.users?.name?.toLowerCase() || '';
      const title = item.professional.title?.toLowerCase() || '';
      const profession = item.professional.profession?.toLowerCase() || '';
      const categoryName =
        item.professional.categories?.name?.toLowerCase() || '';

      return (
        userName.includes(query) ||
        title.includes(query) ||
        profession.includes(query) ||
        categoryName.includes(query)
      );
    });
  }, [blockedUsers, searchQuery]);

  const handleUnblock = async (blockedId: string) => {
    try {
      await unblockMutation.mutateAsync(blockedId);
      toast.success({
        title: 'User Unblocked',
        message: 'This user can now contact you',
      });
    } catch (error) {
      toast.error({
        title: 'Error',
        message: 'Failed to unblock user',
      });
    }
  };

  const renderBlockedUserItem = ({ item }: { item: BlockedUserItem }) => {
    // Only show if professional exists
    if (!item.professional) {
      return null;
    }

    return (
      <View style={styles.cardWrapper}>
        <ProfessionalCard
          professional={item.professional}
          showUnblockButton={true}
          onUnblock={() => handleUnblock(item.blocked_id)}
          isUnblocking={unblockMutation.isPending}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading blocked users..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.emptyState}>
          <UserX size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Error Loading Blocked Users
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {error instanceof Error
              ? error.message
              : 'Failed to load blocked users'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter out users without professional data
  const usersWithProfessionals = filteredUsers.filter(
    (item: BlockedUserItem) => item.professional !== null
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search blocked users..."
        showResultsCount={true}
        resultsCount={usersWithProfessionals.length}
        resultsCountLabel={`${usersWithProfessionals.length} blocked user${
          usersWithProfessionals.length !== 1 ? 's' : ''
        }`}
      />

      {!blockedUsers || blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <UserX size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Blocked Users
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Users you block will appear here
          </Text>
        </View>
      ) : usersWithProfessionals.length === 0 ? (
        <View style={styles.emptyState}>
          <UserX size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            {searchQuery ? 'No Results Found' : 'No Professional Users Blocked'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Only professional users are shown here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={usersWithProfessionals}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  cardWrapper: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
  },
});
