import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  Heart,
  Clock,
  FileText,
  Mic,
  ChevronRight,
  Bell,
  CircleHelp as HelpCircle,
  LogOut,
  QrCode,
  Share2,
  Palette,
  Languages,
  UserX,
  Camera,
  BookOpen,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { router, useSegments } from 'expo-router';
import { useToast } from '@/lib/toastService';
import { ShareProfileModal } from '@/components/profile/ShareProfileModal';
import { AvatarUploadModal } from '@/components/profile/AvatarUploadModal';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PageLoading } from '@/components/ui/PageLoading';

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
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const toast = useToast();

  // ✅ Check auth state first to prevent loading stuck after sign-out
  const { isAuthenticated } = useAuth();

  // ✅ Use real profile data
  const { user, stats, isProfessional, professional, isLoading, profileData, refetch } =
    useProfile();

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar_url]);

  // Refetch profile data when screen comes into focus (e.g., after credit purchase)
  useEffect(() => {
    // Check if we're on the profile tab
    const isOnProfileTab = segments[0] === '(tabs)' && segments[1] === 'profile';
    if (isOnProfileTab) {
      // Small delay to ensure navigation is complete and webhook has processed
      const timer = setTimeout(() => {
        refetch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [segments, refetch]);

  // ✅ Format date helper
  const formatMemberSince = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  // ✅ Get user initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  // ✅ Get avatar background color based on name (consistent color)
  const getAvatarColor = (name: string): string => {
    if (!name) return '#64748b';
    const colors = [
      '#3b82f6', // Blue
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#f59e0b', // Amber
      '#10b981', // Green
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#f97316', // Orange
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // ✅ If not authenticated, show loading and let navigation handle redirect
  // This prevents the loading stuck issue after sign-out
  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo={true} />
        <PageLoading />
      </SafeAreaView>
    );
  }

  // ✅ Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo={true} />
        <PageLoading />
      </SafeAreaView>
    );
  }

  // ✅ No user state (shouldn't happen, but defensive)
  // Show loading instead of error to prevent flash of error message during sign out
  // The useAuth hook will handle navigation on SIGNED_OUT event immediately
  if (!user || !stats) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo={true} />
        <PageLoading />
      </SafeAreaView>
    );
  }

  const handleShareProfile = async () => {
    try {
      const result = await Share.share({
        message: `Check out my Talkee profile! ${user.name}`,
        title: `Share ${user.name}'s Profile`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          toast.success({
            title: 'Profile Shared',
            message: 'Thank you for sharing!',
          });
        } else {
          toast.success({
            title: 'Profile Shared',
            message: 'Profile link shared successfully',
          });
        }
      }
    } catch (error: any) {
      console.error('Error sharing profile:', error.message);
      toast.error({
        title: 'Share Error',
        message: 'Unable to share profile',
      });
    }
  };

  const handleChangePhoto = () => {
    setAvatarModalVisible(true);
  };

  const handleAvatarUploadComplete = async (avatarUrl: string) => {
    try {
      // Invalidate and refetch profile data to show updated avatar
      await refetch();
      
      toast.success({
        title: 'Avatar Updated',
        message: 'Your profile photo has been updated successfully',
      });
    } catch (error) {
      console.error('Error refreshing profile after avatar upload:', error);
      // Still show success toast even if refetch fails
      toast.success({
        title: 'Avatar Updated',
        message: 'Your profile photo has been updated successfully',
      });
    }
  };

  const handleSignOutPress = async () => {
    try {
      // ✅ Sign out from Supabase Auth
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        toast.error({
          title: 'Sign Out Failed',
          message: error.message || 'Unable to sign out',
        });
        return;
      }

      // ✅ Success feedback
      toast.success({
        title: 'Signed Out',
        message: 'See you soon!',
      });

      // ✅ Navigation will be handled automatically by useAuth hook's onAuthStateChange listener
      // No need to navigate manually - this prevents showing "Unable to load profile" screen
      // The auth state change will trigger navigation to login immediately
    } catch (error: any) {
      console.error('Unexpected sign out error:', error);
      toast.error({
        title: 'Sign Out Error',
        message: 'An unexpected error occurred',
      });
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Activity',
      items: [
        {
          id: 'favorites',
          label: 'Favorites',
          icon: <Heart size={20} color="#ef4444" />,
          onPress: () => {
            try {
              router.push('/favorites');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
          badge: stats.favorites_count?.toString(),
        },
        {
          id: 'history',
          label: 'Call History',
          icon: <Clock size={20} color="#3b82f6" />,
          onPress: () => {
            try {
              router.push('/call-history');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
          badge: stats.total_calls?.toString(),
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: <FileText size={20} color="#10b981" />,
          onPress: () => {
            try {
              router.push('/invoices');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
          badge: stats.invoices_count?.toString(),
        },
        // TODO: Recordings feature - to be developed later
        // {
        //   id: 'recordings',
        //   label: 'Recordings',
        //   icon: <Mic size={20} color="#8b5cf6" />,
        //   onPress: () => router.push('/profile/recordings'),
        // },
        // Blocked Users - only for professionals
        ...(isProfessional
          ? [
              {
                id: 'blocked',
                label: 'Blocked Users',
                icon: <UserX size={20} color="#f59e0b" />,
                onPress: () => {
                  try {
                    router.push('/blocked-users');
                  } catch (error) {
                    console.error('Navigation error:', error);
                  }
                },
                badge: stats.blocked_users_count?.toString(),
              },
            ]
          : []),
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell size={20} color="#64748b" />,
          onPress: () => {
            try {
              router.push('/notifications' as any);
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
          badge: '3', // TODO: Replace with real notification count
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
          onPress: () => {
            try {
              router.push('/settings/account');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'howitworks',
          label: 'How It Works',
          icon: <BookOpen size={20} color="#64748b" />,
          onPress: () => {
            try {
              router.push('/how-it-works');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
        },
        {
          id: 'help',
          label: 'Help Center',
          icon: <HelpCircle size={20} color="#64748b" />,
          onPress: () => {
            try {
              router.push('/help');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          },
        },
        {
          id: 'logout',
          label: 'Sign Out',
          icon: <LogOut size={20} color="#ef4444" />,
          onPress: handleSignOutPress,
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 90) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card
          style={[styles.profileCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {(() => {
                const hasValidAvatar =
                  user.avatar_url &&
                  typeof user.avatar_url === 'string' &&
                  user.avatar_url.trim() !== '' &&
                  !user.avatar_url.includes('placeholder') &&
                  !user.avatar_url.includes('via.placeholder') &&
                  !avatarError;

                return hasValidAvatar ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={styles.avatar}
                    onError={() => {
                      setAvatarError(true);
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarInitials,
                      { backgroundColor: getAvatarColor(user.name) },
                    ]}
                  >
                    <Text style={styles.avatarInitialsText}>
                      {getInitials(user.name)}
                    </Text>
                  </View>
                );
              })()}
              <TouchableOpacity
                style={[
                  styles.cameraButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleChangePhoto}
              >
                <Camera size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {user.name}
              </Text>
              <Text
                style={[
                  styles.profileEmail,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {user.primary_email || 'No email'}
              </Text>
              <Text
                style={[styles.memberSince, { color: theme.colors.textMuted }]}
              >
                Member since {formatMemberSince(stats.member_since)}
              </Text>
            </View>
          </View>

          <View
            style={[styles.statsRow, { borderTopColor: theme.colors.divider }]}
          >
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {stats.total_calls || 0}
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
                {stats.favorites_count || 0}
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
          </View>
        </Card>

        {/* Professional Section - Conditional */}
        {isProfessional ? (
          // If professional - show settings
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
                    onPress={() => {
                      try {
                        router.push('/professional-settings');
                      } catch (error) {
                        console.error('Navigation error:', error);
                      }
                    }}
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
                    onPress={() => setShareModalVisible(true)}
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
        ) : (
          // If not professional - show become professional button
          <View style={styles.section}>
            <Card
              style={[
                styles.becomeProfessionalCard,
                { backgroundColor: theme.colors.card },
              ]}
            >
              <View style={styles.becomeProfessionalContent}>
                <Text
                  style={[
                    styles.becomeProfessionalTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Share Your Expertise
                </Text>
                <Text
                  style={[
                    styles.becomeProfessionalDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Join our community of professionals and start earning by
                  sharing your knowledge.
                </Text>
                <Button
                  title="Become a Professional"
                  onPress={() => {
                    try {
                      router.push('/become-professional' as any);
                    } catch (error) {
                      console.error('Navigation error:', error);
                    }
                  }}
                  variant="primary"
                  size="medium"
                  style={[
                    { width: '100%' },
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
            </Card>
          </View>
        )}

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
              onPress={() => {
                try {
                  router.push('/settings/theme');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
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
                <ChevronRight
                  size={20}
                  color={
                    theme.name === 'dark' ? '#FFFFFF' : theme.colors.textMuted
                  }
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.lastMenuItem]}
              onPress={() => {
                try {
                  router.push('/settings/language');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
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
                <ChevronRight
                  size={20}
                  color={
                    theme.name === 'dark' ? '#FFFFFF' : theme.colors.textMuted
                  }
                />
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
                    <ChevronRight
                      size={20}
                      color={
                        theme.name === 'dark'
                          ? '#FFFFFF'
                          : theme.colors.textMuted
                      }
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>

      <ShareProfileModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userId={user.id}
        username={user.name}
        professionalData={
          isProfessional && professional
            ? {
                id: professional.id,
                name: user.name,
                title: professional.title || user.name,
                avatar: user.avatar_url || '',
                rating: 0, // Rating will be calculated from reviews if needed
                totalCalls: professional.total_calls || 0,
                isVerified: professional.is_verified || false,
                ratePerMinute: Number(professional.rate_per_minute) || 0,
                specialties: professional.specialties || [],
              }
            : undefined
        }
      />

      <AvatarUploadModal
        visible={avatarModalVisible}
        currentAvatar={user.avatar_url}
        userId={user.id}
        onClose={() => setAvatarModalVisible(false)}
        onUploadComplete={handleAvatarUploadComplete}
      />
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
  },
  contentContainer: {
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
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
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
  becomeProfessionalCard: {
    marginBottom: 0,
  },
  becomeProfessionalContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  becomeProfessionalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  becomeProfessionalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
});
