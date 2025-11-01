import React, { useState } from 'react';
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
import { UserX, UserCheck, ShieldCheck, Clock } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { mockBlockedUsers, BlockedUser } from '@/mockData/professionals';
import { useToast } from '@/lib/toastService';

export default function BlockedUsersScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [blockedUsers, setBlockedUsers] = useState(mockBlockedUsers);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
      return `${secs}sec`;
    }
    if (secs === 0) {
      return `${mins}min`;
    }
    return `${mins}min ${secs}sec`;
  };

  const handleUnblock = (userId: string) => {
    setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
    toast.success({
      title: 'User Unblocked',
      message: 'This user can now contact you',
    });
  };

  const renderBlockedUserItem = ({ item }: { item: BlockedUser }) => (
    <Card
      style={[
        styles.userCard,
        {
          backgroundColor:
            theme.name === 'dark' ? '#000000' : theme.colors.card,
          borderColor:
            theme.name === 'dark'
              ? 'rgba(255, 255, 255, 0.3)'
              : theme.colors.border,
          borderWidth: 1.5,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => router.push(`/professional/${item.userId}`)}
        activeOpacity={0.7}
      >
        {/* Top Row: Avatar, Name with Verification, and Unblock Button */}
        <View style={styles.topRow}>
          <View style={styles.headerLeft}>
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.userName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.user.name}
              </Text>
              {item.user.isVerified && (
                <ShieldCheck
                  size={18}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.unblockButton,
              {
                backgroundColor:
                  theme.name === 'dark' ? '#000000' : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.success,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleUnblock(item.userId);
            }}
          >
            <UserCheck size={14} color={theme.colors.success} />
            <Text
              style={[
                styles.unblockButtonText,
                {
                  color: theme.colors.success,
                },
              ]}
            >
              Unblock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Second Row: Title */}
        <View style={styles.titleRow}>
          <Text
            style={[styles.userTitle, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {item.user.title}
          </Text>
        </View>

        {/* Third Row: Last Call Date and Time */}
        {item.lastCallDate && (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={14} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.text }]}>
                Last call: {formatDate(item.lastCallDate)}
              </Text>
              <Text
                style={[
                  styles.metaText,
                  { color: theme.colors.textMuted, marginLeft: 4 },
                ]}
              >
                {formatTime(item.lastCallDate)}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Row: Call Duration */}
        {item.lastCallDuration && (
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Clock size={12} color={theme.colors.textMuted} />
              <Text
                style={[styles.statText, { color: theme.colors.textMuted }]}
              >
                Duration: {formatDuration(item.lastCallDuration)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <UserX size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Blocked Users
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Users you block will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  userCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  userItem: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
  },
  unblockButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  titleRow: {
    marginBottom: 8,
  },
  userTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
  },
});
