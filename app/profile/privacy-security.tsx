import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Eye,
  Radio,
  MessageSquare,
  UserX,
  Shield,
  Bell,
  Smartphone,
  Key,
  Download,
  Trash2,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle,
  FileText,
  Mail,
  Calendar,
  Heart,
  Phone,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';

export default function PrivacySecurityScreen() {
  const { theme } = useTheme();

  const [showProfilePublicly, setShowProfilePublicly] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowMessageRequests, setAllowMessageRequests] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [userEmail] = useState('mila@example.com'); // In real app, this would come from user profile

  const handleDownloadData = () => {
    setShowDownloadModal(true);
  };

  const handleConfirmDownload = () => {
    setShowDownloadModal(false);
    Alert.alert(
      'Request Submitted',
      'Your data export request has been submitted. You will receive an email at ' +
        userEmail +
        ' within 24 hours with a link to download your data.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    Alert.alert(
      'Account Deleted',
      'Your account has been scheduled for deletion.'
    );
  };

  const SettingRow = ({
    icon,
    iconColor,
    title,
    description,
    value,
    onValueChange,
    showArrow,
    onPress,
    showDivider = true,
  }: {
    icon: React.ReactNode;
    iconColor?: string;
    title: string;
    description?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    showArrow?: boolean;
    onPress?: () => void;
    showDivider?: boolean;
  }) => (
    <>
      <TouchableOpacity
        style={styles.settingRow}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {icon}
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
            {description && (
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.settingRight}>
          {value !== undefined && onValueChange && (
            <Switch
              value={value}
              onValueChange={onValueChange}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary + '40',
              }}
              thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
            />
          )}
          {showArrow && (
            <ChevronRight size={20} color={theme.colors.textMuted} />
          )}
        </View>
      </TouchableOpacity>
      {showDivider && (
        <View
          style={[styles.divider, { backgroundColor: theme.colors.divider }]}
        />
      )}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Controls Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy Controls
          </Text>
          <Card
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <SettingRow
              icon={<Eye size={20} color={theme.colors.primary} />}
              title="Show Profile Publicly"
              description="Allow others to find your profile in searches"
              value={showProfilePublicly}
              onValueChange={setShowProfilePublicly}
            />
            <SettingRow
              icon={<Radio size={20} color={theme.colors.primary} />}
              title="Show Online Status"
              description="Display when you're active"
              value={showOnlineStatus}
              onValueChange={setShowOnlineStatus}
            />
            <SettingRow
              icon={<MessageSquare size={20} color={theme.colors.primary} />}
              title="Allow Message Requests"
              description="Allow messages from new users"
              value={allowMessageRequests}
              onValueChange={setAllowMessageRequests}
            />
          </Card>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Security
          </Text>
          <Card
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <SettingRow
              icon={<Shield size={20} color={theme.colors.primary} />}
              title="Two-Factor Authentication"
              description="Add an extra layer of security"
              value={twoFactorAuth}
              onValueChange={setTwoFactorAuth}
            />
            <SettingRow
              icon={<Bell size={20} color={theme.colors.primary} />}
              title="Login Alerts"
              description="Get notified of new login attempts"
              value={loginAlerts}
              onValueChange={setLoginAlerts}
            />
            <SettingRow
              icon={<Smartphone size={20} color={theme.colors.textMuted} />}
              title="Manage Devices"
              description="View and manage logged-in devices"
              showArrow
              onPress={() => router.push('/profile/devices')}
            />
          </Card>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Data Management
          </Text>
          <Card
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <SettingRow
              icon={<Download size={20} color={theme.colors.primary} />}
              title="Download My Data"
              description="Request a copy of your data"
              showArrow
              onPress={handleDownloadData}
            />
            <SettingRow
              icon={<Trash2 size={20} color="#ef4444" />}
              iconColor="#ef4444"
              title="Delete My Account"
              description="Permanently delete your account"
              showArrow
              onPress={handleDeleteAccount}
              showDivider={false}
            />
          </Card>
        </View>

        {/* Info Section */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Shield size={20} color={theme.colors.primary} />
          <Text
            style={[styles.infoText, { color: theme.colors.textSecondary }]}
          >
            Your privacy and security are our top priority. We use
            industry-standard encryption to protect your data.
          </Text>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.card,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : theme.colors.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: '#ef444420' },
                ]}
              >
                <AlertTriangle size={40} color="#ef4444" />
              </View>

              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Delete Account
              </Text>

              <Text
                style={[
                  styles.modalDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Are you sure you want to permanently delete your account? This
                action cannot be undone.
              </Text>

              <Text
                style={[styles.modalWarning, { color: theme.colors.textMuted }]}
              >
                All your data, including profile, call history, favorites, and
                account information will be permanently removed.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalCancelButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text
                    style={[
                      styles.modalCancelText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalDeleteButton,
                    { backgroundColor: '#ef4444' },
                  ]}
                  onPress={handleConfirmDelete}
                >
                  <Trash2 size={18} color="#FFFFFF" />
                  <Text style={[styles.modalDeleteText, { color: '#FFFFFF' }]}>
                    Delete Account
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Download Data Modal */}
      <Modal
        visible={showDownloadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDownloadModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDownloadModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.card,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : theme.colors.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setShowDownloadModal(false)}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Download size={40} color={theme.colors.primary} />
              </View>

              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Download My Data
              </Text>

              <Text
                style={[
                  styles.modalDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Request a copy of all your data. We'll prepare your data and
                send it to your email address within 24 hours.
              </Text>

              <View
                style={[
                  styles.dataListContainer,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[styles.dataListTitle, { color: theme.colors.text }]}
                >
                  Your data package will include:
                </Text>

                <View style={styles.dataList}>
                  <View style={styles.dataItem}>
                    <FileText size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.dataItemText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Profile information
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Phone size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.dataItemText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Call history
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Heart size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.dataItemText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Favorites
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Calendar size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.dataItemText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Appointments
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Mail size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.dataItemText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Messages
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Shield size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.dataItemText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Security settings
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.emailContainer,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <Mail size={16} color={theme.colors.textMuted} />
                  <Text
                    style={[styles.emailText, { color: theme.colors.text }]}
                  >
                    {userEmail}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.modalWarning, { color: theme.colors.textMuted }]}
              >
                The download link will expire in 7 days for security reasons.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalCancelButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowDownloadModal(false)}
                >
                  <Text
                    style={[
                      styles.modalCancelText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalDownloadButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handleConfirmDownload}
                >
                  <CheckCircle size={18} color="#FFFFFF" />
                  <Text
                    style={[styles.modalDownloadText, { color: '#FFFFFF' }]}
                  >
                    Request Data
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  settingRight: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  modalWarning: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalDeleteText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  dataListContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  dataListTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  dataList: {
    gap: 10,
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dataItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  emailText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  modalDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalDownloadText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});
