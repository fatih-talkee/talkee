import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { TrendingUp, TrendingDown, DollarSign, UserX } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { mockWalletTransactions, WalletTransaction } from '@/mockData/professionals';
import { useToast } from '@/lib/toastService';

export default function WalletHistoryScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'income' | 'expenses'>('all');
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set(['2']));

  const filteredTransactions = mockWalletTransactions.filter(transaction => {
    if (selectedFilter === 'all') return true;
    return transaction.type === selectedFilter;
  });

  const filters = [
    { key: 'all', label: 'All', count: mockWalletTransactions.length },
    { key: 'income', label: 'Income', count: mockWalletTransactions.filter(t => t.type === 'income').length },
    { key: 'expenses', label: 'Expenses', count: mockWalletTransactions.filter(t => t.type === 'expenses').length },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
      return `${secs}sec`;
    }
    if (secs === 0) {
      return `${mins}min`;
    }
    return `${mins}min ${secs}sec`;
  };

  const getTransactionIcon = (transaction: WalletTransaction) => {
    if (transaction.professional) {
      return <TrendingDown size={20} color={theme.colors.error} />;
    }
    return <TrendingUp size={20} color={theme.colors.success} />;
  };

  const getTransactionIconBackground = (transaction: WalletTransaction) => {
    if (transaction.professional) {
      return theme.name === 'light' ? '#fee2e2' : 'rgba(255, 69, 58, 0.2)';
    }
    return theme.name === 'light' ? '#dcfce7' : 'rgba(48, 209, 88, 0.2)';
  };

  const toggleBlockUser = (userId: string, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    setBlockedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
        toast.success({
          title: 'User Unblocked',
          message: 'This user can now contact you',
        });
      } else {
        newSet.add(userId);
        toast.error({
          title: 'User Blocked',
          message: 'This user can no longer contact you',
        });
      }
      return newSet;
    });
  };

  const renderTransactionItem = ({ item }: { item: WalletTransaction }) => {
    const isUserBlocked = item.callerId ? blockedUsers.has(item.callerId) : false;
    
    return (
      <Card style={[styles.transactionCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.transactionContainer}>
          <TouchableOpacity 
            style={styles.transactionItem}
            onPress={() => {
              if (item.professionalId) {
                router.push(`/professional/${item.professionalId}`);
              } else if (item.callerId) {
                router.push(`/professional/${item.callerId}`);
              }
            }}
            disabled={!item.professionalId && !item.callerId}
            activeOpacity={item.professionalId || item.callerId ? 0.7 : 1}
          >
            <View style={styles.transactionLeft}>
              <View style={[styles.transactionIcon, { backgroundColor: getTransactionIconBackground(item) }]}>
                {getTransactionIcon(item)}
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>{item.description}</Text>
                <View style={styles.transactionMeta}>
                  <Text style={[styles.transactionDate, { color: theme.colors.textMuted }]}>{formatDate(item.timestamp)}</Text>
                  <Text style={[styles.transactionTime, { color: theme.colors.textMuted }]}>{formatTime(item.timestamp)}</Text>
                </View>
                {item.professional && (
                  <View style={styles.transactionProfessional}>
                    <Image source={{ uri: item.professional.avatar }} style={styles.professionalAvatar} />
                    <Text style={[styles.professionalName, { color: theme.colors.textMuted }]}>{item.professional.name}</Text>
                  </View>
                )}
                {item.caller && (
                  <View style={styles.transactionProfessional}>
                    <Image source={{ uri: item.caller.avatar }} style={styles.professionalAvatar} />
                    <Text style={[styles.professionalName, { color: theme.colors.textMuted }]}>{item.caller.name}</Text>
                    {isUserBlocked && (
                      <View style={[styles.blockedBadge, { backgroundColor: theme.colors.error }]}>
                        <Text style={[styles.blockedBadgeText]}>Blocked</Text>
                      </View>
                    )}
                  </View>
                )}
                {item.duration && (
                  <Text style={[styles.durationText, { color: theme.colors.textMuted }]}>
                    {formatDuration(item.duration)}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.transactionRight}>
              <Text style={[
                styles.transactionAmount, 
                { color: item.type === 'income' ? theme.colors.success : theme.colors.error }
              ]}>
                {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
          
          {item.type === 'income' && item.caller && (
            <TouchableOpacity
              style={[styles.blockButton, { backgroundColor: isUserBlocked ? theme.colors.success : theme.colors.error }]}
              onPress={() => toggleBlockUser(item.callerId!)}
            >
              <UserX size={16} color="#ffffff" />
              <Text style={styles.blockButtonText}>
                {isUserBlocked ? 'Unblock' : 'Block'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo showBack backPosition="right" />

      <View style={[styles.filtersSection, { backgroundColor: '#000000' }]}>
        <View style={styles.filters}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                selectedFilter === filter.key && theme.name === 'dark' && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterText,
                { color: theme.colors.textSecondary },
                selectedFilter === filter.key && { color: '#000000' }
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <DollarSign size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No transactions</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Your transaction history will appear here
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
  },
  filtersSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  listContent: {
    padding: 24,
  },
  transactionCard: {
    marginBottom: 12,
    padding: 0,
  },
  transactionContainer: {
    position: 'relative',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  transactionTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  transactionProfessional: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  professionalAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  professionalName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
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
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  blockButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 4,
  },
  blockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  blockedBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
});

