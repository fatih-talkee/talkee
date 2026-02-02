import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import {
  Globe,
  Check,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { TabButtons, TabOption } from '@/components/ui/TabButtons';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'TRY' | 'AUD' | 'CAD';
type DisplayStyle = 'before' | 'after' | 'iso' | 'none';
type DecimalFormat = '12.00' | '12.0' | '12' | '12,00';
type ThousandSeparator = 'comma' | 'dot' | 'space' | 'none';

interface CurrencyFormatState {
  currency: CurrencyCode;
  displayStyle: DisplayStyle;
  decimalFormat: DecimalFormat;
  thousandSeparator: ThousandSeparator;
}

interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export default function CurrencyFormatScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [format, setFormat] = useState<CurrencyFormatState>({
    currency: 'USD',
    displayStyle: 'before',
    decimalFormat: '12.00',
    thousandSeparator: 'comma',
  });

  const [hasChanges, setHasChanges] = useState(false);

  const currencies: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  ];

  const displayStyleOptions: TabOption[] = [
    { key: 'before', label: '$12.00' },
    { key: 'after', label: '12.00$' },
    { key: 'iso', label: 'USD 12' },
    { key: 'none', label: '12.00' },
  ];

  const decimalFormatOptions: TabOption[] = [
    { key: '12.00', label: '12.00' },
    { key: '12.0', label: '12.0' },
    { key: '12', label: '12' },
    { key: '12,00', label: '12,00' },
  ];

  const separatorOptions: TabOption[] = [
    { key: 'comma', label: 'Comma' },
    { key: 'dot', label: 'Dot' },
    { key: 'space', label: 'Space' },
    { key: 'none', label: 'None' },
  ];

  const updateFormat = (field: keyof CurrencyFormatState, value: any) => {
    setFormat({ ...format, [field]: value });
    setHasChanges(true);
  };

  const formatPreviewAmount = (): string => {
    const amount = 1234.56;
    const selectedCurrency = currencies.find(c => c.code === format.currency)!;

    let integerPart = '1234';
    let decimalPart = '';

    // Apply thousand separator
    switch (format.thousandSeparator) {
      case 'comma':
        integerPart = '1,234';
        break;
      case 'dot':
        integerPart = '1.234';
        break;
      case 'space':
        integerPart = '1 234';
        break;
      case 'none':
        integerPart = '1234';
        break;
    }

    // Apply decimal format
    switch (format.decimalFormat) {
      case '12.00':
        decimalPart = format.thousandSeparator === 'dot' ? ',56' : '.56';
        break;
      case '12.0':
        decimalPart = format.thousandSeparator === 'dot' ? ',6' : '.6';
        break;
      case '12':
        decimalPart = '';
        break;
      case '12,00':
        decimalPart = ',56';
        break;
    }

    const formattedNumber = `${integerPart}${decimalPart}`;

    // Apply display style
    switch (format.displayStyle) {
      case 'before':
        return `${selectedCurrency.symbol}${formattedNumber}`;
      case 'after':
        return `${formattedNumber}${selectedCurrency.symbol}`;
      case 'iso':
        return `${selectedCurrency.code} ${formattedNumber}`;
      case 'none':
        return formattedNumber;
      default:
        return formattedNumber;
    }
  };

  const handleSave = () => {
    if (!hasChanges) return;

    // In production, save to backend
    toast.success({
      title: 'Settings Saved',
      message: 'Your currency format preferences have been updated',
    });

    setHasChanges(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Currency Format"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Currency Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Default Currency
          </Text>
          <Card style={styles.menuCard}>
            {currencies.map((currency, index) => {
              const isSelected = format.currency === currency.code;

              return (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyItem,
                    index === currencies.length - 1 && styles.lastMenuItem,
                    { borderBottomColor: theme.colors.divider },
                  ]}
                  onPress={() => updateFormat('currency', currency.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.currencyLeft}>
                    <View style={[styles.currencyIcon, { backgroundColor: theme.colors.surface }]}>
                      <Globe size={20} color={theme.colors.pinkTwo} />
                    </View>
                    <View style={styles.currencyInfo}>
                      <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                        {currency.code} ({currency.symbol})
                      </Text>
                      <Text style={[styles.currencyName, { color: theme.colors.textSecondary }]}>
                        {currency.name}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Check size={20} color={theme.colors.pinkTwo} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>

        {/* Display Style */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Currency Display Style
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Choose how the currency symbol appears
          </Text>
          <TabButtons
            options={displayStyleOptions}
            selectedKey={format.displayStyle}
            onSelect={(key) => updateFormat('displayStyle', key as DisplayStyle)}
            showWrapper={false}
            containerStyle={styles.tabContainer}
          />
        </View>

        {/* Decimal Format */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Decimal Format
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Choose how decimals are displayed
          </Text>
          <TabButtons
            options={decimalFormatOptions}
            selectedKey={format.decimalFormat}
            onSelect={(key) => updateFormat('decimalFormat', key as DecimalFormat)}
            showWrapper={false}
            containerStyle={styles.tabContainer}
          />
        </View>

        {/* Thousand Separator */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Thousand Separator
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Choose how large numbers are separated
          </Text>
          <TabButtons
            options={separatorOptions}
            selectedKey={format.thousandSeparator}
            onSelect={(key) => updateFormat('thousandSeparator', key as ThousandSeparator)}
            showWrapper={false}
            containerStyle={styles.tabContainer}
          />
        </View>

        {/* Preview Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Preview
          </Text>
          <Card style={styles.previewCard}>
            <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
              Example amount
            </Text>
            <Text style={[styles.previewAmount, { color: theme.colors.text }]}>
              {formatPreviewAmount()}
            </Text>
          </Card>
        </View>

        {/* Bottom spacing for fixed button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button - Fixed at Bottom */}
      <View style={[styles.saveButtonContainer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: theme.colors.pinkTwo },
            !hasChanges && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={!hasChanges}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Format</Text>
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  menuCard: {
    padding: 0,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  tabContainer: {
    flexWrap: 'wrap',
  },
  previewCard: {
    padding: 32,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  previewAmount: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  bottomSpacer: {
    height: 20,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
