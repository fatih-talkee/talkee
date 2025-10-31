import React from 'react';
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
import {
  ChevronRight,
  User,
  Briefcase,
  DollarSign,
  Wallet,
  Settings,
} from 'lucide-react-native';

export default function ProfessionalSettings() {
  const router = useRouter();
  const { theme } = useTheme();

  const menuItems = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: User,
      route: '/profile/professional-basic-info',
    },
    {
      id: 'cv',
      title: 'Professional CV',
      icon: Briefcase,
      route: '/profile/professional-cv',
    },
    {
      id: 'pricing',
      title: 'Pricing & Call Settings',
      icon: DollarSign,
      route: '/profile/professional-pricing',
    },
    {
      id: 'financial',
      title: 'Financial Overview',
      icon: Wallet,
      route: '/profile/professional-financial',
    },
    {
      id: 'settings',
      title: 'Call Criteria Settings',
      icon: Settings,
      route: '/profile/call-criteria-settings',
    },
  ];

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
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <IconComponent size={20} color={theme.colors.primary} />
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginLeft: 12,
  },
});
