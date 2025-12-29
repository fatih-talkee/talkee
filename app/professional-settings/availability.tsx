import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoading } from '@/components/ui/PageLoading';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import {
  Calendar,
  Plus,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  ChevronDown,
  Check,
  Phone,
  Video,
} from 'lucide-react-native';
import { daysOptions, timeOptions } from '@/app/become-professional/_constants';
import {
  validateAvailability,
  getFilteredTimeOptions,
  compareTimes,
  checkAvailabilityOverlaps,
} from '@/app/become-professional/_utils';
import type { Availability } from '@/app/become-professional/_types';
import { AvailabilityOverlapModal } from '@/components/ui/AvailabilityOverlapModal';

export default function AvailabilityScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profileData, professional, isLoading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingAvailability, setEditingAvailability] =
    useState<Availability | null>(null);
  const [availabilityFormData, setAvailabilityFormData] = useState<
    Partial<Availability>
  >({
    availableAt: 'every',
    days: [],
    date: undefined,
    startHour: '',
    endHour: '',
    pricePerMinute: '',
    videoCallEnabled: false,
    videoCallRatePerMinute: '',
  });
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [overlappingAvailabilities, setOverlappingAvailabilities] = useState<
    Availability[]
  >([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Close dropdown when modal closes
  useEffect(() => {
    if (!showAvailabilityModal) {
      setShowTypeDropdown(false);
    }
  }, [showAvailabilityModal]);

  // Calculate if save button should be disabled
  const isSaveButtonDisabled = useMemo(() => {
    // Check if price is entered
    const hasPrice =
      availabilityFormData.pricePerMinute &&
      availabilityFormData.pricePerMinute.trim() !== '' &&
      parseFloat(availabilityFormData.pricePerMinute) > 0;

    // Check if video call price is entered (if video call is enabled)
    const hasVideoPrice =
      !availabilityFormData.videoCallEnabled ||
      (availabilityFormData.videoCallRatePerMinute &&
        availabilityFormData.videoCallRatePerMinute.trim() !== '' &&
        parseFloat(availabilityFormData.videoCallRatePerMinute) > 0);

    return !hasPrice || !hasVideoPrice;
  }, [
    availabilityFormData.pricePerMinute,
    availabilityFormData.videoCallEnabled,
    availabilityFormData.videoCallRatePerMinute,
  ]);

  useEffect(() => {
    const loadData = async () => {
      if (profileData?.user?.id && profileData?.professional?.id) {
        try {
          setLoading(true);
          const result = await professionalsService.getProfessionalByUserId(
            profileData.user.id
          );

          if (result.success && result.professional) {
            const prof = result.professional as any; // Type assertion for availabilities
            if (prof.availabilities && Array.isArray(prof.availabilities)) {
              const availabilitiesData: Availability[] =
                prof.availabilities.map((av: any) => ({
                  id: av.id,
                  availableAt: av.available_at,
                  days:
                    av.available_at === 'urgent' ? undefined : av.days || [],
                  date:
                    av.available_at === 'urgent'
                      ? undefined
                      : av.date
                      ? new Date(av.date)
                      : undefined,
                  startHour:
                    av.available_at === 'urgent' ? undefined : av.start_hour,
                  endHour:
                    av.available_at === 'urgent' ? undefined : av.end_hour,
                  pricePerMinute: av.price_per_minute?.toString() || '0',
                  videoCallEnabled: av.video_call_enabled || false,
                  videoCallRatePerMinute:
                    av.video_call_rate_per_minute?.toString() || '',
                }));
              setAvailabilities(availabilitiesData);
            } else {
              setAvailabilities([]);
            }
          } else {
            toast.error({
              title: 'Error',
              message: result.error || 'Failed to load professional data',
            });
          }
        } catch (error: any) {
          console.error('Error loading data:', error);
          toast.error({
            title: 'Error',
            message: 'Failed to load availability data',
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadData();
  }, [profileData]);

  const handleAddAvailability = () => {
    setEditingAvailability(null);
    setAvailabilityFormData({
      availableAt: 'every',
      days: [],
      date: undefined,
      startHour: '',
      endHour: '',
      pricePerMinute: '',
      videoCallEnabled: false,
      videoCallRatePerMinute: '',
    });
    setAvailabilityError(null);
    setShowAvailabilityModal(true);
  };

  const handleEditAvailability = (item: Availability) => {
    setEditingAvailability(item);
    setAvailabilityFormData({
      availableAt: item.availableAt,
      days: item.days || [],
      date: item.date,
      startHour: item.startHour,
      endHour: item.endHour,
      pricePerMinute: item.pricePerMinute,
      videoCallEnabled: item.videoCallEnabled || false,
      videoCallRatePerMinute: item.videoCallRatePerMinute || '',
    });
    setAvailabilityError(null);
    setShowAvailabilityModal(true);
  };

  const handleSaveAvailability = async () => {
    const error = validateAvailability(availabilityFormData);
    if (error) {
      setAvailabilityError(error);
      return;
    }

    const newAvailability: Availability = {
      id: editingAvailability?.id || Date.now().toString(),
      availableAt: availabilityFormData.availableAt!,
      days:
        availabilityFormData.availableAt === 'urgent'
          ? undefined
          : availabilityFormData.days,
      date:
        availabilityFormData.availableAt === 'urgent'
          ? undefined
          : availabilityFormData.date,
      startHour:
        availabilityFormData.availableAt === 'urgent'
          ? undefined
          : availabilityFormData.startHour,
      endHour:
        availabilityFormData.availableAt === 'urgent'
          ? undefined
          : availabilityFormData.endHour,
      pricePerMinute: availabilityFormData.pricePerMinute!,
      videoCallEnabled: availabilityFormData.videoCallEnabled || false,
      videoCallRatePerMinute: availabilityFormData.videoCallRatePerMinute || '',
    };

    // Check for overlaps (only for scheduled availabilities, not urgent)
    if (newAvailability.availableAt !== 'urgent') {
      const overlaps = checkAvailabilityOverlaps(newAvailability, availabilities);
      if (overlaps.length > 0) {
        setOverlappingAvailabilities(overlaps);
        setShowOverlapModal(true);
        return;
      }
    }

    // Update local state
    let updatedAvailabilities: Availability[];
    if (editingAvailability) {
      updatedAvailabilities = availabilities.map((av) =>
        av.id === editingAvailability.id ? newAvailability : av
      );
    } else {
      updatedAvailabilities = [...availabilities, newAvailability];
    }
    setAvailabilities(updatedAvailabilities);

    // Auto-save to database
    if (professional?.id) {
      try {
        setSaving(true);
        const availabilitiesData = updatedAvailabilities.map((av) => ({
          available_at: av.availableAt,
          days: av.availableAt === 'urgent' ? null : av.days || null,
          date:
            av.availableAt === 'urgent'
              ? null
              : av.date
              ? av.date.toISOString().split('T')[0]
              : null,
          start_hour: av.availableAt === 'urgent' ? null : av.startHour || null,
          end_hour: av.availableAt === 'urgent' ? null : av.endHour || null,
          price_per_minute: parseFloat(av.pricePerMinute) || 0,
          video_call_enabled: av.videoCallEnabled || false,
          video_call_rate_per_minute: av.videoCallEnabled
            ? parseFloat(av.videoCallRatePerMinute || '0') || null
            : null,
        }));

        const result =
          await professionalsService.updateProfessionalAvailabilities(
            professional.id,
            availabilitiesData
          );

        if (!result.success) {
          // Revert on error
          setAvailabilities(availabilities);
          toast.error({
            title: 'Error',
            message: result.error || 'Failed to save availability',
          });
          setSaving(false);
          return;
        }

        toast.success({
          title: 'Success',
          message: editingAvailability
            ? 'Availability updated successfully'
            : 'Availability added successfully',
        });
      } catch (error: any) {
        console.error('Error auto-saving availability:', error);
        // Revert on error
        setAvailabilities(availabilities);
        toast.error({
          title: 'Error',
          message: error.message || 'Failed to save availability',
        });
      } finally {
        setSaving(false);
      }
    }

    setShowAvailabilityModal(false);
    setEditingAvailability(null);
    setAvailabilityFormData({
      availableAt: 'every',
      days: [],
      date: undefined,
      startHour: '',
      endHour: '',
      pricePerMinute: '',
      videoCallEnabled: false,
      videoCallRatePerMinute: '',
    });
  };

  const handleDeleteAvailability = async (id: string) => {
    const updatedAvailabilities = availabilities.filter((av) => av.id !== id);
    setAvailabilities(updatedAvailabilities);
    
    // Auto-save after deletion
    if (professional?.id) {
      try {
        setSaving(true);
        const availabilitiesData = updatedAvailabilities.map((av) => ({
          available_at: av.availableAt,
          days: av.availableAt === 'urgent' ? null : av.days || null,
          date:
            av.availableAt === 'urgent'
              ? null
              : av.date
              ? av.date.toISOString().split('T')[0]
              : null,
          start_hour: av.availableAt === 'urgent' ? null : av.startHour || null,
          end_hour: av.availableAt === 'urgent' ? null : av.endHour || null,
          price_per_minute: parseFloat(av.pricePerMinute) || 0,
          video_call_enabled: av.videoCallEnabled || false,
          video_call_rate_per_minute: av.videoCallEnabled
            ? parseFloat(av.videoCallRatePerMinute || '0') || null
            : null,
        }));

        const result =
          await professionalsService.updateProfessionalAvailabilities(
            professional.id,
            availabilitiesData
          );

        if (!result.success) {
          // Revert on error
          setAvailabilities(availabilities);
          toast.error({
            title: 'Error',
            message: result.error || 'Failed to delete availability',
          });
          setSaving(false);
          return;
        }

        toast.success({
          title: 'Success',
          message: 'Availability deleted successfully',
        });
      } catch (error: any) {
        console.error('Error auto-saving after deletion:', error);
        // Revert on error
        setAvailabilities(availabilities);
        toast.error({
          title: 'Error',
          message: error.message || 'Failed to delete availability',
        });
      } finally {
        setSaving(false);
      }
    }
  };


  if (loading || profileLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack onBackPress={() => router.back()} />
        <PageLoading message="Loading availabilities..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Availability
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Set your schedule and pricing
          </Text>
        </View>

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
              onPress={handleAddAvailability}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          <>
            {availabilities.map((item) => (
              <Card
                key={item.id}
                style={[
                  styles.availabilityCard,
                  { backgroundColor: theme.colors.card },
                ]}
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
                                    backgroundColor:
                                      theme.colors.primary + '15',
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
                          <View
                            style={[styles.timeContainer, { marginTop: 8 }]}
                          >
                            <Clock size={14} color={theme.colors.textMuted} />
                            <Text
                              style={[
                                styles.timeText,
                                { color: theme.colors.text },
                              ]}
                            >
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
                                ? (item.date as Date).toLocaleDateString(
                                    'en-US',
                                    {
                                      weekday: 'long',
                                      month: 'long',
                                      day: 'numeric',
                                    }
                                  )
                                : ''}
                            </Text>
                          </View>
                          <View
                            style={[styles.timeContainer, { marginTop: 8 }]}
                          >
                            <Clock size={14} color={theme.colors.textMuted} />
                            <Text
                              style={[
                                styles.timeText,
                                { color: theme.colors.text },
                              ]}
                            >
                              {item.startHour} - {item.endHour}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleEditAvailability(item)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.colors.accent + '20' },
                      ]}
                    >
                      <Edit2 size={18} color={theme.colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteAvailability(item.id)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: '#ef444420' },
                      ]}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
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
                    <Text
                      style={[
                        styles.priceText,
                        { color: theme.colors.primary },
                      ]}
                    >
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
                        <Text
                          style={[
                            styles.priceText,
                            { color: theme.colors.accent },
                          ]}
                        >
                          $
                          {parseFloat(item.videoCallRatePerMinute).toFixed(2)}{' '}
                          / min
                        </Text>
                      </View>
                    )}
                </View>
              </Card>
            ))}

            <TouchableOpacity
              onPress={handleAddAvailability}
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
      </ScrollView>


      {/* Availability Modal */}
      {showAvailabilityModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAvailabilityModal(false)}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAvailabilityModal(false)}
            />
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {editingAvailability
                    ? 'Edit Availability'
                    : 'Add Availability'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAvailabilityModal(false)}
                >
                  <Text
                    style={[styles.modalClose, { color: theme.colors.text }]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => setShowTypeDropdown(false)}
              >
                {availabilityError && (
                  <View
                    style={[
                      styles.errorContainer,
                      { backgroundColor: theme.colors.error + '10' },
                    ]}
                  >
                    <Text
                      style={[styles.errorText, { color: theme.colors.error }]}
                    >
                      {availabilityError}
                    </Text>
                  </View>
                )}

                {/* Availability Type */}
                <View style={styles.inputWrapper}>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                    >
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {availabilityFormData.availableAt === 'every'
                          ? 'Every Week'
                          : availabilityFormData.availableAt === 'specific'
                          ? 'Specific Date'
                          : 'Urgent Call'}
                      </Text>
                      <ChevronDown
                        size={20}
                        color={theme.colors.text}
                        style={[
                          styles.dropdownIcon,
                          showTypeDropdown && styles.dropdownIconOpen,
                        ]}
                      />
                    </TouchableOpacity>
                    {showTypeDropdown && (
                      <View
                        style={[
                          styles.dropdownMenu,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.dropdownOption,
                            {
                              backgroundColor:
                                availabilityFormData.availableAt === 'every'
                                  ? theme.colors.primary + '20'
                                  : 'transparent',
                              borderBottomColor: theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            setAvailabilityFormData({
                              ...availabilityFormData,
                              availableAt: 'every',
                              date: undefined,
                            });
                            setShowTypeDropdown(false);
                            setAvailabilityError(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              {
                                color:
                                  availabilityFormData.availableAt === 'every'
                                    ? theme.colors.primary
                                    : theme.colors.text,
                                fontFamily:
                                  availabilityFormData.availableAt === 'every'
                                    ? 'Inter-SemiBold'
                                    : 'Inter-Regular',
                              },
                            ]}
                          >
                            Every Week
                          </Text>
                          {availabilityFormData.availableAt === 'every' && (
                            <Check
                              size={18}
                              color={theme.colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.dropdownOption,
                            {
                              backgroundColor:
                                availabilityFormData.availableAt === 'specific'
                                  ? theme.colors.primary + '20'
                                  : 'transparent',
                              borderBottomColor: theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            setAvailabilityFormData({
                              ...availabilityFormData,
                              availableAt: 'specific',
                              days: undefined,
                            });
                            setShowTypeDropdown(false);
                            setAvailabilityError(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              {
                                color:
                                  availabilityFormData.availableAt === 'specific'
                                    ? theme.colors.primary
                                    : theme.colors.text,
                                fontFamily:
                                  availabilityFormData.availableAt === 'specific'
                                    ? 'Inter-SemiBold'
                                    : 'Inter-Regular',
                              },
                            ]}
                          >
                            Specific Date
                          </Text>
                          {availabilityFormData.availableAt === 'specific' && (
                            <Check
                              size={18}
                              color={theme.colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.dropdownOption,
                            {
                              backgroundColor:
                                availabilityFormData.availableAt === 'urgent'
                                  ? '#F59E0B' + '20'
                                  : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setAvailabilityFormData({
                              ...availabilityFormData,
                              availableAt: 'urgent',
                              days: undefined,
                              date: undefined,
                              startHour: undefined,
                              endHour: undefined,
                            });
                            setShowTypeDropdown(false);
                            setAvailabilityError(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              {
                                color:
                                  availabilityFormData.availableAt === 'urgent'
                                    ? '#F59E0B'
                                    : theme.colors.text,
                                fontFamily:
                                  availabilityFormData.availableAt === 'urgent'
                                    ? 'Inter-SemiBold'
                                    : 'Inter-Regular',
                              },
                            ]}
                          >
                            Urgent Call
                          </Text>
                          {availabilityFormData.availableAt === 'urgent' && (
                            <Check size={18} color="#F59E0B" />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Days Selection (for every) */}
                {availabilityFormData.availableAt === 'every' && (
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Select Days *
                    </Text>
                    <View style={styles.daysContainerModal}>
                      {daysOptions.map((day) => {
                        const isSelected =
                          availabilityFormData.days?.includes(day);
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayButton,
                              {
                                backgroundColor: isSelected
                                  ? theme.colors.primary + '20'
                                  : theme.colors.card,
                                borderColor: isSelected
                                  ? theme.colors.primary
                                  : theme.colors.border,
                              },
                            ]}
                            onPress={() => {
                              const currentDays =
                                availabilityFormData.days || [];
                              const newDays = isSelected
                                ? currentDays.filter((d) => d !== day)
                                : [...currentDays, day];
                              setAvailabilityFormData({
                                ...availabilityFormData,
                                days: newDays,
                              });
                              setAvailabilityError(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.dayButtonText,
                                {
                                  color: isSelected
                                    ? theme.colors.primary
                                    : theme.colors.text,
                                },
                              ]}
                            >
                              {day.substring(0, 3)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Date Picker (for specific) */}
                {availabilityFormData.availableAt === 'specific' && (
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Select Date *
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.dateButtonText,
                          {
                            color: availabilityFormData.date
                              ? theme.colors.text
                              : theme.colors.textMuted,
                          },
                        ]}
                      >
                        {availabilityFormData.date
                          ? availabilityFormData.date.toLocaleDateString(
                              'en-US',
                              {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }
                            )
                          : 'Select a date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker &&
                      (Platform.OS === 'web' ? (
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={
                            availabilityFormData.date
                              ? availabilityFormData.date
                                  .toISOString()
                                  .split('T')[0]
                              : ''
                          }
                          onChange={(e: any) => {
                            if (e.target?.value) {
                              setAvailabilityFormData({
                                ...availabilityFormData,
                                date: new Date(e.target.value),
                              });
                              setShowDatePicker(false);
                              setAvailabilityError(null);
                            }
                          }}
                          style={{
                            marginTop: 8,
                            padding: 8,
                            borderRadius: 8,
                            border: `1px solid ${theme.colors.border}`,
                          }}
                        />
                      ) : (
                        <DateTimePicker
                          value={availabilityFormData.date || new Date()}
                          mode="date"
                          display="default"
                          minimumDate={new Date()}
                          onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                              setAvailabilityFormData({
                                ...availabilityFormData,
                                date: selectedDate,
                              });
                              setAvailabilityError(null);
                            }
                          }}
                        />
                      ))}
                  </View>
                )}

                {/* Time Selection (not for urgent calls) */}
                {availabilityFormData.availableAt !== 'urgent' && (
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Time Range *
                    </Text>
                    <View style={styles.timeRow}>
                      <TouchableOpacity
                        style={[
                          styles.timeButton,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setShowTimePicker('start')}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            {
                              color: availabilityFormData.startHour
                                ? theme.colors.text
                                : theme.colors.textMuted,
                            },
                          ]}
                        >
                          {availabilityFormData.startHour || 'Start'}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.timeSeparator,
                          { color: theme.colors.text },
                        ]}
                      >
                        -
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.timeButton,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setShowTimePicker('end')}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            {
                              color: availabilityFormData.endHour
                                ? theme.colors.text
                                : theme.colors.textMuted,
                            },
                          ]}
                        >
                          {availabilityFormData.endHour || 'End'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Urgent Call Info */}
                {availabilityFormData.availableAt === 'urgent' && (
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.infoBox,
                        {
                          backgroundColor: '#F59E0B' + '15',
                          borderColor: '#F59E0B' + '40',
                        },
                      ]}
                    >
                      <Text style={[styles.infoText, { color: '#F59E0B' }]}>
                        Urgent calls are always available when you're online,
                        regardless of scheduled hours. Users can call you
                        anytime you're online at the price you set below.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Time Picker Modal */}
                {showTimePicker && (
                  <Modal
                    visible={true}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowTimePicker(null)}
                  >
                    <View style={styles.timePickerOverlay}>
                      <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowTimePicker(null)}
                      />
                      <View
                        style={[
                          styles.timePickerContent,
                          { backgroundColor: theme.colors.surface },
                        ]}
                        onStartShouldSetResponder={() => true}
                      >
                        <View
                          style={[
                            styles.timePickerHeader,
                            { borderBottomColor: theme.colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timePickerTitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            Select{' '}
                            {showTimePicker === 'start' ? 'Start' : 'End'} Time
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowTimePicker(null)}
                          >
                            <Text
                              style={[
                                styles.modalClose,
                                { color: theme.colors.text },
                              ]}
                            >
                              ✕
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.timePickerBody}>
                          {getFilteredTimeOptions(
                            showTimePicker,
                            availabilityFormData.startHour,
                            availabilityFormData.endHour
                          ).map((time) => (
                            <TouchableOpacity
                              key={time.value}
                              style={[
                                styles.timeOption,
                                {
                                  backgroundColor:
                                    (showTimePicker === 'start' &&
                                      availabilityFormData.startHour ===
                                        time.value) ||
                                    (showTimePicker === 'end' &&
                                      availabilityFormData.endHour ===
                                        time.value)
                                      ? theme.colors.primary + '20'
                                      : 'transparent',
                                  borderBottomColor: theme.colors.border,
                                },
                              ]}
                              onPress={() => {
                                if (showTimePicker === 'start') {
                                  setAvailabilityFormData({
                                    ...availabilityFormData,
                                    startHour: time.value,
                                    endHour:
                                      availabilityFormData.endHour &&
                                      compareTimes(
                                        time.value,
                                        availabilityFormData.endHour
                                      ) >= 0
                                        ? ''
                                        : availabilityFormData.endHour,
                                  });
                                } else {
                                  setAvailabilityFormData({
                                    ...availabilityFormData,
                                    endHour: time.value,
                                  });
                                }
                                setShowTimePicker(null);
                                setAvailabilityError(null);
                              }}
                            >
                              <Text
                                style={[
                                  styles.timeOptionText,
                                  {
                                    color:
                                      (showTimePicker === 'start' &&
                                        availabilityFormData.startHour ===
                                          time.value) ||
                                      (showTimePicker === 'end' &&
                                        availabilityFormData.endHour ===
                                          time.value)
                                        ? theme.colors.primary
                                        : theme.colors.text,
                                  },
                                ]}
                              >
                                {time.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                )}

                {/* Price Per Minute */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Voice Call Price Per Minute ($) *
                  </Text>
                  <TextInput
                    value={availabilityFormData.pricePerMinute}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.,]/g, '');
                      setAvailabilityFormData({
                        ...availabilityFormData,
                        pricePerMinute: numericValue,
                      });
                      setAvailabilityError(null);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                    style={[
                      styles.priceInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                  />
                </View>

                {/* Video Call Toggle */}
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => {
                      setAvailabilityFormData({
                        ...availabilityFormData,
                        videoCallEnabled: !availabilityFormData.videoCallEnabled,
                        videoCallRatePerMinute: availabilityFormData
                          .videoCallEnabled
                          ? ''
                          : availabilityFormData.videoCallRatePerMinute,
                      });
                      setAvailabilityError(null);
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: availabilityFormData.videoCallEnabled
                            ? theme.colors.primary
                            : 'transparent',
                          borderColor: availabilityFormData.videoCallEnabled
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      {availabilityFormData.videoCallEnabled && (
                        <Text style={[styles.checkmark, { color: '#fff' }]}>
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                      Enable Video Calls
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Video Call Price Per Minute */}
                {availabilityFormData.videoCallEnabled && (
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Video Call Price Per Minute ($) *
                    </Text>
                    <TextInput
                      value={availabilityFormData.videoCallRatePerMinute}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9.,]/g, '');
                        setAvailabilityFormData({
                          ...availabilityFormData,
                          videoCallRatePerMinute: numericValue,
                        });
                        setAvailabilityError(null);
                      }}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      style={[
                        styles.priceInput,
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

              <View
                style={[
                  styles.modalFooter,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <Button
                  title={editingAvailability ? 'Update' : 'Add'}
                  onPress={handleSaveAvailability}
                  style={styles.modalButtonFullWidth}
                  disabled={isSaveButtonDisabled}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Overlap Error Modal */}
      <AvailabilityOverlapModal
        visible={showOverlapModal}
        onClose={() => setShowOverlapModal(false)}
        overlappingAvailabilities={overlappingAvailabilities}
        newAvailability={{
          id: editingAvailability?.id || Date.now().toString(),
          availableAt: availabilityFormData.availableAt!,
          days:
            availabilityFormData.availableAt === 'urgent'
              ? undefined
              : availabilityFormData.days,
          date:
            availabilityFormData.availableAt === 'urgent'
              ? undefined
              : availabilityFormData.date,
          startHour:
            availabilityFormData.availableAt === 'urgent'
              ? undefined
              : availabilityFormData.startHour,
          endHour:
            availabilityFormData.availableAt === 'urgent'
              ? undefined
              : availabilityFormData.endHour,
          pricePerMinute: availabilityFormData.pricePerMinute!,
          videoCallEnabled: availabilityFormData.videoCallEnabled || false,
          videoCallRatePerMinute: availabilityFormData.videoCallRatePerMinute || '',
        }}
      />
    </SafeAreaView>
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
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    marginTop: 16,
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
  addAvailabilityButton: {
    marginTop: 16,
  },
  addAvailabilityText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
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
    padding: 20,
    paddingBottom: 40,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalButtonFullWidth: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  dropdownIcon: {
    transform: [{ rotate: '0deg' }],
  },
  dropdownIconOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  dropdownOptionText: {
    fontSize: 15,
    flex: 1,
  },
  daysContainerModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  dateButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  timeSeparator: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerContent: {
    width: '100%',
    maxWidth: 400,
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  timePickerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  timePickerBody: {
    maxHeight: 400,
  },
  timeOption: {
    padding: 16,
    borderBottomWidth: 1,
  },
  timeOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  priceInput: {
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
  checkmark: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
});
