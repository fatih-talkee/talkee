import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Heart, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/donationCalculator';

interface DonationSummaryCardProps {
  totalDonated: number;
  donationPercentage: number;
  charityName: string;
  currency: 'USD' | 'TRY' | 'EUR';
  period?: string;
  onViewMore?: () => void;
}

export function DonationSummaryCard({
  totalDonated,
  donationPercentage,
  charityName,
  currency,
  period = 'this month',
  onViewMore,
}: DonationSummaryCardProps) {
  const { theme } = useTheme();

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Heart size={20} color={theme.colors.success} fill={theme.colors.success} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Charity Donations
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

      {/* Amount */}
      <View style={styles.amountSection}>
        <Text style={[styles.amount, { color: theme.colors.success }]}>
          {formatCurrency(totalDonated, currency)}
        </Text>
        <Text style={[styles.period, { color: theme.colors.textMuted }]}>
          donated {period}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
          {donationPercentage}% of earnings → {charityName}
        </Text>
      </View>

      {/* View More Button */}
      {onViewMore && (
        <TouchableOpacity
          onPress={onViewMore}
          style={styles.viewMoreButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewMoreText, { color: theme.colors.pinkTwo }]}>
            View More
          </Text>
          <ChevronRight size={16} color={theme.colors.pinkTwo} />
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  amountSection: {
    marginBottom: 12,
  },
  amount: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  period: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  infoRow: {
    marginBottom: 16,
  },
  info: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
});
