import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {
  Settings,
  Heart,
  Clock,
  FileText,
  Mic,
  ChevronRight,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  QrCode,
  Share2,
  Palette,
  Languages,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';

interface MenuSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    badge?: string;
  }[];
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const [userProfile] = useState({
    name: 'Mila Victoria',
    email: 'mila@example.com',
    avatar:
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: 'January 2024',
    totalCalls: 23,
    favoriteCount: 8,
  });

  const menuSections: MenuSection[] = [
    {
      title: 'Activity',
      items: [
        {
          id: 'favorites',
          label: 'Favorites',
          icon: <Heart size={20} color="#ef4444" />,
          onPress: () => router.push('/favorites'),
          badge: userProfile.favoriteCount.toString(),
        },
        {
          id: 'history',
          label: 'Call History',
          icon: <Clock size={20} color="#3b82f6" />,
          onPress: () => router.push('/call-history'),
          badge: userProfile.totalCalls.toString(),
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: <FileText size={20} color="#10b981" />,
          onPress: () => router.push('/invoices'),
        },
        {
          id: 'recordings',
          label: 'Recordings',
          icon: <Mic size={20} color="#8b5cf6" />,
          onPress: () => router.push('/recordings'),
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'account',
          label: 'Account Settings',
          icon: <Settings size={20} color="#64748b" />,
          onPress: () => router.push('/settings/account'),
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell size={20} color="#64748b" />,
          onPress: () => router.push('/settings/notifications'),
        },
        {
          id: 'privacy',
          label: 'Privacy & Security',
          icon: <Shield size={20} color="#64748b" />,
          onPress: () => router.push('/settings/privacy'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          label: 'Help Center',
          icon: <HelpCircle size={20} color="#64748b" />,
          onPress: () => router.push('/help'),
        },
        {
          id: 'logout',
          label: 'Sign Out',
          icon: <LogOut size={20} color="#ef4444" />,
          onPress: () => router.push('/auth/login'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={true} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card
          style={[styles.profileCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.profileHeader}>
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {userProfile.name}
              </Text>
              <Text
                style={[
                  styles.profileEmail,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {userProfile.email}
              </Text>
              <Text
                style={[styles.memberSince, { color: theme.colors.textMuted }]}
              >
                Member since {userProfile.memberSince}
              </Text>
            </View>
          </View>

          <View
            style={[styles.statsRow, { borderTopColor: theme.colors.divider }]}
          >
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {userProfile.totalCalls}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Calls
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.divider },
              ]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {userProfile.favoriteCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Favorites
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.divider },
              ]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                4.8
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Avg Rating
              </Text>
            </View>
          </View>
        </Card>

        {/* I'm a Professional Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            I'm a Professional
          </Text>
          <Card
            style={[
              styles.professionalCard,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.professionalLayout}>
              <View style={styles.qrContainer}>
                <QrCode size={45} color={theme.colors.text} />
              </View>

              <View
                style={[
                  styles.verticalDivider,
                  { backgroundColor: theme.colors.divider },
                ]}
              />

              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.professionalSettingsButton,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => router.push('/profile/professional-settings')}
                >
                  <Settings size={16} color={theme.colors.text} />
                  <Text
                    style={[
                      styles.professionalSettingsText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Professional Settings
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shareProfileButton,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                  onPress={() => console.log('Share profile')}
                >
                  <Share2 size={14} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.shareProfileText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Share Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            App Settings
          </Text>
          <Card
            style={[styles.menuCard, { backgroundColor: theme.colors.card }]}
          >
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.divider },
              ]}
              onPress={() => router.push('/settings/theme')}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuItemIcon}>
                  <Palette size={20} color={theme.colors.primary} />
                </View>
                <Text
                  style={[styles.menuItemText, { color: theme.colors.text }]}
                >
                  Theme Settings
                </Text>
              </View>
              <View style={styles.menuItemRight}>
                <ChevronRight size={16} color={theme.colors.textMuted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.lastMenuItem]}
              onPress={() => router.push('/settings/language')}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuItemIcon}>
                  <Languages size={20} color={theme.colors.primary} />
                </View>
                <Text
                  style={[styles.menuItemText, { color: theme.colors.text }]}
                >
                  Language
                </Text>
              </View>
              <View style={styles.menuItemRight}>
                <ChevronRight size={16} color={theme.colors.textMuted} />
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            <Card
              style={[styles.menuCard, { backgroundColor: theme.colors.card }]}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    itemIndex === section.items.length - 1 &&
                      styles.lastMenuItem,
                    { borderBottomColor: theme.colors.divider },
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuItemIcon}>{item.icon}</View>
                    <Text
                      style={[
                        styles.menuItemText,
                        { color: theme.colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: '#ffffff' }]}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <ChevronRight size={16} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  profileCard: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  professionalCard: {
    marginBottom: 0,
  },
  professionalLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrContainer: {
    marginRight: 20,
  },
  verticalDivider: {
    width: 1,
    height: 60,
    marginRight: 20,
  },
  buttonsContainer: {
    flex: 1,
    gap: 12,
  },
  professionalSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  professionalSettingsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  shareProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  shareProfileText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
});
