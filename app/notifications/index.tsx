import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  Phone,
  MessageSquare,
  Calendar,
  CreditCard,
  Gift,
  Settings,
  Check,
  Star,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { TabButtons } from '@/components/ui/TabButtons';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import type { Notification } from '@/types/database.types';
import { logger } from '@/lib/logger';
import { PageLoading } from '@/components/ui/PageLoading';

// Extended notification type with professional info
interface NotificationWithProfessional extends Notification {
  professional?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread'>('all');
  const [expandedNotifications, setExpandedNotifications] = useState<
    Set<string>
  >(new Set());

  // Log when notifications screen mounts
  useEffect(() => {
    logger.info('[Notifications] 🔔 Notifications screen mounted', {
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Fetch notifications from API with pagination (load 20 at a time for speed)
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useNotifications(20, 0);

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      return selectedFilter === 'all' || !notification.is_read;
    });
  }, [notifications, selectedFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    const iconSize = 20;
    const iconColor = theme.colors.primary;

    switch (type) {
      case 'call_request':
      case 'call_started':
      case 'call_ended':
        return <Phone size={iconSize} color={iconColor} />;
      case 'message':
        return <MessageSquare size={iconSize} color={iconColor} />;
      case 'review':
        return <Star size={iconSize} color={iconColor} />;
      case 'payment':
        return <CreditCard size={iconSize} color={iconColor} />;
      case 'system':
        return <Settings size={iconSize} color={iconColor} />;
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'call_request':
      case 'call_started':
      case 'call_ended':
        return theme.colors.primary;
      case 'message':
        return theme.colors.info || '#3B82F6';
      case 'review':
        return '#F59E0B';
      case 'payment':
        return theme.colors.success || '#10B981';
      case 'system':
        return theme.colors.textMuted;
      default:
        return theme.colors.primary;
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const toggleExpand = (notificationId: string) => {
    setExpandedNotifications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
        logger.userAction('notification_read', {
          notificationId: notification.id,
          type: notification.type,
        });
      } catch (error) {
        logger.error('Failed to mark notification as read', error);
      }
    }

    // Navigate based on notification type and data
    const professionalId = notification.data?.professional_id;
    if (professionalId) {
      try {
        router.push(`/professional/${professionalId}` as any);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    } else if (notification.data?.action_url) {
      try {
        router.push(notification.data.action_url as any);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success({
        title: 'All Read',
        message: 'All notifications marked as read',
      });
      logger.userAction('notifications_mark_all_read');
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      toast.error({
        title: 'Error',
        message: 'Failed to mark all notifications as read',
      });
    }
  };

  const isLongText = (text: string) => {
    return text.length > 100;
  };

  const renderNotificationItem = ({
    item,
  }: {
    item: NotificationWithProfessional;
  }) => {
    const isExpanded = expandedNotifications.has(item.id);
    const messageIsLong = isLongText(item.message);
    const shouldShowExpand = messageIsLong && !isExpanded;
    const professional = item.professional;
    const professionalAvatar = professional?.avatar_url;

    return (
      <Card
        style={[
          styles.notificationCard,
          { backgroundColor: theme.colors.card },
        ]}
      >
        <View style={styles.notificationItem}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: getNotificationColor(item.type) + '20' },
            ]}
          >
            {getNotificationIcon(item.type)}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {item.title}
              </Text>
              {!item.is_read && (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
            </View>

            <Text
              style={[styles.message, { color: theme.colors.textMuted }]}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {item.message}
            </Text>

            {shouldShowExpand && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                style={styles.viewAllButton}
              >
                <Text
                  style={[styles.viewAllText, { color: theme.colors.primary }]}
                >
                  View all
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
              {formatTimestamp(item.created_at)}
            </Text>
          </View>

          {/* Professional Avatar (if applicable) */}
          {professional && (
            <>
              {(() => {
                const hasValidAvatar =
                  professionalAvatar &&
                  typeof professionalAvatar === 'string' &&
                  professionalAvatar.trim() !== '' &&
                  !professionalAvatar.includes('placeholder') &&
                  !professionalAvatar.includes('via.placeholder');

                return hasValidAvatar ? (
                  <Image
                    source={{ uri: professionalAvatar }}
                    style={styles.avatar}
                    onError={() => {
                      logger.warn('Failed to load professional avatar', {
                        professionalId: professional.id,
                      });
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarInitials,
                      { backgroundColor: getAvatarColor(professional.name) },
                    ]}
                  >
                    <Text style={styles.avatarInitialsText}>
                      {getInitials(professional.name)}
                    </Text>
                  </View>
                );
              })()}
            </>
          )}
        </View>
      </Card>
    );
  };

  const filters = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
  ];

  const handleBackPress = () => {
    logger.info('[Notifications] ⬅️ Back button pressed, navigating to home', {
      timestamp: new Date().toISOString(),
    });
    // Always navigate to home instead of going back (to avoid callback page)
    router.replace('/(tabs)/');
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack onBackPress={handleBackPress} />
        <PageLoading message="Loading notifications..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack onBackPress={handleBackPress} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Failed to load notifications
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        onBackPress={handleBackPress}
        showLogo
        showBack
        rightButton={
          unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              style={[
                styles.markAllButton,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? theme.colors.surface
                      : theme.name === 'light'
                      ? theme.colors.brandPink
                      : '#000000',
                  opacity: markAllAsReadMutation.isPending ? 0.6 : 1,
                },
              ]}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={[styles.markAllText, { color: '#FFFFFF' }]}>
                Read All
              </Text>
            </TouchableOpacity>
          )
        }
      />

      <TabButtons
        options={filters}
        selectedKey={selectedFilter}
        onSelect={(key) => setSelectedFilter(key as any)}
      />

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {selectedFilter === 'unread'
                ? 'No Unread Notifications'
                : 'No Notifications'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              {selectedFilter === 'unread'
                ? "You're all caught up!"
                : 'Your notifications will appear here'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  listContent: {
    padding: 24,
  },
  notificationCard: {
    marginBottom: 12,
    padding: 0,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 4,
  },
  viewAllButton: {
    marginTop: 4,
    marginBottom: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
