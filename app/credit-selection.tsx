import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';

export default function CreditSelectionScreen() {
  const { theme } = useTheme();
  const [credits, setCredits] = useState(50);
  const [inputValue, setInputValue] = useState('50');

  const MIN_CREDITS = 1;
  const MAX_CREDITS = 2000;
  const PRICE_PER_CREDIT = 1.00; // $1 per credit

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
    setInputValue(credits.toString());
  };

  const totalPrice = credits * PRICE_PER_CREDIT;

  const handleContinue = () => {
    router.push({
      pathname: '/purchase',
      params: {
        credits: credits.toString(),
        price: totalPrice.toFixed(2)
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        showBack
        backRoute="/(tabs)/wallet"
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.instructionSection}>
          <Text style={[styles.instructionText, { color: theme.colors.text }]}>
            Choose how many credits you want to buy.
          </Text>
        </View>

        <Card style={[styles.selectorCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Credit Amount</Text>
          
          <View style={styles.stepperContainer}>
            <TouchableOpacity 
              style={[
                styles.stepperButton, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: credits <= MIN_CREDITS ? 0.5 : 1
                }
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
                }
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
                  opacity: credits >= MAX_CREDITS ? 0.5 : 1
                }
              ]}
              onPress={handleIncrease}
              disabled={credits >= MAX_CREDITS}
            >
              <Plus size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.rangeInfo}>
            <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>
              Min: {MIN_CREDITS} • Max: {MAX_CREDITS.toLocaleString()}
            </Text>
          </View>
        </Card>

        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Purchase Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              You selected:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {credits.toLocaleString()} credits
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Price per credit:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              ${PRICE_PER_CREDIT.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.colors.divider }]}>
            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
              Total Price:
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.pinkTwo }]}>
              ${totalPrice.toFixed(2)}
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Continue to Payment"
            onPress={handleContinue}
            style={[styles.continueButton, { backgroundColor: theme.colors.pinkTwo }]}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    marginBottom: 16,
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
    width: 120,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginHorizontal: 16,
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