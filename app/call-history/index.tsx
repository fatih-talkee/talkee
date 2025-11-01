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
import {
  ArrowLeft,
  Search,
  Phone,
  Video,
  Clock,
  DollarSign,
  UserX,
  UserCheck,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { mockCallHistory, CallHistory } from '@/mockData/professionals';
import { useToast } from '@/lib/toastService';

export default function CallHistoryScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'completed' | 'missed'
  >('all');
  const [callHistory, setCallHistory] = useState(mockCallHistory);

  const filteredHistory = callHistory.filter((call) => {
    const matchesSearch = call.professional.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === 'all' || call.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const filters = [
    { key: 'all', label: 'All Calls', count: callHistory.length },
    {
      key: 'completed',
      label: 'Completed',
      count: callHistory.filter((c) => c.status === 'completed').length,
    },
    {
      key: 'missed',
      label: 'Missed',
      count: callHistory.filter((c) => c.status === 'missed').length,
    },
  ];

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

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0 min';
    return `${minutes} min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'missed':
        return theme.colors.error;
      case 'cancelled':
        return theme.colors.textMuted;
      default:
        return theme.colors.textMuted;
    }
  };

  const toggleBlockUser = (callId: string) => {
    setCallHistory((prev) =>
      prev.map((call) => {
        if (call.id === callId) {
          const newBlockedStatus = !call.isBlocked;
          toast.success({
            title: newBlockedStatus ? 'User Blocked' : 'User Unblocked',
            message: newBlockedStatus 
              ? 'This user can no longer contact you' 
              : 'This user can now contact you',
          });
          return { ...call, isBlocked: newBlockedStatus };
        }
        return call;
      })
    );
  };

  const renderCallItem = ({ item }: { item: CallHistory }) => (
    <Card
      style={[
        styles.callCard,
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
          style={styles.callItem}
          onPress={() => router.push(`/professional/${item.professionalId}`)}
        activeOpacity={0.7}
      >
        {/* Top Row: Avatar, Name with Verification, and Block Button */}
        <View style={styles.topRow}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: item.professional.avatar }}
              style={styles.avatar}
            />
            <View
              style={[
                styles.callTypeIcon,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              {item.type === 'video' ? (
                <Video size={12} color="#ffffff" />
              ) : (
                <Phone size={12} color="#ffffff" />
              )}
            </View>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.professionalName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.professional.name}
              </Text>
              {item.professional.isVerified && (
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
              styles.blockButton,
              {
                backgroundColor:
                  theme.name === 'dark' ? '#000000' : theme.colors.surface,
                borderWidth: 1,
                borderColor: item.isBlocked
                  ? theme.colors.success
                  : theme.colors.error,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              toggleBlockUser(item.id);
            }}
          >
            {item.isBlocked ? (
              <>
                <UserCheck
                  size={14}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.blockButtonText,
                    {
                      color: theme.colors.success,
                    },
                  ]}
                >
                  Unblock
                </Text>
              </>
            ) : (
              <>
                <UserX
                  size={14}
                  color={theme.colors.error}
                />
                <Text
                  style={[
                    styles.blockButtonText,
                    {
                      color: theme.colors.error,
                    },
                  ]}
                >
                  Block
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Second Row: Title */}
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.professionalTitle,
              { color: theme.colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {item.professional.title}
          </Text>
        </View>

        {/* Third Row: Date, Time, and Direction */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={14} color={theme.colors.textMuted} />
            <Text style={[styles.metaText, { color: theme.colors.text }]}>
              {formatDate(item.date)}
            </Text>
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.textMuted, marginLeft: 4 },
              ]}
            >
              {formatTime(item.date)}
            </Text>
            </View>
            {item.direction && (
            <View style={styles.metaItem}>
                {item.direction === 'incoming' ? (
                <ArrowDown size={14} color={theme.colors.success} />
                ) : (
                <ArrowUp size={14} color={theme.colors.primary} />
                )}
              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      item.direction === 'incoming'
                        ? theme.colors.success
                        : theme.colors.primary,
                  },
                ]}
              >
                  {item.direction === 'incoming' ? 'Received' : 'Placed'}
                </Text>
              </View>
            )}
          </View>

        {/* Bottom Row: Stats */}
        <View style={styles.statsRow}>
          {item.duration > 0 && (
            <View style={styles.statBadge}>
              <Clock size={12} color={theme.colors.textMuted} />
              <Text
                style={[styles.statText, { color: theme.colors.textMuted }]}
              >
                {formatDuration(item.duration)}
              </Text>
              </View>
          )}
              {item.status === 'completed' && item.cost > 0 && (
            <View
              style={[
                styles.statBadge,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <DollarSign size={12} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.text }]}>
                {'$' + item.cost.toFixed(2)}
              </Text>
                </View>
              )}
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          {item.isBlocked && (
            <View
              style={[
                styles.blockedBadge,
                { backgroundColor: theme.colors.error },
              ]}
            >
              <Text style={styles.blockedBadgeText}>Blocked</Text>
            </View>
          )}
        </View>
        </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search call history..."
        showTabButtons={true}
        tabOptions={filters}
        selectedTabKey={selectedFilter}
        onTabSelect={(key) => setSelectedFilter(key as any)}
      />

      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No call history
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Your call history will appear here once you start connecting with
              professionals
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
    backgroundColor: '#f8fafc',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 24,
  },
  callCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  callItem: {
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
  callTypeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
  professionalName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
  },
  blockButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  titleRow: {
    marginBottom: 8,
  },
  professionalTitle: {
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
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  blockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blockedBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
