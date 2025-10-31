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
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Calendar,
  Hash,
  Sparkles,
  Check,
  Camera,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { mockCategories } from '@/mockData/professionals';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SetupAccountScreen() {
  const { theme } = useTheme();
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

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  const handleBecomeProfessional = () => {
    router.push('/become-professional');
  };

  const toggleInterest = (categoryId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSelectPhoto = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Photo Upload', 'Photo upload feature coming soon!');
    } else {
      Alert.alert('Photo Upload', 'Photo upload feature coming soon!');
    }
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
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <User size={40} color={theme.colors.surface} strokeWidth={2.5} />
          </View>
        )}
        <View
          style={[
            styles.cameraButton,
            { backgroundColor: theme.colors.primary },
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
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          leftIcon={<User size={20} color={theme.colors.textMuted} />}
        />

        <Input
          label="Nickname (Optional)"
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
                setShowDatePicker(Platform.OS === 'ios');
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
                        ? theme.colors.primary
                        : theme.colors.surface,
                    borderColor:
                      gender === option.value
                        ? theme.colors.primary
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
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}
        >
          <Sparkles size={32} color={theme.colors.surface} strokeWidth={2.5} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        What are you interested in?
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Select categories that interest you
      </Text>

      <View style={styles.interestsGrid}>
        {mockCategories.map((category) => {
          const isSelected = selectedInterests.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => toggleInterest(category.id)}
              style={[
                styles.interestCard,
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
              <Text style={styles.interestEmoji}>
                {getCategoryEmoji(category.name)}
              </Text>
              <Text
                style={[
                  styles.interestName,
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
          style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}
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
              { backgroundColor: theme.colors.primary },
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
              { backgroundColor: theme.colors.primary },
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
              { backgroundColor: theme.colors.primary },
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
              { backgroundColor: theme.colors.primary },
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
          { backgroundColor: theme.colors.primary },
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
          <Text style={[styles.skipText, { color: theme.colors.primary }]}>
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
            style={{ backgroundColor: theme.colors.primary }}
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
  interestCard: {
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
  interestEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  interestName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
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
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
});
