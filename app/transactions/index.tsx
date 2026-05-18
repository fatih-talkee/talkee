import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import {
  Settings,
  Wallet,
  FileText,
  ChevronRight,
  DollarSign,
  Clock,
  TrendingUp,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { DonationSummaryCard } from '@/components/charity/DonationSummaryCard';
import { getTotalDonated } from '@/mockData/donations';
import { mockDonations } from '@/mockData/donations';

interface EarningsData {
  totalConversationTime: { hours: number; minutes: number };
  totalEarnings: number;
  commissionRate: number;
  netEarnings: number;
}

export default function TransactionsDashboardScreen() {
  const { theme } = useTheme();

  // Mock earnings data
  const mockEarnings: EarningsData = {
    totalConversationTime: { hours: 42, minutes: 15 },
    totalEarnings: 1247.50,
    commissionRate: 0.20, // 20%
    netEarnings: 998.00,
  };

  const commissionAmount = mockEarnings.totalEarnings * mockEarnings.commissionRate;

  // Mock charity settings - in production, this would come from user's profile
  const mockCharitySettings = {
    enabled: true,
    donationPercentage: 10,
    selectedCharityId: '1', // Global Education Fund
    charityName: 'Global Education Fund',
  };

  // Calculate total donated (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDonations = mockDonations.filter(d => d.date >= thirtyDaysAgo);
  const totalDonated = getTotalDonated(recentDonations);

  const menuItems = [
    {
      id: 'settings',
      label: 'Transaction Settings',
      icon: <Settings size={20} color="#64748b" />,
      route: '/transactions/settings',
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: <Wallet size={20} color="#10b981" />,
      route: '/transactions/withdraw',
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <FileText size={20} color="#3b82f6" />,
      route: '/invoices',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Transactions"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Overview Card */}
        <Card style={styles.earningsCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Earnings Overview
          </Text>

          {/* Total Conversation Time */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Clock size={16} color={theme.colors.textMuted} />
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                Total Conversation Time
              </Text>
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {mockEarnings.totalConversationTime.hours}h {mockEarnings.totalConversationTime.minutes}m
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Gross Earnings */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <TrendingUp size={16} color={theme.colors.success} />
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                Total Earnings (Gross)
              </Text>
            </View>
            <Text style={[styles.earningsValue, { color: theme.colors.success }]}>
              ${mockEarnings.totalEarnings.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Commission */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <DollarSign size={16} color={theme.colors.textMuted} />
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                Commission ({(mockEarnings.commissionRate * 100).toFixed(0)}%)
              </Text>
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textSecondary }]}>
              - ${commissionAmount.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Net Earnings */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Wallet size={16} color={theme.colors.pinkTwo} />
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                Net Earnings
              </Text>
            </View>
            <Text style={[styles.netValue, { color: theme.colors.pinkTwo }]}>
              ${mockEarnings.netEarnings.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Charity Donation Summary */}
        {mockCharitySettings.enabled && (
          <DonationSummaryCard
            totalDonated={totalDonated}
            donationPercentage={mockCharitySettings.donationPercentage}
            charityName={mockCharitySettings.charityName}
            currency="USD"
            period="Last 30 days"
            onViewMore={() => router.push('/charity/history')}
          />
        )}

        {/* Menu Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Manage
          </Text>
          <Card style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && styles.lastMenuItem,
                  { borderBottomColor: theme.colors.divider },
                ]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuItemIcon}>{item.icon}</View>
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                    {item.label}
                  </Text>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.name === 'dark' ? '#FFFFFF' : theme.colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  earningsCard: {
    marginBottom: 24,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  earningsValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  netValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});
