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
  Briefcase,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toastService';
import type { ExperienceFormData } from '@/types/education_experience.types';
import { formatYearRange } from '@/types/education_experience.types';

interface ExperienceInputProps {
  experiences: ExperienceFormData[];
  onExperiencesChange: (experiences: ExperienceFormData[]) => void;
}

export function ExperienceInput({
  experiences,
  onExperiencesChange,
}: ExperienceInputProps) {
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
    const updated = experiences.filter((_, i) => i !== index);
    onExperiencesChange(updated);
  };

  const handleSave = (data: ExperienceFormData) => {
    if (editingIndex !== null) {
      // Edit existing
      const updated = [...experiences];
      updated[editingIndex] = data;
      onExperiencesChange(updated);
    } else {
      // Add new
      onExperiencesChange([...experiences, data]);
    }
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Briefcase size={20} color={theme.colors.textMuted} />
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Work Experience
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleAdd}
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.pinkTwo + '20' },
          ]}
        >
          <Plus size={18} color={theme.colors.pinkTwo} />
          <Text style={[styles.addButtonText, { color: theme.colors.pinkTwo }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper Text */}
      <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
        Add your work experience (optional)
      </Text>

      {/* Experience List */}
      {experiences.length === 0 ? (
        <Card
          style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}
        >
          <Briefcase size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            No experience added yet
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {experiences.map((exp, index) => {

            return (
              <Card
                key={index}
                style={[
                  styles.experienceCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: theme.colors.accent + '20' },
                      ]}
                    >
                      <Briefcase size={20} color={theme.colors.accent} />
                    </View>
                    <View style={styles.cardInfo}>
                      {exp.title && (
                        <Text
                          style={[
                            styles.titleText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {exp.title}
                        </Text>
                      )}
                      {exp.company && (
                        <Text
                          style={[
                            styles.companyText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {exp.company}
                        </Text>
                      )}
                      {exp.location && (
                        <View style={styles.infoRow}>
                          <MapPin size={14} color={theme.colors.textMuted} />
                          <Text
                            style={[
                              styles.locationText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            {exp.location}
                          </Text>
                        </View>
                      )}
                      {(exp.start_year || exp.end_year) && (
                        <View style={styles.infoRow}>
                          <Calendar size={14} color={theme.colors.textMuted} />
                          <Text
                            style={[
                              styles.dateText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            {formatYearRange(
                              exp.start_year || null,
                              exp.end_year || null,
                              exp.is_current || false
                            )}
                          </Text>
                        </View>
                      )}
                      {exp.is_current && (
                        <View
                          style={[
                            styles.currentBadge,
                            { backgroundColor: theme.colors.pinkTwo + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currentText,
                              { color: theme.colors.pinkTwo },
                            ]}
                          >
                            Currently working
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
                {exp.description && (
                  <Text
                    style={[
                      styles.descriptionText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {exp.description}
                  </Text>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Add/Edit Modal - TODO: Implement as separate component */}
      {showAddModal && (
        <ExperienceFormModal
          experience={
            editingIndex !== null ? experiences[editingIndex] : undefined
          }
          onSave={handleSave}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </View>
  );
}

// Placeholder for modal component
function ExperienceFormModal({
  experience,
  onSave,
  onCancel,
}: {
  experience?: ExperienceFormData;
  onSave: (data: ExperienceFormData) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const toast = useToast();
  const [title, setTitle] = useState(experience?.title || '');
  const [company, setCompany] = useState(experience?.company || '');
  const [location, setLocation] = useState(experience?.location || '');
  const [startYear, setStartYear] = useState(
    experience?.start_year?.toString() || ''
  );
  const [endYear, setEndYear] = useState(experience?.end_year?.toString() || '');
  const [isCurrent, setIsCurrent] = useState(experience?.is_current || false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (experience) {
      setTitle(experience.title || '');
      setCompany(experience.company || '');
      setLocation(experience.location || '');
      setStartYear(experience.start_year?.toString() || '');
      setEndYear(experience.end_year?.toString() || '');
      setIsCurrent(experience.is_current || false);
    } else {
      setTitle('');
      setCompany('');
      setLocation('');
      setStartYear('');
      setEndYear('');
      setIsCurrent(false);
    }
    setError(null);
  }, [experience]);

  const handleSave = () => {
    setError(null);
    const minDate = new Date('1900-01-01');

    // Required fields
    if (!title.trim() || !startYear) {
      setError('Title and Start Year are required.');
      toast.error({
        title: 'Validation Error',
        message: 'Title and Start Year are required.',
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
    const startDate = new Date(`${startYearNum}-01-01`);
    
    if (startDate < minDate) {
      setError('Start date must be after 1900-01-01.');
      toast.error({
        title: 'Validation Error',
        message: 'Start date must be after 1900-01-01.',
      });
      return;
    }

    // End year validation (only if not current)
    if (!isCurrent && endYear) {
      if (isNaN(Number(endYear))) {
        setError('End Year must be a number.');
        toast.error({
          title: 'Validation Error',
          message: 'End Year must be a number.',
        });
        return;
      }

      const endYearNum = Number(endYear);
      const endDate = new Date(`${endYearNum}-12-31`);
      const startDateForCompare = new Date(`${startYearNum}-01-01`);

      if (endDate < startDateForCompare) {
        setError('End date cannot be before start date.');
        toast.error({
          title: 'Validation Error',
          message: 'End date cannot be before start date.',
        });
        return;
      }
    }

    onSave({
      title: title.trim() || undefined,
      company: company.trim() || undefined,
      location: location.trim() || undefined,
      start_year: startYear.trim() || undefined,
      end_year: isCurrent ? undefined : endYear.trim() || undefined,
      is_current: isCurrent,
    });
  };

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
              {experience ? 'Edit Experience' : 'Add Experience'}
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

            {/* Title */}
            <View style={modalStyles.inputWrapper}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Job Title *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Software Engineer"
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

            {/* Company */}
            <View style={modalStyles.inputWrapper}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Company
              </Text>
              <TextInput
                value={company}
                onChangeText={setCompany}
                placeholder="e.g., Google"
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

            {/* Location */}
            <View style={modalStyles.inputWrapper}>
              <Text style={[modalStyles.inputLabel, { color: theme.colors.text }]}>
                Location
              </Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., San Francisco, CA"
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
                placeholder="e.g., 2020"
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

            {/* Currently working checkbox */}
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
                      ? theme.colors.pinkTwo
                      : theme.colors.card,
                    borderColor: isCurrent
                      ? theme.colors.pinkTwo
                      : theme.colors.border,
                  },
                ]}
              >
                {isCurrent && <Check size={16} color={theme.colors.surface} />}
              </View>
                <Text style={[modalStyles.checkboxLabel, { color: theme.colors.text }]}>
                  Currently working here
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
                  placeholder="e.g., 2023"
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
  experienceCard: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  titleText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  companyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  currentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  currentText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
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
  descriptionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    marginTop: 8,
    paddingLeft: 52, // Align with text above icon
  },
});
