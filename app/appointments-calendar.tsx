import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Clock, Video, MessageCircle, User } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

interface Appointment {
  id: string;
  time: string;
  callerName: string;
  callerAvatar: string;
  type: 'video' | 'chat';
  duration: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  date: string;
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    time: '10:00 AM',
    callerName: 'Sarah Johnson',
    callerAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'video',
    duration: 30,
    status: 'upcoming',
    date: '2025-01-22'
  },
  {
    id: '2',
    time: '2:30 PM',
    callerName: 'Michael Chen',
    callerAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'chat',
    duration: 15,
    status: 'upcoming',
    date: '2025-01-22'
  },
  {
    id: '3',
    time: '11:00 AM',
    callerName: 'Emma Rodriguez',
    callerAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'video',
    duration: 45,
    status: 'upcoming',
    date: '2025-01-23'
  },
  {
    id: '4',
    time: '9:00 AM',
    callerName: 'David Park',
    callerAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'video',
    duration: 20,
    status: 'completed',
    date: '2025-01-21'
  }
];

export default function AppointmentsCalendarScreen() {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState('2025-01-22');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return theme.colors.info; // info color for upcoming
      case 'completed': return theme.colors.success; // success color for completed
      case 'cancelled': return theme.colors.error; // error color for cancelled
      default: return theme.colors.textMuted; // muted for unknown status
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const formatDateGroup = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (date === today) return 'Today';
    if (date === tomorrow) return 'Tomorrow';
    
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Group appointments by date
  const groupedAppointments = mockAppointments.reduce((groups, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedAppointments).sort();

  // Mark calendar dates with appointments
  const markedDates = mockAppointments.reduce((marked, appointment) => {
    marked[appointment.date] = {
      marked: true,
      dotColor: theme.colors.accent, // accent color for event dots
      selectedColor: appointment.date === selectedDate ? '#007AFF' : undefined,
      selected: appointment.date === selectedDate
    };
    return marked;
  }, {} as any);

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.appointmentContent}>
        <View style={styles.appointmentLeft}>
          <View style={styles.timeContainer}>
            <Clock size={16} color={theme.colors.textMuted} />
            <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>{appointment.time}</Text>
          </View>
          <View style={styles.callerInfo}>
            <Image source={{ uri: appointment.callerAvatar }} style={styles.callerAvatar} />
            <View style={styles.callerDetails}>
              <Text style={[styles.callerName, { color: theme.colors.text }]}>{appointment.callerName}</Text>
              <View style={styles.appointmentMeta}>
                <View style={styles.typeContainer}>
                  {appointment.type === 'video' ? (
                    <Video size={14} color={theme.colors.textMuted} />
                  ) : (
                    <MessageCircle size={14} color={theme.colors.textMuted} />
                  )}
                  <Text style={[styles.typeText, { color: theme.colors.textSecondary }]}>
                    {appointment.type === 'video' ? 'Video Call' : 'Chat'}
                  </Text>
                </View>
                <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>{appointment.duration} min</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.appointmentRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
              {getStatusText(appointment.status)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        title="Appointments Calendar"
        leftButton={
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.colors.overlay }]}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={[styles.calendarContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.colors.card, // calendar background
              calendarBackground: theme.colors.card, // calendar container background
              textSectionTitleColor: theme.colors.text, // day headers (S M T W T F S)
              selectedDayBackgroundColor: theme.colors.primary, // selected day background
              selectedDayTextColor: theme.colors.surface, // selected day text for contrast
              todayTextColor: theme.colors.primary, // today's date highlight
              dayTextColor: theme.colors.text, // regular day text
              textDisabledColor: theme.colors.textMuted, // disabled/inactive days
              dotColor: theme.colors.accent, // event indicator dots
              selectedDotColor: theme.colors.surface, // dots on selected day
              arrowColor: theme.colors.primary, // navigation arrows
              monthTextColor: theme.colors.text, // month/year header
              indicatorColor: theme.colors.primary, // loading indicator
              textDayFontFamily: 'Inter-Regular',
              textMonthFontFamily: 'Inter-Bold',
              textDayHeaderFontFamily: 'Inter-Medium',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
            style={styles.calendar}
          />
        </View>

        {/* Appointments List */}
        <View style={styles.appointmentsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Scheduled Appointments</Text>
          
          {sortedDates.length > 0 ? (
            sortedDates.map((date) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={[styles.dateGroupTitle, { color: theme.colors.textSecondary }]}>{formatDateGroup(date)}</Text>
                {groupedAppointments[date].map(renderAppointmentCard)}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <User size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No appointments scheduled</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                Your upcoming appointments will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 16,
  },
  appointmentsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  appointmentCard: {
    marginBottom: 12,
    padding: 16,
  },
  appointmentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentLeft: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  callerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  callerDetails: {
    flex: 1,
  },
  callerName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  appointmentRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});