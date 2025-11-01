import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Plus, X, Edit2, Trash2, Calendar, DollarSign, Clock, Globe } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface Availability {
  id: string;
  availableAt: 'every' | 'specific';
  days?: string[];
  date?: Date;
  startHour: string;
  endHour: string;
  currency: 'USD' | 'TRY' | 'EUR';
  pricePerMinute: string;
}

const mockAvailabilities: Availability[] = [
  {
    id: '1',
    availableAt: 'every',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startHour: '09:00',
    endHour: '17:00',
    currency: 'USD',
    pricePerMinute: '2.50',
  },
  {
    id: '2',
    availableAt: 'every',
    days: ['Saturday', 'Sunday'],
    startHour: '10:00',
    endHour: '18:00',
    currency: 'USD',
    pricePerMinute: '3.00',
  },
  {
    id: '3',
    availableAt: 'specific',
    date: new Date('2025-12-25'),
    startHour: '10:00',
    endHour: '14:00',
    currency: 'EUR',
    pricePerMinute: '3.00',
  },
  {
    id: '4',
    availableAt: 'specific',
    date: new Date('2026-01-15'),
    startHour: '08:00',
    endHour: '12:00',
    currency: 'USD',
    pricePerMinute: '4.50',
  },
  {
    id: '5',
    availableAt: 'every',
    days: ['Monday', 'Wednesday', 'Friday'],
    startHour: '18:00',
    endHour: '21:00',
    currency: 'TRY',
    pricePerMinute: '50.00',
  },
];

export default function AvailabilitySettingsScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);

  const [formData, setFormData] = useState<Partial<Availability>>({
    availableAt: 'every',
    days: [],
    startHour: '',
    endHour: '',
    currency: 'USD',
    pricePerMinute: '',
  });

  const availableAtOptions = ['every', 'specific'];
  const daysOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currencyOptions = ['USD', 'TRY', 'EUR'];

  const currencySymbols = {
    USD: '$',
    TRY: '₺',
    EUR: '€',
  };

  const openModal = (availability?: Availability) => {
    if (availability) {
      setEditingAvailability(availability);
      setFormData({
        availableAt: availability.availableAt,
        days: availability.days || [],
        date: availability.date,
        startHour: availability.startHour,
        endHour: availability.endHour,
        currency: availability.currency,
        pricePerMinute: availability.pricePerMinute,
      });
    } else {
      setEditingAvailability(null);
      setFormData({
        availableAt: 'every',
        days: [],
        startHour: '',
        endHour: '',
        currency: 'USD',
        pricePerMinute: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAvailability(null);
    setFormData({
      availableAt: 'every',
      days: [],
      startHour: '',
      endHour: '',
      currency: 'USD',
      pricePerMinute: '',
    });
  };

  const toggleDay = (day: string) => {
    const currentDays = formData.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setFormData({ ...formData, days: newDays });
  };

  const handleSave = () => {
    // Validation
    if (formData.availableAt === 'every' && (!formData.days || formData.days.length === 0)) {
      toast.error({
        title: 'Error',
        message: 'Please select at least one day',
      });
      return;
    }

    if (formData.availableAt === 'specific' && !formData.date) {
      toast.error({
        title: 'Error',
        message: 'Please select a specific date',
      });
      return;
    }

    if (!formData.startHour || !formData.endHour) {
      toast.error({
        title: 'Error',
        message: 'Please set start and end hours',
      });
      return;
    }

    if (!formData.pricePerMinute) {
      toast.error({
        title: 'Error',
        message: 'Please enter a price per minute',
      });
      return;
    }

    if (editingAvailability) {
      // Update existing
      setAvailabilities(availabilities.map(av => 
        av.id === editingAvailability.id 
          ? { ...formData, id: editingAvailability.id } as Availability
          : av
      ));
      toast.success({
        title: 'Success',
        message: 'Availability updated successfully',
      });
    } else {
      // Create new
      const newAvailability: Availability = {
        id: Date.now().toString(),
        availableAt: formData.availableAt as 'every' | 'specific',
        days: formData.days,
        date: formData.date,
        startHour: formData.startHour!,
        endHour: formData.endHour!,
        currency: formData.currency!,
        pricePerMinute: formData.pricePerMinute!,
      };
      setAvailabilities([...availabilities, newAvailability]);
      toast.success({
        title: 'Success',
        message: 'Availability created successfully',
      });
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    setAvailabilities(availabilities.filter(av => av.id !== id));
    toast.success({
      title: 'Success',
      message: 'Availability deleted successfully',
    });
  };

  const renderAvailabilityCard = (item: Availability) => (
    <Card 
      key={item.id}
      padding="none"
      style={[
        styles.availabilityCard, 
        { 
          backgroundColor: theme.name === 'dark' ? '#000000' : theme.colors.card,
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme.colors.border,
          borderWidth: 1.5,
          padding: 16,
        }
      ]}
    >
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? theme.colors.accent + '20'
                    : theme.colors.accent + '15',
              },
            ]}
          >
            <Calendar size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.headerInfo}>
            {item.availableAt === 'every' ? (
              <Text
                style={[
                  styles.scheduleBadge,
                  {
                    backgroundColor:
                      theme.name === 'dark'
                        ? theme.colors.accent + '40'
                        : theme.colors.accent + '25',
                    color: theme.colors.accent,
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                    Weekly Schedule
                  </Text>
            ) : (
              <Text
                style={[
                  styles.scheduleBadge,
                  {
                    backgroundColor:
                      theme.name === 'dark'
                        ? theme.colors.primary + '40'
                        : theme.colors.primary + '25',
                    color: theme.colors.primary,
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                  One-time
                </Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            onPress={() => openModal(item)}
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
          >
            <Edit2 size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDelete(item.id)}
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content Section */}
      <View style={styles.cardContent}>
        {item.availableAt === 'every' && (
          <View style={styles.daysContainer}>
            {item.days?.map((day, index) => (
              <View
                key={index}
                style={[
                  styles.dayTag,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayTagText,
                    { color: theme.colors.accent },
                  ]}
                >
                  {day.substring(0, 3)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {item.availableAt === 'specific' && (
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: theme.colors.text }]}>
              {item.date?.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}

        <View style={styles.timePriceRow}>
          <View style={styles.timeContainer}>
            <Clock size={16} color={theme.colors.success} />
            <Text style={[styles.timeText, { color: theme.colors.text }]}>
              {item.startHour} - {item.endHour}
            </Text>
          </View>
          <View
            style={[
              styles.priceBadge,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? theme.colors.success + '20'
                    : theme.colors.success + '15',
              },
            ]}
          >
            <DollarSign size={16} color={theme.colors.success} />
            <Text
              style={[styles.priceText, { color: theme.colors.success }]}
            >
              {currencySymbols[item.currency]}{item.pricePerMinute}/min
          </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        showBack 
        backRoute="/(tabs)/profile"
        rightButtons={
          <TouchableOpacity 
            onPress={() => openModal()}
            style={[
              styles.addButton,
              { backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.name === 'light' ? theme.colors.brandPink : '#000000' },
            ]}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {availabilities.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
            <Calendar size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Availability Set
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textMuted }]}>
              Add your availability schedule to let users know when you're available for calls
            </Text>
            <Button
              title="Add Availability"
              onPress={() => openModal()}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          availabilities.map(renderAvailabilityCard)
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { backgroundColor: '#000000' }]}>
              <Text style={[styles.modalTitle, { color: '#FFFFFF' }]}>
                {editingAvailability ? 'Edit Availability' : 'Add Availability'}
              </Text>
              <TouchableOpacity 
                onPress={closeModal}
                style={[styles.closeButton, { backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.name === 'light' ? '#d60f83' : '#000000' }]}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Available At */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Available At
                </Text>
                <View style={styles.optionsRow}>
                  {availableAtOptions.map(option => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setFormData({ ...formData, availableAt: option as any, days: option === 'specific' ? [] : formData.days })}
                      style={[
                        styles.optionButton,
                        { 
                          backgroundColor: formData.availableAt === option 
                            ? theme.colors.primary + '20'
                            : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                        formData.availableAt === option && { borderColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: theme.colors.text },
                        formData.availableAt === option && { color: theme.colors.primary, fontFamily: 'Inter-Bold' },
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Select Days (if every is selected) */}
              {formData.availableAt === 'every' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Select Days
                  </Text>
                  <View style={styles.daysGrid}>
                    {daysOptions.map(day => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleDay(day)}
                        style={[
                          styles.dayButton,
                          { 
                            backgroundColor: formData.days?.includes(day)
                              ? theme.colors.primary + '20'
                              : theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                          formData.days?.includes(day) && { borderColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={[
                          styles.dayText,
                          { color: theme.colors.text },
                          formData.days?.includes(day) && { color: theme.colors.primary, fontFamily: 'Inter-Bold' },
                        ]}>
                          {day.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Select Date (if specific is selected) */}
              {formData.availableAt === 'specific' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Select Date
                  </Text>
                  {Platform.OS === 'web' ? (
                    <Input
                      value={formData.date ? formData.date.toISOString().split('T')[0] : ''}
                      onChangeText={(text) => {
                        if (text) {
                          const date = new Date(text);
                          if (!isNaN(date.getTime())) {
                            setFormData({ ...formData, date });
                          }
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={[styles.datePickerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    >
                      <Text style={{ color: formData.date ? theme.colors.text : theme.colors.textMuted }}>
                        {formData.date ? formData.date.toLocaleDateString() : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {showDatePicker && !Platform.OS && (
                    <DateTimePicker
                      value={formData.date || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setFormData({ ...formData, date: selectedDate });
                      }}
                    />
                  )}
                </View>
              )}

              {/* Start Hour */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Start Hour
                </Text>
                <Input
                  value={formData.startHour || ''}
                  onChangeText={(text) => setFormData({ ...formData, startHour: text })}
                  placeholder="09:00"
                />
              </View>

              {/* End Hour */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  End Hour
                </Text>
                <Input
                  value={formData.endHour || ''}
                  onChangeText={(text) => setFormData({ ...formData, endHour: text })}
                  placeholder="17:00"
                />
              </View>

              {/* Currency */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Currency
                </Text>
                <View style={styles.optionsRow}>
                  {currencyOptions.map(currency => (
                    <TouchableOpacity
                      key={currency}
                      onPress={() => setFormData({ ...formData, currency: currency as any })}
                      style={[
                        styles.optionButton,
                        { 
                          backgroundColor: formData.currency === currency 
                            ? theme.colors.primary + '20'
                            : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                        formData.currency === currency && { borderColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: theme.colors.text },
                        formData.currency === currency && { color: theme.colors.primary, fontFamily: 'Inter-Bold' },
                      ]}>
                        {currencySymbols[currency]} {currency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Per Minute */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Price Per Minute
                </Text>
                <Input
                  value={formData.pricePerMinute || ''}
                  onChangeText={(text) => setFormData({ ...formData, pricePerMinute: text })}
                  placeholder="2.50"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <Button
                title={editingAvailability ? 'Update Availability' : 'Create Availability'}
                onPress={handleSave}
                style={styles.saveButton}
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  availabilityCard: {
    marginBottom: 16,
    borderWidth: 1.5,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  scheduleBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    gap: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dayTagText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  dateContainer: {
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  timePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
  bottomSpacing: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  datePickerButton: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 0,
  },
});

