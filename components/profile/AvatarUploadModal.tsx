import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '@/contexts/ThemeContext';
import { AvatarService } from '@/services/supabase/avatar.service';

interface AvatarUploadModalProps {
  visible: boolean;
  currentAvatar?: string | null;
  userId: string;
  onClose: () => void;
  onUploadComplete: (avatarUrl: string) => void;
}

export function AvatarUploadModal({
  visible,
  currentAvatar,
  userId,
  onClose,
  onUploadComplete,
}: AvatarUploadModalProps) {
  const { theme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClose = () => {
    setSelectedImage(null);
    onClose();
  };

  const requestPermissions = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library permission is required to select photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500 } }], // Resize to max 500px width
        {
          compress: 0.8, // 80% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Image compression error:', error);
      return uri; // Return original if compression fails
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const hasPermission = await requestPermissions(source);
    if (!hasPermission) return;

    try {
      let result;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square crop
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square crop
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        // Compress the image
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedImage(compressedUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    setUploading(true);

    try {
      const avatarUrl = await AvatarService.uploadAvatar(userId, selectedImage);

      if (avatarUrl) {
        onUploadComplete(avatarUrl);
        handleClose();
      } else {
        Alert.alert(
          'Upload Failed',
          'Failed to upload avatar. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      // Show more detailed error message
      const errorMessage =
        error?.message ||
        'An error occurred while uploading. Please check console for details.';
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.card },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {selectedImage ? 'Preview' : 'Update Profile Photo'}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.card },
              ]}
              disabled={uploading}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {selectedImage ? (
            // Preview Mode
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[
                    styles.previewButton,
                    styles.cancelButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSelectedImage(null)}
                  disabled={uploading}
                >
                  <Text
                    style={[
                      styles.previewButtonText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Choose Different
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.previewButton,
                    styles.uploadButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Selection Mode
            <View style={styles.selectionContainer}>
              {currentAvatar && (
                <View style={styles.currentAvatarContainer}>
                  <Text
                    style={[
                      styles.currentAvatarLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Current Photo
                  </Text>
                  <Image
                    source={{ uri: currentAvatar }}
                    style={styles.currentAvatar}
                  />
                </View>
              )}

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.colors.card },
                  ]}
                  onPress={() => pickImage('camera')}
                >
                  <View
                    style={[
                      styles.optionIconContainer,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]}
                  >
                    <Camera size={32} color={theme.colors.primary} />
                  </View>
                  <Text
                    style={[styles.optionText, { color: theme.colors.text }]}
                  >
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.colors.card },
                  ]}
                  onPress={() => pickImage('library')}
                >
                  <View
                    style={[
                      styles.optionIconContainer,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]}
                  >
                    <ImageIcon size={32} color={theme.colors.primary} />
                  </View>
                  <Text
                    style={[styles.optionText, { color: theme.colors.text }]}
                  >
                    Choose from Library
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  currentAvatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  currentAvatarLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  currentAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  previewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 150,
    marginBottom: 24,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  previewButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  uploadButton: {},
  previewButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
});
