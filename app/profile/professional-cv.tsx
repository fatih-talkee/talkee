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
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Plus, X } from 'lucide-react-native';

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  isCurrent?: boolean;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  startYear: string;
  endYear: string;
}

export default function ProfessionalCV() {
  const router = useRouter();
  const { theme } = useTheme();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [loading, setLoading] = useState(false);

  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);

  const [currentExperience, setCurrentExperience] = useState<
    Partial<Experience>
  >({});
  const [expStartDate, setExpStartDate] = useState<Date | null>(null);
  const [expEndDate, setExpEndDate] = useState<Date | null>(null);
  const [showExpStartPicker, setShowExpStartPicker] = useState(false);
  const [showExpEndPicker, setShowExpEndPicker] = useState(false);
  const [isCurrentJob, setIsCurrentJob] = useState(false);

  const [currentEducation, setCurrentEducation] = useState<Partial<Education>>(
    {}
  );

  const handleSaveExperience = () => {
    if (!currentExperience.company || !currentExperience.position) {
      Alert.alert('Error', 'Please fill in company and position');
      return;
    }

    const newExperience: Experience = {
      id: Date.now().toString(),
      company: currentExperience.company || '',
      position: currentExperience.position || '',
      startDate: expStartDate ? expStartDate.toLocaleDateString() : '',
      endDate: isCurrentJob
        ? 'Present'
        : expEndDate
        ? expEndDate.toLocaleDateString()
        : '',
      description: currentExperience.description || '',
      isCurrent: isCurrentJob,
    };

    setExperiences([...experiences, newExperience]);
    setCurrentExperience({});
    setExpStartDate(null);
    setExpEndDate(null);
    setIsCurrentJob(false);
    setShowExperienceModal(false);
  };

  const handleSaveEducation = () => {
    if (!currentEducation.institution || !currentEducation.degree) {
      Alert.alert('Error', 'Please fill in institution and degree');
      return;
    }

    const newEducation: Education = {
      id: Date.now().toString(),
      institution: currentEducation.institution || '',
      degree: currentEducation.degree || '',
      startYear: currentEducation.startYear || '',
      endYear: currentEducation.endYear || '',
    };

    setEducation([...education, newEducation]);
    setCurrentEducation({});
    setShowEducationModal(false);
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'CV information saved successfully!');
    }, 1000);
  };

  const handleDeleteExperience = (id: string) => {
    setExperiences(experiences.filter((exp) => exp.id !== id));
  };

  const handleDeleteEducation = (id: string) => {
    setEducation(education.filter((edu) => edu.id !== id));
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>
            Experience
          </Text>
          {experiences.map((exp) => (
            <View
              key={exp.id}
              style={[
                styles.cvItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cvItemHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.cvItemTitle, { color: theme.colors.text }]}
                  >
                    {exp.position}
                  </Text>
                  <Text
                    style={[
                      styles.cvItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {exp.company}
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDate,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {exp.startDate} - {exp.endDate || 'Present'}
                  </Text>
                  {exp.description ? (
                    <Text
                      style={[
                        styles.cvItemDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {exp.description}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteExperience(exp.id)}
                >
                  <X size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: theme.colors.primary }]}
            onPress={() => setShowExperienceModal(true)}
          >
            <Plus size={20} color={theme.colors.primary} />
            <Text
              style={[styles.addButtonText, { color: theme.colors.primary }]}
            >
              Add Experience
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.subsectionTitle,
              { color: theme.colors.text, marginTop: 24 },
            ]}
          >
            Education
          </Text>
          {education.map((edu) => (
            <View
              key={edu.id}
              style={[
                styles.cvItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cvItemHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.cvItemTitle, { color: theme.colors.text }]}
                  >
                    {edu.degree}
                  </Text>
                  <Text
                    style={[
                      styles.cvItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {edu.institution}
                  </Text>
                  <Text
                    style={[
                      styles.cvItemDate,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {edu.startYear} - {edu.endYear}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteEducation(edu.id)}>
                  <X size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: theme.colors.primary }]}
            onPress={() => setShowEducationModal(true)}
          >
            <Plus size={20} color={theme.colors.primary} />
            <Text
              style={[styles.addButtonText, { color: theme.colors.primary }]}
            >
              Add Education
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: (theme.colors as any).pinkTwo || theme.colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text
            style={[styles.saveButtonText, { color: theme.colors.surface }]}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showExperienceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExperienceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add Experience
              </Text>
              <TouchableOpacity onPress={() => setShowExperienceModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Company *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentExperience.company}
                onChangeText={(text) =>
                  setCurrentExperience({ ...currentExperience, company: text })
                }
                placeholder="Company name"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Position *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentExperience.position}
                onChangeText={(text) =>
                  setCurrentExperience({ ...currentExperience, position: text })
                }
                placeholder="Job title"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Start Date
              </Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                  value={
                    expStartDate ? expStartDate.toISOString().split('T')[0] : ''
                  }
                  onChangeText={(text) => {
                    if (text) {
                      const date = new Date(text);
                      if (!isNaN(date.getTime())) {
                        setExpStartDate(date);
                      }
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setShowExpStartPicker(true)}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: expStartDate
                          ? theme.colors.text
                          : theme.colors.textMuted,
                      }}
                    >
                      {expStartDate
                        ? expStartDate.toLocaleDateString()
                        : 'Select start date'}
                    </Text>
                  </TouchableOpacity>

                  {showExpStartPicker && (
                    <DateTimePicker
                      value={expStartDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowExpStartPicker(false);
                        if (selectedDate) setExpStartDate(selectedDate);
                      }}
                    />
                  )}
                </>
              )}

              <View style={styles.switchRowModal}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.textSecondary, marginBottom: 0 },
                  ]}
                >
                  End Date
                </Text>
                <View style={styles.switchContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Currently Working
                  </Text>
                  <Switch
                    value={isCurrentJob}
                    onValueChange={setIsCurrentJob}
                    trackColor={{
                      false: theme.colors.disabled,
                      true: theme.colors.primaryLight,
                    }}
                    thumbColor={isCurrentJob ? theme.colors.primary : '#ffffff'}
                  />
                </View>
              </View>

              {!isCurrentJob ? (
                Platform.OS === 'web' ? (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                    value={
                      expEndDate ? expEndDate.toISOString().split('T')[0] : ''
                    }
                    onChangeText={(text) => {
                      if (text) {
                        const date = new Date(text);
                        if (!isNaN(date.getTime())) {
                          setExpEndDate(date);
                        }
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setShowExpEndPicker(true)}
                      style={[
                        styles.input,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: expEndDate
                            ? theme.colors.text
                            : theme.colors.textMuted,
                        }}
                      >
                        {expEndDate
                          ? expEndDate.toLocaleDateString()
                          : 'Select end date'}
                      </Text>
                    </TouchableOpacity>

                    {showExpEndPicker && (
                      <DateTimePicker
                        value={expEndDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowExpEndPicker(false);
                          if (selectedDate) setExpEndDate(selectedDate);
                        }}
                      />
                    )}
                  </>
                )
              ) : (
                <View style={styles.currentJobIndicator}>
                  <Text
                    style={[
                      styles.currentJobText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    End Date: Present
                  </Text>
                </View>
              )}

              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Description
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentExperience.description}
                onChangeText={(text) =>
                  setCurrentExperience({
                    ...currentExperience,
                    description: text,
                  })
                }
                placeholder="Describe your role..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: (theme.colors as any).pinkTwo || theme.colors.primary },
              ]}
              onPress={handleSaveExperience}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: theme.colors.surface },
                ]}
              >
                Add Experience
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEducationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEducationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add Education
              </Text>
              <TouchableOpacity onPress={() => setShowEducationModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Institution *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentEducation.institution}
                onChangeText={(text) =>
                  setCurrentEducation({
                    ...currentEducation,
                    institution: text,
                  })
                }
                placeholder="University or school name"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Degree *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentEducation.degree}
                onChangeText={(text) =>
                  setCurrentEducation({ ...currentEducation, degree: text })
                }
                placeholder="Bachelor of Science, etc."
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Start Year
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentEducation.startYear}
                onChangeText={(text) =>
                  setCurrentEducation({ ...currentEducation, startYear: text })
                }
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />

              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                End Year
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                value={currentEducation.endYear}
                onChangeText={(text) =>
                  setCurrentEducation({ ...currentEducation, endYear: text })
                }
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: (theme.colors as any).pinkTwo || theme.colors.primary },
              ]}
              onPress={handleSaveEducation}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: theme.colors.surface },
                ]}
              >
                Add Education
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  subsectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 12,
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
  cvItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cvItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cvItemTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  cvItemSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 4,
  },
  cvItemDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginBottom: 8,
  },
  cvItemDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  switchRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  currentJobIndicator: {
    marginBottom: 16,
  },
  currentJobText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
