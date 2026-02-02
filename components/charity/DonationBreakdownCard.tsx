import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { EarningsBreakdown, formatCurrency } from '@/lib/donationCalculator';

interface DonationBreakdownCardProps {
  breakdown: EarningsBreakdown;
}

export function DonationBreakdownCard({ breakdown }: DonationBreakdownCardProps) {
  const { theme } = useTheme();

  const rows = [
    {
      label: 'Gross Earnings',
      amount: breakdown.grossEarnings,
      color: theme.colors.text,
      bold: false,
    },
    {
      label: `Platform Fee (${(breakdown.platformCommissionRate * 100).toFixed(0)}%)`,
      amount: -breakdown.platformCommission,
      color: theme.colors.textSecondary,
      bold: false,
    },
    {
      label: `Charity Donation (${breakdown.donationPercentage}%)`,
      amount: -breakdown.donationAmount,
      color: theme.colors.success,
      bold: false,
    },
  ];

  return (
    <Card style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Earnings Breakdown
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

      {/* Breakdown rows */}
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: row.color,
                fontFamily: row.bold ? 'Inter-Bold' : 'Inter-Regular',
              },
            ]}
          >
            {row.label}
          </Text>
          <Text
            style={[
              styles.amount,
              {
                color: row.color,
                fontFamily: row.bold ? 'Inter-Bold' : 'Inter-Medium',
              },
            ]}
          >
            {row.amount >= 0 ? '' : '-'}
            {formatCurrency(Math.abs(row.amount), breakdown.currency)}
          </Text>
        </View>
      ))}

      {/* Final divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.divider, marginTop: 12 }]} />

      {/* Net payout */}
      <View style={styles.row}>
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.text,
              fontFamily: 'Inter-Bold',
            },
          ]}
        >
          Net Payout
        </Text>
        <Text
          style={[
            styles.amount,
            {
              color: theme.colors.pinkTwo,
              fontFamily: 'Inter-Bold',
              fontSize: 18,
            },
          ]}
        >
          {formatCurrency(breakdown.netEarnings, breakdown.currency)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
  amount: {
    fontSize: 15,
    textAlign: 'right',
  },
});
