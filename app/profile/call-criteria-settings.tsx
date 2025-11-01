import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Check, Shield, Users, CreditCard, UserX } from 'lucide-react-native';

interface CallCriteriaOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
}

export default function CallCriteriaSettings() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const [criteria, setCriteria] = useState<CallCriteriaOption[]>([
    {
      id: 'verified',
      title: 'Only Verified Users',
      description: 'Allow only verified users to contact you',
      icon: Shield,
      enabled: true,
    },
    {
      id: 'payment',
      title: 'Payment Required Upfront',
      description: 'Users must have sufficient credits before calling',
      icon: CreditCard,
      enabled: true,
    },
    {
      id: 'anonymous',
      title: 'No Anonymous Callers',
      description: 'Block users with incomplete profiles',
      icon: UserX,
      enabled: false,
    },
    {
      id: 'newUsers',
      title: 'Accept New Users',
      description: 'Allow users who recently joined the platform',
      icon: Users,
      enabled: true,
    },
  ]);

  const toggleCriteria = (id: string) => {
    setCriteria((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.back();
    }, 1000);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Control Who Can Call You
          </Text>
          <Text
            style={[
              styles.infoDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            Set requirements for who can contact you. These settings help you
            maintain quality interactions and protect your time.
          </Text>
        </View>

        <View style={styles.criteriaList}>
          {criteria.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleCriteria(item.id)}
                style={[
                  styles.criteriaCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: item.enabled
                      ? theme.colors.primary
                      : theme.colors.border,
                    borderWidth: item.enabled ? 2 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.criteriaLeft}>
                  <View
                    style={[
                      styles.criteriaIcon,
                      {
                        backgroundColor: item.enabled
                          ? `${theme.colors.primary}20`
                          : `${theme.colors.textMuted}20`,
                      },
                    ]}
                  >
                    <IconComponent
                      size={24}
                      color={
                        item.enabled
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.criteriaTextContainer}>
                    <Text
                      style={[
                        styles.criteriaTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.criteriaDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: item.enabled
                        ? theme.colors.primary
                        : 'transparent',
                      borderColor: item.enabled
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                >
                  {item.enabled && (
                    <Check
                      size={18}
                      color={theme.colors.surface}
                      strokeWidth={3}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[styles.tipCard, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.tipTitle, { color: theme.colors.primary }]}>
            💡 Pro Tip
          </Text>
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
            Enabling "Payment Required Upfront" ensures you don't waste time on
            calls that won't be completed. Most successful professionals use
            this setting.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <Button
          title={loading ? 'Saving...' : 'Save Settings'}
          onPress={handleSave}
          disabled={loading}
          style={{ backgroundColor: (theme.colors as any).pinkTwo || theme.colors.primary }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  criteriaList: {
    gap: 12,
    marginBottom: 24,
  },
  criteriaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  criteriaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  criteriaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  criteriaTextContainer: {
    flex: 1,
  },
  criteriaTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  criteriaDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
