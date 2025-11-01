import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Lock,
  Trash2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';

export default function AccountSettingsScreen() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Mock save
    setTimeout(() => {
      setLoading(false);
      setIsEditing(false);
    }, 1000);
  };

  const handleChangePassword = () => {
    router.push('/settings/change-password');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteLoading(true);
    // Mock delete operation
    setTimeout(() => {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      // Navigate to login or home screen after deletion
      router.replace('/auth/login');
    }, 2000);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        backPosition="right"
        rightButtons={[
          <TouchableOpacity
            key="edit"
            onPress={() => setIsEditing(!isEditing)}
            style={[
              styles.editButton,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? theme.colors.surface
                    : theme.name === 'light'
                    ? theme.colors.brandPink
                    : '#000000',
              },
            ]}
          >
            <Text
              style={[
                styles.editButtonText,
                {
                  color: '#FFFFFF',
                },
              ]}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>,
        ]}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Personal Information
          </Text>

          <View
            style={[
              styles.inputGroup,
              {
                borderColor: isEditing
                  ? theme.colors.primary
                  : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <User
              color={theme.colors.textMuted}
              size={18}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              editable={isEditing}
            />
          </View>

          <View
            style={[
              styles.inputGroup,
              {
                borderColor: isEditing
                  ? theme.colors.primary
                  : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Mail
              color={theme.colors.textMuted}
              size={18}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={isEditing}
            />
          </View>

          <View
            style={[
              styles.inputGroup,
              {
                borderColor: isEditing
                  ? theme.colors.primary
                  : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Phone
              color={theme.colors.textMuted}
              size={18}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Phone Number"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              keyboardType="phone-pad"
              editable={isEditing}
            />
          </View>

          {isEditing && (
            <Button
              title={loading ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={loading}
              style={styles.saveButton}
            />
          )}
        </View>

        {/* Security */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Security
          </Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Lock size={20} color={theme.colors.primary} />
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingLabel, { color: theme.colors.primary }]}
                >
                  Change Password
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Update your account password
                </Text>
              </View>
            </View>
            <ChevronRight
              size={20}
              color={theme.name === 'dark' ? '#FFFFFF' : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Account Actions
          </Text>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Trash2 size={20} color={theme.colors.error} />
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingLabel, { color: theme.colors.error }]}
                >
                  Delete Account
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Permanently delete your account and all data
                </Text>
              </View>
            </View>
            <ChevronRight
              size={20}
              color={theme.name === 'dark' ? '#FFFFFF' : theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Account Information
          </Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Member Since
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                January 2024
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Account Type
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                Standard
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Calls
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                23
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Account ID
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                AC-7891234
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalIconContainer}>
              <View
                style={[
                  styles.modalIcon,
                  { backgroundColor: theme.colors.error + '20' },
                ]}
              >
                <AlertTriangle size={32} color={theme.colors.error} />
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Delete Account?
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

            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: theme.colors.error + '10',
                  borderColor: theme.colors.error + '30',
                },
              ]}
            >
              <Text style={[styles.warningText, { color: theme.colors.error }]}>
                All your data will be permanently deleted, including:
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Your profile and personal information
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Call history and recordings
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Credits and payment history
              </Text>
              <Text style={[styles.warningItem, { color: theme.colors.error }]}>
                • Favorites and preferences
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.deleteButton,
                  { backgroundColor: theme.colors.error },
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteButtonText}>
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  saveButton: {
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  dangerItem: {
    marginTop: 0,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  warningItem: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
