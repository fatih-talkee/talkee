import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard, Check } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SavedCard {
  id: string;
  lastFour: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
}

const savedCards: SavedCard[] = [
  { id: '1', lastFour: '1234', brand: 'Visa', expiryMonth: '12', expiryYear: '25' },
  { id: '2', lastFour: '5678', brand: 'Mastercard', expiryMonth: '08', expiryYear: '26' },
];

export default function PurchaseScreen() {
  const { theme } = useTheme();
  const { credits, price } = useLocalSearchParams();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useIsMounted();
  const [newCardData, setNewCardData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardholderName: '',
  });

  const creditsAmount = parseInt(credits as string) || 50;
  const totalPrice = parseFloat(price as string) || 50.00;

  const handleCardSelection = (cardId: string) => {
    setSelectedCard(cardId);
    setUseNewCard(false);
  };

  const handleUseNewCard = () => {
    setUseNewCard(true);
    setSelectedCard(null);
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiry = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setNewCardData({ ...newCardData, cardNumber: formatted });
  };

  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiry(text);
    setNewCardData({ ...newCardData, expiry: formatted });
  };

  const handleCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setNewCardData({ ...newCardData, cvv: cleaned.substring(0, 4) });
  };

  const isFormValid = () => {
    if (selectedCard) return true;
    if (useNewCard) {
      return (
        newCardData.cardNumber.replace(/\s/g, '').length >= 13 &&
        newCardData.expiry.length === 5 &&
        newCardData.cvv.length >= 3 &&
        newCardData.cardholderName.trim().length > 0
      );
    }
    return false;
  };

  const handlePurchase = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        
        Alert.alert(
          'Purchase Successful!',
          `You've successfully purchased ${creditsAmount} credits for $${totalPrice.toFixed(2)}.`,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/wallet')
            }
          ]
        );
      }
    }, 2000);
  };

  const getBrandIcon = (brand: string) => {
    // In a real app, you'd use actual card brand icons
    return <CreditCard size={20} color={theme.colors.text} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        title="Purchase Credits"
        leftButton={
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.colors.card }]}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Selected Package */}
          <Card style={[styles.packageCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.packageTitle, { color: theme.colors.text }]}>Selected Package</Text>
            <Text style={[styles.packageCredits, { color: theme.colors.pinkTwo }]}>
              {creditsAmount.toLocaleString()} credits
            </Text>
            <Text style={[styles.packagePrice, { color: theme.colors.textSecondary }]}>
              ${totalPrice.toFixed(2)}
            </Text>
          </Card>

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Choose Payment Method</Text>
            
            {/* Saved Cards */}
            <View style={styles.savedCards}>
              {savedCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.savedCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: selectedCard === card.id ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                  onPress={() => handleCardSelection(card.id)}
                >
                  <View style={styles.cardLeft}>
                    {getBrandIcon(card.brand)}
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardBrand, { color: theme.colors.text }]}>{card.brand}</Text>
                      <Text style={[styles.cardNumber, { color: theme.colors.textMuted }]}>
                        •••• •••• •••• {card.lastFour}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    {selectedCard === card.id && (
                      <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
                        <Check size={16} color="#ffffff" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>Or Add New Card</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* New Card Option */}
            <TouchableOpacity
              style={[
                styles.newCardButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: useNewCard ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={handleUseNewCard}
            >
              <CreditCard size={20} color={theme.colors.text} />
              <Text style={[styles.newCardText, { color: theme.colors.text }]}>Add New Card</Text>
              {useNewCard && (
                <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
                  <Check size={16} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* New Card Form */}
            {useNewCard && (
              <Card style={[styles.newCardForm, { backgroundColor: theme.colors.card }]}>
                <Input
                  label="Card Number"
                  value={newCardData.cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="numeric"
                  leftIcon={<CreditCard size={20} color={theme.colors.textMuted} />}
                />

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Input
                      label="Expiry"
                      value={newCardData.expiry}
                      onChangeText={handleExpiryChange}
                      placeholder="MM/YY"
                      keyboardType="numeric"
                      style={styles.halfInput}
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <Input
                      label="CVV"
                      value={newCardData.cvv}
                      onChangeText={handleCvvChange}
                      placeholder="123"
                      keyboardType="numeric"
                      secureTextEntry
                      style={styles.halfInput}
                    />
                  </View>
                </View>

                <Input
                  label="Cardholder Name"
                  value={newCardData.cardholderName}
                  onChangeText={(text) => setNewCardData({ ...newCardData, cardholderName: text })}
                  placeholder="John Doe"
                  autoCapitalize="words"
                />
              </Card>
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
          <Button
            title={loading ? "Processing..." : `Pay $${totalPrice.toFixed(2)}`}
            onPress={handlePurchase}
            disabled={!isFormValid() || loading}
            style={[styles.payButton, { backgroundColor: theme.colors.pinkTwo }]}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  packageCard: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  packageCredits: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  savedCards: {
    gap: 12,
    marginBottom: 24,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardInfo: {
    marginLeft: 12,
  },
  cardBrand: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginHorizontal: 16,
  },
  newCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  newCardText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
    flex: 1,
  },
  newCardForm: {
    marginBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  halfInput: {
    marginBottom: 0,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  payButton: {
    width: '100%',
  },
});