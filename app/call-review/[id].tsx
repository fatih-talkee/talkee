import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { mockProfessionals } from '@/mockData/professionals';
import { Button } from '@/components/ui/Button';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useToast } from '@/lib/toastService';

export default function CallReviewScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useIsMounted();
  const toast = useToast();

  const professional = mockProfessionals.find(p => p.id === id);

  const handleClose = () => {
    router.replace('/(tabs)');
  };

  const handleStarPress = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsSubmitting(false);
        
        // Show success toast
        toast.success({
          title: 'Success',
          message: 'Thanks for your feedback!',
        });
        
        // Navigate after showing toast
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      }
    }, 1000);
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  if (!professional) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>Professional not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar with Close Button */}
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.name === 'light' ? theme.colors.brandPink : '#000000' }]}
          onPress={handleClose}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Title and Subtitle */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            How was your session?
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Your feedback helps us improve.
          </Text>
        </View>

        {/* Professional Info */}
        <View style={[styles.professionalInfo, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.professionalText, { color: theme.colors.textSecondary }]}>
            Session with {professional.name}
          </Text>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Rate your experience (optional)
          </Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => handleStarPress(star)}
              >
                <Star
                  size={32}
                  color={star <= rating ? theme.colors.accent : theme.colors.border}
                  fill={star <= rating ? theme.colors.accent : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingText, { color: theme.colors.accent }]}>
              {getRatingText(rating)}
            </Text>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Leave a comment (optional)
          </Text>
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }
            ]}
            placeholder="Leave a comment..."
            placeholderTextColor={theme.colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.characterCount, { color: theme.colors.textMuted }]}>
            {comment.length}/500
          </Text>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? "Submitting..." : "Submit Review"}
            onPress={handleSubmitReview}
            disabled={isSubmitting}
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  spacer: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  professionalInfo: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  professionalText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  ratingSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  commentSection: {
    marginBottom: 32,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 100,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  submitButton: {
    width: '100%',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 50,
  },
});