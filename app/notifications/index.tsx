import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Phone, MessageSquare, Calendar, CreditCard, Gift, Settings, Check } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { mockNotifications, Notification } from '@/mockData/professionals';
import { useToast } from '@/lib/toastService';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread'>('all');
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const filteredNotifications = notifications.filter(notification => {
    return selectedFilter === 'all' || !notification.isRead;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
      case 'call':
        return <Phone size={iconSize} color={iconColor} />;
      case 'message':
        return <MessageSquare size={iconSize} color={iconColor} />;
      case 'appointment':
        return <Calendar size={iconSize} color={iconColor} />;
      case 'payment':
        return <CreditCard size={iconSize} color={iconColor} />;
      case 'promotion':
        return <Gift size={iconSize} color={iconColor} />;
      case 'system':
        return <Settings size={iconSize} color={iconColor} />;
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'call':
        return theme.colors.primary;
      case 'message':
        return theme.colors.info;
      case 'appointment':
        return theme.colors.accent;
      case 'payment':
        return theme.colors.success;
      case 'promotion':
        return '#FF6B35';
      case 'system':
        return theme.colors.textMuted;
      default:
        return theme.colors.primary;
    }
  };

  const toggleExpand = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );

    // Navigate based on action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success({
      title: 'All Read',
      message: 'All notifications marked as read',
    });
  };

  const isLongText = (text: string) => {
    return text.length > 100; // Adjust threshold as needed
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isExpanded = expandedNotifications.has(item.id);
    const messageIsLong = isLongText(item.message);
    const shouldShowExpand = messageIsLong && !isExpanded;
    
    return (
      <Card style={[styles.notificationCard, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={styles.notificationItem}
          onPress={() => handleNotificationPress(item)}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
            {getNotificationIcon(item.type)}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
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
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                  View all
                </Text>
              </TouchableOpacity>
            )}
            
            <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>

          {/* Professional Avatar (if applicable) */}
          {item.professional && (
            <Image 
              source={{ uri: item.professional.avatar }} 
              style={styles.avatar} 
            />
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  const filters = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        showLogo 
        showBack 
        backRoute="/(tabs)"
        backPosition="right"
        rightButton={
          unreadCount > 0 && (
            <TouchableOpacity 
              onPress={handleMarkAllAsRead}
              style={styles.markAllButton}
            >
              <Check size={20} color={theme.colors.primary} />
              <Text style={[styles.markAllText, { color: theme.colors.primary }]}>
                Read All
              </Text>
            </TouchableOpacity>
          )
        }
      />

      <View style={[styles.filterSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.tabBarBorder }]}>
        <View style={styles.filters}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                selectedFilter === filter.key && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterText,
                { color: theme.colors.textSecondary },
                selectedFilter === filter.key && { color: '#000000' }
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {selectedFilter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              {selectedFilter === 'unread' 
                ? 'You\'re all caught up!'
                : 'Your notifications will appear here'
              }
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
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  filterSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
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

