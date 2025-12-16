import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { router, useSegments } from 'expo-router';
import {
  CreditCard,
  Plus,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useWalletBalance,
  useWalletTransactions,
  useMonthlyTransactions,
} from '@/hooks/useUser';
import { logger } from '@/lib/logger';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { SectionLoading } from '@/components/ui/SectionLoading';
import { InlineLoading } from '@/components/ui/InlineLoading';

interface CreditPackage {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const creditPackages: CreditPackage[] = [
  { id: '1', amount: 50, price: 49.99 },
  { id: '2', amount: 100, price: 89.99, bonus: 10 },
  { id: '3', amount: 250, price: 199.99, bonus: 50, popular: true },
  { id: '4', amount: 500, price: 349.99, bonus: 150 },
];

export default function WalletScreen() {
  const { theme } = useTheme();
  const segments = useSegments();
  const [selectedPackage, setSelectedPackage] = useState<string>('3'); // Default: 250 credits (popular)
  const [refreshing, setRefreshing] = useState(false);

  // Fetch wallet balance
  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useWalletBalance();

  // Fetch recent transactions (for display)
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useWalletTransactions(5, 0);

  // Fetch monthly transactions (for monthly change calculation)
  const {
    data: monthlyTransactions = [],
    refetch: refetchMonthlyTransactions,
  } = useMonthlyTransactions();

  // Refetch when screen comes into focus (after navigation from credit-selection)
  useEffect(() => {
    // Check if we're on the wallet tab
    const isOnWalletTab = segments[0] === '(tabs)' && segments[1] === 'wallet';
    if (isOnWalletTab) {
      // Small delay to ensure navigation is complete
      const timer = setTimeout(() => {
        refetchBalance();
        refetchTransactions();
        refetchMonthlyTransactions();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    segments,
    refetchBalance,
    refetchTransactions,
    refetchMonthlyTransactions,
  ]);

  // Calculate monthly change from all monthly transactions
  const monthlyChange = useMemo(() => {
    if (!monthlyTransactions || monthlyTransactions.length === 0) return 0;

    return monthlyTransactions.reduce((sum, tx) => {
      // Income/earning transactions add, expense transactions subtract
      if (
        tx.type === 'income' ||
        tx.type === 'credit_purchase' ||
        tx.type === 'call_earning'
      ) {
        return sum + tx.amount;
      } else if (tx.type === 'expenses' || tx.type === 'call_expense') {
        return sum - tx.amount;
      }
      return sum;
    }, 0);
  }, [monthlyTransactions]);

  const handlePurchase = (packageId: string, amount: number) => {
    setSelectedPackage(packageId);
    try {
      router.push(`/credit-selection?credits=${amount}`);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchBalance(), refetchTransactions()]);
    } catch (error) {
      logger.error('Error refreshing wallet data', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTransactionDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) {
        return 'Today, ' + format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return 'Yesterday, ' + format(date, 'h:mm a');
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch (error) {
      return dateString;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
      case 'credit_purchase':
      case 'call_earning':
        return Plus;
      case 'expenses':
      case 'call_expense':
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income':
      case 'credit_purchase':
      case 'call_earning':
        return theme.colors.success;
      case 'expenses':
      case 'call_expense':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const getTransactionAmount = (transaction: any) => {
    // TransactionType enum: 'income' | 'expenses' | 'credit_purchase' | 'call_earning' | 'call_expense'
    const isPositive =
      transaction.type === 'income' ||
      transaction.type === 'credit_purchase' ||
      transaction.type === 'call_earning';
    return `${isPositive ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(
      2
    )}`;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={true} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Balance */}
        <Card
          style={[
            styles.balanceCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.balanceHeader}>
            <Text
              style={[
                styles.balanceLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Current Balance
            </Text>
          </View>
          {balanceLoading ? (
            <SectionLoading size="large" style={{ marginVertical: 20 }} />
          ) : balanceError ? (
            <Text
              style={[
                styles.balanceAmount,
                { color: theme.colors.error, fontSize: 16 },
              ]}
            >
              Error loading balance
            </Text>
          ) : (
            <>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: theme.colors.primaryLight },
                ]}
              >
                {'$' + currentBalance.toFixed(2)}
              </Text>
              <View style={styles.balanceFooter}>
                {monthlyChange !== 0 && (
                  <View style={styles.balanceInfo}>
                    {monthlyChange > 0 ? (
                      <TrendingUp size={16} color={theme.colors.success} />
                    ) : (
                      <TrendingDown size={16} color={theme.colors.error} />
                    )}
                    <Text
                      style={[
                        styles.balanceChange,
                        {
                          color:
                            monthlyChange > 0
                              ? theme.colors.success
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {monthlyChange > 0 ? '+' : ''}
                      {'$' + Math.abs(monthlyChange).toFixed(2)} this month
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => {
                try {
                  router.push('/credit-selection');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  {
                    backgroundColor: theme.colors.surface,
                    borderWidth: theme.name === 'light' ? 1 : 0,
                    borderColor:
                      theme.name === 'light'
                        ? theme.colors.border
                        : 'transparent',
                    ...(theme.name === 'light'
                      ? Platform.OS === 'web'
                        ? { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
                        : {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                          }
                      : {}),
                  },
                ]}
              >
                <Plus size={24} color={theme.colors.warning} />
              </View>
              <Text
                style={[
                  styles.quickActionText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Add Credits
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              activeOpacity={0.7}
              onPress={() => {
                try {
                  router.push('/wallet-history');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  {
                    backgroundColor: theme.colors.surface,
                    borderWidth: theme.name === 'light' ? 1 : 0,
                    borderColor:
                      theme.name === 'light'
                        ? theme.colors.border
                        : 'transparent',
                    ...(theme.name === 'light'
                      ? Platform.OS === 'web'
                        ? { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
                        : {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                          }
                      : {}),
                  },
                ]}
              >
                <History size={24} color={theme.colors.primary} />
              </View>
              <Text
                style={[
                  styles.quickActionText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit Packages */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Buy Credits
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}
          >
            Purchase credits to connect with professionals. Unused credits never
            expire.
          </Text>

          <View style={styles.packagesGrid}>
            {creditPackages.map((pkg) => {
              const isSelected = selectedPackage === pkg.id;
              const isPopular = pkg.popular; // Only 250 has popular: true

              // Selected cards get the 250 style (yellow border, light yellow background)
              // Popular badge only shows on 250, regardless of selection
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor:
                        theme.name === 'dark'
                          ? theme.colors.creditColor || '#FFFFFF'
                          : theme.colors.creditColor || theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                    // Apply selected style - only border, no background
                    isSelected && {
                      borderColor: '#FFD60A', // Yellow border when selected
                      borderWidth: 3,
                    },
                    // 250 keeps its popular style when NOT selected
                    isPopular &&
                      !isSelected && {
                        borderColor: theme.colors.accent,
                        backgroundColor: theme.colors.accentLight || '#FFF3CD',
                      },
                  ]}
                  onPress={() => handlePurchase(pkg.id, pkg.amount)}
                  activeOpacity={0.8}
                >
                  {/* Popular badge only shows on 250, regardless of selection */}
                  {isPopular && (
                    <View
                      style={[
                        styles.popularBadge,
                        { backgroundColor: theme.colors.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.popularText,
                          { color: theme.colors.surface },
                        ]}
                      >
                        Popular
                      </Text>
                    </View>
                  )}

                  <View style={styles.packageHeader}>
                    <Text
                      style={[
                        styles.packageAmount,
                        {
                          color:
                            theme.name === 'dark'
                              ? '#000000'
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {'$' + pkg.amount}
                    </Text>
                    <Text
                      style={[
                        styles.packageCredits,
                        {
                          color:
                            theme.name === 'dark'
                              ? '#333333'
                              : theme.colors.textMuted,
                        },
                      ]}
                    >
                      credits
                    </Text>
                  </View>

                  {pkg.bonus && (
                    <View style={styles.bonusSection}>
                      <Text
                        style={[
                          styles.bonusText,
                          {
                            color: theme.colors.success,
                          },
                        ]}
                      >
                        {'+ $' + pkg.bonus + ' bonus'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.packageFooter}>
                    <Text
                      style={[
                        styles.packagePrice,
                        {
                          color: theme.colors.warning,
                        },
                      ]}
                    >
                      {'$' + pkg.price}
                    </Text>
                    <Text
                      style={[
                        styles.packageValue,
                        {
                          color:
                            theme.name === 'dark'
                              ? '#666666'
                              : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {'$' +
                        (pkg.price / (pkg.amount + (pkg.bonus || 0))).toFixed(
                          2
                        )}
                      /credit
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Activity
            </Text>
            {transactions.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  try {
                    router.push('/wallet-history');
                  } catch (error) {
                    console.error('Navigation error:', error);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.viewAllText, { color: theme.colors.primary }]}
                >
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Card style={styles.transactionCard}>
            {transactionsLoading ? (
              <InlineLoading message="Loading transactions..." size="small" />
            ) : transactionsError ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  Error loading transactions
                </Text>
                <TouchableOpacity
                  onPress={() => refetchTransactions()}
                  style={styles.retryButton}
                >
                  <Text
                    style={[styles.retryText, { color: theme.colors.primary }]}
                  >
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: theme.colors.textMuted }]}
                >
                  No transactions yet
                </Text>
              </View>
            ) : (
              transactions.map((transaction) => {
                const IconComponent = getTransactionIcon(transaction.type);
                const iconColor = getTransactionColor(transaction.type);
                const isPositive =
                  transaction.type === 'income' ||
                  transaction.type === 'credit_purchase' ||
                  transaction.type === 'call_earning';

                return (
                  <View key={transaction.id} style={styles.transaction}>
                    <View
                      style={[
                        styles.transactionIcon,
                        {
                          backgroundColor:
                            theme.name === 'light'
                              ? isPositive
                                ? '#dcfce7'
                                : '#fee2e2'
                              : isPositive
                              ? 'rgba(48, 209, 88, 0.2)'
                              : 'rgba(255, 69, 58, 0.2)',
                        },
                      ]}
                    >
                      <IconComponent size={20} color={iconColor} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text
                        style={[
                          styles.transactionTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {transaction.description || 'Transaction'}
                      </Text>
                      <Text
                        style={[
                          styles.transactionDate,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {formatTransactionDate(transaction.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.transactionAmount, { color: iconColor }]}
                    >
                      {getTransactionAmount(transaction)}
                    </Text>
                  </View>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // theme.colors.background → screen background
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // theme.colors.surface → button background
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  balanceCard: {
    // theme.colors.card → card background
    // theme.colors.border → card border
    marginBottom: 24,
    borderRadius: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // theme.colors.textSecondary → label text
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    // theme.colors.primaryLight → balance amount
    marginBottom: 12,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceChange: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    // theme.colors.success → positive change
    marginLeft: 6,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    // theme.colors.text → section title
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // theme.colors.textMuted → subtitle
    marginBottom: 20,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    // theme.colors.surface → icon background
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    // theme.colors.textSecondary → action label
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  packageCard: {
    width: '48%',
    // theme.colors.card → package card background
    // theme.colors.border → default border
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -40 }],
    // theme.colors.accent → popular badge background
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    // theme.colors.surface → badge text
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  packageAmount: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    // theme.colors.text → package amount
  },
  packageCredits: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    // theme.colors.textMuted → credits label
  },
  bonusSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  bonusText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    // theme.colors.success → bonus text
  },
  packageFooter: {
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    // theme.colors.warning → price
    marginBottom: 2,
  },
  packageValue: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    // theme.colors.textMuted → per-credit value
  },
  transactionCard: {
    padding: 0,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // Dynamic background based on theme and transaction type
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
    // theme.colors.text → transaction title
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    // theme.colors.textMuted → transaction date
  },
  transactionAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    // theme.colors.error (negative) / theme.colors.success (positive)
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
