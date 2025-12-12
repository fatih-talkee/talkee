import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Dimensions,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import {
  X,
  Copy,
  Share2,
  Download,
  ShieldCheck,
  Star,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import ViewShot from 'react-native-view-shot';
import { Image } from 'react-native';

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
  const [sharingQr, setSharingQr] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const qrCodeRef = useRef<any>(null);

  // Deep link for app (opens app directly)
  const appDeepLink = professionalData
    ? `talkee://professional/${professionalData.id}`
    : userId
    ? `talkee://user/${userId}`
    : 'talkee://';

  // Web URL (fallback for web users or if app not installed)
  const profileUrl = professionalData
    ? `https://talkee.app/professional/${professionalData.id}`
    : userId
    ? `https://talkee.app/user/${userId}`
    : 'https://talkee.app';

  // Combined link (app deep link + web URL for universal compatibility)
  const universalLink = `${appDeepLink}\n\nOr visit: ${profileUrl}`;

  const handleCopyLink = async () => {
    try {
      const linkToCopy = Platform.OS === 'web' ? profileUrl : universalLink;

      // Use Expo Clipboard for both web and mobile
      await Clipboard.setStringAsync(linkToCopy);

      setCopied(true);
      setMessage({ type: 'success', text: 'Profile link copied to clipboard' });
      setTimeout(() => {
        setCopied(false);
        setMessage(null);
      }, 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy link' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = professionalData
        ? `Check out ${professionalData.name} on Talkee! ${professionalData.title} - ${professionalData.rating}★ rating.\n\n${universalLink}`
        : username
        ? `Check out ${username}'s profile on Talkee!\n\n${universalLink}`
        : `Check out this profile on Talkee:\n\n${universalLink}`;

      await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? appDeepLink : profileUrl,
        title: 'Share Profile',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleShareQrCode = async () => {
    if (!qrCodeRef.current) {
      setMessage({ type: 'error', text: 'QR code not ready' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setSharingQr(true);

      // Capture QR code as image
      const uri = await qrCodeRef.current.capture();

      if (!uri) {
        throw new Error('Failed to capture QR code');
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share QR Code',
        });

        setMessage({ type: 'success', text: 'QR code shared successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        // Fallback: copy image to clipboard or show alert
        setMessage({
          type: 'warning',
          text: "Sharing not available. Please use the share button in your device's image viewer.",
        });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to share QR code',
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSharingQr(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.card },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Share Profile
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {message && (
            <View
              style={[
                styles.messageContainer,
                {
                  backgroundColor:
                    message.type === 'success'
                      ? theme.colors.success + '20'
                      : message.type === 'error'
                      ? theme.colors.error + '20'
                      : theme.colors.warning + '20',
                  borderColor:
                    message.type === 'success'
                      ? theme.colors.success
                      : message.type === 'error'
                      ? theme.colors.error
                      : theme.colors.warning,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  {
                    color:
                      message.type === 'success'
                        ? theme.colors.success
                        : message.type === 'error'
                        ? theme.colors.error
                        : theme.colors.warning,
                  },
                ]}
              >
                {message.text}
              </Text>
            </View>
          )}

          {/* Profile Card */}
          {(professionalData || username) && (
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Image
                source={{
                  uri:
                    professionalData?.avatar ||
                    'https://via.placeholder.com/150',
                }}
                style={styles.profileAvatar}
              />
              <View style={styles.profileInfo}>
                <View style={styles.profileHeader}>
                  <Text
                    style={[styles.profileName, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {professionalData?.name || username || 'User'}
                  </Text>
                  {professionalData?.isVerified && (
                    <ShieldCheck
                      size={16}
                      color={theme.colors.primary}
                      strokeWidth={2.5}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.profileTitle,
                    { color: theme.colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {professionalData?.title || 'Talkee User'}
                </Text>
                {professionalData && (
                  <View style={styles.profileStats}>
                    {professionalData.rating > 0 && (
                      <View style={styles.statItem}>
                        <Star
                          size={12}
                          color={theme.colors.accent}
                          fill={theme.colors.accent}
                        />
                        <Text
                          style={[
                            styles.statText,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {professionalData.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {professionalData.totalCalls > 0 && (
                      <Text
                        style={[
                          styles.statText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {professionalData.totalCalls} calls
                      </Text>
                    )}
                    {professionalData.ratePerMinute > 0 && (
                      <Text
                        style={[
                          styles.statText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        ${professionalData.ratePerMinute.toFixed(2)}/min
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            bounces={true}
          >
            <View style={styles.content}>
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
                  <ViewShot
                    ref={qrCodeRef}
                    options={{ format: 'png', quality: 1.0 }}
                    style={styles.qrCodeWrapper}
                  >
                    <QRCode
                      value={appDeepLink}
                      size={200}
                      color={theme.name === 'dark' ? '#FFFFFF' : '#000000'}
                      backgroundColor={
                        theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF'
                      }
                      logo={require('../../assets/images/icon.png')}
                      logoSize={40}
                      logoBackgroundColor="#FFFFFF"
                      logoMargin={4}
                    />
                  </ViewShot>
                </View>
                <TouchableOpacity
                  style={[
                    styles.shareQrButton,
                    {
                      backgroundColor: theme.colors.primary + '20',
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={handleShareQrCode}
                  disabled={sharingQr}
                >
                  <Download size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.shareQrButtonText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {sharingQr ? 'Sharing...' : 'Share QR Code'}
                  </Text>
                </TouchableOpacity>
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
                  <View style={styles.linkTextContainer}>
                    <Text
                      style={[
                        styles.linkText,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="middle"
                    >
                      {Platform.OS === 'web' ? profileUrl : appDeepLink}
                    </Text>
                    {Platform.OS !== 'web' && (
                      <Text
                        style={[
                          styles.linkSubtext,
                          { color: theme.colors.textMuted },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        Web: {profileUrl}
                      </Text>
                    )}
                  </View>
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
            </View>
          </ScrollView>

          <View style={styles.footer}>
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
    height: Dimensions.get('window').height * 0.85,
    maxHeight: Dimensions.get('window').height * 0.9,
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 0,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 4,
  },
  messageContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  profileTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  content: {
    alignItems: 'center',
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
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  shareQrButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  linkTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  linkSubtext: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
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
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
});
