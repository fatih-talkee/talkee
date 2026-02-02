import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  ChevronRight,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface BankAccount {
  id: string;
  bankName: string;
  holderName: string;
  iban: string;
  branchCode?: string;
  status: 'verified' | 'pending';
  createdAt: string;
}

export default function BankAccountScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  // Mock data - in real app would fetch from backend
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: '1',
      bankName: 'Akbank',
      holderName: 'John Doe',
      iban: 'TR330006100519786457841326',
      status: 'verified',
      createdAt: '2024-11-01',
    },
    {
      id: '2',
      bankName: 'İş Bankası',
      holderName: 'John Doe',
      iban: 'TR640001500158007326503803',
      status: 'pending',
      createdAt: '2024-11-10',
    },
  ]);

  const maskIBAN = (iban: string): string => {
    if (iban.length < 8) return iban;
    const first = iban.slice(0, 4);
    const last = iban.slice(-4);
    const middleLength = Math.min(iban.length - 8, 16);
    const middle = '•'.repeat(middleLength);
    return `${first} ${middle} ${last}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'verified') {
      return (
        <View style={styles.statusBadge}>
          <CheckCircle size={14} color={theme.colors.success} />
          <Text style={[styles.statusText, { color: theme.colors.success }]}>
            Verified
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.statusBadge}>
          <Clock size={14} color={theme.colors.warning} />
          <Text style={[styles.statusText, { color: theme.colors.warning }]}>
            Pending
          </Text>
        </View>
      );
    }
  };

  const handleDelete = (account: BankAccount) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to remove ${account.bankName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAccounts(accounts.filter((a) => a.id !== account.id));
            toast.success({
              title: 'Account Deleted',
              message: `${account.bankName} has been removed`,
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Bank Accounts"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {accounts.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
              <Building2 size={48} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No bank accounts added yet
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
              Add your first bank account to receive payments
            </Text>
          </View>
        ) : (
          /* Account List */
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Saved Accounts
            </Text>
            {accounts.map((account, index) => (
              <Card key={account.id} style={styles.accountCard}>
                <View style={styles.accountRow}>
                  <View style={[styles.bankIcon, { backgroundColor: theme.colors.surface }]}>
                    <Building2 size={24} color={theme.colors.pinkTwo} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.bankName, { color: theme.colors.text }]}>
                      {account.bankName}
                    </Text>
                    <Text style={[styles.holderName, { color: theme.colors.textSecondary }]}>
                      {account.holderName}
                    </Text>
                    <Text style={[styles.iban, { color: theme.colors.textMuted }]}>
                      {maskIBAN(account.iban)}
                    </Text>
                    {getStatusBadge(account.status)}
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleDelete(account)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Account Button - Fixed at Bottom */}
      <View style={[styles.addButtonContainer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={() => router.push('/transactions/add-bank-account')}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Bank Account</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  accountCard: {
    marginBottom: 16,
    padding: 16,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  holderName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  iban: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  addButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
