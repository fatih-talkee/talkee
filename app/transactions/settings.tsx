import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  CreditCard,
  Bell,
  Globe,
  FileText,
  ChevronRight,
  Wallet,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';
import { router } from 'expo-router';

export default function TransactionSettingsScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const handleComingSoon = (feature: string) => {
    toast.info({
      title: 'Coming Soon',
      message: `${feature} settings will be available soon`,
    });
  };

  const payoutMethods = [
    {
      id: 'bank',
      label: 'Bank Account',
      icon: <CreditCard size={20} color="#3b82f6" />,
      onPress: () => router.push('/transactions/bank-account'),
    },
    {
      id: 'paypal',
      label: 'PayPal',
      icon: <Wallet size={20} color="#0070ba" />,
      onPress: () => router.push('/transactions/paypal'),
    },
    {
      id: 'stripe',
      label: 'Stripe Connect',
      icon: <CreditCard size={20} color="#635bff" />,
      onPress: () => router.push('/transactions/stripe-connect'),
    },
  ];

  const preferences = [
    {
      id: 'currency',
      label: 'Currency Format',
      icon: <Globe size={20} color="#64748b" />,
      onPress: () => router.push('/transactions/currency-format'),
    },
    {
      id: 'notifications',
      label: 'Payout Notifications',
      icon: <Bell size={20} color="#64748b" />,
      onPress: () => router.push('/transactions/payout-notification'),
    },
    {
      id: 'tax',
      label: 'Tax Information',
      icon: <FileText size={20} color="#64748b" />,
      onPress: () => router.push('/transactions/tax-information'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Transaction Settings"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Payout Methods Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Payout Methods
          </Text>
          <Card style={styles.menuCard}>
            {payoutMethods.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === payoutMethods.length - 1 && styles.lastMenuItem,
                  { borderBottomColor: theme.colors.divider },
                ]}
                onPress={item.onPress}
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

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Preferences
          </Text>
          <Card style={styles.menuCard}>
            {preferences.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === preferences.length - 1 && styles.lastMenuItem,
                  { borderBottomColor: theme.colors.divider },
                ]}
                onPress={item.onPress}
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
