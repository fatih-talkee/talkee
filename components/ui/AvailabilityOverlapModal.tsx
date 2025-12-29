import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from './Button';
import { AlertTriangle, X } from 'lucide-react-native';
import type { Availability } from '@/app/become-professional/_types';

interface AvailabilityOverlapModalProps {
  visible: boolean;
  onClose: () => void;
  overlappingAvailabilities: Availability[];
  newAvailability: Availability;
}

export function AvailabilityOverlapModal({
  visible,
  onClose,
  overlappingAvailabilities,
  newAvailability,
}: AvailabilityOverlapModalProps) {
  const { theme } = useTheme();

  const formatAvailability = (av: Availability): string => {
    if (av.availableAt === 'urgent') {
      return 'Urgent Call (Always available when online)';
    } else if (av.availableAt === 'every') {
      const days = av.days?.map((d) => d.substring(0, 3)).join(', ') || '';
      return `Weekly: ${days} ${av.startHour} - ${av.endHour}`;
    } else if (av.availableAt === 'specific') {
      const dateStr = av.date
        ? (av.date as Date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        : '';
      return `One-time: ${dateStr} ${av.startHour} - ${av.endHour}`;
    }
    return 'Unknown';
  };

  const formatNewAvailability = (): string => {
    if (newAvailability.availableAt === 'urgent') {
      return 'Urgent Call (Always available when online)';
    } else if (newAvailability.availableAt === 'every') {
      const days =
        newAvailability.days?.map((d) => d.substring(0, 3)).join(', ') || '';
      return `Weekly: ${days} ${newAvailability.startHour} - ${newAvailability.endHour}`;
    } else if (newAvailability.availableAt === 'specific') {
      const dateStr = newAvailability.date
        ? (newAvailability.date as Date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        : '';
      return `One-time: ${dateStr} ${newAvailability.startHour} - ${newAvailability.endHour}`;
    }
    return 'Unknown';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.error + '20' },
                ]}
              >
                <AlertTriangle size={24} color={theme.colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Availability Conflict
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text
              style={[styles.message, { color: theme.colors.text }]}
            >
              The availability you're trying to add conflicts with existing
              availabilities. Please adjust the time or date to avoid overlaps.
            </Text>

            <View style={styles.conflictSection}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                New Availability:
              </Text>
              <View
                style={[
                  styles.availabilityBox,
                  {
                    backgroundColor: theme.colors.primary + '15',
                    borderColor: theme.colors.primary + '40',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.availabilityText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {formatNewAvailability()}
                </Text>
              </View>
            </View>

            <View style={styles.conflictSection}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                Conflicting Availabilities:
              </Text>
              {overlappingAvailabilities.map((av, index) => (
                <View
                  key={index}
                  style={[
                    styles.availabilityBox,
                    {
                      backgroundColor: theme.colors.error + '15',
                      borderColor: theme.colors.error + '40',
                      marginTop: index > 0 ? 8 : 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availabilityText,
                      { color: theme.colors.error },
                    ]}
                  >
                    {formatAvailability(av)}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: theme.colors.accent + '15',
                  borderColor: theme.colors.accent + '40',
                },
              ]}
            >
              <Text
                style={[styles.infoText, { color: theme.colors.accent }]}
              >
                💡 Tip: You can't have overlapping availabilities. Either adjust
                the time range or remove the conflicting availability first.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.modalFooter,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <Button title="Got it" onPress={onClose} style={styles.button} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
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
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 20,
  },
  conflictSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  availabilityBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  availabilityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  button: {
    width: '100%',
  },
});

