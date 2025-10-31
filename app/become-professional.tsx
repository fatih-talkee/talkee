import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Briefcase,
  GraduationCap,
  DollarSign,
  Clock,
  Check,
  FileText,
  Mail,
  Plus,
  X,
  Edit2,
  Trash2,
  Calendar,
  Globe,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { mockCategories } from '@/mockData/professionals';
import { useIsMounted } from '@/hooks/useIsMounted';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, KeyboardAvoidingView } from 'react-native';

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

const minimumDurations = [
  { label: '5 minutes', value: '5' },
  { label: '10 minutes', value: '10' },
  { label: '15 minutes', value: '15' },
  { label: '20 minutes', value: '20' },
  { label: '30 minutes', value: '30' },
];

const daysOptions = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const currencyOptions = ['USD', 'TRY', 'EUR'];
const currencySymbols = {
  USD: '$',
  TRY: '₺',
  EUR: '€',
};

const educationLevels = [
  { label: 'High School', value: 'high_school' },
  { label: 'Associate Degree', value: 'associate' },
  { label: "Bachelor's Degree", value: 'bachelor' },
  { label: "Master's Degree", value: 'master' },
  { label: 'Doctorate (PhD)', value: 'doctorate' },
  { label: 'Professional Certificate', value: 'certificate' },
  { label: 'Other', value: 'other' },
];

export default function BecomeProfessionalScreen() {
  const { theme } = useTheme();
  const isMountedRef = useIsMounted();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const progressAnim = useRef(new Animated.Value(25)).current;

  // Step 1 - Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [education, setEducation] = useState('');

  // Step 2 - Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Step 3 - Availability & Minimum Duration
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingAvailability, setEditingAvailability] =
    useState<Availability | null>(null);
  const [availabilityFormData, setAvailabilityFormData] = useState<
    Partial<Availability>
  >({
    availableAt: 'every',
    days: [],
    startHour: '',
    endHour: '',
    currency: 'USD',
    pricePerMinute: '',
  });
  const [minimumDuration, setMinimumDuration] = useState('10');
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showEducationDropdown, setShowEducationDropdown] = useState(false);

  // Step 4 - Finish
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Availability helpers
  const openAvailabilityModal = (availability?: Availability) => {
    if (availability) {
      setEditingAvailability(availability);
      setAvailabilityFormData({
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
      setAvailabilityFormData({
        availableAt: 'every',
        days: [],
        startHour: '',
        endHour: '',
        currency: 'USD',
        pricePerMinute: '',
      });
    }
    setShowAvailabilityModal(true);
  };

  const closeAvailabilityModal = () => {
    setShowAvailabilityModal(false);
    setEditingAvailability(null);
    setAvailabilityFormData({
      availableAt: 'every',
      days: [],
      startHour: '',
      endHour: '',
      currency: 'USD',
      pricePerMinute: '',
    });
  };

  const toggleDay = (day: string) => {
    const currentDays = availabilityFormData.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    setAvailabilityFormData({ ...availabilityFormData, days: newDays });
  };

  const handleSaveAvailability = () => {
    if (
      availabilityFormData.availableAt === 'every' &&
      (!availabilityFormData.days || availabilityFormData.days.length === 0)
    ) {
      return;
    }
    if (
      availabilityFormData.availableAt === 'specific' &&
      !availabilityFormData.date
    ) {
      return;
    }
    if (
      !availabilityFormData.startHour ||
      !availabilityFormData.endHour ||
      !availabilityFormData.pricePerMinute
    ) {
      return;
    }

    // Validate time format
    if (
      !validateTimeFormat(availabilityFormData.startHour) ||
      !validateTimeFormat(availabilityFormData.endHour)
    ) {
      return;
    }

    if (editingAvailability) {
      setAvailabilities(
        availabilities.map((av) =>
          av.id === editingAvailability.id
            ? ({
                ...availabilityFormData,
                id: editingAvailability.id,
              } as Availability)
            : av
        )
      );
    } else {
      const newAvailability: Availability = {
        id: Date.now().toString(),
        availableAt: availabilityFormData.availableAt as 'every' | 'specific',
        days: availabilityFormData.days,
        date: availabilityFormData.date,
        startHour: availabilityFormData.startHour!,
        endHour: availabilityFormData.endHour!,
        currency: availabilityFormData.currency!,
        pricePerMinute: availabilityFormData.pricePerMinute!,
      };
      setAvailabilities([...availabilities, newAvailability]);
    }
    closeAvailabilityModal();
  };

  const handleDeleteAvailability = (id: string) => {
    setAvailabilities(availabilities.filter((av) => av.id !== id));
  };

  // Time format helper
  const formatTimeInput = (text: string): string => {
    // Remove all non-numeric characters
    const numericValue = text.replace(/[^\d]/g, '');

    // Limit to 4 digits
    const limited = numericValue.slice(0, 4);

    // Format as HH:MM
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 2) {
      return limited;
    } else {
      // Format as HH:MM
      const hours = limited.slice(0, 2);
      const minutes = limited.slice(2, 4);
      return `${hours}:${minutes}`;
    }
  };

  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleTimeChange = (field: 'startHour' | 'endHour', text: string) => {
    const formatted = formatTimeInput(text);
    setAvailabilityFormData({
      ...availabilityFormData,
      [field]: formatted,
    });
  };

  const handleNextStep = () => {
    // Validation for Step 1
    if (currentStep === 1) {
      if (
        !fullName.trim() ||
        !email.trim() ||
        !profession.trim() ||
        !education.trim()
      ) {
        return;
      }
    }

    if (currentStep < 4) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      Animated.timing(progressAnim, {
        toValue: newStep * 25,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      Animated.timing(progressAnim, {
        toValue: newStep * 25,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        router.replace('/(tabs)');
      }
    }, 1000);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      setSelectedCategories((prev) => [...prev, `custom_${customCategory}`]);
      setCustomCategory('');
      setShowCustomInput(false);
    }
  };

  const selectedDuration = minimumDurations.find(
    (d) => d.value === minimumDuration
  );
  const selectedEducation = educationLevels.find((e) => e.value === education);

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View
        style={[styles.progressBar, { backgroundColor: theme.colors.border }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
        Step {currentStep} of 4
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}
        >
          <User size={32} color={theme.colors.surface} strokeWidth={2.5} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        Professional Information
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Tell us about your professional background
      </Text>

      <View style={styles.form}>
        <Input
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          leftIcon={<User size={20} color={theme.colors.textMuted} />}
        />

        <Input
          label="Email Address *"
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          leftIcon={<Mail size={20} color={theme.colors.textMuted} />}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Profession *"
          value={profession}
          onChangeText={setProfession}
          placeholder="e.g., Life Coach, Business Consultant"
          leftIcon={<Briefcase size={20} color={theme.colors.textMuted} />}
        />

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Education *
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setShowEducationDropdown(!showEducationDropdown)}
          >
            <GraduationCap size={20} color={theme.colors.textMuted} />
            <Text
              style={[
                styles.dropdownText,
                {
                  color: education ? theme.colors.text : theme.colors.textMuted,
                },
              ]}
            >
              {selectedEducation?.label || 'Select your education level'}
            </Text>
            <ChevronLeft
              size={16}
              color={theme.colors.textMuted}
              style={{
                transform: [
                  { rotate: showEducationDropdown ? '90deg' : '-90deg' },
                ],
              }}
            />
          </TouchableOpacity>

          {showEducationDropdown && (
            <View
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {educationLevels.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: theme.colors.border },
                    education === level.value && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setEducation(level.value);
                    setShowEducationDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      {
                        color:
                          education === level.value
                            ? theme.colors.surface
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}
        >
          <Briefcase size={32} color={theme.colors.surface} strokeWidth={2.5} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        Select Categories
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Choose categories where you can provide expertise
      </Text>

      <View style={styles.categoriesGrid}>
        {mockCategories.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => toggleCategory(category.id)}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Check
                    size={14}
                    color={theme.colors.surface}
                    strokeWidth={3}
                  />
                </View>
              )}
              <Text style={styles.categoryEmoji}>
                {getCategoryEmoji(category.name)}
              </Text>
              <Text
                style={[
                  styles.categoryName,
                  {
                    color: isSelected
                      ? theme.colors.surface
                      : theme.colors.text,
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Other Category */}
        <TouchableOpacity
          onPress={() => setShowCustomInput(true)}
          style={[
            styles.categoryCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Text style={styles.categoryEmoji}>➕</Text>
          <Text
            style={[styles.categoryName, { color: theme.colors.textSecondary }]}
          >
            Other
          </Text>
        </TouchableOpacity>
      </View>

      {showCustomInput && (
        <View
          style={[
            styles.customInputContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Input
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="Enter custom category"
            autoFocus
          />
          <View style={styles.customButtonsRow}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowCustomInput(false);
                setCustomCategory('');
              }}
              style={[
                styles.customButton,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <Button
              title="Add"
              onPress={handleAddCustomCategory}
              style={[
                styles.customButton,
                { backgroundColor: theme.colors.primary },
              ]}
            />
          </View>
        </View>
      )}

      {/* Show selected custom categories */}
      {selectedCategories.filter((c) => c.startsWith('custom_')).length > 0 && (
        <View style={styles.customCategoriesList}>
          {selectedCategories
            .filter((c) => c.startsWith('custom_'))
            .map((cat) => (
              <View
                key={cat}
                style={[
                  styles.customCategoryChip,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.customCategoryText,
                    { color: theme.colors.surface },
                  ]}
                >
                  {cat.replace('custom_', '')}
                </Text>
                <TouchableOpacity onPress={() => toggleCategory(cat)}>
                  <Text
                    style={[styles.removeX, { color: theme.colors.surface }]}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const renderAvailabilityCard = (item: Availability) => {
    const selectedDuration = minimumDurations.find(
      (d) => d.value === minimumDuration
    );

    return (
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
              {item.availableAt === 'every' ? (
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
                </>
              ) : (
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
              )}
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
                  {item.availableAt === 'every'
                    ? 'Repeats every week'
                    : item.date?.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                </Text>
              </View>
              <View style={[styles.timeContainer, { marginTop: 8 }]}>
                <Clock size={14} color={theme.colors.textMuted} />
                <Text style={[styles.timeText, { color: theme.colors.text }]}>
                  {item.startHour} - {item.endHour}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => openAvailabilityModal(item)}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.accent + '20' },
              ]}
            >
              <Edit2 size={18} color={theme.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteAvailability(item.id)}
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
          <View
            style={[
              styles.priceBadge,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <DollarSign size={20} color={theme.colors.primary} />
            <Text style={[styles.priceText, { color: theme.colors.primary }]}>
              {currencySymbols[item.currency]}
              {item.pricePerMinute} / min
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderStep3 = () => {
    const selectedDuration = minimumDurations.find(
      (d) => d.value === minimumDuration
    );

    return (
      <View style={styles.stepContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Calendar
              size={32}
              color={theme.colors.surface}
              strokeWidth={2.5}
            />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          Set Your Availability
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Add your availability schedule and set minimum call duration
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Availability Schedule
            </Text>
            {availabilities.length === 0 ? (
              <Card
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.card },
                ]}
              >
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
                  onPress={() => openAvailabilityModal()}
                  style={styles.emptyButton}
                />
              </Card>
            ) : (
              <>
                {availabilities.map(renderAvailabilityCard)}
                <TouchableOpacity
                  onPress={() => openAvailabilityModal()}
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Minimum Call Duration
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowDurationDropdown(!showDurationDropdown)}
            >
              <Clock size={20} color={theme.colors.textMuted} />
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
                {selectedDuration?.label}
              </Text>
              <ChevronLeft
                size={16}
                color={theme.colors.textMuted}
                style={{
                  transform: [
                    { rotate: showDurationDropdown ? '90deg' : '-90deg' },
                  ],
                }}
              />
            </TouchableOpacity>

            {showDurationDropdown && (
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {minimumDurations.map((duration) => (
                  <TouchableOpacity
                    key={duration.value}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: theme.colors.border },
                      minimumDuration === duration.value && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      setMinimumDuration(duration.value);
                      setShowDurationDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        {
                          color:
                            minimumDuration === duration.value
                              ? theme.colors.surface
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {duration.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
              Prevent calls shorter than this duration
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}
        >
          <Check size={32} color={theme.colors.surface} strokeWidth={3} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        Almost There!
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Just a few more settings to complete your professional profile
      </Text>

      <View style={styles.finalSettings}>
        <TouchableOpacity
          onPress={() => setIsAvailable(!isAvailable)}
          style={[
            styles.settingCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.settingIcon,
                {
                  backgroundColor: isAvailable
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <Check size={20} color={theme.colors.surface} strokeWidth={3} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Available for Calls
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.textMuted },
                ]}
              >
                Users can see you're online and ready
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsPublic(!isPublic)}
          style={[
            styles.settingCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.settingIcon,
                {
                  backgroundColor: isPublic
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <Check size={20} color={theme.colors.surface} strokeWidth={3} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Public Profile
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.textMuted },
                ]}
              >
                {isPublic
                  ? 'Your profile appears in public searches'
                  : 'Your profile is private and hidden from searches'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.termsContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <FileText size={48} color={theme.colors.primary} strokeWidth={1.5} />
        <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
          By continuing, you agree to our{' '}
          <TouchableOpacity
            onPress={() => router.push('/profile/privacy-policy')}
          >
            <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
              Terms of Service
            </Text>
          </TouchableOpacity>{' '}
          and{' '}
          <TouchableOpacity
            onPress={() => router.push('/profile/privacy-policy')}
          >
            <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </Text>
      </View>

      <Button
        title={loading ? 'Setting up...' : 'Save & Become Professional'}
        onPress={handleComplete}
        disabled={loading}
        style={[
          styles.completeButton,
          { backgroundColor: theme.colors.primary },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header 
        showLogo 
        rightButtons={
          <TouchableOpacity
            onPress={currentStep > 1 ? handlePreviousStep : () => router.back()}
            style={[
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAvailabilityModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingAvailability ? 'Edit Availability' : 'Add Availability'}
              </Text>
              <TouchableOpacity onPress={closeAvailabilityModal}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Available At */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Available At
                </Text>
                <View style={styles.optionsRow}>
                  {['every', 'specific'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() =>
                        setAvailabilityFormData({
                          ...availabilityFormData,
                          availableAt: option as any,
                          days:
                            option === 'specific'
                              ? []
                              : availabilityFormData.days,
                        })
                      }
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor:
                            availabilityFormData.availableAt === option
                              ? theme.colors.primary + '20'
                              : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                        availabilityFormData.availableAt === option && {
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: theme.colors.text },
                          availabilityFormData.availableAt === option && {
                            color: theme.colors.primary,
                            fontFamily: 'Inter-Bold',
                          },
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Select Days (if every is selected) */}
              {availabilityFormData.availableAt === 'every' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Select Days
                  </Text>
                  <View style={styles.daysGrid}>
                    {daysOptions.map((day) => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleDay(day)}
                        style={[
                          styles.dayButton,
                          {
                            backgroundColor:
                              availabilityFormData.days?.includes(day)
                                ? theme.colors.primary + '20'
                                : theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                          availabilityFormData.days?.includes(day) && {
                            borderColor: theme.colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: theme.colors.text },
                            availabilityFormData.days?.includes(day) && {
                              color: theme.colors.primary,
                              fontFamily: 'Inter-Bold',
                            },
                          ]}
                        >
                          {day.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Select Date (if specific is selected) */}
              {availabilityFormData.availableAt === 'specific' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Select Date
                  </Text>
                  {Platform.OS === 'web' ? (
                    <Input
                      value={
                        availabilityFormData.date
                          ? availabilityFormData.date
                              .toISOString()
                              .split('T')[0]
                          : ''
                      }
                      onChangeText={(text) => {
                        if (text) {
                          const date = new Date(text);
                          if (!isNaN(date.getTime())) {
                            setAvailabilityFormData({
                              ...availabilityFormData,
                              date,
                            });
                          }
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={[
                        styles.datePickerButton,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: availabilityFormData.date
                            ? theme.colors.text
                            : theme.colors.textMuted,
                        }}
                      >
                        {availabilityFormData.date
                          ? availabilityFormData.date.toLocaleDateString()
                          : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {showDatePicker && !Platform.OS && (
                    <DateTimePicker
                      value={availabilityFormData.date || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate)
                          setAvailabilityFormData({
                            ...availabilityFormData,
                            date: selectedDate,
                          });
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
                  value={availabilityFormData.startHour || ''}
                  onChangeText={(text) => handleTimeChange('startHour', text)}
                  placeholder="09:00"
                  keyboardType="numeric"
                  maxLength={5}
                />
                {availabilityFormData.startHour &&
                  !validateTimeFormat(availabilityFormData.startHour) && (
                    <Text
                      style={[
                        styles.errorText,
                        { color: theme.colors.error, marginTop: 4 },
                      ]}
                    >
                      Please enter time in HH:MM format (e.g., 09:00)
                    </Text>
                  )}
              </View>

              {/* End Hour */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  End Hour
                </Text>
                <Input
                  value={availabilityFormData.endHour || ''}
                  onChangeText={(text) => handleTimeChange('endHour', text)}
                  placeholder="17:00"
                  keyboardType="numeric"
                  maxLength={5}
                />
                {availabilityFormData.endHour &&
                  !validateTimeFormat(availabilityFormData.endHour) && (
                    <Text
                      style={[
                        styles.errorText,
                        { color: theme.colors.error, marginTop: 4 },
                      ]}
                    >
                      Please enter time in HH:MM format (e.g., 17:00)
                    </Text>
                  )}
              </View>

              {/* Currency */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Currency
                </Text>
                <View style={styles.optionsRow}>
                  {currencyOptions.map((currency) => (
                    <TouchableOpacity
                      key={currency}
                      onPress={() =>
                        setAvailabilityFormData({
                          ...availabilityFormData,
                          currency: currency as any,
                        })
                      }
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor:
                            availabilityFormData.currency === currency
                              ? theme.colors.primary + '20'
                              : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                        availabilityFormData.currency === currency && {
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: theme.colors.text },
                          availabilityFormData.currency === currency && {
                            color: theme.colors.primary,
                            fontFamily: 'Inter-Bold',
                          },
                        ]}
                      >
                        {
                          currencySymbols[
                            currency as keyof typeof currencySymbols
                          ]
                        }{' '}
                        {currency}
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
                  value={availabilityFormData.pricePerMinute || ''}
                  onChangeText={(text) =>
                    setAvailabilityFormData({
                      ...availabilityFormData,
                      pricePerMinute: text,
                    })
                  }
                  placeholder="2.50"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <Button
                title={
                  editingAvailability
                    ? 'Update Availability'
                    : 'Create Availability'
                }
                onPress={handleSaveAvailability}
                style={styles.saveButton}
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {currentStep < 4 && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <Button
            title="Continue"
            onPress={handleNextStep}
            style={{ backgroundColor: theme.colors.primary }}
            disabled={
              currentStep === 1 &&
              (!fullName.trim() ||
                !email.trim() ||
                !profession.trim() ||
                !education.trim())
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const getCategoryEmoji = (categoryName: string): string => {
  const emojiMap: { [key: string]: string } = {
    Business: '💼',
    Technology: '💻',
    Health: '❤️',
    Finance: '💰',
    Lifestyle: '✨',
    Education: '📚',
    Design: '🎨',
    Entertainment: '🎬',
    Sports: '⚽',
    Automotive: '🚗',
    Photography: '📸',
    Gaming: '🎮',
  };
  return emojiMap[categoryName] || '⭐';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%',
    gap: 20,
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    lineHeight: 16,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  rateUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  dropdownMenu: {
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  categoryCard: {
    width: '47%',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  customInputContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 12,
  },
  customButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customButton: {
    flex: 1,
  },
  customCategoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  customCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    gap: 8,
  },
  customCategoryText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  removeX: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  finalSettings: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  settingCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  termsContainer: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  termsText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },
  termsLink: {
    fontFamily: 'Inter-Bold',
  },
  completeButton: {
    width: '100%',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    borderTopWidth: 1,
  },
  // Availability styles
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
    alignItems: 'flex-end',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  priceText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
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
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
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
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
});
