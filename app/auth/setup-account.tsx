import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  User,
  Calendar,
  Hash,
  Sparkles,
  Camera,
  X,
  Plus,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usersService, notificationsService } from '@/services';
import { useCategories } from '@/hooks/useCategories';

export default function SetupAccountScreen() {
  const { theme } = useTheme();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const [currentStep, setCurrentStep] = useState(1);
  const progressAnim = useRef(new Animated.Value(33.33)).current;

  // Step 1 - Personal Info
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Step 2 - Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  // Added custom categories support from backup to enhance the UI functionality (Step 2 visual improvement)
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const handleNextStep = () => {
    if (currentStep < 3) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      Animated.timing(progressAnim, {
        toValue: newStep * 33.33,
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
        toValue: newStep * 33.33,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const sendWelcomeNotification = async () => {
    try {
      const currentUser = await usersService.getCurrentUser();
      if (currentUser) {
        await notificationsService.sendPushNotification(
          currentUser.id,
          'Welcome to Talkee! 🎉',
          'We are excited to have you here. Start exploring professionals or become one yourself!',
          { type: 'system', action_url: 'talkee://home' }
        );
      }
    } catch (error) {
      console.error('Error sending welcome notification', error);
    }
  };

  const handleSkip = async () => {
    await sendWelcomeNotification();
    router.replace('/(tabs)/');
  };

  const handleComplete = async () => {
    try {
      const currentUser = await usersService.getCurrentUser();
      if (!currentUser) {
        console.error('No user found');
        await sendWelcomeNotification();
        router.replace('/(tabs)/');
        return;
      }

      // Save user profile data
      const updates: any = {};

      if (fullName.trim()) {
        updates.name = fullName.trim();
      }

      // Logic for saving profile data preserved from original file
      if (Object.keys(updates).length > 0) {
        await usersService.updateProfile(updates);
      }

      if (selectedInterests.length > 0) {
        console.log('Selected interests:', selectedInterests);
      }

      await sendWelcomeNotification();
      router.replace('/(tabs)/');
    } catch (error) {
      console.error('Error saving profile data:', error);
      await sendWelcomeNotification();
      router.replace('/(tabs)/');
    }
  };

  const handleBecomeProfessional = () => {
    try {
      router.push('/become-professional' as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const toggleInterest = (categoryId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddCustomCategory = () => {
    const trimmedCategory = customCategoryInput.trim();
    if (trimmedCategory && !customCategories.includes(trimmedCategory)) {
      setCustomCategories((prev) => [...prev, trimmedCategory]);
      setSelectedInterests((prev) => [...prev, trimmedCategory]);
      setCustomCategoryInput('');
      setShowCustomCategoryModal(false);
    }
  };

  const handleRemoveCustomCategory = (category: string) => {
    setCustomCategories((prev) => prev.filter((c) => c !== category));
    setSelectedInterests((prev) => prev.filter((c) => c !== category));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSelectPhoto = () => {
    Alert.alert('Photo Upload', 'Photo upload feature coming soon!');
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View
        style={[styles.progressBar, { backgroundColor: theme.colors.border }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.pinkTwo || theme.colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
        Step {currentStep} of 3
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity
        onPress={handleSelectPhoto}
        style={[
          styles.profileImageContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View
            style={[
              styles.profileImagePlaceholder,
              { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
            ]}
          >
            <User size={40} color={theme.colors.surface} strokeWidth={2.5} />
          </View>
        )}
        <View
          style={[
            styles.cameraButton,
            { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
          ]}
        >
          <Camera size={18} color={theme.colors.surface} />
        </View>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        Tell us about yourself
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Help us personalize your experience
      </Text>

      <View style={styles.form}>
        <Input
          label="Full Name"
          labelStyle={{ color: theme.colors.text }}
            style={{ backgroundColor: theme.colors.surface, color: theme.colors.pinkTwo || theme.colors.primary, borderColor: theme.colors.border }}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          leftIcon={<User size={20} color={theme.colors.textMuted} />}
        />

        <Input
          label="Nickname (Optional)"
            labelStyle={{ color: theme.colors.text }}
            style={{ backgroundColor: theme.colors.surface, color: theme.colors.pinkTwo || theme.colors.primary, borderColor: theme.colors.border }}
          value={nickname}
          onChangeText={setNickname}
          placeholder="How should we call you?"
          leftIcon={<Hash size={20} color={theme.colors.textMuted} />}
        />

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Birth Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.dateButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Calendar size={20} color={theme.colors.textMuted} />
            <Text style={[styles.dateText, { color: theme.colors.text }]}>
              {formatDate(birthDate)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setBirthDate(selectedDate);
                }
              }}
              maximumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Gender
          </Text>
          <View style={styles.genderContainer}>
            {[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setGender(option.value as any)}
                style={[
                  styles.genderButton,
                  {
                    backgroundColor:
                      gender === option.value
                        ? (theme.colors.pinkTwo || theme.colors.primary)
                        : theme.colors.surface,
                    borderColor:
                      gender === option.value
                        ? (theme.colors.pinkTwo || theme.colors.primary)
                        : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.genderText,
                    {
                      color:
                        gender === option.value
                          ? theme.colors.surface
                          : theme.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        What are you interested in?
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Your feed will be personalized based on what you like.
      </Text>

      <View style={styles.interestsGrid}>
          {/* Combine backend categories and custom ones for display if needed, currently separating them logic-wise but visual wise they are pills */}
        {categoriesLoading ? (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                 Loading categories...
            </Text>
        ) : (
             categories.map((category) => {
              const isSelected = selectedInterests.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => toggleInterest(category.id)}
                  style={[
                    styles.interestPill,
                    {
                      backgroundColor: isSelected
                        ? (theme.colors.pinkTwo || theme.colors.primary)
                        : 'transparent',
                      borderColor: isSelected
                        ? (theme.colors.pinkTwo || theme.colors.primary)
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.interestPillText,
                      {
                        color: isSelected
                          ? theme.colors.surface
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                  <Text
                    style={[
                      styles.interestPillIcon,
                      {
                        color: isSelected
                          ? theme.colors.surface
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {isSelected ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              );
            })
        )}

        {/* Custom Categories */}
        {customCategories.map((category) => {
          const isSelected = selectedInterests.includes(category);
          return (
            <TouchableOpacity
              key={category}
              onPress={() => toggleInterest(category)}
              onLongPress={() => handleRemoveCustomCategory(category)}
              style={[
                styles.interestPill,
                {
                  backgroundColor: isSelected
                    ? (theme.colors.pinkTwo || theme.colors.primary)
                    : 'transparent',
                  borderColor: isSelected
                    ? (theme.colors.pinkTwo || theme.colors.primary)
                    : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.interestPillText,
                  {
                    color: isSelected
                      ? theme.colors.surface
                      : theme.colors.text,
                  },
                ]}
              >
                {category}
              </Text>
              <Text
                style={[
                  styles.interestPillIcon,
                  {
                    color: isSelected
                      ? theme.colors.surface
                      : theme.colors.text,
                  },
                ]}
              >
                {isSelected ? '✓' : '+'}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Other Button */}
        <TouchableOpacity
          onPress={() => setShowCustomCategoryModal(true)}
          style={[
            styles.interestPill,
            styles.otherPill,
            {
              backgroundColor: 'transparent',
              borderColor: theme.colors.border,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Plus size={18} color={theme.colors.text} />
          <Text
            style={[
              styles.interestPillText,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Other
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: theme.colors.pinkTwo || theme.colors.primary }]}
        >
          <Sparkles size={32} color={theme.colors.surface} strokeWidth={2.5} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        Become a Professional
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Share your expertise and earn money by helping others
      </Text>

      <View
        style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureDot,
              { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
            ]}
          />
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Set your own hourly rates
          </Text>
        </View>
        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureDot,
              { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
            ]}
          />
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Work on your own schedule
          </Text>
        </View>
        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureDot,
              { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
            ]}
          />
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Connect with people worldwide
          </Text>
        </View>
        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureDot,
              { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
            ]}
          />
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Build your professional brand
          </Text>
        </View>
      </View>

      <Button
        title="Become a Professional"
        onPress={handleBecomeProfessional}
        style={[
          styles.professionalButton,
          { backgroundColor: theme.colors.pinkTwo || theme.colors.primary },
        ]}
      />

      <TouchableOpacity
        onPress={handleComplete}
        style={styles.maybeLaterButton}
      >
        <Text
          style={[styles.maybeLaterText, { color: theme.colors.textSecondary }]}
        >
          Maybe Later
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        {currentStep > 1 ? (
          <TouchableOpacity
            onPress={handlePreviousStep}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipText, { color: theme.colors.pinkTwo || theme.colors.primary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      {currentStep < 3 && (
        <View style={styles.footer}>
          <Button
            title={currentStep === 2 ? 'Continue' : 'Next'}
            onPress={handleNextStep}
            style={{ backgroundColor: theme.colors.pinkTwo || theme.colors.primary }}
          />
        </View>
      )}

      {/* Custom Category Modal */}
      <Modal
        visible={showCustomCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomCategoryModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : theme.colors.surface,
            borderBottomColor: theme.colors.border,
          }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Custom Category</Text>
            <TouchableOpacity
              onPress={() => setShowCustomCategoryModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.surface }]}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Enter a category that interests you
            </Text>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }]}
                value={customCategoryInput}
                onChangeText={setCustomCategoryInput}
                placeholder="e.g., Cooking, Photography, etc."
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustomCategory}
              />
            </View>

            <Button
              title="Add Category"
              onPress={handleAddCustomCategory}
              disabled={!customCategoryInput.trim()}
              style={[styles.modalButton, {
                backgroundColor: theme.colors.pinkTwo || theme.colors.primary,
                opacity: customCategoryInput.trim() ? 1 : 0.5,
              }]}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
  },
  stepContent: {
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  // Replaced interestCard with interestPill style
  interestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
  },
  otherPill: {
    borderStyle: 'dashed',
  },
  interestPillText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  interestPillIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    width: '100%',
    marginTop: 20,
    fontFamily: 'Inter-Medium',
  },
  featureCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  professionalButton: {
    width: '100%',
    marginBottom: 16,
  },
  maybeLaterButton: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  maybeLaterText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingTop: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 24,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalButton: {
    marginTop: 8,
  },
});
