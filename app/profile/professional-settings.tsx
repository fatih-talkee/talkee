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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { ArrowLeft, Plus, X, Briefcase, GraduationCap } from 'lucide-react-native';

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

export default function ProfessionalSettings() {
  const router = useRouter();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [about, setAbout] = useState('');

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);

  const [ratePerMinute, setRatePerMinute] = useState('10.00');
  const [minCallDuration, setMinCallDuration] = useState('5');
  const [acceptingCalls, setAcceptingCalls] = useState(true);

  const [accountBalance, setAccountBalance] = useState('$1,245.50');
  const [lastPayout, setLastPayout] = useState('Dec 1, 2025');

  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showMinDurationPicker, setShowMinDurationPicker] = useState(false);

  const [currentExperience, setCurrentExperience] = useState<Partial<Experience>>({});
  const [expStartDate, setExpStartDate] = useState<Date | null>(null);
  const [expEndDate, setExpEndDate] = useState<Date | null>(null);
  const [showExpStartPicker, setShowExpStartPicker] = useState(false);
  const [showExpEndPicker, setShowExpEndPicker] = useState(false);
  const [isCurrentJob, setIsCurrentJob] = useState(false);

  const [currentEducation, setCurrentEducation] = useState<Partial<Education>>({});

  const minDurationOptions = ['1', '5', '10', '15'];

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
      endDate: isCurrentJob ? 'Present' : (expEndDate ? expEndDate.toLocaleDateString() : ''),
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

  const handleSaveSettings = () => {
    Alert.alert('Success', 'Professional settings saved successfully!');
  };

  const handleDeleteExperience = (id: string) => {
    setExperiences(experiences.filter(exp => exp.id !== id));
  };

  const handleDeleteEducation = (id: string) => {
    setEducation(education.filter(edu => edu.id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Professional Settings"
        leftButton={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

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

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Briefcase size={20} color={theme.colors.text} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>Professional CV</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>Experience</Text>
            {experiences.map((exp) => (
              <View key={exp.id} style={[styles.cvItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.cvItemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cvItemTitle, { color: theme.colors.text }]}>{exp.position}</Text>
                    <Text style={[styles.cvItemSubtitle, { color: theme.colors.textSecondary }]}>{exp.company}</Text>
                    <Text style={[styles.cvItemDate, { color: theme.colors.textMuted }]}>
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </Text>
                    {exp.description ? (
                      <Text style={[styles.cvItemDescription, { color: theme.colors.textSecondary }]}>{exp.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteExperience(exp.id)}>
                    <X size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.pinkTwo }]}
              onPress={() => setShowExperienceModal(true)}
            >
              <Plus size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.addButtonText, { color: theme.colors.pinkTwo }]}>Add Experience</Text>
            </TouchableOpacity>

            <Text style={[styles.subsectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Education</Text>
            {education.map((edu) => (
              <View key={edu.id} style={[styles.cvItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.cvItemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cvItemTitle, { color: theme.colors.text }]}>{edu.degree}</Text>
                    <Text style={[styles.cvItemSubtitle, { color: theme.colors.textSecondary }]}>{edu.institution}</Text>
                    <Text style={[styles.cvItemDate, { color: theme.colors.textMuted }]}>
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
              style={[styles.addButton, { borderColor: theme.colors.pinkTwo }]}
              onPress={() => setShowEducationModal(true)}
            >
              <Plus size={20} color={theme.colors.pinkTwo} />
              <Text style={[styles.addButtonText, { color: theme.colors.pinkTwo }]}>Add Education</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pricing and Call Settings</Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

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

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Financial Overview</Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>Account Balance</Text>
              <Text style={[styles.financialValue, { color: theme.colors.text }]}>{accountBalance}</Text>
            </View>

            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>Last Payout</Text>
              <Text style={[styles.financialValue, { color: theme.colors.text }]}>{lastPayout}</Text>
            </View>

            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: theme.colors.pinkTwo }]}
              onPress={() => {}}
            >
              <Text style={[styles.outlineButtonText, { color: theme.colors.pinkTwo }]}>View Transactions</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={handleSaveSettings}
        >
          <Text style={[styles.saveButtonText, { color: theme.colors.surface }]}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showExperienceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExperienceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Experience</Text>
              <TouchableOpacity onPress={() => setShowExperienceModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Company *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentExperience.company}
                onChangeText={(text) => setCurrentExperience({ ...currentExperience, company: text })}
                placeholder="Company name"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Position *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentExperience.position}
                onChangeText={(text) => setCurrentExperience({ ...currentExperience, position: text })}
                placeholder="Job title"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                  value={expStartDate ? expStartDate.toISOString().split('T')[0] : ''}
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
                    style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, justifyContent: 'center' }]}
                  >
                    <Text style={{ color: expStartDate ? theme.colors.text : theme.colors.textMuted }}>
                      {expStartDate ? expStartDate.toLocaleDateString() : 'Select start date'}
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
                <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: 0 }]}>End Date</Text>
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>Currently Working</Text>
                  <Switch
                    value={isCurrentJob}
                    onValueChange={setIsCurrentJob}
                    trackColor={{ false: theme.colors.disabled, true: theme.colors.primaryLight }}
                    thumbColor={isCurrentJob ? theme.colors.primary : '#ffffff'}
                  />
                </View>
              </View>

              {!isCurrentJob ? (
                Platform.OS === 'web' ? (
                  <TextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                    value={expEndDate ? expEndDate.toISOString().split('T')[0] : ''}
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
                      style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, justifyContent: 'center' }]}
                    >
                      <Text style={{ color: expEndDate ? theme.colors.text : theme.colors.textMuted }}>
                        {expEndDate ? expEndDate.toLocaleDateString() : 'Select end date'}
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
                  <Text style={[styles.currentJobText, { color: theme.colors.textMuted }]}>
                    End Date: Present
                  </Text>
                </View>
              )}

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentExperience.description}
                onChangeText={(text) => setCurrentExperience({ ...currentExperience, description: text })}
                placeholder="Describe your role..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveExperience}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.surface }]}>Add Experience</Text>
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
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Education</Text>
              <TouchableOpacity onPress={() => setShowEducationModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Institution *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentEducation.institution}
                onChangeText={(text) => setCurrentEducation({ ...currentEducation, institution: text })}
                placeholder="University or school name"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Degree *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentEducation.degree}
                onChangeText={(text) => setCurrentEducation({ ...currentEducation, degree: text })}
                placeholder="Bachelor of Science, etc."
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Start Year</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentEducation.startYear}
                onChangeText={(text) => setCurrentEducation({ ...currentEducation, startYear: text })}
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>End Year</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                value={currentEducation.endYear}
                onChangeText={(text) => setCurrentEducation({ ...currentEducation, endYear: text })}
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveEducation}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.surface }]}>Add Education</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 16,
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
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  financialValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
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
