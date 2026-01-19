import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { supabase } from '@/lib/supabase';
import { notificationsService } from '@/services/notifications.service';

// Import unified types from education_experience.types.ts
import type {
  DegreeLevel,
  EducationFormData,
  ExperienceFormData,
} from '@/types/education_experience.types';

// Import Step Components
import { Step1Information } from './_components/Step1Information';
import { Step2AboutMe } from './_components/Step2AboutMe';
import { Step3EducationExperience } from './_components/Step3EducationExperience';
import { Step4Categories } from './_components/Step4Categories';
import { Step5Availability } from './_components/Step5Availability';
import { Step6Finish } from './_components/Step6Finish';
import { daysOptions, timeOptions } from './_constants';
import {
  validateAvailability,
  getFilteredTimeOptions,
  compareTimes,
  checkAvailabilityOverlaps,
} from './_utils';
import { AvailabilityOverlapModal } from '@/components/ui/AvailabilityOverlapModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock, ChevronDown, Check } from 'lucide-react-native';

// Local types (only what's not in database.types.ts)
interface Availability {
  id: string;
  availableAt: 'every' | 'specific' | 'urgent';
  days?: string[];
  date?: Date;
  startHour?: string; // Optional for urgent calls
  endHour?: string; // Optional for urgent calls
  pricePerMinute: string;
  videoCallEnabled?: boolean;
  videoCallRatePerMinute?: string;
}

const TOTAL_STEPS = 6;

export default function BecomeProfessionalScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profileData, isLoading: profileLoading } = useProfile();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progressAnim] = useState(new Animated.Value(16.67)); // 100/6 = 16.67%

  // Step 1 - Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Step 2 - About Me
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [skillsCertifications, setSkillsCertifications] = useState<string[]>(
    []
  );

  // Step 3 - Education & Experience
  const [educations, setEducations] = useState<EducationFormData[]>([]);
  const [experiences, setExperiences] = useState<ExperienceFormData[]>([]);

  // Step 4 - Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 5 - Availability
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

  // Step 6 - Finish
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  // Load profile data for initial form population
  // Use a ref to track if we've already loaded initial data
  const hasLoadedInitialData = useRef(false);

  useEffect(() => {
    if (profileData && !profileLoading && !hasLoadedInitialData.current) {
      setFullName(profileData.user.name || '');
      setEmail(profileData.user.primary_email || '');
      setBio(profileData.user.bio || '');
      hasLoadedInitialData.current = true;
    }
  }, [profileData, profileLoading]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep / TOTAL_STEPS) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Close dropdown when modal closes
  useEffect(() => {
    if (!showAvailabilityModal) {
      setShowTypeDropdown(false);
    }
  }, [showAvailabilityModal]);

  // Helper function to log form data
  const logFormData = (action: string) => {
    const formData = {
      step1: {
        fullName,
        email,
        bio,
      },
      step2: {
        specialties,
        languages,
        skillsCertifications,
      },
      step3: {
        educations,
        experiences,
      },
      step4: {
        selectedCategories,
      },
      step5: {
        availabilities,
      },
      step6: {
        isAvailable,
        isPublic,
      },
    };
  };

  const handleNextStep = () => {
    // Step 1 validation
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim()) {
        toast.error({
          title: 'Missing Information',
          message: 'Please enter your full name and email address',
        });
        return;
      }
      if (!bio.trim() || bio.length < 50) {
        toast.error({
          title: 'Bio Too Short',
          message:
            'Your bio must be at least 50 characters to help clients understand your expertise',
        });
        return;
      }
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (languages.length === 0) {
        toast.error({
          title: 'Language Required',
          message: 'Please add at least one language you can communicate in',
        });
        return;
      }
    }

    // Step 3 validation (all optional)
    // No validation needed

    // Step 4 validation
    if (currentStep === 4) {
      if (selectedCategories.length === 0) {
        toast.error({
          title: 'Category Required',
          message:
            'Please select at least one category that matches your expertise',
        });
        return;
      }
    }

    // Step 5 validation
    if (currentStep === 5) {
      if (availabilities.length === 0) {
        toast.error({
          title: 'Availability Required',
          message:
            'Please add at least one time slot when you are available for calls',
        });
        return;
      }
    }

    if (currentStep < TOTAL_STEPS) {
      logFormData(`Continue from Step ${currentStep}`);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error({
        title: 'Authentication Required',
        message:
          'Please sign in to continue creating your professional profile',
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare professional data
      const professionalData = {
        // Step 1
        full_name: fullName,
        email: email,
        bio: bio,

        // Step 2
        specialties: specialties,
        languages: languages,
        skills_certifications: skillsCertifications,

        // Step 3 - Convert to proper format
        educations: educations.map((edu) => ({
          degree_level: edu.degree_level,
          institution: edu.institution || null,
          field_of_study: edu.field_of_study || null,
          start_year: edu.start_year ? Number(edu.start_year) : null,
          end_year: edu.end_year ? Number(edu.end_year) : null,
          is_current: edu.is_current || false,
          description: (edu as any).description || null,
          sort_order: 0,
        })),
        experiences: experiences.map((exp) => {
          // Convert start_year and end_year to start_date and end_date (year-only format)
          const startYear = exp.start_year ? String(exp.start_year) : null;
          const endYear = exp.end_year ? String(exp.end_year) : null;

          // Create date strings in format "YYYY-01-01" for year-only dates
          const startDate = startYear ? `${startYear}-01-01` : null;
          const endDate = exp.is_current
            ? null
            : endYear
            ? `${endYear}-12-31`
            : null;

          return {
            title: exp.title || null,
            company: exp.company || null,
            location: exp.location || null,
            start_date: startDate,
            end_date: endDate,
            is_current: exp.is_current || false,
            description: (exp as any).description || null,
            sort_order: 0,
          };
        }),

        // Step 4
        category_ids: selectedCategories,

        // Step 5
        availabilities: availabilities.map((av) => ({
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
          currency: 'USD',
          price_per_minute: parseFloat(av.pricePerMinute) || 0,
          video_call_enabled: av.videoCallEnabled || false,
          video_call_rate_per_minute: av.videoCallEnabled
            ? parseFloat(av.videoCallRatePerMinute || '0') || null
            : null,
        })),

        // Step 6
        is_available: isAvailable,
        is_public: isPublic,
      };

      // Log final form data before submission
      logFormData('Save & Become Professional (Final)');

      // Get current authenticated user
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.id) {
        toast.error({
          title: 'Error',
          message: 'User not authenticated',
        });
        setLoading(false);
        return;
      }

      // Get the database user ID (not auth_id)
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.user.id)
        .single();

      if (userError || !dbUser) {
        toast.error({
          title: 'Error',
          message: 'User not found in database',
        });
        setLoading(false);
        return;
      }

      // Create professional record
      const { data: newProfessional, error: createError } = await supabase
        .from('professionals')
        .insert({
          user_id: dbUser.id,
          bio: professionalData.bio,
          category_id: professionalData.category_ids[0] || null,
          rate_per_minute:
            professionalData.availabilities[0]?.price_per_minute || 0,
          is_available: professionalData.is_available,
          is_public: professionalData.is_public,
        })
        .select()
        .single();

      if (createError || !newProfessional) {
        toast.error({
          title: 'Error',
          message:
            createError?.message || 'Failed to create professional profile',
        });
        setLoading(false);
        return;
      }

      const professionalId = newProfessional.id;

      // Update all sub-sections using existing methods
      // 1. About Me
      if (
        professionalData.specialties ||
        professionalData.languages ||
        professionalData.skills_certifications
      ) {
        const aboutResult =
          await professionalsService.updateProfessionalAboutMe(professionalId, {
            specialties: professionalData.specialties || [],
            languages: professionalData.languages || [],
            skills_certifications: professionalData.skills_certifications || [],
          });
        if (!aboutResult.success) {
          throw new Error(aboutResult.error || 'Failed to update about me');
        }
      }

      // 2. Education & Experience
      if (professionalData.educations || professionalData.experiences) {
        const eduExpResult =
          await professionalsService.updateProfessionalEducationExperience(
            professionalId,
            {
              educations: professionalData.educations || [],
              experiences: professionalData.experiences || [],
            }
          );
        if (!eduExpResult.success) {
          throw new Error(
            eduExpResult.error || 'Failed to update education & experience'
          );
        }
      }

      // 3. Categories
      if (
        professionalData.category_ids &&
        professionalData.category_ids.length > 0
      ) {
        const categoriesResult =
          await professionalsService.updateProfessionalCategories(
            professionalId,
            professionalData.category_ids
          );
        if (!categoriesResult.success) {
          throw new Error(
            categoriesResult.error || 'Failed to update categories'
          );
        }
      }

      // 4. Availabilities
      if (
        professionalData.availabilities &&
        professionalData.availabilities.length > 0
      ) {
        const availabilitiesResult =
          await professionalsService.updateProfessionalAvailabilities(
            professionalId,
            professionalData.availabilities
          );
        if (!availabilitiesResult.success) {
          throw new Error(
            availabilitiesResult.error || 'Failed to update availabilities'
          );
        }
      }

      const result = { success: true };

      if (result.success) {
        toast.success({
          title: 'Profile Created!',
          message:
            'Your professional profile has been created successfully. Welcome aboard!',
        });

        // Send congratulatory push notification
        await notificationsService.sendPushNotification(
          dbUser.id,
          'Congratulations! You are now a Professional 🌟',
          'Your profile is live. You can now start receiving calls and earning money. Good luck!',
          { type: 'system', action_url: 'talkee://profile' }
        );

        // Reset all form states after successful save/update
        setFullName('');
        setEmail('');
        setBio('');
        setSpecialties([]);
        setLanguages([]);
        setSkillsCertifications([]);
        setEducations([]);
        setExperiences([]);
        setSelectedCategories([]);
        setAvailabilities([]);
        setIsAvailable(true);
        setIsPublic(true);
        setCurrentStep(1);

        // Navigate to home
        setTimeout(() => {
          router.replace('/(tabs)/' as any);
        }, 1000);
      } else {
        throw new Error('Failed to create professional profile');
      }
    } catch (error: any) {
      toast.error({
        title: 'Profile Creation Failed',
        message:
          error.message ||
          'An error occurred while creating your profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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

  const handleSaveAvailability = () => {
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
      const overlaps = checkAvailabilityOverlaps(
        newAvailability,
        availabilities
      );
      if (overlaps.length > 0) {
        setOverlappingAvailabilities(overlaps);
        setShowOverlapModal(true);
        return;
      }
    }

    if (editingAvailability) {
      setAvailabilities((prev) =>
        prev.map((av) =>
          av.id === editingAvailability.id ? newAvailability : av
        )
      );
      logFormData('Update Availability');
    } else {
      setAvailabilities((prev) => [...prev, newAvailability]);
      logFormData('Add Availability');
    }

    setShowAvailabilityModal(false);
    setEditingAvailability(null);
    setAvailabilityFormData({
      availableAt: 'every',
      days: [],
      startHour: '',
      endHour: '',
      pricePerMinute: '',
      videoCallEnabled: false,
      videoCallRatePerMinute: '',
    });
  };

  const handleDeleteAvailability = (id: string) => {
    setAvailabilities((prev) => prev.filter((av) => av.id !== id));
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressBarBackground,
          { backgroundColor: theme.colors.border },
        ]}
      >
        <Animated.View
          style={[
            styles.progressBarFill,
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
      <Text style={[styles.progressText, { color: theme.colors.textMuted }]}>
        Step {currentStep} of {TOTAL_STEPS}
      </Text>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Information
            fullName={fullName}
            email={email}
            bio={bio}
            profileLoading={!!profileLoading}
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onBioChange={setBio}
          />
        );

      case 2:
        return (
          <Step2AboutMe
            specialties={specialties}
            languages={languages}
            skillsCertifications={skillsCertifications}
            onSpecialtiesChange={setSpecialties}
            onLanguagesChange={setLanguages}
            onSkillsCertificationsChange={setSkillsCertifications}
          />
        );

      case 3:
        return (
          <Step3EducationExperience
            educations={educations}
            experiences={experiences}
            onEducationsChange={(newEducations) => {
              setEducations(newEducations);
              logFormData('Add/Update Education');
            }}
            onExperiencesChange={(newExperiences) => {
              setExperiences(newExperiences);
              logFormData('Add/Update Experience');
            }}
          />
        );

      case 4:
        return (
          <Step4Categories
            selectedCategories={selectedCategories}
            searchQuery={searchQuery}
            onCategoryToggle={handleCategoryToggle}
            onSearchChange={setSearchQuery}
          />
        );

      case 5:
        return (
          <Step5Availability
            availabilities={availabilities}
            onAddAvailability={handleAddAvailability}
            onEditAvailability={handleEditAvailability}
            onDeleteAvailability={handleDeleteAvailability}
          />
        );

      case 6:
        return (
          <Step6Finish
            onTermsPress={() => {
              // Open terms modal or navigate
            }}
            onPrivacyPress={() => {
              // Open privacy modal or navigate
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <Header
        showBack
        onBackPress={() => {
          if (currentStep === 1) {
            router.back();
          } else {
            handlePreviousStep();
          }
        }}
      />

      {renderProgressBar()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with navigation buttons */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: '#000000',
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        {currentStep < TOTAL_STEPS ? (
          <Button
            title="Continue"
            onPress={handleNextStep}
            style={styles.nextButtonFullWidth}
          />
        ) : (
          <Button
            title={loading ? 'Creating...' : 'Save & Become Professional'}
            onPress={handleComplete}
            style={styles.nextButtonFullWidth}
            disabled={loading}
          />
        )}
      </View>

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAvailabilityModal(false)}
        >
          <View style={availabilityModalStyles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAvailabilityModal(false)}
            />
            <View
              style={[
                availabilityModalStyles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View
                style={[
                  availabilityModalStyles.modalHeader,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    availabilityModalStyles.modalTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {editingAvailability
                    ? 'Edit Availability'
                    : 'Add Availability'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAvailabilityModal(false)}
                >
                  <Text
                    style={[
                      availabilityModalStyles.modalClose,
                      { color: theme.colors.text },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={availabilityModalStyles.modalBody}
                contentContainerStyle={availabilityModalStyles.modalBodyContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => setShowTypeDropdown(false)}
              >
                {availabilityError && (
                  <View
                    style={[
                      availabilityModalStyles.errorContainer,
                      { backgroundColor: theme.colors.error + '10' },
                    ]}
                  >
                    <Text
                      style={[
                        availabilityModalStyles.errorText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {availabilityError}
                    </Text>
                  </View>
                )}

                {/* Availability Type */}
                <View style={availabilityModalStyles.inputWrapper}>
                  <View style={availabilityModalStyles.dropdownContainer}>
                    <TouchableOpacity
                      style={[
                        availabilityModalStyles.dropdownButton,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                    >
                      <Text
                        style={[
                          availabilityModalStyles.dropdownButtonText,
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
                          availabilityModalStyles.dropdownIcon,
                          showTypeDropdown && availabilityModalStyles.dropdownIconOpen,
                        ]}
                      />
                    </TouchableOpacity>
                    {showTypeDropdown && (
                      <View
                        style={[
                          availabilityModalStyles.dropdownMenu,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            availabilityModalStyles.dropdownOption,
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
                              availabilityModalStyles.dropdownOptionText,
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
                            <Check size={18} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            availabilityModalStyles.dropdownOption,
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
                              availabilityModalStyles.dropdownOptionText,
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
                            <Check size={18} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            availabilityModalStyles.dropdownOption,
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
                              availabilityModalStyles.dropdownOptionText,
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
                  <View style={availabilityModalStyles.inputWrapper}>
                    <Text
                      style={[
                        availabilityModalStyles.label,
                        { color: theme.colors.text },
                      ]}
                    >
                      Select Days *
                    </Text>
                    <View style={availabilityModalStyles.daysContainer}>
                      {daysOptions.map((day) => {
                        const isSelected =
                          availabilityFormData.days?.includes(day);
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              availabilityModalStyles.dayButton,
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
                                availabilityModalStyles.dayButtonText,
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
                  <View style={availabilityModalStyles.inputWrapper}>
                    <Text
                      style={[
                        availabilityModalStyles.label,
                        { color: theme.colors.text },
                      ]}
                    >
                      Select Date *
                    </Text>
                    <TouchableOpacity
                      style={[
                        availabilityModalStyles.dateButton,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text
                        style={[
                          availabilityModalStyles.dateButtonText,
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
                  <View style={availabilityModalStyles.inputWrapper}>
                    <Text
                      style={[
                        availabilityModalStyles.label,
                        { color: theme.colors.text },
                      ]}
                    >
                      Time Range *
                    </Text>
                    <View style={availabilityModalStyles.timeRow}>
                      <TouchableOpacity
                        style={[
                          availabilityModalStyles.timeButton,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setShowTimePicker('start')}
                      >
                        <Text
                          style={[
                            availabilityModalStyles.timeButtonText,
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
                          availabilityModalStyles.timeSeparator,
                          { color: theme.colors.text },
                        ]}
                      >
                        -
                      </Text>
                      <TouchableOpacity
                        style={[
                          availabilityModalStyles.timeButton,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setShowTimePicker('end')}
                      >
                        <Text
                          style={[
                            availabilityModalStyles.timeButtonText,
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

                {/* Urgent Call Info (only for urgent) */}
                {availabilityFormData.availableAt === 'urgent' && (
                  <View style={availabilityModalStyles.inputWrapper}>
                    <View
                      style={[
                        availabilityModalStyles.infoBox,
                        {
                          backgroundColor: '#F59E0B' + '15',
                          borderColor: '#F59E0B' + '40',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          availabilityModalStyles.infoText,
                          { color: '#F59E0B' },
                        ]}
                      >
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
                    <View style={availabilityModalStyles.timePickerOverlay}>
                      <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowTimePicker(null)}
                      />
                      <View
                        style={[
                          availabilityModalStyles.timePickerContent,
                          { backgroundColor: theme.colors.surface },
                        ]}
                        onStartShouldSetResponder={() => true}
                      >
                        <View
                          style={[
                            availabilityModalStyles.timePickerHeader,
                            { borderBottomColor: theme.colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              availabilityModalStyles.timePickerTitle,
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
                                availabilityModalStyles.modalClose,
                                { color: theme.colors.text },
                              ]}
                            >
                              ✕
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView
                          style={availabilityModalStyles.timePickerBody}
                        >
                          {getFilteredTimeOptions(
                            showTimePicker,
                            availabilityFormData.startHour,
                            availabilityFormData.endHour
                          ).map((time) => (
                            <TouchableOpacity
                              key={time.value}
                              style={[
                                availabilityModalStyles.timeOption,
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
                                  availabilityModalStyles.timeOptionText,
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
                <View style={availabilityModalStyles.inputWrapper}>
                  <Text
                    style={[
                      availabilityModalStyles.label,
                      { color: theme.colors.text },
                    ]}
                  >
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
                      availabilityModalStyles.priceInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                  />
                </View>

                {/* Video Call Toggle */}
                <View style={availabilityModalStyles.inputWrapper}>
                  <TouchableOpacity
                    style={availabilityModalStyles.checkboxRow}
                    onPress={() => {
                      setAvailabilityFormData({
                        ...availabilityFormData,
                        videoCallEnabled:
                          !availabilityFormData.videoCallEnabled,
                        videoCallRatePerMinute:
                          availabilityFormData.videoCallEnabled
                            ? ''
                            : availabilityFormData.videoCallRatePerMinute,
                      });
                      setAvailabilityError(null);
                    }}
                  >
                    <View
                      style={[
                        availabilityModalStyles.checkbox,
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
                        <Text
                          style={[
                            availabilityModalStyles.checkmark,
                            { color: '#fff' },
                          ]}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        availabilityModalStyles.checkboxLabel,
                        { color: theme.colors.text },
                      ]}
                    >
                      Enable Video Calls
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Video Call Price Per Minute */}
                {availabilityFormData.videoCallEnabled && (
                  <View style={availabilityModalStyles.inputWrapper}>
                    <Text
                      style={[
                        availabilityModalStyles.label,
                        { color: theme.colors.text },
                      ]}
                    >
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
                        availabilityModalStyles.priceInput,
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
                  availabilityModalStyles.modalFooter,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <Button
                  title="Add"
                  onPress={handleSaveAvailability}
                  style={availabilityModalStyles.modalButtonFullWidth}
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
          videoCallRatePerMinute:
            availabilityFormData.videoCallRatePerMinute || '',
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100, // Extra padding for keyboard
  },
  footer: {
    padding: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  nextButtonFullWidth: {
    width: '100%',
  },
});

const availabilityModalStyles = StyleSheet.create({
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
  modalButton: {
    flex: 1,
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
  optionGroup: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  optionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckmark: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  daysContainer: {
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
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  timePickerContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
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
    fontSize: 15,
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
});
