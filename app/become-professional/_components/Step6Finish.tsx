import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { FileText, Check, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';

interface Step6FinishProps {
  onTermsPress: () => void;
  onPrivacyPress: () => void;
}

export function Step6Finish({
  onTermsPress,
  onPrivacyPress,
}: Step6FinishProps) {
  const { theme } = useTheme();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [availableForCalls, setAvailableForCalls] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  return (
    <View style={[styles.stepContent, styles.stepContentCompact]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Almost There!
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Just a few more settings to complete your profile
      </Text>

      {/* Available for Calls Card */}
      <TouchableOpacity
        onPress={() => setAvailableForCalls(!availableForCalls)}
        style={[
          styles.settingCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View
          style={[
            styles.checkCircle,
            {
              backgroundColor: availableForCalls
                ? theme.colors.pinkTwo || theme.colors.primary
                : 'transparent',
              borderColor: availableForCalls
                ? theme.colors.pinkTwo || theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          {availableForCalls && (
            <Check size={18} color={theme.colors.surface} strokeWidth={3} />
          )}
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            Available for Calls
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            Users can see you're online and ready
          </Text>
        </View>
      </TouchableOpacity>

      {/* Public Profile Card */}
      <TouchableOpacity
        onPress={() => setPublicProfile(!publicProfile)}
        style={[
          styles.settingCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View
          style={[
            styles.checkCircle,
            {
              backgroundColor: publicProfile
                ? theme.colors.pinkTwo || theme.colors.primary
                : 'transparent',
              borderColor: publicProfile
                ? theme.colors.pinkTwo || theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          {publicProfile && (
            <Check size={18} color={theme.colors.surface} strokeWidth={3} />
          )}
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            Public Profile
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            Your profile appears in public searches
          </Text>
        </View>
      </TouchableOpacity>

      {/* Terms & Privacy */}
      <View style={styles.termsSection}>
        <FileText size={40} color={theme.colors.pinkTwo || theme.colors.primary} strokeWidth={1.5} />
        <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
          By continuing, you agree to our{'\n'}
          <TouchableOpacity onPress={() => setShowTermsModal(true)}>
            <Text style={[styles.termsLink, { color: theme.colors.pinkTwo || theme.colors.primary }]}>
              Terms of Service
            </Text>
          </TouchableOpacity>{' '}
          and{' '}
          <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
            <Text style={[styles.termsLink, { color: theme.colors.pinkTwo || theme.colors.primary }]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </Text>
      </View>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTermsModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Terms of Service
              </Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={[
                  styles.modalText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Last updated: October 21, 2025{'\n\n'}
                Welcome to Talkee. By using our platform, you agree to be bound
                by these Terms of Service.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  1. Acceptance of Terms
                </Text>
                {'\n'}
                By accessing or using Talkee, you agree to comply with and be
                bound by these Terms of Service.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  2. Use of Service
                </Text>
                {'\n'}
                You agree to use Talkee only for lawful purposes and in
                accordance with these Terms.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  3. User Accounts
                </Text>
                {'\n'}
                You are responsible for maintaining the confidentiality of your
                account credentials.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  4. Professional Services
                </Text>
                {'\n'}
                Professionals on Talkee provide their services independently.
                Talkee is not responsible for the quality or outcome of
                professional services.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  5. Payment Terms
                </Text>
                {'\n'}
                All payments are processed securely. Refunds are subject to our
                refund policy.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  6. Limitation of Liability
                </Text>
                {'\n'}
                Talkee shall not be liable for any indirect, incidental, or
                consequential damages.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  7. Changes to Terms
                </Text>
                {'\n'}
                We reserve the right to modify these terms at any time.
                Continued use constitutes acceptance of changes.
              </Text>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPrivacyModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Privacy Policy
              </Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={[
                  styles.modalText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Last updated: October 21, 2025{'\n\n'}
                At Talkee, we value your privacy and are committed to protecting
                your personal information.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  1. Information We Collect
                </Text>
                {'\n'}
                We collect information you provide directly, including name,
                email, phone number, and profile information.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  2. How We Use Your Information
                </Text>
                {'\n'}
                We use your information to provide, maintain, and improve our
                services, process transactions, and communicate with you.
                {'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  3. Information Sharing
                </Text>
                {'\n'}
                We do not sell your personal information. We may share
                information with service providers who assist us in operating
                our platform.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  4. Data Security
                </Text>
                {'\n'}
                We implement appropriate security measures to protect your
                personal information.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  5. Your Rights
                </Text>
                {'\n'}
                You have the right to access, update, or delete your personal
                information at any time.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  6. Cookies and Tracking
                </Text>
                {'\n'}
                We use cookies and similar technologies to enhance your
                experience and analyze usage.{'\n\n'}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  7. Changes to This Policy
                </Text>
                {'\n'}
                We may update this Privacy Policy from time to time. We will
                notify you of any changes.
              </Text>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    alignItems: 'center',
  },
  stepContentCompact: {
    alignItems: 'center',
    width: '100%',
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
  settingCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  termsSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
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
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    height: '80%',
    borderRadius: 20,
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
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
});

// Default export to prevent Expo Router from treating this as a route
export default Step6Finish;
