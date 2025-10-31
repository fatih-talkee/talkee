import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { User, Mail, Phone, Lock, Trash2 } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

  const handleSave = async () => {
    setLoading(true);
    // Mock save
    setTimeout(() => {
      setLoading(false);
      setIsEditing(false);
    }, 1000);
  };

  const handleChangePassword = () => {
    console.log('Navigate to change password');
  };

  const handleDeleteAccount = () => {
    console.log('Navigate to delete account confirmation');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Header 
        title="Account Settings"
        showBack
        rightButtons={
          <TouchableOpacity 
            onPress={() => setIsEditing(!isEditing)}
            style={styles.editButton}
          >
            <Text style={[styles.editButtonText, { color: theme.colors.accent }]}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <Card style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
          
          <Input
            label="Full Name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({...formData, fullName: text})}
            leftIcon={<User size={20} color="#64748b" />}
            editable={isEditing}
            style={!isEditing && styles.disabledInput}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            leftIcon={<Mail size={20} color="#64748b" />}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={isEditing}
            style={!isEditing && styles.disabledInput}
          />

          <Input
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            leftIcon={<Phone size={20} color="#64748b" />}
            keyboardType="phone-pad"
            editable={isEditing}
            style={!isEditing && styles.disabledInput}
          />

          {isEditing && (
            <Button
              title={loading ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              disabled={loading}
              style={styles.saveButton}
            />
          )}
        </Card>

        {/* Security */}
        <Card style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Security</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleChangePassword}
          >
            <View style={styles.settingLeft}>
              <Lock size={20} color="#64748b" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingDescription}>
                  Update your account password
                </Text>
              </View>
            </View>
            <ArrowLeft size={16} color="#94a3b8" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </Card>

        {/* Account Actions */}
        <Card style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account Actions</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <Trash2 size={20} color="#ef4444" />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Delete Account</Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account and all data
                </Text>
              </View>
            </View>
            <ArrowLeft size={16} color="#ef4444" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </Card>

        {/* Account Info */}
        <Card style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>January 2024</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={styles.infoValue}>Standard</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Calls</Text>
              <Text style={styles.infoValue}>23</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account ID</Text>
              <Text style={styles.infoValue}>AC-7891234</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  disabledInput: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
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
    color: '#374151',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  dangerItem: {
    marginTop: 8,
  },
  dangerText: {
    color: '#ef4444',
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
});