import React, { useState, useEffect } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
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
  const { user: currentUser, isLoading: isProfileLoading } = useProfile();
  const [avatarError, setAvatarError] = useState(false);

  // Get professional and caller data first
  const professional = call.professional;
  const caller = call.caller;

  // ✅ CRITICAL FIX: Calculate professionalId for useIsFavorite hook
  // This must be calculated BEFORE the hook is called, and must always return a string
  // Use call.professional?.id directly to ensure consistency
  const professionalIdForFavorite = professional?.id || '';

  // ✅ CRITICAL FIX: All hooks must be called before any early returns
  // Check if favorited (only for professional, not caller)
  // Must be called before early return to maintain hooks order
  // Always pass a string (empty string if no professional) to ensure hook is always called
  const { data: isFavorite = false } = useIsFavorite(professionalIdForFavorite);

  // Reset avatar error when avatar URL changes
  // Must be called before early return to maintain hooks order
  // Dependencies: currentUser?.id (determines which avatar to show) and call data
  useEffect(() => {
    setAvatarError(false);
  }, [
    currentUser?.id,
    call.caller_id,
    call.professional?.users?.avatar_url,
    call.caller?.avatar_url,
  ]);

  // ✅ FIX: Don't render until currentUser is loaded to prevent showing wrong avatar
  if (isProfileLoading || !currentUser) {
    return null; // Or show a loading skeleton
  }

  // ✅ FIX: Determine if currentUser is caller or professional (callee)
  // Calculate displayProfessional AFTER early return check
  let displayProfessional: any = null;

  // ✅ FIX: Determine if currentUser is caller or professional (callee)
  const isCaller = currentUser.id === call.caller_id;
  const isProfessional = currentUser.id === professional?.user_id;

  // ✅ FIX: Determine call direction and which user to display
  // If currentUser is caller: show professional info, direction = 'outgoing', expense
  // If currentUser is professional: show caller info, direction = 'incoming', earning
  const direction: 'incoming' | 'outgoing' = isCaller ? 'outgoing' : 'incoming';

  let displayUser: any = null;

  if (isCaller) {
    // CurrentUser is caller: show professional info
    displayUser = professional?.users;
    displayProfessional = professional;
  } else if (isProfessional) {
    // CurrentUser is professional: show caller info
    displayUser = caller;
    displayProfessional = professional; // Still show professional for category, etc.
  } else {
    // Fallback: show professional info (old behavior)
    displayUser = professional?.users;
    displayProfessional = professional;
  }

  if (!displayUser || !displayProfessional) {
    return null;
  }

  const userName = displayUser.name || 'Unknown';
  const userAvatar = displayUser.avatar_url || '';
  const isVerified = displayUser.is_verified || false;

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
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#f97316', // Orange
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Calculate online status (only for professional)
  const isOnline =
    displayProfessional?.is_active && displayProfessional?.is_available;

  // Get category data
  const categoryName = displayProfessional.categories?.name || 'Professional';

  // ✅ FIX: Calculate expense/earning based on user role
  // Caller pays full cost, professional earns 80% (20% platform fee)
  // Convert total_cost to number (it might come as string from database)
  const fullCost = Number(call.total_cost) || 0;
  const professionalEarning = fullCost * 0.8; // 80% to professional
  const displayAmount = isCaller ? fullCost : professionalEarning; // Expense for caller, earning for professional
  const isExpense = isCaller; // True for caller (expense), false for professional (earning)

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

  // Format duration.
  // ✅ FIX: Prefer duration_minutes from database (set by Twilio webhook or fallback calculation)
  // Fallback to start_time/end_time calculation if duration_minutes is not available
  // For missed calls or calls that never connected, start_time will be null - don't show duration
  const formatDuration = () => {
    // ✅ Priority 1: Use duration_minutes from database (most accurate, set by Twilio webhook)
    if (call.duration_minutes && call.duration_minutes > 0) {
      const minutes = call.duration_minutes;
      if (minutes < 60) return `${minutes} min`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    // ✅ Priority 2: Calculate from start_time and end_time (fallback)
    // start_time is only set when call connects, not when caller initiates
    if (!call.start_time || !call.end_time) {
      return null; // Call never connected, no duration to show
    }

    const start = new Date(call.start_time).getTime();
    const end = new Date(call.end_time).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null; // Invalid timestamps
    }

    const seconds = Math.max(0, Math.floor((end - start) / 1000));
    if (seconds < 60) return `${seconds} sec`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get status text and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pending',
          color: theme.colors.warning,
          bgColor: theme.colors.warning + '20',
        };
      case 'active':
        return {
          text: 'In progress',
          color: theme.colors.primary,
          bgColor: theme.colors.primary + '20',
        };
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
    // ✅ FIX: Navigate to the OTHER party's profile
    // If currentUser is caller: navigate to professional
    // If currentUser is professional: navigate to caller (if they are also a professional)
    if (isCaller && displayProfessional?.id) {
      // CurrentUser is caller: navigate to professional
      try {
        router.push(`/professional/${displayProfessional.id}`);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    } else if (isProfessional && displayProfessional?.id) {
      // CurrentUser is professional: navigate to professional (for now, same as caller case)
      // TODO: If caller is also a professional, navigate to their profile
      try {
        router.push(`/professional/${displayProfessional.id}`);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  const handleBlockPress = (event: any) => {
    event.stopPropagation();
    // ✅ FIX: Block the OTHER party (displayUser)
    if (displayUser?.id) {
      onToggleBlock(displayUser.id, !isBlocked);
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
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {(() => {
              const hasValidAvatar =
                userAvatar &&
                typeof userAvatar === 'string' &&
                userAvatar.trim() !== '' &&
                !userAvatar.includes('placeholder') &&
                !userAvatar.includes('via.placeholder') &&
                !avatarError;

              return hasValidAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
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
                    { backgroundColor: getAvatarColor(userName) },
                  ]}
                >
                  <Text style={styles.avatarInitialsText}>
                    {getInitials(userName)}
                  </Text>
                </View>
              );
            })()}
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
            {/* ✅ FIX: Show duration only for completed calls that actually connected (have start_time) */}
            {callStatus === 'completed' && formatDuration() && (
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
                  {formatDuration()}
                </Text>
              </View>
            )}
            {/* ✅ FIX: Show cost for completed calls (even if 0, to show it was free) */}
            {callStatus === 'completed' && (
              <View
                style={[
                  styles.statBadge,
                  {
                    backgroundColor:
                      (isExpense ? theme.colors.error : theme.colors.success) +
                      '15',
                    borderColor: isExpense
                      ? theme.colors.error
                      : theme.colors.success,
                    borderWidth: 1,
                  },
                ]}
              >
                {isExpense ? (
                  <ArrowDown size={14} color={theme.colors.error} />
                ) : (
                  <ArrowUp size={14} color={theme.colors.success} />
                )}
                <Text
                  style={[
                    styles.statText,
                    {
                      color: isExpense
                        ? theme.colors.error
                        : theme.colors.success,
                    },
                  ]}
                >
                  {isExpense ? '-' : '+'}${displayAmount.toFixed(2)}
                </Text>
              </View>
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
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
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
