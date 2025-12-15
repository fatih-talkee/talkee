import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  Plus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Phone,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { TabButtons } from '@/components/ui/TabButtons';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { useWalletTransactions } from '@/hooks/useUser';
import { useToast } from '@/lib/toastService';
import { PageLoading } from '@/components/ui/PageLoading';
import { InlineLoading } from '@/components/ui/InlineLoading';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { Transaction } from '@/types/database.types';

export default function WalletHistoryScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'income' | 'expenses'
  >('all');

  // Fetch transactions from API
  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useWalletTransactions(100, 0);

  const filteredTransactions = useMemo(() => {
    if (selectedFilter === 'all') return transactions;
    if (selectedFilter === 'income') {
      return transactions.filter(
        (tx) =>
          tx.type === 'income' ||
          tx.type === 'credit_purchase' ||
          tx.type === 'call_earning'
      );
    }
    // expenses
    return transactions.filter(
      (tx) => tx.type === 'expenses' || tx.type === 'call_expense'
    );
  }, [transactions, selectedFilter]);

  const filters = useMemo(() => {
    const incomeCount = transactions.filter(
      (tx) =>
        tx.type === 'income' ||
        tx.type === 'credit_purchase' ||
        tx.type === 'call_earning'
    ).length;
    const expensesCount = transactions.filter(
      (tx) => tx.type === 'expenses' || tx.type === 'call_expense'
    ).length;

    return [
      { key: 'all', label: 'All', count: transactions.length },
      { key: 'income', label: 'Income', count: incomeCount },
      { key: 'expenses', label: 'Expenses', count: expensesCount },
    ];
  }, [transactions]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = parseISO(timestamp);
      if (isToday(date)) {
        return 'Today, ' + format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return 'Yesterday, ' + format(date, 'h:mm a');
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch (error) {
      return timestamp;
    }
  };

  const getTransactionIcon = (type: string) => {
    const iconSize = 20;
    const iconColor = getTransactionColor(type);

    switch (type) {
      case 'income':
      case 'credit_purchase':
      case 'call_earning':
        return <Plus size={iconSize} color={iconColor} />;
      case 'expenses':
      case 'call_expense':
        return <CreditCard size={iconSize} color={iconColor} />;
      default:
        return <DollarSign size={iconSize} color={iconColor} />;
    }
  };

  const getTransactionColor = (type: string) => {
    const isPositive =
      type === 'income' ||
      type === 'credit_purchase' ||
      type === 'call_earning';
    return isPositive ? theme.colors.success : theme.colors.error;
  };

  const getTransactionIconBackground = (type: string) => {
    const isPositive =
      type === 'income' ||
      type === 'credit_purchase' ||
      type === 'call_earning';
    return theme.name === 'light'
      ? isPositive
        ? '#dcfce7'
        : '#fee2e2'
      : isPositive
      ? 'rgba(48, 209, 88, 0.2)'
      : 'rgba(255, 69, 58, 0.2)';
  };

  const getTransactionAmount = (transaction: Transaction) => {
    const isPositive =
      transaction.type === 'income' ||
      transaction.type === 'credit_purchase' ||
      transaction.type === 'call_earning';
    return `${isPositive ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(
      2
    )}`;
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const iconColor = getTransactionColor(item.type);
    const iconBackground = getTransactionIconBackground(item.type);
    const isPositive =
      item.type === 'income' ||
      item.type === 'credit_purchase' ||
      item.type === 'call_earning';

    return (
      <Card
        style={[styles.transactionCard, { backgroundColor: theme.colors.card }]}
      >
        <TouchableOpacity style={styles.transactionItem} activeOpacity={0.7}>
          {/* Icon */}
          <View
            style={[styles.iconContainer, { backgroundColor: iconBackground }]}
          >
            {getTransactionIcon(item.type)}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {item.description || 'Transaction'}
            </Text>
            <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
              {formatTimestamp(item.created_at)}
            </Text>
            {item.status && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === 'completed' || item.status === 'success'
                        ? theme.colors.success + '20'
                        : theme.colors.error + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        item.status === 'completed' || item.status === 'success'
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            )}
          </View>

          {/* Amount */}
          <Text style={[styles.amount, { color: iconColor }]}>
            {getTransactionAmount(item)}
          </Text>
        </TouchableOpacity>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading transaction history..." />
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
            Failed to load transactions
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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

      <TabButtons
        options={filters}
        selectedKey={selectedFilter}
        onSelect={(key) => setSelectedFilter(key as any)}
      />

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <DollarSign size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No transactions
            </Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  listContent: {
    padding: 24,
  },
  transactionCard: {
    marginBottom: 12,
    padding: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
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
