import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface NotificationSettings {
  emailPayoutProcessed: boolean;
  emailPayoutFailed: boolean;
  emailPayoutPending: boolean;
  pushPayoutUpdates: boolean;
  pushPayoutIssues: boolean;
  weeklySummary: boolean;
  monthlySummary: boolean;
}

export default function PayoutNotificationScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  const [settings, setSettings] = useState<NotificationSettings>({
    emailPayoutProcessed: true,
    emailPayoutFailed: true,
    emailPayoutPending: false,
    pushPayoutUpdates: true,
    pushPayoutIssues: true,
    weeklySummary: false,
    monthlySummary: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!hasChanges) return;

    // In production, save to backend
    toast.success({
      title: 'Settings Saved',
      message: 'Your notification preferences have been updated',
    });

    setHasChanges(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Payout Notifications"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Email Notifications
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Receive email updates about your payouts
          </Text>

          <Card style={styles.settingsCard}>
            {/* Payout Processed */}
            <View
              style={[
                styles.toggleRow,
                { borderBottomColor: theme.colors.divider },
              ]}
            >
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Payout Processed
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Get notified when a payout is successfully completed
                </Text>
              </View>
              <Switch
                value={settings.emailPayoutProcessed}
                onValueChange={(value) => updateSetting('emailPayoutProcessed', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Payout Failed */}
            <View
              style={[
                styles.toggleRow,
                { borderBottomColor: theme.colors.divider },
              ]}
            >
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Payout Failed
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Get notified when a payout fails or encounters an error
                </Text>
              </View>
              <Switch
                value={settings.emailPayoutFailed}
                onValueChange={(value) => updateSetting('emailPayoutFailed', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Payout Pending Verification */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Pending Verification
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Get notified when a payout is pending verification
                </Text>
              </View>
              <Switch
                value={settings.emailPayoutPending}
                onValueChange={(value) => updateSetting('emailPayoutPending', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        </View>

        {/* Push Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Push Notifications
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Receive push notifications on your device
          </Text>

          <Card style={styles.settingsCard}>
            {/* Payout Updates */}
            <View
              style={[
                styles.toggleRow,
                { borderBottomColor: theme.colors.divider },
              ]}
            >
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Payout Updates
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Receive push notifications about payout status changes
                </Text>
              </View>
              <Switch
                value={settings.pushPayoutUpdates}
                onValueChange={(value) => updateSetting('pushPayoutUpdates', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Payout Issues */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Payout Issues
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Receive alerts when there are issues with your payout
                </Text>
              </View>
              <Switch
                value={settings.pushPayoutIssues}
                onValueChange={(value) => updateSetting('pushPayoutIssues', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        </View>

        {/* Summary Emails Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Summary Emails
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Receive periodic summaries of your payout activity
          </Text>

          <Card style={styles.settingsCard}>
            {/* Weekly Summary */}
            <View
              style={[
                styles.toggleRow,
                { borderBottomColor: theme.colors.divider },
              ]}
            >
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Weekly Summary
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Receive a weekly summary of your payout activity
                </Text>
              </View>
              <Switch
                value={settings.weeklySummary}
                onValueChange={(value) => updateSetting('weeklySummary', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Monthly Summary */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Monthly Summary
                </Text>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                  Receive a monthly summary of your payout activity
                </Text>
              </View>
              <Switch
                value={settings.monthlySummary}
                onValueChange={(value) => updateSetting('monthlySummary', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.pinkTwo }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        </View>

        {/* Bottom spacing for fixed button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button - Fixed at Bottom */}
      <View style={[styles.saveButtonContainer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: theme.colors.pinkTwo },
            !hasChanges && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={!hasChanges}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  settingsCard: {
    padding: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  toggleLeft: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
