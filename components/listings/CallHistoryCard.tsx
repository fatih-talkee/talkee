import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Phone,
  Video,
  Clock,
  DollarSign,
  UserX,
  UserCheck,
  ShieldCheck,
  Heart,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsFavorite } from '@/hooks/useFavorites';
import type { CallWithRelations } from '@/types/database.types';

interface CallHistoryCardProps {
  call: CallWithRelations;
  isBlocked: boolean;
  onToggleBlock: (userId: string, isBlocked: boolean) => void;
}

export function CallHistoryCard({
  call,
  isBlocked,
  onToggleBlock,
}: CallHistoryCardProps) {
  const { theme } = useTheme();

  // Get professional data
  const professional = call.professional;
  if (!professional || !professional.users) {
    return null;
  }

  const userName = professional.users.name || 'Unknown';
  const userAvatar =
    professional.users.avatar_url || 'https://via.placeholder.com/150';
  const isVerified = professional.users.is_verified || false;

  // Check if favorited
  const { data: isFavorite = false } = useIsFavorite(professional.id);

  // Calculate online status
  const isOnline = professional.is_active && professional.is_available;

  // Get category data
  const categoryName = professional.categories?.name || 'Professional';

  // Determine call direction (outgoing for caller)
  const direction: 'incoming' | 'outgoing' = 'outgoing';

  // Format date with time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateStr = '';
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateStr = 'Yesterday';
    } else {
      dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return { dateStr, timeStr };
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get status text and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          text: 'Completed',
          color: theme.colors.success,
          bgColor: theme.colors.success + '20',
        };
      case 'missed':
        return {
          text: 'Missed',
          color: theme.colors.error,
          bgColor: theme.colors.error + '20',
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          color: theme.colors.textMuted,
          bgColor: theme.colors.textMuted + '20',
        };
      default:
        return {
          text: status,
          color: theme.colors.textMuted,
          bgColor: theme.colors.textMuted + '20',
        };
    }
  };

  const handlePress = () => {
    router.push(`/professional/${professional.id}`);
  };

  const handleBlockPress = (event: any) => {
    event.stopPropagation();
    if (professional.users) {
      onToggleBlock(professional.users.id, !isBlocked);
    }
  };

  const callDate = call.start_time || call.created_at;
  const { dateStr, timeStr } = formatDateTime(callDate);
  const callType = call.call_type;
  const callStatus = call.status;
  const statusInfo = getStatusInfo(callStatus);

  // Call type colors
  const callTypeColors = {
    video: {
      bg: '#6366F1', // Indigo
      text: '#FFFFFF',
    },
    voice: {
      bg: '#10B981', // Green
      text: '#FFFFFF',
    },
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={styles.container}
    >
      <View
        style={[
          styles.card,
          Platform.OS === 'web'
            ? styles.cardShadowWeb
            : styles.cardShadowNative,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.text,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
            {/* Favorite indicator (top-left) */}
            {isFavorite && (
              <View
                style={[
                  styles.favoriteIndicator,
                  {
                    backgroundColor: theme.colors.error,
                  },
                ]}
              >
                <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            )}
            {/* Blocked indicator (top-left, if not favorite) */}
            {!isFavorite && isBlocked && (
              <View
                style={[
                  styles.blockedIndicator,
                  {
                    backgroundColor: theme.colors.error,
                  },
                ]}
              >
                <UserX size={10} color="#FFFFFF" />
              </View>
            )}
            {/* Online indicator (bottom-right) */}
            <View
              style={[
                styles.onlineIndicator,
                {
                  backgroundColor: isOnline
                    ? theme.colors.success
                    : theme.colors.error,
                },
              ]}
            />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  {
                    color: theme.colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {userName}
              </Text>
              {isVerified && (
                <ShieldCheck
                  size={20}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              )}
              {/* Voice/Video badge */}
              <View
                style={[
                  styles.callTypeBadge,
                  {
                    backgroundColor: callTypeColors[callType].bg,
                  },
                ]}
              >
                {callType === 'video' ? (
                  <Video size={12} color={callTypeColors[callType].text} />
                ) : (
                  <Phone size={12} color={callTypeColors[callType].text} />
                )}
                <Text
                  style={[
                    styles.callTypeText,
                    {
                      color: callTypeColors[callType].text,
                    },
                  ]}
                >
                  {callType === 'video' ? 'Video' : 'Voice'}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {categoryName}
            </Text>
            {/* Call info row - date, time, direction, status */}
            <View style={styles.callInfoRow}>
              <View style={styles.callInfoItem}>
                <Clock size={12} color={theme.colors.textMuted} />
                <Text
                  style={[
                    styles.callInfoText,
                    {
                      color: theme.colors.textMuted,
                    },
                  ]}
                >
                  {dateStr} {timeStr}
                </Text>
              </View>
              {/* Direction badge (incoming/outgoing) */}
              <View
                style={[
                  styles.directionBadge,
                  {
                    backgroundColor:
                      direction === 'incoming'
                        ? theme.colors.success + '20'
                        : theme.colors.primary + '20',
                    borderColor:
                      direction === 'incoming'
                        ? theme.colors.success
                        : theme.colors.primary,
                  },
                ]}
              >
                {direction === 'incoming' ? (
                  <ArrowDown size={10} color={theme.colors.success} />
                ) : (
                  <ArrowUp size={10} color={theme.colors.primary} />
                )}
                <Text
                  style={[
                    styles.directionText,
                    {
                      color:
                        direction === 'incoming'
                          ? theme.colors.success
                          : theme.colors.primary,
                    },
                  ]}
                >
                  {direction === 'incoming' ? 'Received' : 'Placed'}
                </Text>
              </View>
              {/* Status badge with border */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusInfo.bgColor,
                    borderColor: statusInfo.color,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: statusInfo.color,
                    },
                  ]}
                >
                  {statusInfo.text}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.callStatsSection}>
            {/* Completed calls: show cost and duration prominently */}
            {callStatus === 'completed' && (
              <>
                {call.duration_minutes != null &&
                  call.duration_minutes >= 0 && (
                    <View
                      style={[
                        styles.statBadge,
                        {
                          backgroundColor: theme.colors.textMuted + '15',
                          borderColor: theme.colors.textMuted,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Clock size={14} color={theme.colors.textMuted} />
                      <Text
                        style={[
                          styles.statText,
                          {
                            color: theme.colors.textMuted,
                          },
                        ]}
                      >
                        {formatDuration(call.duration_minutes)}
                      </Text>
                    </View>
                  )}
                {call.total_cost != null && call.total_cost >= 0 && (
                  <View
                    style={[
                      styles.statBadge,
                      {
                        backgroundColor: theme.colors.primary + '15',
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <DollarSign size={14} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.statText,
                        {
                          color: theme.colors.primary,
                        },
                      ]}
                    >
                      ${call.total_cost.toFixed(2)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.blockButton,
              {
                backgroundColor: isBlocked
                  ? theme.name === 'light'
                    ? theme.colors.success + '15'
                    : theme.colors.success + '20'
                  : theme.name === 'light'
                  ? theme.colors.error + '15'
                  : theme.colors.error + '20',
                borderColor: isBlocked
                  ? theme.colors.success
                  : theme.colors.error,
                borderWidth: 1,
              },
            ]}
            onPress={handleBlockPress}
          >
            {isBlocked ? (
              <UserCheck size={14} color={theme.colors.success} />
            ) : (
              <UserX size={14} color={theme.colors.error} />
            )}
            <Text
              style={[
                styles.blockButtonText,
                {
                  color: isBlocked ? theme.colors.success : theme.colors.error,
                },
              ]}
            >
              {isBlocked ? 'Unblock' : 'Block'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardShadowNative: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cardShadowWeb: {
    boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  favoriteIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  blockedIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    flex: 1,
    minWidth: 100,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  callTypeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  callInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  callInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callInfoText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  directionText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  durationText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callStatsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  blockButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
