import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { X, Video, Phone, DollarSign, BadgeCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface CallConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  callType: 'voice' | 'video' | 'urgent';
  professional: {
    name: string;
    title: string;
    avatar: string | null;
    ratePerMinute: number;
    isVerified?: boolean;
  };
}

export function CallConfirmationModal({
  visible,
  onClose,
  onConfirm,
  callType,
  professional,
}: CallConfirmationModalProps) {
  const { theme } = useTheme();

  const isVideo = callType === 'video';
  const isUrgent = callType === 'urgent';
  
  const modalTitle = isVideo 
    ? 'Confirm Video Call' 
    : isUrgent 
      ? 'Confirm Urgent Call' 
      : 'Confirm Voice Call';
      
  const buttonText = isVideo 
    ? 'Start Video Call' 
    : isUrgent 
      ? 'Start Urgent Call' 
      : 'Start Voice Call';

  const accentColor = isVideo ? theme.colors.pinkTwo : isUrgent ? '#F59E0B' : '#10B981';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={[styles.modalContainer, { backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {isVideo ? (
                <Video size={22} color={accentColor} strokeWidth={2.5} />
              ) : (
                <Phone size={22} color={accentColor} strokeWidth={2.5} />
              )}
              <Text style={[styles.title, { color: '#FFFFFF' }]}>
                {modalTitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
            >
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Professional Info */}
          <View style={styles.professionalSection}>
            <View style={styles.avatarContainer}>
              {professional.avatar ? (
                <Image source={{ uri: professional.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                   <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{professional.name.charAt(0)}</Text>
                </View>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={[styles.professionalName, { color: '#FFFFFF' }]}>
                {professional.name}
              </Text>
              {professional.isVerified && (
                <BadgeCheck size={18} color={theme.colors.pinkTwo} strokeWidth={2.5} />
              )}
            </View>
            <Text style={[styles.professionalTitle, { color: '#9CA3AF' }]}>
              {professional.title}
            </Text>
          </View>

          {/* Rate Card */}
          <View style={[styles.rateCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={styles.rateRow}>
              <DollarSign size={18} color={accentColor} />
              <Text style={[styles.rateValue, { color: '#FFFFFF' }]}>
                ${professional.ratePerMinute.toFixed(2)}
                <Text style={styles.rateUnit}> /minute</Text>
              </Text>
            </View>
            <View style={styles.freeBadge}>
              <Text style={[styles.freeBadgeText, { color: '#10B981' }]}>
                ✓ First 2 minutes free
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton, { borderColor: 'rgba(255,255,255,0.1)' }]}
            >
              <Text style={[styles.cancelButtonText, { color: '#9CA3AF' }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.button, styles.confirmButton, { backgroundColor: accentColor }]}
            >
              <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  professionalTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  rateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
    alignItems: 'center',
    gap: 10,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  rateUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    opacity: 0.7,
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  confirmButton: {
    // Background color set dynamically
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});
