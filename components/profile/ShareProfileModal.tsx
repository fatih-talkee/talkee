import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Copy, Share2, Star, ShieldCheck, QrCode } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import QRCode from 'react-native-qrcode-svg';

interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  professionalData?: {
    id: string;
    name: string;
    title: string;
    avatar: string;
    rating: number;
    totalCalls: number;
    isVerified: boolean;
    ratePerMinute: number;
    specialties: string[];
  };
  username?: string;
  userId?: string;
}

export function ShareProfileModal({
  visible,
  onClose,
  professionalData,
  username,
  userId,
}: ShareProfileModalProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const profileUrl = professionalData
    ? `https://talkee.app/professional/${professionalData.id}`
    : userId
    ? `https://talkee.app/user/${userId}`
    : 'https://talkee.app';

  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        Alert.alert('Link Copied', profileUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = professionalData
        ? `Check out ${professionalData.name} on Talkee! ${professionalData.title} - ${professionalData.rating}★ rating. ${profileUrl}`
        : username
        ? `Check out ${username}'s profile on Talkee! ${profileUrl}`
        : `Check out this profile on Talkee: ${profileUrl}`;

      await Share.share({
        message: shareMessage,
        url: profileUrl,
        title: 'Share Professional Profile',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.card },
          ]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Share Profile
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {professionalData && (
                <View
                  style={[
                    styles.professionalInfo,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: professionalData.avatar }}
                    style={styles.professionalAvatar}
                  />
                  <View style={styles.professionalDetails}>
                    <View style={styles.professionalNameRow}>
                      <Text
                        style={[
                          styles.professionalName,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {professionalData.name}
                      </Text>
                      {professionalData.isVerified && (
                        <ShieldCheck size={22} color={theme.colors.primary} strokeWidth={3} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.professionalTitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {professionalData.title}
                    </Text>
                    <View style={styles.professionalStats}>
                      <View style={styles.statItem}>
                        <Star
                          size={14}
                          color={theme.colors.warning}
                          fill={theme.colors.warning}
                        />
                        <Text
                          style={[
                            styles.statText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {professionalData.rating}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.statSeparator,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        •
                      </Text>
                      <Text
                        style={[
                          styles.statText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {professionalData.totalCalls} calls
                      </Text>
                      <Text
                        style={[
                          styles.statSeparator,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        •
                      </Text>
                      <Text
                        style={[
                          styles.statText,
                          { color: theme.colors.warning },
                        ]}
                      >
                        {'$' + professionalData.ratePerMinute.toFixed(2)}/min
                      </Text>
                    </View>
                    {professionalData.specialties &&
                      professionalData.specialties.length > 0 && (
                      <View style={styles.specialtiesList}>
                          {professionalData.specialties
                            .slice(0, 3)
                            .map((specialty, index) => (
                              <View
                                key={index}
                                style={[
                                  styles.specialtyBadge,
                                  {
                                    backgroundColor: theme.colors.background,
                                    borderColor: theme.colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.specialtyText,
                                    { color: theme.colors.primary },
                                  ]}
                                >
                              {specialty}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

            <View style={styles.qrSection}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                QR Code
              </Text>
                <View
                  style={[
                    styles.qrContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={profileUrl}
                    size={180}
                      color={theme.name === 'dark' ? '#FFFFFF' : '#000000'}
                      backgroundColor={
                        theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF'
                      }
                    logo={require('../../assets/images/icon.png')}
                    logoSize={40}
                      logoBackgroundColor="#FFFFFF"
                    logoMargin={2}
                  />
                </View>
              </View>
            </View>

            <View style={styles.linkSection}>
                <Text
                  style={[
                    styles.linkLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                Profile Link
              </Text>
              <View
                style={[
                  styles.linkContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    },
                ]}
              >
                <Text
                    style={[
                      styles.linkText,
                      { color: theme.colors.textSecondary },
                    ]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {profileUrl}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyLink}
                  style={[
                    styles.copyButton,
                      { borderColor: theme.colors.primary },
                  ]}
                >
                  <Copy size={16} color={theme.colors.primary} />
                    <Text
                      style={[styles.copyText, { color: theme.colors.primary }]}
                    >
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                    { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleShare}
              >
                <Share2 size={20} color={theme.colors.surface} />
                  <Text
                    style={[
                      styles.shareButtonText,
                      { color: theme.colors.surface },
                    ]}
                  >
                  Share Profile
                </Text>
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
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
    height: Dimensions.get('window').height * 0.85,
    maxHeight: Dimensions.get('window').height * 0.95,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  content: {
    alignItems: 'center',
  },
  professionalInfo: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
  },
  professionalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  professionalDetails: {
    flex: 1,
  },
  professionalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 6,
  },
  professionalTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  professionalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  statSeparator: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  specialtiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  qrSection: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  qrContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  linkSection: {
    width: '100%',
    marginBottom: 24,
  },
  linkLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginRight: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  actions: {
    width: '100%',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
});
