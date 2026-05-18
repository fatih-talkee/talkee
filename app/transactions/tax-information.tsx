import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Globe,
  Hash,
  MapPin,
  FileText,
  Calendar,
  X,
  Check,
  Upload,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface TaxInformation {
  fullName: string;
  dateOfBirth: string;
  country: string;
  taxId: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  stateProvince: string;
}

interface TaxFormErrors {
  fullName: string;
  dateOfBirth: string;
  country: string;
  taxId: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  stateProvince: string;
}

interface Country {
  code: string;
  name: string;
}

export default function TaxInformationScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [taxInfo, setTaxInfo] = useState<TaxInformation>({
    fullName: '',
    dateOfBirth: '',
    country: '',
    taxId: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    stateProvince: '',
  });

  const [errors, setErrors] = useState<TaxFormErrors>({
    fullName: '',
    dateOfBirth: '',
    country: '',
    taxId: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    stateProvince: '',
  });

  const [showCountrySelect, setShowCountrySelect] = useState(false);

  const countries: Country[] = [
    { code: 'US', name: 'United States' },
    { code: 'TR', name: 'Turkey' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'NL', name: 'Netherlands' },
  ];

  const updateField = (field: keyof TaxInformation, value: string) => {
    setTaxInfo({ ...taxInfo, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const selectCountry = (countryName: string) => {
    updateField('country', countryName);
    setShowCountrySelect(false);
  };

  const validateForm = (): boolean => {
    const newErrors: TaxFormErrors = {
      fullName: '',
      dateOfBirth: '',
      country: '',
      taxId: '',
      streetAddress: '',
      city: '',
      postalCode: '',
      stateProvince: '',
    };

    if (!taxInfo.fullName.trim()) {
      newErrors.fullName = 'Full legal name is required';
    }

    if (!taxInfo.dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    if (!taxInfo.country) {
      newErrors.country = 'Country is required';
    }

    if (!taxInfo.taxId.trim()) {
      newErrors.taxId = 'Tax ID is required';
    }

    if (!taxInfo.streetAddress.trim()) {
      newErrors.streetAddress = 'Street address is required';
    }

    if (!taxInfo.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!taxInfo.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }

    if (!taxInfo.stateProvince.trim()) {
      newErrors.stateProvince = 'State/Province is required';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error({
        title: 'Validation Error',
        message: 'Please fill in all required fields correctly',
      });
      return;
    }

    // In production, submit to backend
    toast.success({
      title: 'Tax Information Submitted',
      message: 'Your tax information has been saved successfully',
    });

    // Clear form
    setTaxInfo({
      fullName: '',
      dateOfBirth: '',
      country: '',
      taxId: '',
      streetAddress: '',
      city: '',
      postalCode: '',
      stateProvince: '',
    });
  };

  const handleUploadDocument = () => {
    toast.info({
      title: 'Coming Soon',
      message: 'Document upload will be available soon',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Tax Information"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Personal Information
          </Text>

          <Card style={styles.formCard}>
            {/* Full Legal Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Full Legal Name *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.fullName ? theme.colors.error : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <User size={20} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter your full legal name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={taxInfo.fullName}
                  onChangeText={(text) => updateField('fullName', text)}
                />
              </View>
              {errors.fullName ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.fullName}
                </Text>
              ) : null}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Date of Birth *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.dateOfBirth ? theme.colors.error : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Calendar size={20} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={theme.colors.textMuted}
                  value={taxInfo.dateOfBirth}
                  onChangeText={(text) => updateField('dateOfBirth', text)}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {errors.dateOfBirth ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.dateOfBirth}
                </Text>
              ) : null}
            </View>
          </Card>
        </View>

        {/* Tax Residence Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tax Residence
          </Text>

          <Card style={styles.formCard}>
            {/* Country Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Country of Tax Residence *
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.country ? theme.colors.error : theme.colors.border,
                  },
                ]}
                onPress={() => setShowCountrySelect(true)}
                activeOpacity={0.7}
              >
                <View style={styles.inputIconContainer}>
                  <Globe size={20} color={theme.colors.textMuted} />
                </View>
                <Text
                  style={[
                    styles.input,
                    {
                      color: taxInfo.country ? theme.colors.text : theme.colors.textMuted,
                      paddingTop: 18,
                    },
                  ]}
                >
                  {taxInfo.country || 'Select country'}
                </Text>
              </TouchableOpacity>
              {errors.country ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.country}
                </Text>
              ) : null}
            </View>

            {/* Tax ID Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Tax Identification Number (TIN) *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.taxId ? theme.colors.error : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Hash size={20} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter your tax ID"
                  placeholderTextColor={theme.colors.textMuted}
                  value={taxInfo.taxId}
                  onChangeText={(text) => updateField('taxId', text)}
                />
              </View>
              {errors.taxId ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.taxId}
                </Text>
              ) : null}
            </View>
          </Card>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Address
          </Text>

          <Card style={styles.formCard}>
            {/* Street Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Street Address *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.streetAddress ? theme.colors.error : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <MapPin size={20} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter street address"
                  placeholderTextColor={theme.colors.textMuted}
                  value={taxInfo.streetAddress}
                  onChangeText={(text) => updateField('streetAddress', text)}
                />
              </View>
              {errors.streetAddress ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.streetAddress}
                </Text>
              ) : null}
            </View>

            {/* City and Postal Code - Side by Side */}
            <View style={styles.rowInputGroup}>
              {/* City */}
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  City *
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: errors.city ? theme.colors.error : theme.colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="City"
                    placeholderTextColor={theme.colors.textMuted}
                    value={taxInfo.city}
                    onChangeText={(text) => updateField('city', text)}
                  />
                </View>
                {errors.city ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errors.city}
                  </Text>
                ) : null}
              </View>

              {/* Postal Code */}
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Postal Code *
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: errors.postalCode ? theme.colors.error : theme.colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Postal"
                    placeholderTextColor={theme.colors.textMuted}
                    value={taxInfo.postalCode}
                    onChangeText={(text) => updateField('postalCode', text)}
                  />
                </View>
                {errors.postalCode ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errors.postalCode}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* State/Province */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                State / Province *
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.stateProvince ? theme.colors.error : theme.colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter state or province"
                  placeholderTextColor={theme.colors.textMuted}
                  value={taxInfo.stateProvince}
                  onChangeText={(text) => updateField('stateProvince', text)}
                />
              </View>
              {errors.stateProvince ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.stateProvince}
                </Text>
              ) : null}
            </View>
          </Card>
        </View>

        {/* Optional Documents Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tax Documents (Optional)
          </Text>

          <Card style={styles.uploadCard}>
            <View style={styles.uploadContent}>
              <View style={[styles.uploadIcon, { backgroundColor: theme.colors.surface }]}>
                <FileText size={32} color={theme.colors.pinkTwo} />
              </View>
              <Text style={[styles.uploadTitle, { color: theme.colors.text }]}>
                Upload Tax Document
              </Text>
              <Text style={[styles.uploadDescription, { color: theme.colors.textSecondary }]}>
                W-9, W-8BEN, or other tax forms
              </Text>
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: theme.colors.border }]}
                onPress={handleUploadDocument}
                activeOpacity={0.7}
              >
                <Upload size={18} color={theme.colors.pinkTwo} />
                <Text style={[styles.uploadButtonText, { color: theme.colors.pinkTwo }]}>
                  Choose File
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Submit Tax Information</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountrySelect}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountrySelect(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Country
              </Text>
              <TouchableOpacity
                onPress={() => setShowCountrySelect(false)}
                style={styles.modalClose}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Country List */}
            <ScrollView style={styles.countryList}>
              {countries.map((country) => {
                const isSelected = taxInfo.country === country.name;

                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryItem,
                      { borderBottomColor: theme.colors.divider },
                    ]}
                    onPress={() => selectCountry(country.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.countryName, { color: theme.colors.text }]}>
                      {country.name}
                    </Text>
                    {isSelected && (
                      <Check size={20} color={theme.colors.pinkTwo} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  formCard: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowInputGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfInput: {
    flex: 1,
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
  uploadCard: {
    padding: 32,
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  modalClose: {
    padding: 4,
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  countryName: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});
