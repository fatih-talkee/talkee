import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { UserX, UserCheck } from 'lucide-react-native';
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
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
    setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
    toast.success({
      title: 'User Unblocked',
      message: 'This user can now contact you',
    });
  };

  const renderBlockedUserItem = ({ item }: { item: BlockedUser }) => (
    <Card style={[styles.userCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.userContainer}>
        <TouchableOpacity 
          style={styles.userItem}
          onPress={() => router.push(`/professional/${item.userId}`)}
        >
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{item.user.name}</Text>
            <Text style={[styles.userTitle, { color: theme.colors.textMuted }]}>{item.user.title}</Text>
            
            {item.lastCallDate && (
              <View style={styles.callInfo}>
                <Text style={[styles.callLabel, { color: theme.colors.textMuted }]}>Last call:</Text>
                <Text style={[styles.callValue, { color: theme.colors.text }]}>
                  {formatDate(item.lastCallDate)} at {formatTime(item.lastCallDate)}
                </Text>
              </View>
            )}
            
            {item.lastCallDuration && (
              <Text style={[styles.durationText, { color: theme.colors.textMuted }]}>
                Call length: {formatDuration(item.lastCallDuration)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.unblockButton, { backgroundColor: theme.colors.success }]}
          onPress={() => handleUnblock(item.userId)}
        >
          <UserCheck size={16} color="#ffffff" />
          <Text style={styles.unblockButtonText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo showBack backPosition="right" />

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <UserX size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Blocked Users</Text>
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
  },
  userContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  userTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  callLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginRight: 4,
  },
  callValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  unblockButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 4,
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

