import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, Briefcase, DollarSign, Clock, Shield, Eye, EyeOff } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FormData {
  fullName: string;
  profession: string;
  categories: string[];
  ratePerMinute: string;
  callCriteria: string;
  minimumDuration: string;
  isAvailable: boolean;
  isPublic: boolean;
}

const availableCategories = [
  'Business', 'Technology', 'Health', 'Finance', 'Lifestyle', 'Education',
  'Design', 'Entertainment', 'Sports', 'Automotive', 'Photography', 'Gaming'
];

const minimumDurations = [
  { label: '5 minutes', value: '5' },
  { label: '10 minutes', value: '10' },
  { label: '15 minutes', value: '15' },
  { label: '20 minutes', value: '20' },
  { label: '30 minutes', value: '30' },
];

export default function BecomeProfessionalScreen() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    profession: '',
    categories: [],
    ratePerMinute: '',
    callCriteria: '',
    minimumDuration: '10',
    isAvailable: true,
    isPublic: true,
  });
  const [loading, setLoading] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const isMountedRef = useIsMounted();

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    // Mock submission
    setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        router.back();
        router.back();
      }
    }, 2000);
  };

  const selectedDuration = minimumDurations.find(d => d.value === formData.minimumDuration);

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack backRoute="/(tabs)/profile" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Become a Professional</Text>
          <Text style={styles.subtitle}>
            Set up your profile to start receiving paid calls from users seeking your expertise
          </Text>
        </View>

        <Card style={styles.formCard}>
          {/* Full Name */}
          <Input
            label="Full Name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({...formData, fullName: text})}
            placeholder="Enter your full name"
            leftIcon={<User size={20} color="#9E9E9E" />}
          />

          {/* Profession */}
          <Input
            label="Profession"
            value={formData.profession}
            onChangeText={(text) => setFormData({...formData, profession: text})}
            placeholder="e.g., Life Coach, Therapist, Business Consultant"
            leftIcon={<Briefcase size={20} color="#9E9E9E" />}
          />

          {/* Call Categories */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Call Categories</Text>
            <Text style={styles.fieldHint}>Select the types of calls you want to receive</Text>
            <View style={styles.categoriesGrid}>
              {availableCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    formData.categories.includes(category) && styles.categoryChipSelected
                  ]}
                  onPress={() => handleCategoryToggle(category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    formData.categories.includes(category) && styles.categoryChipTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Per-Minute Rate */}
          <View style={styles.fieldGroup}>
            <Input
              label="Per-Minute Rate"
              value={formData.ratePerMinute}
              onChangeText={(text) => setFormData({...formData, ratePerMinute: text})}
              placeholder="10.00"
              keyboardType="decimal-pad"
              leftIcon={<DollarSign size={20} color="#9E9E9E" />}
            />
            <Text style={styles.fieldHint}>This is what you'll earn per minute of call time</Text>
          </View>

          {/* Call Criteria */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Call Criteria</Text>
            <Text style={styles.fieldHint}>Set requirements for who can contact you</Text>
            <View style={styles.criteriaOptions}>
              <TouchableOpacity style={styles.criteriaOption}>
                <View style={styles.checkbox}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={styles.criteriaText}>Only verified users</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.criteriaOption}>
                <View style={styles.checkbox}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={styles.criteriaText}>Payment required upfront</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.criteriaOption}>
                <View style={[styles.checkbox, styles.checkboxUnchecked]} />
                <Text style={styles.criteriaText}>No anonymous callers</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Minimum Call Duration */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Minimum Call Duration</Text>
            <Text style={styles.fieldHint}>Prevent calls shorter than this duration</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowDurationDropdown(!showDurationDropdown)}
            >
              <Clock size={20} color="#9E9E9E" />
              <Text style={styles.dropdownText}>{selectedDuration?.label}</Text>
              <ArrowLeft 
                size={16} 
                color="#9E9E9E" 
                style={{ transform: [{ rotate: showDurationDropdown ? '90deg' : '-90deg' }] }} 
              />
            </TouchableOpacity>
            
            {showDurationDropdown && (
              <View style={styles.dropdownMenu}>
                {minimumDurations.map((duration) => (
                  <TouchableOpacity
                    key={duration.value}
                    style={[
                      styles.dropdownItem,
                      formData.minimumDuration === duration.value && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setFormData({...formData, minimumDuration: duration.value});
                      setShowDurationDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      formData.minimumDuration === duration.value && styles.dropdownItemTextSelected
                    ]}>
                      {duration.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Availability Toggle */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleLabel}>Available for Calls</Text>
              <Text style={styles.toggleHint}>Users can see you're online and ready</Text>
            </View>
            <Switch
              value={formData.isAvailable}
              onValueChange={(value) => setFormData({...formData, isAvailable: value})}
              trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Profile Visibility Toggle */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleLabelRow}>
                <Text style={styles.toggleLabel}>Public Profile</Text>
                {formData.isPublic ? (
                  <Eye size={16} color="#30D158" />
                ) : (
                  <EyeOff size={16} color="#9E9E9E" />
                )}
              </View>
              <Text style={styles.toggleHint}>
                {formData.isPublic 
                  ? 'Your profile appears in public searches' 
                  : 'Your profile is private and hidden from searches'
                }
              </Text>
            </View>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => setFormData({...formData, isPublic: value})}
              trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>
      </ScrollView>

      {/* Sticky Save Button */}
      <View style={styles.saveButtonContainer}>
        <Button
          title={loading ? "Setting up your profile..." : "Save & Become Professional"}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: '#2C2C2E',
    marginBottom: 100,
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    marginBottom: 12,
    lineHeight: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3A3A3C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  criteriaOptions: {
    gap: 12,
  },
  criteriaOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxUnchecked: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkmark: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  criteriaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  dropdownMenu: {
    backgroundColor: '#3A3A3C',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownItemSelected: {
    backgroundColor: '#007AFF',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  dropdownItemTextSelected: {
    fontFamily: 'Inter-Bold',
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  toggleLeft: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toggleHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9E9E9E',
    lineHeight: 16,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    width: '100%',
  },
});