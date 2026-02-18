import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { useToast } from '@/lib/toastService';
import {
  Shield,
  CreditCard,
  UserX,
  UserPlus,
} from 'lucide-react-native';

// Her bir kriter öğesinin tipi
interface CriteriaItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export default function CallCriteriaScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Kriter ayarları — şimdilik local state
  const [criteria, setCriteria] = useState<CriteriaItem[]>([
    {
      id: 'verified_only',
      title: 'Only Verified Users',
      description: 'Allow only verified users to contact you',
      icon: <Shield size={22} color={theme.colors.pinkTwo} strokeWidth={1.8} />,
      enabled: true,
    },
    {
      id: 'payment_required',
      title: 'Payment Required Upfront',
      description: 'Users must have sufficient credits before calling',
      icon: <CreditCard size={22} color={theme.colors.pinkTwo} strokeWidth={1.8} />,
      enabled: true,
    },
    {
      id: 'no_anonymous',
      title: 'No Anonymous Callers',
      description: 'Block users with incomplete profiles',
      icon: <UserX size={22} color={theme.colors.pinkTwo} strokeWidth={1.8} />,
      enabled: false,
    },
    {
      id: 'accept_new_users',
      title: 'Accept New Users',
      description: 'Allow users who recently joined the platform',
      icon: <UserPlus size={22} color={theme.colors.pinkTwo} strokeWidth={1.8} />,
      enabled: true,
    },
  ]);

  // Toggle değiştirme
  const handleToggle = (id: string) => {
    setCriteria((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  // Kaydet
  const handleSave = () => {
    // TODO: Backend entegrasyonu eklenecek
    toast.success({
      title: 'Settings Saved',
      message: 'Call criteria updated successfully',
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo={false}
        title="Call Criteria Settings"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Açıklama kartı */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Control Who Can Call You
          </Text>
          <Text
            style={[styles.infoDescription, { color: theme.colors.textSecondary }]}
          >
            Set requirements for who can contact you. These settings help you
            maintain quality interactions and protect your time.
          </Text>
        </View>

        {/* Kriter öğeleri */}
        <View style={styles.criteriaList}>
          {criteria.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => handleToggle(item.id)}
              style={[
                styles.criteriaCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: item.enabled
                    ? theme.colors.pinkTwo
                    : theme.colors.border,
                },
              ]}
            >
              {/* İkon */}
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: theme.colors.pinkTwo + '18',
                  },
                ]}
              >
                {item.icon}
              </View>

              {/* Metin */}
              <View style={styles.textWrapper}>
                <Text style={[styles.criteriaTitle, { color: theme.colors.text }]}>
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

              {/* Toggle */}
              <Switch
                value={item.enabled}
                onValueChange={() => handleToggle(item.id)}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.pinkTwo,
                }}
                thumbColor="#ffffff"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer — Kaydet butonu */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.pinkTwo }]}
          onPress={handleSave}
          activeOpacity={0.85}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    gap: 16,
  },
  // Açıklama kartı
  infoCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  // Kriter listesi
  criteriaList: {
    gap: 12,
  },
  criteriaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    gap: 3,
  },
  criteriaTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  criteriaDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 17,
  },
  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
