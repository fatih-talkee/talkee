import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  CreditCard,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;

  // Push notification categories
  calls: boolean;
  messages: boolean;
  appointments: boolean;
  promotions: boolean;
  payments: boolean;
  system: boolean;
}

export default function NotificationsSettingsScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    calls: true,
    messages: true,
    appointments: true,
    promotions: false,
    payments: true,
    system: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Mock save functionality
    setTimeout(() => {
      setHasChanges(false);
      toast.success({
        title: 'Settings Saved',
        message: 'Your notification preferences have been updated',
      });
    }, 500);
  };

  const handleClearAll = () => {
    toast.info({
      title: 'Clear Notifications',
      message: 'Feature coming soon',
    });
  };

  const notificationCategories = [
    {
      key: 'calls' as keyof NotificationSettings,
      label: 'Call Notifications',
      icon: Phone,
      description: 'Incoming calls and missed calls',
    },
    {
      key: 'messages' as keyof NotificationSettings,
      label: 'Messages',
      icon: MessageSquare,
      description: 'Chat messages and replies',
    },
    {
      key: 'appointments' as keyof NotificationSettings,
      label: 'Appointments',
      icon: Calendar,
      description: 'Upcoming and scheduled sessions',
    },
    {
      key: 'promotions' as keyof NotificationSettings,
      label: 'Promotions',
      icon: Bell,
      description: 'Special offers and deals',
    },
    {
      key: 'payments' as keyof NotificationSettings,
      label: 'Payments',
      icon: CreditCard,
      description: 'Transactions and billing updates',
    },
    {
      key: 'system' as keyof NotificationSettings,
      label: 'System Updates',
      icon: Bell,
      description: 'App updates and maintenance',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <Header
        title="Notifications"
        showBack
        rightButtons={
          hasChanges && (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text
                style={[styles.saveButtonText, { color: theme.colors.primary }]}
              >
                Save
              </Text>
            </TouchableOpacity>
          )
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Channels */}
        <Card style={{ marginBottom: 24 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notification Channels
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              { color: theme.colors.textMuted },
            ]}
          >
            Choose how you want to receive notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Bell size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingLabel, { color: theme.colors.text }]}
                >
                  Push Notifications
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Receive push notifications on your device
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={(value) => updateSetting('pushEnabled', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary + '80',
              }}
              thumbColor={
                settings.pushEnabled ? theme.colors.primary : '#f4f3f4'
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.accent + '20' },
                ]}
              >
                <Mail size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingLabel, { color: theme.colors.text }]}
                >
                  Email Notifications
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Receive email notifications
                </Text>
              </View>
            </View>
            <Switch
              value={settings.emailEnabled}
              onValueChange={(value) => updateSetting('emailEnabled', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent + '80',
              }}
              thumbColor={
                settings.emailEnabled ? theme.colors.accent : '#f4f3f4'
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.info + '20' },
                ]}
              >
                <MessageSquare size={20} color={theme.colors.info} />
              </View>
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingLabel, { color: theme.colors.text }]}
                >
                  SMS Notifications
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Receive SMS notifications
                </Text>
              </View>
            </View>
            <Switch
              value={settings.smsEnabled}
              onValueChange={(value) => updateSetting('smsEnabled', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.info + '80',
              }}
              thumbColor={settings.smsEnabled ? theme.colors.info : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Notification Types */}
        {settings.pushEnabled && (
          <Card style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Notification Types
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: theme.colors.textMuted },
              ]}
            >
              Select which types of notifications you want to receive
            </Text>

            {notificationCategories.map((category, index) => {
              const IconComponent = category.icon;
              const isEnabled = settings[category.key];

              return (
                <View
                  key={category.key}
                  style={[
                    styles.settingRow,
                    index < notificationCategories.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.divider,
                    },
                  ]}
                >
                  <View style={styles.settingLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: isEnabled
                            ? theme.colors.primary + '20'
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <IconComponent
                        size={20}
                        color={
                          isEnabled
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                      />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text
                        style={[
                          styles.settingLabel,
                          {
                            color: isEnabled
                              ? theme.colors.text
                              : theme.colors.textMuted,
                          },
                        ]}
                      >
                        {category.label}
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {category.description}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={(value) =>
                      updateSetting(category.key, value)
                    }
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary + '80',
                    }}
                    thumbColor={isEnabled ? theme.colors.primary : '#f4f3f4'}
                  />
                </View>
              );
            })}
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={{ marginBottom: 24 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Actions
          </Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
          >
            <Text
              style={[styles.actionButtonText, { color: theme.colors.primary }]}
            >
              Clear All Notifications
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Info */}
        <Card style={{ marginBottom: 40 }}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Notification Settings
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            • Your notification preferences are saved automatically{'\n'}• You
            can change these settings at any time{'\n'}• Some notifications may
            be required for app functionality
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  infoCard: {
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
});
