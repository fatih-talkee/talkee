import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { stripeService } from '@/services/supabase/stripe.service';
import { useCurrentUser } from '@/hooks/useUser';
import { useToast } from '@/lib/toastService';
import { useWalletBalance } from '@/hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from '@/hooks/useUser';

export default function CreditSelectionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { data: user } = useCurrentUser();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { refetch: refetchBalance } = useWalletBalance();
  const params = useLocalSearchParams();

  // Get initial credits from URL params or default to 50
  const initialCredits = params.credits
    ? parseInt(params.credits as string, 10)
    : 50;

  const [credits, setCredits] = useState(initialCredits);
  const [inputValue, setInputValue] = useState(initialCredits.toString());
  const [loading, setLoading] = useState(false);

  const MIN_CREDITS = 1;
  const MAX_CREDITS = 2000;
  const PRICE_PER_CREDIT = 1.0; // $1 per credit

  // Update credits when params change
  useEffect(() => {
    if (params.credits) {
      const newCredits = parseInt(params.credits as string, 10);
      if (
        !isNaN(newCredits) &&
        newCredits >= MIN_CREDITS &&
        newCredits <= MAX_CREDITS
      ) {
        setCredits(newCredits);
        setInputValue(newCredits.toString());
      }
    }
  }, [params.credits]);

  const handleDecrease = () => {
    if (credits > MIN_CREDITS) {
      const newValue = credits - 1;
      setCredits(newValue);
      setInputValue(newValue.toString());
    }
  };

  const handleIncrease = () => {
    if (credits < MAX_CREDITS) {
      const newValue = credits + 1;
      setCredits(newValue);
      setInputValue(newValue.toString());
    }
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);

    // Parse the input and validate
    const numericValue = parseInt(text, 10);
    if (!isNaN(numericValue)) {
      if (numericValue >= MIN_CREDITS && numericValue <= MAX_CREDITS) {
        setCredits(numericValue);
      } else if (numericValue < MIN_CREDITS) {
        setCredits(MIN_CREDITS);
      } else if (numericValue > MAX_CREDITS) {
        setCredits(MAX_CREDITS);
      }
    }
  };

  const handleInputBlur = () => {
    // Ensure input field shows the validated value
    // If input is empty or invalid, reset to current credits value
    const numericValue = parseInt(inputValue, 10);
    if (isNaN(numericValue) || numericValue < MIN_CREDITS) {
      setCredits(50); // Default to 50 if invalid
      setInputValue('50');
    } else {
      setInputValue(credits.toString());
    }
  };

  const totalPrice = credits * PRICE_PER_CREDIT;

  const handleContinue = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setLoading(true);
    try {
      // 1. Create payment intent
      const { clientSecret, paymentIntentId } =
        await stripeService.createPaymentIntent(totalPrice, user.id);

      if (!clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      // Helper function to convert rgba/rgb to hex (Stripe requires 6-character hex format, no alpha)
      const colorToHex = (
        color: string,
        fallback: string = '#FFFFFF'
      ): string => {
        // If already hex, validate and return
        if (color.startsWith('#')) {
          const hex = color.substring(1);
          // Stripe only accepts 6-character hex (RGB), not 8-character (RGBA)
          if (hex.length === 6) {
            return color;
          }
          // If 8-character hex, remove alpha channel
          if (hex.length === 8) {
            return `#${hex.substring(0, 6)}`;
          }
          // If invalid hex length, use fallback
          return fallback;
        }

        // If rgba/rgb format, convert to hex (ignore alpha for Stripe)
        const rgbaMatch = color.match(
          /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
        );
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1], 10);
          const g = parseInt(rgbaMatch[2], 10);
          const b = parseInt(rgbaMatch[3], 10);

          // Convert RGB to 6-character hex (Stripe format)
          const hex = [r, g, b]
            .map((x) => {
              const hexValue = x.toString(16);
              return hexValue.length === 1 ? '0' + hexValue : hexValue;
            })
            .join('');

          return `#${hex}`;
        }

        // Fallback: return provided fallback or default
        return fallback;
      };

      // 2. Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Talkee',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: user.name || 'User',
          email: user.primary_email || '',
        },
        allowsDelayedPaymentMethods: true,
        appearance: {
          colors: {
            primary: colorToHex(theme.colors.primary, '#6366F1'),
            background: colorToHex(theme.colors.background, '#FFFFFF'),
            componentBackground: colorToHex(theme.colors.card, '#F9FAFB'),
            componentBorder: colorToHex(theme.colors.border, '#E5E7EB'),
            componentDivider: colorToHex(theme.colors.border, '#E5E7EB'),
            primaryText: colorToHex(theme.colors.text, '#111827'),
            secondaryText: colorToHex(theme.colors.textMuted, '#6B7280'),
            componentText: colorToHex(theme.colors.text, '#111827'),
            placeholderText: colorToHex(theme.colors.textMuted, '#9CA3AF'),
          },
          shapes: {
            borderRadius: 12,
            borderWidth: 1,
          },
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Error', presentError.message);
        }
        // User cancelled, no need to show error
      } else {
        // Payment successful
        toast.success({
          title: 'Payment Successful! 💰',
          message: `You've successfully purchased ${credits.toLocaleString()} credits for $${totalPrice.toFixed(
            2
          )}.`,
        });

        // Invalidate and refetch wallet balance and transactions
        queryClient.invalidateQueries({ queryKey: userKeys.wallet() });
        // Explicitly invalidate transactions to ensure they refresh
        queryClient.invalidateQueries({ queryKey: userKeys.transactions() });
        await refetchBalance();

        // Invalidate notifications cache to show new notification
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        // Also refetch notifications to ensure they appear immediately
        queryClient.refetchQueries({ queryKey: ['notifications'] });

        // Navigate back to wallet
        setTimeout(() => {
          router.replace('/(tabs)/wallet');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Payment failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <Header showBack backRoute="/(tabs)/wallet" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.instructionSection}>
            <Text
              style={[styles.instructionText, { color: theme.colors.text }]}
            >
              Choose how many credits you want to buy.
            </Text>
          </View>

          <Card
            style={[
              styles.selectorCard,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>
              Credit Amount
            </Text>

            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: credits <= MIN_CREDITS ? 0.5 : 1,
                  },
                ]}
                onPress={handleDecrease}
                disabled={credits <= MIN_CREDITS}
              >
                <Minus size={24} color={theme.colors.text} />
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.creditInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    textAlign: 'center',
                    textAlignVertical: 'center',
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                    fontSize: 50,
                    height: Platform.OS === 'android' ? 80 : 70,
                    paddingVertical: 0,
                    paddingTop: Platform.OS === 'android' ? 0 : undefined,
                    includeFontPadding: false,
                  },
                ]}
                value={inputValue}
                onChangeText={handleInputChange}
                onBlur={handleInputBlur}
                keyboardType="numeric"
                textAlign="center"
                selectTextOnFocus
              />

              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: credits >= MAX_CREDITS ? 0.5 : 1,
                  },
                ]}
                onPress={handleIncrease}
                disabled={credits >= MAX_CREDITS}
              >
                <Plus size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.rangeInfo}>
              <Text
                style={[styles.rangeText, { color: theme.colors.textMuted }]}
              >
                Min: {MIN_CREDITS} • Max: {MAX_CREDITS.toLocaleString()}
              </Text>
            </View>
          </Card>

          <Card
            style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
              Purchase Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                You selected:
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {credits.toLocaleString()} credits
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Price per credit:
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {'$' + PRICE_PER_CREDIT.toFixed(2)}
              </Text>
            </View>

            <View
              style={[
                styles.summaryRow,
                styles.totalRow,
                { borderTopColor: theme.colors.divider },
              ]}
            >
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total Price:
              </Text>
              <Text
                style={[styles.totalValue, { color: theme.colors.pinkTwo }]}
              >
                {'$' + totalPrice.toFixed(2)}
              </Text>
            </View>
          </Card>

          <View style={styles.buttonContainer}>
            <Button
              title={loading ? 'Processing...' : 'Continue to Payment'}
              onPress={handleContinue}
              disabled={loading}
              style={[
                styles.continueButton,
                { backgroundColor: theme.colors.pinkTwo },
              ]}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  instructionSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  selectorCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 80,
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditInput: {
    width: 140,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginHorizontal: 16,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  rangeInfo: {
    marginTop: 8,
  },
  rangeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  summaryCard: {
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  continueButton: {
    width: '100%',
  },
});
