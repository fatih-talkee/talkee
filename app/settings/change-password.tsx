import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Key, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [visibility, setVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);

  const toggleVisibility = (field: keyof typeof visibility) => {
    setVisibility({ ...visibility, [field]: !visibility[field] });
  };

  const handleChangePassword = async () => {
    // Validation
    if (!formData.currentPassword) {
      toast.error({
        title: 'Error',
        message: 'Please enter your current password',
      });
      return;
    }

    if (!formData.newPassword) {
      toast.error({
        title: 'Error',
        message: 'Please enter a new password',
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error({
        title: 'Error',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error({
        title: 'Error',
        message: 'New passwords do not match',
      });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error({
        title: 'Error',
        message: 'New password must be different from current password',
      });
      return;
    }

    setLoading(true);
    
    // Mock API call
    setTimeout(() => {
      setLoading(false);
      toast.success({
        title: 'Success',
        message: 'Your password has been changed successfully',
      });
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Header 
        showBack
        backRoute="/(tabs)/profile"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Information Card */}
        <Card style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Key size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              Update Your Password
            </Text>
          </View>
          <Text style={[styles.infoDescription, { color: theme.colors.textMuted }]}>
            Choose a strong password that contains at least 8 characters, including letters, numbers, and special characters.
          </Text>
        </Card>

        {/* Password Form */}
        <Card style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Password Details
          </Text>

          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Input
              label="Current Password"
              value={formData.currentPassword}
              onChangeText={(text) => setFormData({...formData, currentPassword: text})}
              leftIcon={<Lock size={20} color="#64748b" />}
              rightIcon={
                <TouchableOpacity onPress={() => toggleVisibility('currentPassword')}>
                  {visibility.currentPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              }
              secureTextEntry={!visibility.currentPassword}
              autoCapitalize="none"
            />
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Input
              label="New Password"
              value={formData.newPassword}
              onChangeText={(text) => setFormData({...formData, newPassword: text})}
              leftIcon={<Lock size={20} color="#64748b" />}
              rightIcon={
                <TouchableOpacity onPress={() => toggleVisibility('newPassword')}>
                  {visibility.newPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              }
              secureTextEntry={!visibility.newPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Input
              label="Confirm New Password"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
              leftIcon={<Lock size={20} color="#64748b" />}
              rightIcon={
                <TouchableOpacity onPress={() => toggleVisibility('confirmPassword')}>
                  {visibility.confirmPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              }
              secureTextEntry={!visibility.confirmPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Save Button */}
          <Button
            title={loading ? "Changing Password..." : "Change Password"}
            onPress={handleChangePassword}
            disabled={loading}
            style={styles.saveButton}
          />
        </Card>

        {/* Password Tips */}
        <Card style={[styles.tipsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
            Password Tips
          </Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                Use at least 8 characters
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                Mix uppercase and lowercase letters
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                Include numbers and special characters
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                Don't use personal information
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                Avoid common words or phrases
              </Text>
            </View>
          </View>
        </Card>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    paddingTop: 24,
  },
  infoCard: {
    marginBottom: 24,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  formCard: {
    marginBottom: 24,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  tipsCard: {
    marginBottom: 24,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});

