import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Platform,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';
import { useToast } from '@/lib/toastService';
import { supabase } from '@/lib/supabase';

// Import unified types from education_experience.types.ts
import type {
  DegreeLevel,
  EducationFormData,
  ExperienceFormData,
} from '@/types/education_experience.types';

// Import Step Components
import { Step1Information } from './components/Step1Information';
import { Step2AboutMe } from './components/Step2AboutMe';
import { Step3EducationExperience } from './components/Step3EducationExperience';
import { Step4Categories } from './components/Step4Categories';
import { Step5Availability } from './components/Step5Availability';
import { Step6Finish } from './components/Step6Finish';
import { daysOptions, timeOptions } from './constants';
import { validateAvailability, getFilteredTimeOptions, compareTimes } from './utils';

// Local types (only what's not in database.types.ts)
interface Availability {
  id: string;
  availableAt: 'every' | 'specific';
  days?: string[];
  date?: Date;
  startHour: string;
  endHour: string;
  pricePerMinute: string;
}

const TOTAL_STEPS = 6;

export default function BecomeProfessionalScreen() {
  const { theme } = useTheme();
  const { profileData, isLoading: profileLoading } = useProfile();
  const toast = useToast();
  const params = useLocalSearchParams();
  const isEditMode = params.mode === 'edit';
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProfessional, setLoadingProfessional] = useState(false);
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
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [availabilityFormData, setAvailabilityFormData] = useState<Partial<Availability>>({
    availableAt: 'every',
    days: [],
    startHour: '',
    endHour: '',
    pricePerMinute: '',
  });
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Step 6 - Finish
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  // Load profile data (only in create mode, not edit mode to prevent flash)
  useEffect(() => {
    if (!isEditMode && profileData && !profileLoading) {
      setFullName(profileData.user.name || '');
      setEmail(profileData.user.primary_email || '');
      setBio(profileData.user.bio || '');
    }
  }, [profileData, profileLoading, isEditMode]);

  // Load professional data for edit mode
  useEffect(() => {
    if (isEditMode && profileData?.user?.id && !profileLoading) {
      const loadProfessionalData = async () => {
        setLoadingProfessional(true);
        try {
          const result = await professionalsService.getProfessionalByUserId(
            profileData.user.id
          );
          
          if (result.success && result.professional) {
            const prof = result.professional;
            
            console.log('[Edit Mode] Professional data loaded:', {
              educations: prof.educations,
              experiences: prof.experiences,
              categories: prof.categories,
              availabilities: prof.availabilities,
            });
            
            // Step 1
            setFullName(profileData.user.name || '');
            setEmail(profileData.user.primary_email || '');
            setBio(prof.bio || '');
            
            // Step 2
            setSpecialties(prof.specialties || []);
            setLanguages(prof.languages || []);
            setSkillsCertifications(prof.skills_certifications || []);
            
            // Step 3 - Convert educations
            if (prof.educations && Array.isArray(prof.educations) && prof.educations.length > 0) {
              const educationsData: EducationFormData[] = prof.educations.map((edu: any) => ({
                degree_level: edu.degree_level,
                institution: edu.institution || undefined,
                field_of_study: edu.field_of_study || undefined,
                start_year: edu.start_year?.toString() || undefined,
                end_year: edu.end_year?.toString() || undefined,
                is_current: edu.is_current || false,
              }));
              console.log('[Edit Mode] Setting educations:', educationsData);
              setEducations(educationsData);
            } else {
              console.log('[Edit Mode] No educations found or empty array');
              setEducations([]);
            }
            
            // Step 3 - Convert experiences
            if (prof.experiences && Array.isArray(prof.experiences) && prof.experiences.length > 0) {
              const experiencesData: ExperienceFormData[] = prof.experiences.map((exp: any) => {
                // Extract year from start_date (format: "YYYY-01-01")
                const startYear = exp.start_date ? exp.start_date.split('-')[0] : undefined;
                const endYear = exp.end_date ? exp.end_date.split('-')[0] : undefined;
                
                return {
                  title: exp.title || undefined,
                  company: exp.company || undefined,
                  location: exp.location || undefined,
                  start_year: startYear,
                  end_year: endYear,
                  is_current: exp.is_current || false,
                };
              });
              console.log('[Edit Mode] Setting experiences:', experiencesData);
              setExperiences(experiencesData);
            } else {
              console.log('[Edit Mode] No experiences found or empty array');
              setExperiences([]);
            }
            
            // Step 4 - Categories
            if (prof.categories && prof.categories.length > 0) {
              setSelectedCategories(prof.categories.map((cat: any) => cat.id));
            }
            
            // Step 5 - Availabilities
            if (prof.availabilities && prof.availabilities.length > 0) {
              const availabilitiesData: Availability[] = prof.availabilities.map((av: any) => ({
                id: av.id,
                availableAt: av.available_at,
                days: av.days || [],
                date: av.date ? new Date(av.date) : undefined,
                startHour: av.start_hour,
                endHour: av.end_hour,
                pricePerMinute: av.price_per_minute?.toString() || '0',
              }));
              setAvailabilities(availabilitiesData);
            }
            
            // Step 6
            setIsAvailable(prof.is_available ?? true);
            setIsPublic(prof.is_public ?? true);
          }
        } catch (error) {
          console.error('Error loading professional data:', error);
          toast.error({
            title: 'Error',
            message: 'Failed to load professional data',
          });
        } finally {
          setLoadingProfessional(false);
        }
      };
      
      loadProfessionalData();
    }
  }, [isEditMode, profileData, profileLoading]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep / TOTAL_STEPS) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

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
    console.log(`[${action}] Form Data:`, JSON.stringify(formData, null, 2));
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
          description: edu.description || null,
          sort_order: 0,
        })),
        experiences: experiences.map((exp) => {
          // Convert start_year and end_year to start_date and end_date (year-only format)
          const startYear = exp.start_year ? String(exp.start_year) : null;
          const endYear = exp.end_year ? String(exp.end_year) : null;
          
          // Create date strings in format "YYYY-01-01" for year-only dates
          const startDate = startYear ? `${startYear}-01-01` : null;
          const endDate = exp.is_current ? null : (endYear ? `${endYear}-12-31` : null);
          
          return {
            title: exp.title || null,
            company: exp.company || null,
            location: exp.location || null,
            start_date: startDate,
            end_date: endDate,
            is_current: exp.is_current || false,
            description: exp.description || null,
            sort_order: 0,
          };
        }),

        // Step 4
        category_ids: selectedCategories,

        // Step 5
        availabilities: availabilities.map((av) => ({
          available_at: av.availableAt,
          days: av.days || null,
          date: av.date ? av.date.toISOString().split('T')[0] : null,
          start_hour: av.startHour,
          end_hour: av.endHour,
          currency: 'USD',
          price_per_minute: parseFloat(av.pricePerMinute) || 0,
        })),

        // Step 6
        is_available: isAvailable,
        is_public: isPublic,
      };

      // Log final form data before submission
      logFormData(isEditMode ? 'Update Professional Profile (Final)' : 'Save & Become Professional (Final)');

      // Create or update professional profile
      // Note: createProfessional handles both create and update scenarios
      const result = await professionalsService.createProfessional(
        professionalData
      );

      if (result.success) {
        toast.success({
          title: isEditMode ? 'Profile Updated!' : 'Profile Created!',
          message: isEditMode
            ? 'Your professional profile has been updated successfully.'
            : 'Your professional profile has been created successfully. Welcome aboard!',
        });

        // Navigate to home
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);
      } else {
        throw new Error(
          result.error || `Failed to ${isEditMode ? 'update' : 'create'} professional profile`
        );
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
      startHour: '',
      endHour: '',
      pricePerMinute: '',
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
    });
    setAvailabilityError(null);
    setShowAvailabilityModal(true);
  };

  const handleSaveAvailability = () => {
    const error = validateAvailability(availabilityFormData);
    if (error) {
      setAvailabilityError(error);
      return;
    }

    const newAvailability: Availability = {
      id: editingAvailability?.id || Date.now().toString(),
      availableAt: availabilityFormData.availableAt!,
      days: availabilityFormData.days,
      date: availabilityFormData.date,
      startHour: availabilityFormData.startHour!,
      endHour: availabilityFormData.endHour!,
      pricePerMinute: availabilityFormData.pricePerMinute!,
    };

    if (editingAvailability) {
      setAvailabilities((prev) =>
        prev.map((av) => (av.id === editingAvailability.id ? newAvailability : av))
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
            profileLoading={profileLoading}
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
            loading={loading}
            onTermsPress={() => {
              // Open terms modal or navigate
            }}
            onPrivacyPress={() => {
              // Open privacy modal or navigate
            }}
            onComplete={handleComplete}
          />
        );

      default:
        return null;
    }
  };

  // Show loading while professional data is being loaded in edit mode
  if (isEditMode && (loadingProfessional || profileLoading)) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showBack onBackPress={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontFamily: 'Inter-Medium', marginBottom: 8 }}>
            Loading your professional profile...
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontFamily: 'Inter-Regular' }}>
            Please wait
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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

            <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
        {renderStepContent()}
      </ScrollView>

      {/* Footer with navigation buttons */}
      <View
                          style={[
          styles.footer,
                            {
            backgroundColor: '#000000',
            borderTopColor: theme.colors.border,
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
            title={loading ? 'Creating Profile...' : 'Complete'}
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
                <Text style={[availabilityModalStyles.modalTitle, { color: theme.colors.text }]}>
                  {editingAvailability ? 'Edit Availability' : 'Add Availability'}
                        </Text>
                <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                  <Text style={[availabilityModalStyles.modalClose, { color: theme.colors.text }]}>
                    ✕
                  </Text>
            </TouchableOpacity>
        </View>

              <ScrollView
                style={availabilityModalStyles.modalBody}
                showsVerticalScrollIndicator={false}
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
                  <Text style={[availabilityModalStyles.label, { color: theme.colors.text }]}>
                    Availability Type
      </Text>
                  <View style={availabilityModalStyles.radioGroup}>
        <TouchableOpacity
          style={[
                        availabilityModalStyles.radioOption,
            {
                          backgroundColor:
                            availabilityFormData.availableAt === 'every'
                              ? theme.colors.primary + '20'
                              : theme.colors.card,
                          borderColor:
                            availabilityFormData.availableAt === 'every'
                              ? theme.colors.primary
                              : theme.colors.border,
            },
          ]}
                      onPress={() => {
                        setAvailabilityFormData({
                          ...availabilityFormData,
                          availableAt: 'every',
                          date: undefined,
                        });
                        setAvailabilityError(null);
                      }}
                    >
            <View
              style={[
                          availabilityModalStyles.radioCircle,
                {
                            borderColor:
                              availabilityFormData.availableAt === 'every'
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
                        {availabilityFormData.availableAt === 'every' && (
                          <View
                style={[
                              availabilityModalStyles.radioInner,
                              { backgroundColor: theme.colors.primary },
                ]}
                          />
                        )}
            </View>
                      <Text style={[availabilityModalStyles.radioLabel, { color: theme.colors.text }]}>
                        Every Week
                      </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
                        availabilityModalStyles.radioOption,
            {
                          backgroundColor:
                            availabilityFormData.availableAt === 'specific'
                              ? theme.colors.primary + '20'
                              : theme.colors.card,
                          borderColor:
                            availabilityFormData.availableAt === 'specific'
                              ? theme.colors.primary
                              : theme.colors.border,
            },
          ]}
                      onPress={() => {
                        setAvailabilityFormData({
                          ...availabilityFormData,
                          availableAt: 'specific',
                          days: undefined,
                        });
                        setAvailabilityError(null);
                      }}
                    >
            <View
              style={[
                          availabilityModalStyles.radioCircle,
                {
                            borderColor:
                              availabilityFormData.availableAt === 'specific'
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
                        {availabilityFormData.availableAt === 'specific' && (
      <View
        style={[
                              availabilityModalStyles.radioInner,
          { backgroundColor: theme.colors.primary },
        ]}
      />
                        )}
    </View>
                      <Text style={[availabilityModalStyles.radioLabel, { color: theme.colors.text }]}>
                        Specific Date
              </Text>
              </TouchableOpacity>
                </View>
              </View>

                {/* Days Selection (for every) */}
              {availabilityFormData.availableAt === 'every' && (
                  <View style={availabilityModalStyles.inputWrapper}>
                    <Text style={[availabilityModalStyles.label, { color: theme.colors.text }]}>
                      Select Days *
                  </Text>
                    <View style={availabilityModalStyles.daysContainer}>
                      {daysOptions.map((day) => {
                        const isSelected = availabilityFormData.days?.includes(day);
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
                              const currentDays = availabilityFormData.days || [];
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
                    <Text style={[availabilityModalStyles.label, { color: theme.colors.text }]}>
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
                          ? availabilityFormData.date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Select a date'}
                    </Text>
                  </TouchableOpacity>
                    {showDatePicker && (
                      Platform.OS === 'web' ? (
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={
                            availabilityFormData.date
                              ? availabilityFormData.date.toISOString().split('T')[0]
                              : ''
                          }
                          onChange={(e) => {
                            if (e.target.value) {
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
                      )
                    )}
                </View>
              )}

                {/* Time Selection */}
                <View style={availabilityModalStyles.inputWrapper}>
                  <Text style={[availabilityModalStyles.label, { color: theme.colors.text }]}>
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
                    <Text style={[availabilityModalStyles.timeSeparator, { color: theme.colors.text }]}>
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
                            Select {showTimePicker === 'start' ? 'Start' : 'End'} Time
                      </Text>
                          <TouchableOpacity onPress={() => setShowTimePicker(null)}>
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
                        <ScrollView style={availabilityModalStyles.timePickerBody}>
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
                                      availabilityFormData.startHour === time.value) ||
                                    (showTimePicker === 'end' &&
                                      availabilityFormData.endHour === time.value)
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
                                      compareTimes(time.value, availabilityFormData.endHour) >= 0
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
                                        availabilityFormData.startHour === time.value) ||
                                      (showTimePicker === 'end' &&
                                        availabilityFormData.endHour === time.value)
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
                  <Text style={[availabilityModalStyles.label, { color: theme.colors.text }]}>
                    Price Per Minute ($) *
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
                />
              </View>
            </View>
          </View>
      </Modal>
      )}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
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
    maxHeight: '90%',
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
    padding: 20,
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
});
