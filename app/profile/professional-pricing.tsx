import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';

export default function ProfessionalPricing() {
  const router = useRouter();
  const { theme } = useTheme();

  const [ratePerMinute, setRatePerMinute] = useState('10.00');
  const [minCallDuration, setMinCallDuration] = useState('5');
  const [acceptingCalls, setAcceptingCalls] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showMinDurationPicker, setShowMinDurationPicker] = useState(false);

  const minDurationOptions = ['1', '5', '10', '15'];

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Pricing settings saved successfully!');
    }, 1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo showBack backPosition="right" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Rate per Minute ($)</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            value={ratePerMinute}
            onChangeText={setRatePerMinute}
            placeholder="10.00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Minimum Call Duration</Text>
          <TouchableOpacity
            style={[styles.picker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            onPress={() => setShowMinDurationPicker(true)}
          >
            <Text style={[styles.pickerText, { color: theme.colors.text }]}>{minCallDuration} minutes</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Currently Accepting Calls</Text>
              <Text style={[styles.switchDescription, { color: theme.colors.textMuted }]}>
                Allow users to call you now
              </Text>
            </View>
            <Switch
              value={acceptingCalls}
              onValueChange={setAcceptingCalls}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={[styles.saveButtonText, { color: theme.colors.surface }]}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMinDurationPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMinDurationPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMinDurationPicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.pickerModalTitle, { color: theme.colors.text }]}>Select Minimum Duration</Text>
            {minDurationOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.pickerOption, option === minCallDuration && { backgroundColor: theme.colors.surface }]}
                onPress={() => {
                  setMinCallDuration(option);
                  setShowMinDurationPicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, { color: theme.colors.text }]}>{option} minutes</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
  },
  pickerModalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    textAlign: 'center',
  },
});
