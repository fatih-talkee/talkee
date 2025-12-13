// app/(tabs)/credits.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { stripeService } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/database.types';

// Conditional import for Stripe (native-only, doesn't work on web)
// Metro config handles web mock automatically
let useStripe: any = null;
let initPaymentSheet: any = null;
let presentPaymentSheet: any = null;

if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    useStripe = stripeModule.useStripe;
  } catch (error) {
    console.warn('Stripe module not available:', error);
  }
} else {
  // Web: Metro config will provide mock, but we can also handle here
  useStripe = () => ({
    initPaymentSheet: () => Promise.resolve({ error: null }),
    presentPaymentSheet: () => Promise.resolve({ error: null }),
  });
}
export default function CreditsScreen() {
  const stripe = useStripe ? useStripe() : null;
  const { user } = useAuth() as unknown as { user: User | null };
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<any>(null);

  // Web platform check
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Credits</Text>
          {credits ? (
            <>
              <Text style={styles.balanceAmount}>
                ${credits.balance?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.balanceSubtext}>
                Purchased: ${credits.total_purchased?.toFixed(2) || '0.00'} •
                Spent: ${credits.total_spent?.toFixed(2) || '0.00'}
              </Text>
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>
        <Text style={styles.sectionTitle}>Buy Credits</Text>
        <Text style={styles.webMessage}>
          Credit purchase is only available on mobile devices.
        </Text>
      </View>
    );
  }

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    if (!user) return;
    try {
      const data = await stripeService.getUserCredits(user.id);
      setCredits(data);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const buyCredits = async (amount: number) => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setLoading(true);
    try {
      // 1. Create payment intent
      console.log('Creating payment intent...');
      const { clientSecret } = await stripeService.createPaymentIntent(
        amount,
        user.id
      );

      if (!stripe) {
        Alert.alert('Error', 'Stripe is not available on this platform');
        setLoading(false);
        return;
      }

      // 2. Initialize payment sheet
      console.log('Initializing payment sheet...');
      const { error: initError } = await stripe.initPaymentSheet({
        merchantDisplayName: 'Talkee',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: user.name || 'User',
          email: user.primary_email || '',
        },
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        setLoading(false);
        return;
      }

      // 3. Present payment sheet
      console.log('Presenting payment sheet...');
      const { error: presentError } = await stripe.presentPaymentSheet();

      if (presentError) {
        Alert.alert('Payment Cancelled', presentError.message);
      } else {
        Alert.alert('Success', `$${amount} credits added!`);
        // Reload credits
        await loadCredits();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Credits Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Credits</Text>
        {credits ? (
          <>
            <Text style={styles.balanceAmount}>
              ${credits.balance?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.balanceSubtext}>
              Purchased: ${credits.total_purchased?.toFixed(2) || '0.00'} •
              Spent: ${credits.total_spent?.toFixed(2) || '0.00'}
            </Text>
          </>
        ) : (
          <ActivityIndicator />
        )}
      </View>

      {/* Purchase Options */}
      <Text style={styles.sectionTitle}>Buy Credits</Text>

      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={() => buyCredits(10)}
        disabled={loading}
      >
        <Text style={styles.purchaseButtonText}>Buy $10</Text>
        <Text style={styles.purchaseButtonSubtext}>Perfect for trying</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={() => buyCredits(50)}
        disabled={loading}
      >
        <Text style={styles.purchaseButtonText}>Buy $50</Text>
        <Text style={styles.purchaseButtonSubtext}>Most popular</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={() => buyCredits(100)}
        disabled={loading}
      >
        <Text style={styles.purchaseButtonText}>Buy $100</Text>
        <Text style={styles.purchaseButtonSubtext}>Best value</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#F8F9FA',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  webMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  purchaseButtonSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  webMessage2: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
});
