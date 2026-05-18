import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  Wallet,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface Withdrawal {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  method: string;
}

export default function WithdrawScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string>('bank');
  const [amount, setAmount] = useState<string>('');

  const availableBalance = 998.00;
  const minimumWithdrawal = 50.00;

  const mockWithdrawals: Withdrawal[] = [
    {
      id: '1',
      date: 'Nov 1, 2024',
      amount: 500,
      status: 'paid',
      method: 'Bank Account',
    },
    {
      id: '2',
      date: 'Oct 15, 2024',
      amount: 450,
      status: 'paid',
      method: 'PayPal',
    },
    {
      id: '3',
      date: 'Sep 28, 2024',
      amount: 600,
      status: 'paid',
      method: 'Bank Account',
    },
  ];

  const paymentMethods = [
    { id: 'bank', label: 'Bank Account ****1234' },
    { id: 'paypal', label: 'PayPal' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} color={theme.colors.success} />;
      case 'pending':
        return <Clock size={16} color={theme.colors.warning} />;
      case 'failed':
        return <XCircle size={16} color={theme.colors.error} />;
      default:
        return null;
    }
  };

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);

    if (!amount || isNaN(withdrawAmount)) {
      toast.error({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount',
      });
      return;
    }

    if (withdrawAmount < minimumWithdrawal) {
      toast.error({
        title: 'Below Minimum',
        message: `Minimum withdrawal is $${minimumWithdrawal.toFixed(2)}`,
      });
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast.error({
        title: 'Insufficient Balance',
        message: `You only have $${availableBalance.toFixed(2)} available`,
      });
      return;
    }

    toast.success({
      title: 'Withdrawal Requested',
      message: `Your withdrawal of $${withdrawAmount.toFixed(2)} is being processed`,
    });
    setAmount('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Withdraw Earnings"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Available Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Wallet size={24} color={theme.colors.pinkTwo} />
            <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>
              Available Balance
            </Text>
          </View>
          <Text style={[styles.balanceAmount, { color: theme.colors.success }]}>
            ${availableBalance.toFixed(2)}
          </Text>
          <View style={[styles.balanceNote, { backgroundColor: theme.colors.surface }]}>
            <AlertCircle size={14} color={theme.colors.textMuted} />
            <Text style={[styles.balanceNoteText, { color: theme.colors.textSecondary }]}>
              Minimum withdrawal: ${minimumWithdrawal.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Payment Method
          </Text>
          <Card style={styles.methodsCard}>
            {paymentMethods.map((method, index) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodItem,
                  index === paymentMethods.length - 1 && styles.lastMethodItem,
                  { borderBottomColor: theme.colors.divider },
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={styles.methodLeft}>
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: theme.colors.pinkTwo },
                      selectedMethod === method.id && {
                        backgroundColor: theme.colors.pinkTwo,
                      },
                    ]}
                  >
                    {selectedMethod === method.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={[styles.methodText, { color: theme.colors.text }]}>
                    {method.label}
                  </Text>
                </View>
                <CreditCard size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Amount
          </Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[styles.withdrawButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={handleWithdraw}
        >
          <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
        </TouchableOpacity>

        {/* Recent Withdrawals */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Withdrawals
          </Text>
          {mockWithdrawals.map((withdrawal) => (
            <Card key={withdrawal.id} style={styles.withdrawalCard}>
              <View style={styles.withdrawalRow}>
                <View style={styles.withdrawalInfo}>
                  <Text style={[styles.withdrawalDate, { color: theme.colors.text }]}>
                    {withdrawal.date}
                  </Text>
                  <Text style={[styles.withdrawalMethod, { color: theme.colors.textMuted }]}>
                    {withdrawal.method}
                  </Text>
                </View>
                <View style={styles.withdrawalRight}>
                  <Text style={[styles.withdrawalAmount, { color: theme.colors.text }]}>
                    ${withdrawal.amount.toFixed(2)}
                  </Text>
                  <View style={styles.statusContainer}>
                    {getStatusIcon(withdrawal.status)}
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(withdrawal.status) },
                      ]}
                    >
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ))}
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
  balanceCard: {
    marginBottom: 24,
    padding: 20,
    alignItems: 'center',
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  balanceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  balanceNoteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  methodsCard: {
    padding: 0,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastMethodItem: {
    borderBottomWidth: 0,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  methodText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-Medium',
  },
  withdrawButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  withdrawalCard: {
    marginBottom: 12,
    padding: 16,
  },
  withdrawalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalDate: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  withdrawalMethod: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  withdrawalRight: {
    alignItems: 'flex-end',
  },
  withdrawalAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
});
