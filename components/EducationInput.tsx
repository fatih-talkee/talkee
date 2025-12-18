import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import {
  Plus,
  GraduationCap,
  Edit2,
  Trash2,
  Calendar,
  BookOpen,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toastService';
import type {
  EducationFormData,
  DegreeLevel,
} from '@/types/education_experience.types';
import {
  EDUCATION_LEVELS,
  getDegreeLevelLabel,
  formatYearRange,
} from '@/types/education_experience.types';

interface EducationInputProps {
  educations: EducationFormData[];
  onEducationsChange: (educations: EducationFormData[]) => void;
}

export function EducationInput({
  educations,
  onEducationsChange,
}: EducationInputProps) {
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    setEditingIndex(null);
    setShowAddModal(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const handleDelete = (index: number) => {
    const updated = educations.filter((_, i) => i !== index);
    onEducationsChange(updated);
  };

  const handleSave = (data: EducationFormData) => {
    if (editingIndex !== null) {
      // Edit existing
      const updated = [...educations];
      updated[editingIndex] = data;
      onEducationsChange(updated);
    } else {
      // Add new
      onEducationsChange([...educations, data]);
    }
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <GraduationCap size={20} color={theme.colors.textMuted} />
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Education
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleAdd}
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.primary + '20' },
          ]}
        >
          <Plus size={18} color={theme.colors.primary} />
          <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper Text */}
      <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
        Add your educational background (optional)
      </Text>

      {/* Education List */}
      {educations.length === 0 ? (
        <Card
          style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}
        >
          <GraduationCap size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            No education added yet
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {educations.map((edu, index) => (
            <Card
              key={index}
              style={[
                styles.educationCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]}
                  >
                    <GraduationCap size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text
                      style={[styles.degreeLabel, { color: theme.colors.text }]}
                    >
                      {getDegreeLevelLabel(edu.degree_level)}
                    </Text>
                    {edu.field_of_study && (
                      <View style={styles.infoRow}>
                        <BookOpen size={14} color={theme.colors.textMuted} />
                        <Text
                          style={[
                            styles.fieldText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {edu.field_of_study}
                        </Text>
                      </View>
                    )}
                    {edu.institution && (
                      <Text
                        style={[
                          styles.institutionText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {edu.institution}
                      </Text>
                    )}
                    {(edu.start_year || edu.end_year) && (
                      <View style={styles.infoRow}>
                        <Calendar size={14} color={theme.colors.textMuted} />
                        <Text
                          style={[
                            styles.yearText,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {formatYearRange(
                            edu.start_year || null,
                            edu.end_year || null,
                            edu.is_current || false
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(index)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.accent + '20' },
                    ]}
                  >
                    <Edit2 size={16} color={theme.colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(index)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: '#ef444420' },
                    ]}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Add/Edit Modal - TODO: Implement as separate component */}
      {showAddModal && (
        <EducationFormModal
          education={
            editingIndex !== null ? educations[editingIndex] : undefined
          }
          onSave={handleSave}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </View>
  );
}

function EducationFormModal({
  education,
  onSave,
  onCancel,
}: {
  education?: EducationFormData;
  onSave: (data: EducationFormData) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const toast = useToast();
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>(
    education?.degree_level || 'high_school'
  );
  const [fieldOfStudy, setFieldOfStudy] = useState(
    education?.field_of_study || ''
  );
  const [institution, setInstitution] = useState(education?.institution || '');
  const [startYear, setStartYear] = useState(
    education?.start_year?.toString() || ''
  );
  const [endYear, setEndYear] = useState(education?.end_year?.toString() || '');
  const [isCurrent, setIsCurrent] = useState(education?.is_current || false);
  const [showDegreeDropdown, setShowDegreeDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (education) {
      setDegreeLevel(education.degree_level);
      setFieldOfStudy(education.field_of_study || '');
      setInstitution(education.institution || '');
      setStartYear(education.start_year?.toString() || '');
      setEndYear(education.end_year?.toString() || '');
      setIsCurrent(education.is_current || false);
    } else {
      setDegreeLevel('high_school');
      setFieldOfStudy('');
      setInstitution('');
      setStartYear('');
      setEndYear('');
      setIsCurrent(false);
    }
    setError(null);
  }, [education]);

  const handleSave = () => {
    setError(null);
    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear + 10;

    // Required fields
    if (!degreeLevel || !startYear) {
      setError('Degree Level and Start Year are required.');
      toast.error({
        title: 'Validation Error',
        message: 'Degree Level and Start Year are required.',
      });
      return;
    }

    // Start year validation
    if (isNaN(Number(startYear))) {
      setError('Start Year must be a number.');
      toast.error({
        title: 'Validation Error',
        message: 'Start Year must be a number.',
      });
      return;
    }

    const startYearNum = Number(startYear);
    if (startYearNum < minYear || startYearNum > maxYear) {
      setError(`Start Year must be between ${minYear} and ${maxYear}.`);
      toast.error({
        title: 'Validation Error',
        message: `Start Year must be between ${minYear} and ${maxYear}.`,
      });
      return;
    }

    // End year validation (only if not current)
    if (!isCurrent) {
      if (endYear) {
        if (isNaN(Number(endYear))) {
          setError('End Year must be a number.');
          toast.error({
            title: 'Validation Error',
            message: 'End Year must be a number.',
          });
          return;
        }

        const endYearNum = Number(endYear);
        if (endYearNum < minYear || endYearNum > maxYear) {
          setError(`End Year must be between ${minYear} and ${maxYear}.`);
          toast.error({
            title: 'Validation Error',
            message: `End Year must be between ${minYear} and ${maxYear}.`,
          });
          return;
        }

        if (endYearNum < startYearNum) {
          setError('End Year cannot be before Start Year.');
          toast.error({
            title: 'Validation Error',
            message: 'End Year cannot be before Start Year.',
          });
          return;
        }
      }
    }

    onSave({
      degree_level: degreeLevel,
      field_of_study: fieldOfStudy.trim() || undefined,
      institution: institution.trim() || undefined,
      start_year: startYear.trim() || undefined,
      end_year: isCurrent ? undefined : endYear.trim() || undefined,
      is_current: isCurrent,
    });
  };

  const selectedDegree = EDUCATION_LEVELS.find(
    (level) => level.value === degreeLevel
  );

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={modalStyles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <View
          style={[
            modalStyles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[
              modalStyles.modalHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <Text style={[modalStyles.modalTitle, { color: theme.colors.text }]}>
              {education ? 'Edit Education' : 'Add Education'}
            </Text>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[modalStyles.modalClose, { color: theme.colors.text }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={modalStyles.modalBody}
            contentContainerStyle={modalStyles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <View
                style={[
                  modalStyles.errorMessageContainer,
                  { backgroundColor: theme.colors.error + '10' },
                ]}
              >
                <Text
                  style={[
                    modalStyles.errorMessageText,
                    { color: theme.colors.error },
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}

            {/* Degree Level */}
            <View style={[modalStyles.inputWrapper, { zIndex: showDegreeDropdown ? 1000 : 1 }]}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Degree Level *
              </Text>
              <TouchableOpacity
                style={[
                  modalStyles.dropdownButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setShowDegreeDropdown(!showDegreeDropdown)}
                activeOpacity={0.7}
              >
                <Text
                  style={[modalStyles.dropdownText, { color: theme.colors.text }]}
                >
                  {selectedDegree?.label || 'Select degree level'}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>▼</Text>
              </TouchableOpacity>
              {showDegreeDropdown && (
                <View
                  style={[
                    modalStyles.dropdownMenu,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled={true}
                    style={modalStyles.dropdownScroll}
                  >
                    {EDUCATION_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level.value}
                        onPress={() => {
                          setDegreeLevel(level.value);
                          setShowDegreeDropdown(false);
                        }}
                        style={[
                          modalStyles.dropdownOption,
                          {
                            backgroundColor:
                              degreeLevel === level.value
                                ? theme.colors.primary + '20'
                                : 'transparent',
                            borderBottomColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            modalStyles.dropdownOptionText,
                            {
                              color:
                                degreeLevel === level.value
                                  ? theme.colors.primary
                                  : theme.colors.text,
                            },
                          ]}
                        >
                          {level.label}
                        </Text>
                        {degreeLevel === level.value && (
                          <Check size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Field of Study */}
            <View style={modalStyles.inputWrapper}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Field of Study
              </Text>
              <TextInput
                value={fieldOfStudy}
                onChangeText={setFieldOfStudy}
                placeholder="e.g., Computer Science, Psychology"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  modalStyles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
              />
            </View>

            {/* Institution */}
            <View style={modalStyles.inputWrapper}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Institution
              </Text>
              <TextInput
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g., Harvard University"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  modalStyles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
              />
            </View>

            {/* Start Year */}
            <View style={modalStyles.inputWrapper}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Start Year *
              </Text>
              <TextInput
                value={startYear}
                onChangeText={(text) => setStartYear(text.replace(/[^0-9]/g, ''))}
                placeholder="e.g., 2018"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                style={[
                  modalStyles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
              />
            </View>

            {/* Currently studying checkbox */}
            <View style={[modalStyles.checkboxWrapper]}>
              <TouchableOpacity
                style={modalStyles.checkboxRow}
                onPress={() => setIsCurrent(!isCurrent)}
              >
              <View
                style={[
                  modalStyles.checkbox,
                  {
                    backgroundColor: isCurrent
                      ? theme.colors.primary
                      : theme.colors.card,
                    borderColor: isCurrent
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                {isCurrent && <Check size={16} color={theme.colors.surface} />}
              </View>
                <Text style={[modalStyles.checkboxLabel, { color: theme.colors.text }]}>
                  Currently studying
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Year (only if not current) */}
            {!isCurrent && (
              <View style={modalStyles.inputWrapper}>
                <Text
                  style={[modalStyles.inputLabel, { color: theme.colors.text }]}
                >
                  End Year
                </Text>
                <TextInput
                  value={endYear}
                  onChangeText={(text) => setEndYear(text.replace(/[^0-9]/g, ''))}
                  placeholder="e.g., 2022"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  style={[
                    modalStyles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                />
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View
            style={[
              modalStyles.modalFooter,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <Button
              title="Add"
              onPress={handleSave}
              style={modalStyles.modalButtonFullWidth}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    height: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    position: 'relative',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  modalClose: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 24,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  textInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
  },
  dropdownScroll: {
    flexGrow: 1,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownOptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  checkboxWrapper: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  modalButton: {
    flex: 1,
  },
  modalButtonFullWidth: {
    width: '100%',
  },
  errorMessageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorMessageText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  list: {
    gap: 12,
  },
  educationCard: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  degreeLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  institutionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  yearText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
