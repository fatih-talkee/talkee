import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CreditCard, Plus, History, Download, TrendingUp } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FilterModal } from '@/components/filters/FilterModal';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [currentBalance] = useState(127.50);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: [0, 100] as [number, number],
    rating: 0,
    availability: 'all' as 'all' | 'online' | 'quick-response',
    categories: [] as string[],
  });

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    console.log('Purchase package:', packageId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={true}
        rightButton={
          <TouchableOpacity style={[styles.historyButton, { backgroundColor: theme.colors.surface }]}>
            <History size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <Card style={[styles.balanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Current Balance</Text>
            <TouchableOpacity>
              <Download size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.balanceAmount, { color: theme.colors.primaryLight }]}>${currentBalance.toFixed(2)}</Text>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceInfo}>
              <TrendingUp size={16} color={theme.colors.success} />
              <Text style={[styles.balanceChange, { color: theme.colors.success }]}>+$25.00 this month</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/credit-selection')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.surface }]}>
                <Plus size={24} color={theme.colors.warning} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>Add Credits</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.surface }]}>
                <History size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.surface }]}>
                <Download size={24} color={theme.colors.success} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit Packages */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Buy Credits</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
            Purchase credits to connect with professionals. Unused credits never expire.
          </Text>
          
          <View style={styles.packagesGrid}>
            {creditPackages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  {
                    backgroundColor: theme.colors.creditColor,
                    borderColor: theme.colors.border,
                  },
                  pkg.popular && {
                    borderColor: theme.colors.accent,
                    backgroundColor: theme.colors.accentLight,
                  },
                  selectedPackage === pkg.id && {
                    borderColor: theme.colors.accent,
                    backgroundColor: theme.colors.accentLight,
                  }
                ]}
                onPress={() => handlePurchase(pkg.id)}
                activeOpacity={0.8}
              >
                {pkg.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: theme.colors.accent }]}>
                    <Text style={[styles.popularText, { color: theme.colors.surface }]}>Popular</Text>
                  </View>
                )}

                <View style={styles.packageHeader}>
                  <Text style={[styles.packageAmount, { color: theme.colors.ƒtext }]}>${pkg.amount}</Text>
                  <Text style={[styles.packageCredits, { color: theme.colors.textMuted }]}>credits</Text>
                </View>

                {pkg.bonus && (
                  <View style={styles.bonusSection}>
                    <Text style={[styles.bonusText, { color: theme.colors.success }]}>+ ${pkg.bonus} bonus</Text>
                  </View>
                )}

                <View style={styles.packageFooter}>
                  <Text style={[styles.packagePrice, { color: theme.colors.warning }]}>${pkg.price}</Text>
                  <Text style={[styles.packageValue, { color: theme.colors.textMuted }]}>
                    ${(pkg.price / (pkg.amount + (pkg.bonus || 0))).toFixed(2)}/credit
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
          <Card style={styles.transactionCard}>
            <View style={[styles.transaction, { borderBottomColor: theme.colors.divider }]}>
              <View style={[styles.transactionIcon, { backgroundColor: theme.name === 'light' ? '#fee2e2' : 'rgba(255, 69, 58, 0.2)' }]}>
                <CreditCard size={20} color={theme.colors.error} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>Call with Dr. Sarah Chen</Text>
                <Text style={[styles.transactionDate, { color: theme.colors.textMuted }]}>Today, 2:30 PM</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: theme.colors.error }]}>-$21.25</Text>
            </View>

            <View style={[styles.transaction, { borderBottomColor: theme.colors.divider }]}>
              <View style={[styles.transactionIcon, { backgroundColor: theme.name === 'light' ? '#dcfce7' : 'rgba(48, 209, 88, 0.2)' }]}>
                <Plus size={20} color={theme.colors.success} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>Credits Added</Text>
                <Text style={[styles.transactionDate, { color: theme.colors.textMuted }]}>Yesterday, 4:15 PM</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: theme.colors.success }]}>+$100.00</Text>
            </View>

            <View style={styles.transaction}>
              <View style={[styles.transactionIcon, { backgroundColor: theme.name === 'light' ? '#fee2e2' : 'rgba(255, 69, 58, 0.2)' }]}>
                <CreditCard size={20} color={theme.colors.error} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>Call with Marcus Thompson</Text>
                <Text style={[styles.transactionDate, { color: theme.colors.textMuted }]}>Jan 19, 2:15 PM</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: theme.colors.error }]}>-$180.00</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={() => {}}
        initialFilters={filters}
      />
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
    borderBottomWidth: 1,
    // theme.colors.divider → transaction separator
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
});