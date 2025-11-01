import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';

export default function ProfessionalFinancial() {
  const router = useRouter();
  const { theme } = useTheme();

  const [accountBalance] = useState('$1,245.50');
  const [lastPayout] = useState('Dec 1, 2025');
  const [loading, setLoading] = useState(false);

  const handleViewTransactions = () => {
    Alert.alert('Info', 'Transaction history will be displayed here');
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Financial settings saved successfully!');
    }, 1000);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.financialRow}>
            <Text
              style={[
                styles.financialLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Account Balance
            </Text>
            <Text style={[styles.financialValue, { color: theme.colors.text }]}>
              {accountBalance}
            </Text>
          </View>

          <View style={styles.financialRow}>
            <Text
              style={[
                styles.financialLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Last Payout
            </Text>
            <Text style={[styles.financialValue, { color: theme.colors.text }]}>
              {lastPayout}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.outlineButton,
              { borderColor: theme.colors.primary },
            ]}
            onPress={handleViewTransactions}
          >
            <Text
              style={[
                styles.outlineButtonText,
                { color: theme.colors.primary },
              ]}
            >
              View Transactions
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: (theme.colors as any).pinkTwo || theme.colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text
            style={[styles.saveButtonText, { color: theme.colors.surface }]}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  financialValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});
