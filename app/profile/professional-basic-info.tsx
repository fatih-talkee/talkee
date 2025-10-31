import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';

export default function ProfessionalBasicInfo() {
  const router = useRouter();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Basic information saved successfully!');
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
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Dr. or Mr."
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>First Name</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last Name</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Date of Birth</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
              value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
              onChangeText={(text) => {
                if (text) {
                  const date = new Date(text);
                  if (!isNaN(date.getTime())) {
                    setDateOfBirth(date);
                  }
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
            />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setShowDobPicker(true)}
                style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, justifyContent: 'center' }]}
              >
                <Text style={{ color: dateOfBirth ? theme.colors.text : theme.colors.textMuted }}>
                  {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Select date of birth'}
                </Text>
              </TouchableOpacity>

              {showDobPicker && (
                <DateTimePicker
                  value={dateOfBirth || new Date(1990, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDobPicker(false);
                    if (selectedDate) setDateOfBirth(selectedDate);
                  }}
                />
              )}
            </>
          )}

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>About</Text>
          <TextInput
            style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            value={about}
            onChangeText={setAbout}
            placeholder="Tell us about yourself..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    minHeight: 100,
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
