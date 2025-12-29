import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Calendar,
  Plus,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  Phone,
  Video,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import type { Availability } from '../_types';

interface Step5AvailabilityProps {
  availabilities: Availability[];
  onAddAvailability: () => void;
  onEditAvailability: (item: Availability) => void;
  onDeleteAvailability: (id: string) => void;
}

function AvailabilityCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Availability;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Card
      key={item.id}
      style={[styles.availabilityCard, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View
            style={[
              styles.iconContainerSmall,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <Calendar size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            {item.availableAt === 'urgent' ? (
              <>
                <View style={styles.infoRow}>
                  <Text
                    style={[
                      styles.scheduleBadge,
                      {
                        backgroundColor: '#F59E0B' + '20',
                        color: '#F59E0B',
                      },
                    ]}
                  >
                    Urgent Call
                  </Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 8 }]}>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: theme.colors.textMuted,
                        fontFamily: 'Inter-Regular',
                      },
                    ]}
                  >
                    Always available when online
                  </Text>
                </View>
              </>
            ) : item.availableAt === 'every' ? (
              <>
                <View style={styles.infoRow}>
                  <Text
                    style={[
                      styles.scheduleBadge,
                      {
                        backgroundColor: theme.colors.primary + '20',
                        color: theme.colors.primary,
                      },
                    ]}
                  >
                    Weekly Schedule
                  </Text>
                </View>
                <View style={styles.daysContainer}>
                  {item.days?.map((day, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dayTag,
                        {
                          backgroundColor: theme.colors.primary + '15',
                          borderColor: theme.colors.primary + '40',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayTagText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {day.substring(0, 3)}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.infoRow, { marginTop: 8 }]}>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: theme.colors.textMuted,
                        fontFamily: 'Inter-Regular',
                      },
                    ]}
                  >
                    Repeats every week
                  </Text>
                </View>
                <View style={[styles.timeContainer, { marginTop: 8 }]}>
                  <Clock size={14} color={theme.colors.textMuted} />
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>
                    {item.startHour} - {item.endHour}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text
                    style={[
                      styles.scheduleBadge,
                      {
                        backgroundColor: theme.colors.accent + '20',
                        color: theme.colors.accent,
                      },
                    ]}
                  >
                    One-time
                  </Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 8 }]}>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: theme.colors.textMuted,
                        fontFamily: 'Inter-Regular',
                      },
                    ]}
                  >
                    {item.date
                      ? (item.date as Date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })
                      : ''}
                  </Text>
                </View>
                <View style={[styles.timeContainer, { marginTop: 8 }]}>
                  <Clock size={14} color={theme.colors.textMuted} />
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>
                    {item.startHour} - {item.endHour}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={onEdit}
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.accent + '20' },
            ]}
          >
            <Edit2 size={18} color={theme.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={[styles.actionButton, { backgroundColor: '#ef444420' }]}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.colors.border }]}
      />

      <View style={styles.priceSection}>
        {/* Voice Call Price */}
        <View
          style={[
            styles.priceBadge,
            {
              backgroundColor:
                theme.name === 'dark'
                  ? theme.colors.primary + '40'
                  : theme.colors.primary + '20',
              borderWidth: theme.name === 'dark' ? 1 : 0,
              borderColor: theme.colors.primary + '60',
            },
          ]}
        >
          <Phone size={16} color={theme.colors.primary} />
          <Text style={[styles.priceText, { color: theme.colors.primary }]}>
            ${parseFloat(item.pricePerMinute).toFixed(2)} / min
          </Text>
        </View>
        {/* Video Call Price (if enabled) */}
        {item.videoCallEnabled &&
          item.videoCallRatePerMinute &&
          parseFloat(item.videoCallRatePerMinute) > 0 && (
            <View
              style={[
                styles.priceBadge,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? theme.colors.accent + '40'
                      : theme.colors.accent + '20',
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor: theme.colors.accent + '60',
                },
              ]}
            >
              <Video size={16} color={theme.colors.accent} />
              <Text style={[styles.priceText, { color: theme.colors.accent }]}>
                ${parseFloat(item.videoCallRatePerMinute).toFixed(2)} / min
              </Text>
            </View>
          )}
      </View>
    </Card>
  );
}

export function Step5Availability({
  availabilities,
  onAddAvailability,
  onEditAvailability,
  onDeleteAvailability,
}: Step5AvailabilityProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.stepContent, styles.stepContentCompact]}>
      <View
        style={[
          styles.iconContainerCompact,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[
            styles.iconCircleCompact,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Calendar size={20} color={theme.colors.surface} strokeWidth={2.5} />
        </View>
      </View>

      <Text style={[styles.titleCompact, { color: theme.colors.text }]}>
        Set Your Availability
      </Text>
      <Text
        style={[styles.subtitleCompact, { color: theme.colors.textSecondary }]}
      >
        Add your availability schedule
      </Text>

      <View style={styles.formCompact}>
        <View style={styles.inputGroup}>
          {availabilities.length === 0 ? (
            <Card
              style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}
            >
              <View style={styles.warningContainer}>
                <Text
                  style={[
                    styles.warningText,
                    { color: theme.colors.error || '#ef4444' },
                  ]}
                >
                  Please add at least one availability to continue
                </Text>
              </View>
              <Calendar size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Availability Set
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  { color: theme.colors.textMuted },
                ]}
              >
                Add your availability schedule to let users know when you're
                available for calls
              </Text>
              <Button
                title="Add Availability"
                onPress={onAddAvailability}
                style={styles.emptyButton}
              />
            </Card>
          ) : (
            <>
              {availabilities.map((item) => (
                <AvailabilityCard
                  key={item.id}
                  item={item}
                  onEdit={() => onEditAvailability(item)}
                  onDelete={() => onDeleteAvailability(item.id)}
                />
              ))}
              <TouchableOpacity
                onPress={onAddAvailability}
                style={[
                  styles.addAvailabilityButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 16,
                  },
                ]}
              >
                <Plus size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.addAvailabilityText,
                    {
                      color: theme.colors.primary,
                      marginLeft: 8,
                      fontFamily: 'Inter-Bold',
                      fontSize: 15,
                    },
                  ]}
                >
                  Add Availability
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    alignItems: 'center',
  },
  stepContentCompact: {
    alignItems: 'flex-start',
    width: '100%',
  },
  iconContainerCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  iconCircleCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCompact: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
    textAlign: 'left',
  },
  subtitleCompact: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 20,
  },
  formCompact: {
    width: '100%',
    gap: 16,
  },
  inputGroup: {
    width: '100%',
  },
  warningContainer: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    marginTop: 16,
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
  addAvailabilityButton: {
    marginTop: 16,
  },
  addAvailabilityText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  availabilityCard: {
    marginBottom: 16,
    padding: 20,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  scheduleBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dayTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
  divider: {
    height: 1,
    marginVertical: 16,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  priceText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});

// Default export to prevent Expo Router from treating this as a route
export default null;
