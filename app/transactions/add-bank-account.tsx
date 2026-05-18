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
import { router } from 'expo-router';
import {
  Building2,
  User,
  CreditCard,
  Hash,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface FormData {
  bankName: string;
  holderName: string;
  iban: string;
  branchCode: string;
}

interface FormErrors {
  bankName: string;
  holderName: string;
  iban: string;
}

export default function AddBankAccountScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [formData, setFormData] = useState<FormData>({
    bankName: '',
    holderName: '',
    iban: '',
    branchCode: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    bankName: '',
    holderName: '',
    iban: '',
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      bankName: '',
      holderName: '',
      iban: '',
    };

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.holderName.trim()) {
      newErrors.holderName = 'Account holder name is required';
    }

    if (!formData.iban.trim()) {
      newErrors.iban = 'IBAN is required';
    } else if (formData.iban.replace(/\s/g, '').length < 24) {
      newErrors.iban = 'Please enter a valid IBAN (minimum 24 characters)';
    }

    setErrors(newErrors);
    return !newErrors.bankName && !newErrors.holderName && !newErrors.iban;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error({
        title: 'Validation Error',
        message: 'Please fill in all required fields correctly',
      });
      return;
    }

    // Simulate saving (in real app would call API)
    toast.success({
      title: 'Account Added',
      message: 'Your bank account has been added successfully',
    });

    // Navigate back
    setTimeout(() => {
      router.back();
    }, 500);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (field in errors && errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Add Bank Account"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          {/* Bank Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Bank Name *
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.bankName ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Building2 size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Enter bank name"
                placeholderTextColor={theme.colors.textMuted}
                value={formData.bankName}
                onChangeText={(text) => updateField('bankName', text)}
              />
            </View>
            {errors.bankName ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.bankName}
              </Text>
            ) : null}
          </View>

          {/* Account Holder Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Account Holder Name *
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.holderName ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <User size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Enter account holder name"
                placeholderTextColor={theme.colors.textMuted}
                value={formData.holderName}
                onChangeText={(text) => updateField('holderName', text)}
              />
            </View>
            {errors.holderName ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.holderName}
              </Text>
            ) : null}
          </View>

          {/* IBAN */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              IBAN / Account Number *
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.iban ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <CreditCard size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                placeholderTextColor={theme.colors.textMuted}
                value={formData.iban}
                onChangeText={(text) => updateField('iban', text)}
                autoCapitalize="characters"
              />
            </View>
            {errors.iban ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.iban}
              </Text>
            ) : null}
          </View>

          {/* Branch Code (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Branch Code (Optional)
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Hash size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Enter branch code"
                placeholderTextColor={theme.colors.textMuted}
                value={formData.branchCode}
                onChangeText={(text) => updateField('branchCode', text)}
              />
            </View>
          </View>

          {/* Info Note */}
          <View style={[styles.infoNote, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Account verification may take 1-2 business days. You will be notified once your account is verified.
            </Text>
          </View>
        </Card>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Bank Account</Text>
        </TouchableOpacity>
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
  formCard: {
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  infoNote: {
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
