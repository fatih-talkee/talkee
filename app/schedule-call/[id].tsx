import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  X,
  Phone,
  Video,
  DollarSign,
} from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { mockProfessionals } from '@/mockData/professionals';

interface TimeSlot {
  time: string;
  available: boolean;
}

const generateDefaultTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const times = [
    '09:00',
    '10:00',
    '11:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  times.forEach((time) => {
    const isAvailable = Math.random() > 0.2;
    slots.push({ time, available: isAvailable });
  });

  return slots;
};

const getTimeSlotsForDate = (dateString: string): TimeSlot[] => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return [];
  }

  return generateDefaultTimeSlots();
};

export default function ScheduleCallScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const professional = mockProfessionals.find((p) => p.id === id);

  if (!professional) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={{ color: theme.colors.text }}>Talkie not found</Text>
      </SafeAreaView>
    );
  }

  const generateMarkedDates = () => {
    const marked: any = {};
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        marked[dateString] = {
          marked: true,
          dotColor: theme.colors.primary,
          selected: selectedDate === dateString,
          selectedColor: theme.colors.primary,
        };
      }
    }

    return marked;
  };

  const markedDates = generateMarkedDates();

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleScheduleClick = () => {
    if (!selectedDate || !selectedTime) {
      return;
    }
    setConfirmModalVisible(true);
  };

  const handleConfirmSchedule = () => {
    setConfirmModalVisible(false);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  const currentTimeSlots = selectedDate
    ? getTimeSlotsForDate(selectedDate)
    : [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Professional Info Card */}
        <Card
          style={[
            styles.professionalCard,
            {
              backgroundColor:
                theme.name === 'dark' ? '#000000' : theme.colors.card,
              borderColor:
                theme.name === 'dark'
                  ? 'rgba(255, 255, 255, 0.3)'
                  : theme.colors.border,
              borderWidth: 1.5,
            },
          ]}
          padding="none"
        >
          <View style={styles.professionalInfo}>
            <Image
              source={{ uri: professional.avatar }}
              style={styles.avatar}
            />
            <View style={styles.professionalDetails}>
              <Text
                style={[styles.professionalName, { color: theme.colors.text }]}
              >
                {professional.name}
              </Text>
              <Text
                style={[
                  styles.professionalTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
            {professional.title}
          </Text>
          <View style={styles.rateInfo}>
                <View
                  style={[
                    styles.rateBadge,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                >
                  <DollarSign size={14} color={theme.colors.primary} />
                  <Text
                    style={[styles.rateText, { color: theme.colors.primary }]}
                  >
                    {'$' + professional.ratePerMinute.toFixed(2) + '/min'}
            </Text>
                </View>
                <View
                  style={[
                    styles.responseTimeBadge,
                    { backgroundColor: theme.colors.success + '20' },
                  ]}
                >
              <Clock size={12} color={theme.colors.success} />
                  <Text
                    style={[
                      styles.responseTimeText,
                      { color: theme.colors.success },
                    ]}
                  >
                {professional.responseTime}
              </Text>
            </View>
          </View>
        </View>
          </View>
        </Card>

        {/* Call Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Call Type
          </Text>
          <View style={styles.callTypeButtons}>
            <TouchableOpacity
              style={[
                styles.callTypeCard,
                {
                  backgroundColor:
                    callType === 'voice'
                      ? theme.colors.primary
                      : theme.name === 'dark'
                      ? '#000000'
                      : theme.colors.card,
                  borderColor:
                    callType === 'voice'
                      ? theme.colors.primary
                      : theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : theme.colors.border,
                  borderWidth: callType === 'voice' ? 2 : 1.5,
                },
              ]}
              onPress={() => setCallType('voice')}
              activeOpacity={0.7}
            >
              <Phone
                size={16}
                color={
                  callType === 'voice' ? '#FFFFFF' : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.callTypeLabel,
                  {
                    color: callType === 'voice' ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                Voice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.callTypeCard,
                {
                  backgroundColor:
                    callType === 'video'
                      ? theme.colors.primary
                      : theme.name === 'dark'
                      ? '#000000'
                      : theme.colors.card,
                  borderColor:
                    callType === 'video'
                      ? theme.colors.primary
                      : theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : theme.colors.border,
                  borderWidth: callType === 'video' ? 2 : 1.5,
                },
              ]}
              onPress={() => setCallType('video')}
              activeOpacity={0.7}
            >
              <Video
                size={16}
                color={
                  callType === 'video' ? '#FFFFFF' : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.callTypeLabel,
                  {
                    color: callType === 'video' ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                Video
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Select Date
          </Text>
          <Card
            style={[
              styles.calendarCard,
              {
                backgroundColor:
                  theme.name === 'dark' ? '#000000' : theme.colors.card,
                borderColor:
                  theme.name === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : theme.colors.border,
                borderWidth: 1.5,
              },
            ]}
            padding="none"
          >
            <View style={styles.calendarContainer}>
            <Calendar
              current={new Date().toISOString().split('T')[0]}
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day) => handleDateSelect(day.dateString)}
              markedDates={markedDates}
              theme={{
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.card,
                  calendarBackground:
                    theme.name === 'dark' ? '#000000' : theme.colors.card,
                textSectionTitleColor: theme.colors.textMuted,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: '#FFFFFF',
                  todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.text,
                textDisabledColor: theme.colors.textMuted,
                  dotColor: theme.colors.primary,
                  selectedDotColor: '#FFFFFF',
                  arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.text,
                textDayFontFamily: 'Inter-Regular',
                textMonthFontFamily: 'Inter-Bold',
                textDayHeaderFontFamily: 'Inter-Medium',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
          </Card>
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Available Time Slots
            </Text>
            {currentTimeSlots.length > 0 ? (
              <View style={styles.timeSlots}>
                {currentTimeSlots.map((slot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlot,
                      {
                        backgroundColor:
                          selectedTime === slot.time
                            ? theme.colors.primary
                            : theme.name === 'dark'
                            ? '#000000'
                            : theme.colors.card,
                        borderColor:
                          selectedTime === slot.time
                            ? theme.colors.primary
                            : theme.name === 'dark'
                            ? 'rgba(255, 255, 255, 0.3)'
                          : theme.colors.border,
                        borderWidth: 1.5,
                        opacity: slot.available ? 1 : 0.5,
                      },
                    ]}
                    onPress={() =>
                      slot.available && handleTimeSelect(slot.time)
                    }
                    disabled={!slot.available}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        {
                          color:
                            selectedTime === slot.time
                              ? '#FFFFFF'
                            : slot.available
                            ? theme.colors.text
                            : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {slot.time}
                    </Text>
                    {!slot.available && (
                      <Text
                        style={[
                          styles.bookedText,
                          { color: theme.colors.error },
                        ]}
                      >
                        Booked
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Card
                style={[
                  styles.noSlotsContainer,
                  {
                    backgroundColor:
                      theme.name === 'dark' ? '#000000' : theme.colors.card,
                    borderColor:
                      theme.name === 'dark'
                        ? 'rgba(255, 255, 255, 0.3)'
                        : theme.colors.border,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <CalendarIcon size={32} color={theme.colors.textMuted} />
                <Text
                  style={[
                    styles.noSlotsText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No available time slots for this date
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* Summary */}
        {selectedDate && selectedTime && (
          <Card
            style={[
              styles.summaryCard,
              {
                backgroundColor:
                  theme.name === 'dark' ? '#000000' : theme.colors.card,
                borderColor:
                  theme.name === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : theme.colors.border,
                borderWidth: 1.5,
              },
            ]}
            padding="none"
          >
            <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
              Appointment Summary
            </Text>

              <View style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <View
                    style={[
                      styles.summaryIcon,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]}
                  >
                    <CalendarIcon size={16} color={theme.colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Date
                  </Text>
                </View>
                <Text
                  style={[styles.summaryValue, { color: theme.colors.text }]}
                >
                {new Date(selectedDate).toLocaleDateString('en-US', {
                    month: 'short',
                  day: 'numeric',
                    year: 'numeric',
                })}
              </Text>
            </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <View
                    style={[
                      styles.summaryIcon,
                      { backgroundColor: theme.colors.success + '20' },
                    ]}
                  >
                    <Clock size={16} color={theme.colors.success} />
            </View>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Time
                  </Text>
                </View>
                <Text
                  style={[styles.summaryValue, { color: theme.colors.text }]}
                >
                  {selectedTime}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <View
                    style={[
                      styles.summaryIcon,
                      { backgroundColor: theme.colors.accent + '20' },
                    ]}
                  >
                    {callType === 'voice' ? (
                      <Phone size={16} color={theme.colors.accent} />
                    ) : (
                      <Video size={16} color={theme.colors.accent} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Type
                  </Text>
                </View>
                <Text
                  style={[styles.summaryValue, { color: theme.colors.text }]}
                >
                {callType === 'voice' ? 'Voice Call' : 'Video Call'}
              </Text>
            </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              <View style={styles.summaryTotal}>
                <Text
                  style={[
                    styles.summaryTotalLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Rate
              </Text>
                <View style={styles.summaryTotalValue}>
                  <DollarSign size={18} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.summaryTotalAmount,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {'$' + professional.ratePerMinute.toFixed(2) + '/min'}
              </Text>
            </View>
          </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConfirmModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  theme.name === 'dark' ? '#000000' : theme.colors.card,
                borderColor:
                  theme.name === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : theme.colors.border,
                borderWidth: 1.5,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.name === 'light' ? theme.colors.brandPink : '#000000' },
              ]}
              onPress={() => setConfirmModalVisible(false)}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              {callType === 'voice' ? (
                <Phone size={32} color={theme.colors.primary} />
              ) : (
                <Video size={32} color={theme.colors.primary} />
              )}
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Confirm Appointment
            </Text>

            <Text
              style={[
                styles.modalSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              You are about to request an appointment with
            </Text>

            <View
              style={[
                styles.modalTalkieInfo,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.modalTalkieName,
                  { color: theme.colors.primary },
                ]}
              >
                {professional.name}
              </Text>
              <Text
                style={[
                  styles.modalTalkieTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {professional.title}
              </Text>
            </View>

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <View
                  style={[
                    styles.modalDetailIcon,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                >
                  <CalendarIcon size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.modalDetailText}>
                  <Text
                    style={[
                      styles.modalDetailLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Date
                  </Text>
                  <Text
                    style={[
                      styles.modalDetailValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDetailRow}>
                <View
                  style={[
                    styles.modalDetailIcon,
                    { backgroundColor: theme.colors.success + '20' },
                  ]}
                >
                  <Clock size={18} color={theme.colors.success} />
                </View>
                <View style={styles.modalDetailText}>
                  <Text
                    style={[
                      styles.modalDetailLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Time
                  </Text>
                  <Text
                    style={[
                      styles.modalDetailValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {selectedTime}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDetailRow}>
                <View
                  style={[
                    styles.modalDetailIcon,
                    { backgroundColor: theme.colors.accent + '20' },
                  ]}
                >
                  {callType === 'voice' ? (
                    <Phone size={18} color={theme.colors.accent} />
                  ) : (
                    <Video size={18} color={theme.colors.accent} />
                  )}
                </View>
                <View style={styles.modalDetailText}>
                  <Text
                    style={[
                      styles.modalDetailLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Call Type
                  </Text>
                  <Text
                    style={[
                      styles.modalDetailValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {callType === 'voice' ? 'Voice Call' : 'Video Call'}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.modalPricing,
                {
                  backgroundColor: theme.colors.primary + '10',
                  borderColor: theme.colors.primary,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalPricingLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Rate
              </Text>
              <Text
                style={[
                  styles.modalPricingValue,
                  { color: theme.colors.primary },
                ]}
              >
                {'$' + professional.ratePerMinute.toFixed(2) + '/minute'}
              </Text>
            </View>

            <Text style={[styles.modalNote, { color: theme.colors.textMuted }]}>
              The talkie will be notified and you'll receive a confirmation once
              they accept your request.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text
                  style={[styles.modalCancelText, { color: theme.colors.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleConfirmSchedule}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={[styles.modalConfirmText, { color: '#FFFFFF' }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Action */}
      <View
        style={[
          styles.bottomAction,
          {
            backgroundColor:
              theme.name === 'dark' ? '#000000' : theme.colors.card,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1.5,
          },
        ]}
      >
        <Button
          title={
            selectedDate && selectedTime
              ? 'Send Appointment Request'
              : 'Select Date & Time'
          }
          onPress={handleScheduleClick}
          disabled={!selectedDate || !selectedTime}
          style={[
            styles.scheduleButton,
            {
              backgroundColor:
                selectedDate && selectedTime
                  ? theme.colors.primary
                  : theme.colors.surface,
            },
          ]}
        />
      </View>
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
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  professionalCard: {
    marginBottom: 24,
    overflow: 'hidden',
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  professionalTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  rateText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  responseTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  responseTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  callTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  callTypeCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callTypeLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  calendarCard: {
    overflow: 'hidden',
  },
  calendarContainer: {
    padding: 8,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeSlotText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  bookedText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  noSlotsContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  noSlotsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  summaryCard: {
    overflow: 'hidden',
  },
  summaryContent: {
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  summaryTotalValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  bottomAction: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  scheduleButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalTalkieInfo: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTalkieName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  modalTalkieTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  modalDetails: {
    gap: 16,
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDetailText: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  modalDetailValue: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  modalPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalPricingLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  modalPricingValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  modalNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelButton: {},
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  modalConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});
