import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { logger } from '@/lib/logger';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Clock,
  Phone,
  Video,
  Heart,
  Share2,
  Calendar,
  MessageCircle,
  DollarSign,
  Zap,
  Briefcase,
  GraduationCap,
  Award,
  Pin,
  AlertCircle,
  Wallet,
  QrCode,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { TabButtons } from '@/components/ui/TabButtons';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { ShareProfileModal } from '@/components/profile/ShareProfileModal';
import { QRCodeScanner } from '@/components/qr/QRCodeScanner';
import { PageLoading } from '@/components/ui/PageLoading';
import { SectionLoading } from '@/components/ui/SectionLoading';
import { useIsOnline } from '@/hooks/useNetworkStatus';

// ✅ API HOOKS
import { useProfessional } from '@/hooks/useProfessionals';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useFavorites';
import { useProfessionalFeeds } from '@/hooks/useProfessionalFeeds';
import { professionalsService } from '@/services/supabase/professionals.service';
import { usersService } from '@/services/supabase/user.service';
import { useQuery } from '@tanstack/react-query';
import type { Availability } from '@/types/database.types';
import { useWalletBalance } from '@/hooks/useUser';
import { useProfile } from '@/hooks/useProfile';

// ✅ TYPE ADAPTERS (not needed here, we use ProfessionalWithRelations directly)
import {
  ProfessionalWithRelations,
  getDegreeLevelLabel,
} from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';

type TabType = 'feed' | 'about' | 'availability' | 'cv';

export default function ProfessionalProfileScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const isNetworkOnline = useIsOnline();
  const insets = useSafeAreaInsets();
  const { makeCall, callState } = useTwilioVoice(); // ✅ EKLE
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [insufficientBalanceModalVisible, setInsufficientBalanceModalVisible] =
    useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('about'); // Start with 'about' since feed is not implemented yet

  // ✅ Fetch wallet balance
  const { data: walletBalance = 0 } = useWalletBalance();

  // ✅ Get current user profile
  const { user: currentUser } = useProfile();

  // ✅ Fetch professional data
  const {
    data: professionalData,
    isLoading,
    error,
  } = useProfessional(id as string);

  // ✅ Fetch feeds (includes total_count, no need for separate feed count query)
  const { data: feedsResponse, isLoading: feedsLoading } = useProfessionalFeeds(
    id as string,
    20
  );
  const feedsData = feedsResponse?.feeds || [];
  const feedCountData = feedsResponse?.total_count || 0;

  // ✅ Get availabilities from professional data (optimized - included in getProfessional)
  // Fallback to separate query if not included in professional data
  const availabilitiesFromProfessional = professionalData?.availabilities;
  const { data: availabilitiesFromQuery = [] } = useQuery<Availability[]>({
    queryKey: ['professionals', id, 'availabilities'],
    queryFn: () =>
      professionalsService.getProfessionalAvailabilities(id as string),
    enabled: !!id && !availabilitiesFromProfessional, // Only fetch if not in professional data
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const availabilitiesData = availabilitiesFromProfessional || availabilitiesFromQuery;

  // ✅ Check if professional has blocked current user
  const professionalUserId = professionalData?.user_id;
  const { data: isBlockedByProfessional = false } = useQuery<boolean>({
    queryKey: ['isBlockedByUser', professionalUserId],
    queryFn: () => {
      if (!professionalUserId) return false;
      return usersService.isBlockedByUser(professionalUserId);
    },
    enabled: !!professionalUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Group availabilities by type and days (moved outside renderTabContent to fix hooks order)
  const groupedAvailabilities = useMemo(() => {
    const groups: {
      [key: string]: Availability[];
    } = {};

    availabilitiesData.forEach((avail) => {
      if (avail.available_at === 'every' && avail.days) {
        // Group by days and time
        const daysKey = [...avail.days].sort().join(',');
        const timeKey = `${avail.start_hour}-${avail.end_hour}`;
        const priceKey = avail.price_per_minute.toString();
        const groupKey = `${daysKey}|${timeKey}|${priceKey}`;

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(avail);
      } else if (avail.available_at === 'specific') {
        // Specific dates as individual groups
        const groupKey = `specific-${avail.id}`;
        groups[groupKey] = [avail];
      }
    });

    return Object.values(groups);
  }, [availabilitiesData]);

  // ✅ Check if favorited
  const { data: isFavorite = false } = useIsFavorite(id as string);

  // Check for currently active availability
  const currentAvailability = useMemo(() => {
    if (availabilitiesData.length === 0) return null;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    // Helper function to compare times (HH:MM format)
    const compareTimes = (time1: string, time2: string): number => {
      const [h1, m1] = time1.split(':').map(Number);
      const [h2, m2] = time2.split(':').map(Number);
      const minutes1 = h1 * 60 + m1;
      const minutes2 = h2 * 60 + m2;
      return minutes1 - minutes2;
    };

    for (const avail of availabilitiesData) {
      if (avail.available_at === 'urgent') {
        // Urgent call is always available when professional is online
        // No time restrictions, just check if professional is online
        // We'll check is_available in the component level
        // Return with null remainingMinutes (always available)
        return {
          availability: avail,
          remainingMinutes: null, // Always available, no time limit
          isActive: true,
        };
      } else if (
        avail.available_at === 'every' &&
        avail.days &&
        avail.days.length > 0 &&
        avail.start_hour &&
        avail.end_hour
      ) {
        // Check if current day is in the days array
        const dayMatch = avail.days.some(
          (day) => day.toLowerCase() === currentDay.toLowerCase()
        );

        if (dayMatch) {
          // Check if current time is within the availability window
          const timeComparisonStart = compareTimes(
            currentTime,
            avail.start_hour
          );
          const timeComparisonEnd = compareTimes(currentTime, avail.end_hour);

          if (timeComparisonStart >= 0 && timeComparisonEnd < 0) {
            // Calculate remaining minutes
            const [endHour, endMin] = avail.end_hour.split(':').map(Number);
            const [currentHour, currentMin] = currentTime
              .split(':')
              .map(Number);
            const endMinutes = endHour * 60 + endMin;
            const currentMinutes = currentHour * 60 + currentMin;
            const remainingMinutes = endMinutes - currentMinutes;

            return {
              availability: avail,
              remainingMinutes,
              isActive: true,
            };
          }
        }
      } else if (
        avail.available_at === 'specific' &&
        avail.date &&
        avail.start_hour &&
        avail.end_hour
      ) {
        if (avail.date === currentDate) {
          // Check if current time is within the availability window
          const timeComparisonStart = compareTimes(
            currentTime,
            avail.start_hour
          );
          const timeComparisonEnd = compareTimes(currentTime, avail.end_hour);

          if (timeComparisonStart >= 0 && timeComparisonEnd < 0) {
            // Calculate remaining minutes
            const [endHour, endMin] = avail.end_hour.split(':').map(Number);
            const [currentHour, currentMin] = currentTime
              .split(':')
              .map(Number);
            const endMinutes = endHour * 60 + endMin;
            const currentMinutes = currentHour * 60 + currentMin;
            const remainingMinutes = endMinutes - currentMinutes;

            return {
              availability: avail,
              remainingMinutes,
              isActive: true,
            };
          }
        }
      }
    }
    return null;
  }, [availabilitiesData]);

  const [remainingTime, setRemainingTime] = useState<number | null>(
    currentAvailability?.remainingMinutes || null
  );
  const [avatarError, setAvatarError] = useState(false);
  const [feedAvatarErrors, setFeedAvatarErrors] = useState<{
    [key: string]: boolean;
  }>({});

  // Update remaining time when currentAvailability changes
  useEffect(() => {
    if (currentAvailability) {
      setRemainingTime(currentAvailability.remainingMinutes);
    } else {
      setRemainingTime(null);
    }
  }, [currentAvailability]);

  // Update remaining time every minute (only for scheduled availabilities, not urgent)
  useEffect(() => {
    if (!currentAvailability) {
      setRemainingTime(null);
      return;
    }

    // Don't update time for urgent calls (always available)
    if (currentAvailability.availability.available_at === 'urgent') {
      setRemainingTime(null);
      return;
    }

    // Don't update if end_hour is null (shouldn't happen for scheduled, but safety check)
    if (!currentAvailability.availability.end_hour) {
      setRemainingTime(null);
      return;
    }

    const interval = setInterval(() => {
      if (
        currentAvailability &&
        currentAvailability.remainingMinutes !== null &&
        currentAvailability.availability.end_hour
      ) {
        const [endHour, endMin] = currentAvailability.availability.end_hour
          .split(':')
          .map(Number);
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        const [currentHour, currentMin] = currentTime.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;
        const currentMinutes = currentHour * 60 + currentMin;
        const remaining = endMinutes - currentMinutes;

        if (remaining > 0) {
          setRemainingTime(remaining);
        } else {
          setRemainingTime(null);
        }
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentAvailability]);

  // Helper function to format remaining time
  const formatRemainingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
    }
    return `${hours}h ${mins}m left`;
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

  // ✅ Use professional data directly (no need to adapt)
  // Must be defined before useEffect that uses it
  const professional = professionalData || null;

  // Reset avatar error when professional changes
  useEffect(() => {
    setAvatarError(false);
    setFeedAvatarErrors({});
  }, [professional?.users?.avatar_url]);

  // ✅ Toggle favorite mutation
  const toggleFavoriteMutation = useToggleFavorite();

  const handleToggleFavorite = async () => {
    try {
      await toggleFavoriteMutation.mutateAsync(id as string);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Calculate minimum required balance (5 minutes)
  const minimumRequiredBalance = useMemo(() => {
    if (!professional) return 0;
    if (currentAvailability) {
      return currentAvailability.availability.price_per_minute * 5;
    }
    // Fallback to professional's rate_per_minute
    return (professional.rate_per_minute || 0) * 5;
  }, [professional, currentAvailability]);

  // Check if user has sufficient balance
  const hasSufficientBalance = walletBalance >= minimumRequiredBalance;

  // ✅ Listen to call state changes to reset isCalling
  useEffect(() => {
    if (callState.status === 'connected' || callState.status === 'idle') {
      setIsCalling(false);
    }
  }, [callState.status]);

  const handleVoiceCall = async () => {
    // ✅ SECURITY: Check authentication FIRST before any other checks
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to make a call');
      return;
    }

    // Check balance before making call
    if (!hasSufficientBalance) {
      setInsufficientBalanceModalVisible(true);
      return;
    }

    try {
      setIsCalling(true); // ✅ Start calling state

      logger.info('[ProfessionalProfile] Initiating voice call', {
        professionalId: id,
        userId: currentUser.id,
      });

      const effectiveRatePerMinute = currentAvailability
        ? currentAvailability.availability.price_per_minute
        : professional?.rate_per_minute || 0;

      // ✅ Double-check user authentication (defense in depth)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setIsCalling(false); // ✅ Reset on error
        Alert.alert('Error', 'You must be logged in to make a call');
        return;
      }

      // ✅ Get user balance
      const userBalance = walletBalance; // Already loaded via useWalletBalance

      // ✅ Make call directly (Twilio native screen will open)
      await makeCall({
        professionalId: id as string,
        professionalUserId: professional?.user_id || '',
        type: 'voice',
        urgent: false,
        debugId: `voice-${Date.now()}`,
        ratePerMinute: Number(effectiveRatePerMinute),
        userBalance,
      });

      logger.info('[ProfessionalProfile] ✅ Voice call initiated successfully');
      // Note: isCalling will be reset by useEffect when callState changes
    } catch (error) {
      setIsCalling(false); // ✅ Reset on error
      logger.error('[ProfessionalProfile] Voice call error:', error);
      Alert.alert(
        'Call Failed',
        'Could not start the call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleVideoCall = async () => {
    // ✅ SECURITY: Check authentication FIRST before any other checks
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to make a call');
      return;
    }

    // Check balance before making call
    if (!hasSufficientBalance) {
      setInsufficientBalanceModalVisible(true);
      return;
    }

    try {
      setIsCalling(true); // ✅ Start calling state

      logger.info('[ProfessionalProfile] Initiating video call', {
        professionalId: id,
        userId: currentUser.id,
      });

      // ✅ Get video call rate if enabled, otherwise use voice rate
      const effectiveRatePerMinute = currentAvailability
        ? currentAvailability.availability.video_call_enabled &&
          currentAvailability.availability.video_call_rate_per_minute
          ? currentAvailability.availability.video_call_rate_per_minute
          : currentAvailability.availability.price_per_minute
        : professional?.rate_per_minute || 0;

      // ✅ Double-check user authentication (defense in depth)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setIsCalling(false); // ✅ Reset on error
        Alert.alert('Error', 'You must be logged in to make a call');
        return;
      }

      // ✅ Get user balance
      const userBalance = walletBalance; // Already loaded via useWalletBalance

      // ✅ Make call directly (Twilio native screen will open)
      await makeCall({
        professionalId: id as string,
        professionalUserId: professional?.user_id || '',
        type: 'video',
        urgent: false,
        debugId: `video-${Date.now()}`,
        ratePerMinute: Number(effectiveRatePerMinute),
        userBalance,
      });

      logger.info('[ProfessionalProfile] ✅ Video call initiated successfully');
      // Note: isCalling will be reset by useEffect when callState changes
    } catch (error) {
      setIsCalling(false); // ✅ Reset on error
      logger.error('[ProfessionalProfile] Video call error:', error);
      Alert.alert(
        'Call Failed',
        'Could not start the call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleUrgentCall = async () => {
    // ✅ SECURITY: Check authentication FIRST before any other checks
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to make a call');
      return;
    }

    // Check balance before making call
    if (!hasSufficientBalance) {
      setInsufficientBalanceModalVisible(true);
      return;
    }

    try {
      setIsCalling(true); // ✅ Start calling state

      logger.info('[ProfessionalProfile] Initiating urgent call', {
        professionalId: id,
        userId: currentUser.id,
      });

      // ✅ Get urgent call rate per minute
      // Priority: 1. Urgent availability price_per_minute, 2. Professional default rate_per_minute
      let effectiveRatePerMinute = 0;

      // First, try to find urgent availability
      const urgentAvail = availabilitiesData.find(
        (avail) => avail.available_at === 'urgent'
      );

      if (urgentAvail?.price_per_minute != null) {
        effectiveRatePerMinute = Number(urgentAvail.price_per_minute);
        logger.debug('[ProfessionalProfile] Using urgent availability rate', {
          professionalId: id,
          ratePerMinute: effectiveRatePerMinute,
          urgentAvailabilityId: urgentAvail.id,
        });
      } else if (professional?.rate_per_minute) {
        effectiveRatePerMinute = Number(professional.rate_per_minute) || 0;
        logger.debug('[ProfessionalProfile] Using professional default rate for urgent call', {
          professionalId: id,
          ratePerMinute: effectiveRatePerMinute,
          hasUrgentAvailability: !!urgentAvail,
        });
      }

      // Validate professional data before navigation
      if (!professional || !id) {
        setIsCalling(false); // ✅ Reset on error
        logger.error(
          '[ProfessionalProfile] Missing professional data for urgent call',
          {
            professionalId: id,
            hasProfessional: !!professional,
          }
        );
        return;
      }

      // ✅ Double-check user authentication (defense in depth)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setIsCalling(false); // ✅ Reset on error
        Alert.alert('Error', 'You must be logged in to make a call');
        return;
      }

      // ✅ Get user balance
      const userBalance = walletBalance; // Already loaded via useWalletBalance

      // ✅ Make call directly (Twilio native screen will open)
      await makeCall({
        professionalId: id as string,
        professionalUserId: professional?.user_id || '',
        type: 'voice',
        urgent: true,
        debugId: `urgent-${Date.now()}`,
        ratePerMinute: Number(effectiveRatePerMinute),
        userBalance,
      });

      logger.info(
        '[ProfessionalProfile] ✅ Urgent call initiated successfully'
      );
      // Note: isCalling will be reset by useEffect when callState changes
    } catch (error) {
      setIsCalling(false); // ✅ Reset on error
      logger.error('[ProfessionalProfile] Urgent call error:', error);
      Alert.alert(
        'Call Failed',
        error instanceof Error
          ? error.message
          : 'Could not start the call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Determine button states
  const isAvailable = currentAvailability !== null;
  const isOnline =
    Boolean(professional?.is_active) && Boolean(professional?.is_available);
  const isUrgentCallAvailability =
    currentAvailability?.availability.available_at === 'urgent';

  // Show urgent call button if:
  // 1. No scheduled availability but professional is online, OR
  // 2. Urgent call availability exists and professional is online
  const showUrgentCall =
    (!isAvailable && isOnline) || (isUrgentCallAvailability && isOnline);

  // Show voice/video buttons if scheduled availability exists (not urgent)
  const showVoiceVideo = isAvailable && !isUrgentCallAvailability;

  // Check if viewing own profile (can't call yourself)
  const isOwnProfile = useMemo(() => {
    if (!currentUser || !professional) return false;
    return currentUser.id === professional.user_id;
  }, [currentUser?.id, professional?.user_id]);

  // Buttons enabled if:
  // 1. User is logged in (currentUser exists and has id)
  // 2. NOT viewing own profile (can't call yourself)
  // 3. Professional has NOT blocked us
  // 4. Scheduled availability + online, OR
  // 5. Urgent call availability + online
  // ✅ SECURITY: Explicitly check that currentUser exists and has an id
  const buttonsEnabled =
    !!currentUser &&
    !!currentUser.id &&
    !isOwnProfile &&
    !isBlockedByProfessional &&
    ((isAvailable && isOnline && !isUrgentCallAvailability) ||
      (isUrgentCallAvailability && isOnline));

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading professional..." />
      </SafeAreaView>
    );
  }

  // Offline durumunda cache'lenmiş verileri göster, sadece gerçekten veri yoksa hata göster
  if (error || !professional) {
    // Offline durumunda ve cache'de veri yoksa
    if (!isNetworkOnline && !professional) {
      return (
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Header showLogo showBack />
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={theme.colors.textMuted} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              No Internet Connection
            </Text>
            <Text
              style={[styles.errorSubtext, { color: theme.colors.textMuted }]}
            >
              Please check your connection and try again
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    // Online durumunda veya gerçekten professional bulunamadıysa
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Professional not found
          </Text>
          <Text
            style={[styles.errorSubtext, { color: theme.colors.textMuted }]}
          >
            The professional you're looking for doesn't exist or has been
            removed
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        if (feedsLoading) {
          return (
            <View style={styles.feedContainer}>
              <SectionLoading size="large" />
            </View>
          );
        }

        if (feedsData.length === 0) {
          return (
            <View style={styles.feedContainer}>
              <View style={styles.emptyState}>
                <MessageCircle
                  size={48}
                  color={theme.colors.textMuted}
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No posts yet
                </Text>
                <Text
                  style={[
                    styles.emptyStateSubtext,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  This professional hasn't shared any posts yet.
                </Text>
              </View>
            </View>
          );
        }

        return (
          <View style={styles.feedContainer}>
            {feedsData.map((feed: any) => {
              // Calculate time ago
              const now = new Date();
              const feedDate = new Date(feed.created_at);
              const diffInMs = now.getTime() - feedDate.getTime();
              const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
              const diffInDays = Math.floor(diffInHours / 24);

              let timeAgo = '';
              if (diffInHours < 1) {
                const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                timeAgo =
                  diffInMinutes <= 1
                    ? 'Just now'
                    : `${diffInMinutes} minutes ago`;
              } else if (diffInHours < 24) {
                timeAgo = `${diffInHours} ${
                  diffInHours === 1 ? 'hour' : 'hours'
                } ago`;
              } else if (diffInDays < 7) {
                timeAgo = `${diffInDays} ${
                  diffInDays === 1 ? 'day' : 'days'
                } ago`;
              } else {
                timeAgo = feedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }

              return (
                <Card
                  key={feed.id}
                  style={[
                    styles.feedCard,
                    feed.is_pinned && {
                      borderLeftWidth: 3,
                      borderLeftColor: theme.colors.accent,
                    },
                  ]}
                >
                  <View style={styles.feedHeader}>
                    <View style={styles.feedAuthorRow}>
                      {(() => {
                        const feedAvatarUrl =
                          feed.professional_avatar ||
                          professional.users?.avatar_url ||
                          '';
                        const feedName =
                          feed.professional_name ||
                          professional.users?.name ||
                          'Unknown';
                        const feedId = feed.id || '';
                        const hasFeedAvatarError =
                          feedAvatarErrors[feedId] || false;
                        const hasValidFeedAvatar =
                          feedAvatarUrl &&
                          typeof feedAvatarUrl === 'string' &&
                          feedAvatarUrl.trim() !== '' &&
                          !feedAvatarUrl.includes('placeholder') &&
                          !feedAvatarUrl.includes('via.placeholder') &&
                          !hasFeedAvatarError;

                        return hasValidFeedAvatar ? (
                          <Image
                            source={{ uri: feedAvatarUrl }}
                            style={styles.feedAvatar}
                            onError={() => {
                              setFeedAvatarErrors((prev) => ({
                                ...prev,
                                [feedId]: true,
                              }));
                            }}
                          />
                        ) : (
                          <View
                            style={[
                              styles.feedAvatar,
                              styles.feedAvatarInitials,
                              { backgroundColor: getAvatarColor(feedName) },
                            ]}
                          >
                            <Text style={styles.feedAvatarInitialsText}>
                              {getInitials(feedName)}
                            </Text>
                          </View>
                        );
                      })()}
                      <View style={styles.feedAuthorInfo}>
                        <View style={styles.feedAuthorNameRow}>
                          <Text
                            style={[
                              styles.feedAuthorName,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {feed.professional_name ||
                              professional.users?.name ||
                              'Unknown'}
                          </Text>
                          {professional.is_verified && (
                            <ShieldCheck
                              size={16}
                              color={theme.colors.primary}
                              strokeWidth={2.5}
                            />
                          )}
                          {feed.is_pinned && (
                            <View
                              style={[
                                styles.pinnedBadge,
                                {
                                  backgroundColor: theme.colors.accent + '20',
                                },
                              ]}
                            >
                              <Pin
                                size={14}
                                color={theme.colors.accent}
                                fill={theme.colors.accent}
                              />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.feedTimestamp,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {timeAgo}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text
                    style={[styles.feedContent, { color: theme.colors.text }]}
                  >
                    {feed.content}
                  </Text>
                </Card>
              );
            })}
          </View>
        );

      case 'about':
        return (
          <View style={styles.aboutContainer}>
            {/* About Me Card */}
            <Card
              style={[
                styles.sectionCard,
                styles.aboutMeCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIconContainer,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                >
                  <MessageCircle
                    size={20}
                    color={theme.colors.primary}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  About Me
                </Text>
              </View>
              <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
                {professional.bio || 'No bio available'}
              </Text>
            </Card>

            {/* Specialties Card */}
            <Card
              style={[
                styles.sectionCard,
                styles.specialtiesCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIconContainer,
                    { backgroundColor: theme.colors.accent + '20' },
                  ]}
                >
                  <Award
                    size={20}
                    color={theme.colors.accent}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Specialties
                </Text>
              </View>
              <View style={styles.specialties}>
                {(professional.specialties || []).length > 0 ? (
                  (professional.specialties || []).map((specialty, index) => {
                    // Clean up specialty string (remove quotes if present)
                    const cleanSpecialty =
                      typeof specialty === 'string'
                        ? specialty.replace(/^["']|["']$/g, '')
                        : String(specialty);

                    return (
                      <View
                        key={index}
                        style={[
                          styles.specialtyTag,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.accent,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.specialtyText,
                            { color: theme.colors.accent },
                          ]}
                        >
                          {cleanSpecialty}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    No specialties specified
                  </Text>
                )}
              </View>
            </Card>

            {/* Languages Card */}
            <Card
              style={[
                styles.sectionCard,
                styles.languagesCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIconContainer,
                    { backgroundColor: '#10B981' + '20' },
                  ]}
                >
                  <MessageCircle size={20} color="#10B981" strokeWidth={2} />
                </View>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Languages
                </Text>
              </View>
              <Text
                style={[
                  styles.languagesText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {(professional.languages || []).length > 0
                  ? (professional.languages || [])
                      .map((lang) => {
                        // Clean up language string (remove quotes if present)
                        return typeof lang === 'string'
                          ? lang.replace(/^["']|["']$/g, '')
                          : String(lang);
                      })
                      .join(', ')
                  : 'No languages specified'}
              </Text>
            </Card>
          </View>
        );

      case 'availability':
        if (availabilitiesData.length === 0) {
          return (
            <View style={styles.availabilityContainer}>
              <View style={styles.emptyState}>
                <Calendar
                  size={48}
                  color={theme.colors.textMuted}
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No availability set
                </Text>
                <Text
                  style={[
                    styles.emptyStateSubtext,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  This professional hasn't set their availability yet.
                </Text>
              </View>
            </View>
          );
        }

        // Helper function to get day abbreviation
        const getDayAbbr = (day: string) => {
          const dayMap: { [key: string]: string } = {
            Monday: 'Mon',
            Tuesday: 'Tue',
            Wednesday: 'Wed',
            Thursday: 'Thu',
            Friday: 'Fri',
            Saturday: 'Sat',
            Sunday: 'Sun',
          };
          return dayMap[day] || day.substring(0, 3);
        };

        // Helper function to format date
        const formatDate = (dateString: string) => {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        };

        return (
          <View style={styles.availabilityContainer}>
            {/* Current Availability Banner - Shows at the top of Availability tab */}
            {currentAvailability &&
            remainingTime !== null &&
            remainingTime > 0 ? (
              professional.is_available ? (
                // Available + Online → Green
                <View
                  style={[
                    styles.currentAvailabilityBanner,
                    {
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                    },
                  ]}
                >
                  <View style={styles.currentAvailabilityContent}>
                    <View
                      style={[
                        styles.currentAvailabilityIconContainer,
                        { backgroundColor: '#10B981' + '20' },
                      ]}
                    >
                      <Clock size={20} color="#10B981" strokeWidth={2.5} />
                    </View>
                    <View style={styles.currentAvailabilityTextContainer}>
                      <Text
                        style={[
                          styles.currentAvailabilityTitle,
                          { color: '#10B981' },
                        ]}
                      >
                        Available Now
                      </Text>
                      <Text
                        style={[
                          styles.currentAvailabilitySubtitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {formatRemainingTime(remainingTime)}
                      </Text>
                    </View>
                    <View style={styles.currentAvailabilityPriceContainer}>
                      {/* Voice Call Price */}
                      <View style={styles.availabilityPriceRow}>
                        <Phone size={14} color="#10B981" strokeWidth={2.5} />
                        <Text
                          style={[
                            styles.currentAvailabilityPrice,
                            { color: '#10B981' },
                          ]}
                        >
                          $
                          {currentAvailability.availability.price_per_minute.toFixed(
                            2
                          )}
                          /min
                        </Text>
                      </View>
                      {/* Video Call Price (if enabled) */}
                      {currentAvailability.availability.video_call_enabled &&
                        currentAvailability.availability
                          .video_call_rate_per_minute && (
                          <>
                            <View
                              style={[
                                styles.priceSeparator,
                                { backgroundColor: theme.colors.border },
                              ]}
                            />
                            <View style={styles.availabilityPriceRow}>
                              <Video
                                size={14}
                                color="#10B981"
                                strokeWidth={2.5}
                              />
                              <Text
                                style={[
                                  styles.currentAvailabilityPrice,
                                  { color: '#10B981' },
                                ]}
                              >
                                $
                                {currentAvailability.availability.video_call_rate_per_minute.toFixed(
                                  2
                                )}
                                /min
                              </Text>
                            </View>
                          </>
                        )}
                    </View>
                  </View>
                </View>
              ) : (
                // Available but Offline → Orange/Warning
                <View
                  style={[
                    styles.currentAvailabilityBanner,
                    {
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                    },
                  ]}
                >
                  <View style={styles.currentAvailabilityContent}>
                    <View
                      style={[
                        styles.currentAvailabilityIconContainer,
                        { backgroundColor: '#F59E0B' + '20' },
                      ]}
                    >
                      <AlertCircle
                        size={20}
                        color="#F59E0B"
                        strokeWidth={2.5}
                      />
                    </View>
                    <View style={styles.currentAvailabilityTextContainer}>
                      <Text
                        style={[
                          styles.currentAvailabilityTitle,
                          { color: '#F59E0B' },
                        ]}
                      >
                        Available but Offline
                      </Text>
                      <Text
                        style={[
                          styles.currentAvailabilitySubtitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {formatRemainingTime(remainingTime)}
                      </Text>
                    </View>
                    <View style={styles.currentAvailabilityPriceContainer}>
                      {/* Voice Call Price */}
                      <View style={styles.availabilityPriceRow}>
                        <Phone size={14} color="#F59E0B" strokeWidth={2.5} />
                        <Text
                          style={[
                            styles.currentAvailabilityPrice,
                            { color: '#F59E0B' },
                          ]}
                        >
                          $
                          {currentAvailability.availability.price_per_minute.toFixed(
                            2
                          )}
                          /min
                        </Text>
                      </View>
                      {/* Video Call Price (if enabled) */}
                      {currentAvailability.availability.video_call_enabled &&
                        currentAvailability.availability
                          .video_call_rate_per_minute && (
                          <>
                            <View
                              style={[
                                styles.priceSeparator,
                                { backgroundColor: theme.colors.border },
                              ]}
                            />
                            <View style={styles.availabilityPriceRow}>
                              <Video
                                size={14}
                                color="#F59E0B"
                                strokeWidth={2.5}
                              />
                              <Text
                                style={[
                                  styles.currentAvailabilityPrice,
                                  { color: '#F59E0B' },
                                ]}
                              >
                                $
                                {currentAvailability.availability.video_call_rate_per_minute.toFixed(
                                  2
                                )}
                                /min
                              </Text>
                            </View>
                          </>
                        )}
                    </View>
                  </View>
                </View>
              )
            ) : null}

            {groupedAvailabilities.map((group, groupIndex) => {
              const firstAvail = group[0];
              const isWeekly = firstAvail.available_at === 'every';
              const days = isWeekly ? (firstAvail.days || []).sort() : null;
              const date = isWeekly ? null : firstAvail.date;

              return (
                <Card
                  key={groupIndex}
                  style={[
                    styles.availabilityCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.availabilityHeader}>
                    <View
                      style={[
                        styles.availabilityIconContainer,
                        { backgroundColor: '#3B82F6' + '15' },
                      ]}
                    >
                      <Calendar size={22} color="#3B82F6" strokeWidth={2.5} />
                    </View>
                    <View style={styles.availabilityHeaderText}>
                      <Text
                        style={[
                          styles.availabilityTypeText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {isWeekly ? 'Weekly Schedule' : 'Specific Date'}
                      </Text>
                    </View>
                  </View>

                  {isWeekly && days && days.length > 0 && (
                    <View style={styles.daysRow}>
                      {days.map((day, index) => {
                        // Different colors for different days
                        const dayColors: { [key: string]: string } = {
                          Monday: '#8B5CF6', // Purple
                          Tuesday: '#EC4899', // Pink
                          Wednesday: '#F59E0B', // Amber
                          Thursday: '#10B981', // Green
                          Friday: '#3B82F6', // Blue
                          Saturday: '#EF4444', // Red
                          Sunday: '#F97316', // Orange
                        };
                        const dayColor = dayColors[day] || '#6B7280';

                        return (
                          <View
                            key={index}
                            style={[
                              styles.dayBadge,
                              {
                                backgroundColor: dayColor + '20',
                                borderColor: dayColor,
                                borderWidth: 1.5,
                              },
                            ]}
                          >
                            <Text style={[styles.dayText, { color: dayColor }]}>
                              {getDayAbbr(day)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {!isWeekly && date && (
                    <View style={styles.dateRow}>
                      <View
                        style={[
                          styles.dateIconContainer,
                          { backgroundColor: '#3B82F6' + '15' },
                        ]}
                      >
                        <Calendar size={16} color="#3B82F6" strokeWidth={2} />
                      </View>
                      <Text
                        style={[styles.dateText, { color: theme.colors.text }]}
                      >
                        {formatDate(date)}
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.availabilityFooter,
                      { borderTopColor: theme.colors.border },
                    ]}
                  >
                    <View style={styles.timeRow}>
                      <View
                        style={[
                          styles.timeIconContainer,
                          { backgroundColor: '#10B981' + '15' },
                        ]}
                      >
                        <Clock size={18} color="#10B981" strokeWidth={2.5} />
                      </View>
                      <Text
                        style={[styles.timeText, { color: theme.colors.text }]}
                      >
                        {firstAvail.start_hour} - {firstAvail.end_hour}
                      </Text>
                    </View>
                    <View style={styles.priceContainer}>
                      {/* Voice Call Price */}
                      <View style={styles.availabilityPriceRow}>
                        <Phone size={14} color="#10B981" strokeWidth={2.5} />
                        <Text
                          style={[
                            styles.availabilityPriceText,
                            { color: '#10B981' },
                          ]}
                        >
                          ${firstAvail.price_per_minute.toFixed(2)}/min
                        </Text>
                      </View>
                      {/* Video Call Price (if enabled) */}
                      {firstAvail.video_call_enabled &&
                        firstAvail.video_call_rate_per_minute && (
                          <>
                            <View
                              style={[
                                styles.priceSeparator,
                                { backgroundColor: theme.colors.border },
                              ]}
                            />
                            <View style={styles.availabilityPriceRow}>
                              <Video
                                size={14}
                                color="#10B981"
                                strokeWidth={2.5}
                              />
                              <Text
                                style={[
                                  styles.availabilityPriceText,
                                  { color: '#10B981' },
                                ]}
                              >
                                $
                                {firstAvail.video_call_rate_per_minute.toFixed(
                                  2
                                )}
                                /min
                              </Text>
                            </View>
                          </>
                        )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        );

      case 'cv':
        if (!professional) {
          return (
            <View style={styles.cvContainer}>
              <View style={styles.emptyState}>
                <Briefcase
                  size={48}
                  color={theme.colors.textMuted}
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No data available
                </Text>
              </View>
            </View>
          );
        }

        const educations = professional.educations || [];
        const experiences = professional.experiences || [];
        const skills = professional.skills_certifications || [];

        // Check if we have any data
        const hasData =
          educations.length > 0 || experiences.length > 0 || skills.length > 0;

        if (!hasData) {
          return (
            <View style={styles.cvContainer}>
              <View style={styles.emptyState}>
                <Briefcase
                  size={48}
                  color={theme.colors.textMuted}
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No data available
                </Text>
              </View>
            </View>
          );
        }

        return (
          <View style={styles.cvContainer}>
            {/* Experience Section */}
            {experiences.length > 0 && (
              <Card
                style={[
                  styles.cvSectionCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.cvSectionHeader}>
                  <View
                    style={[
                      styles.cvSectionIconContainer,
                      { backgroundColor: '#3B82F6' + '15' },
                    ]}
                  >
                    <Briefcase size={20} color="#3B82F6" strokeWidth={2.5} />
                  </View>
                  <Text
                    style={[
                      styles.cvSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Experience
                  </Text>
                </View>
                {experiences.map((exp, index) => {
                  const startDate = exp.start_date
                    ? new Date(exp.start_date).getFullYear()
                    : null;
                  const endDate = exp.is_current
                    ? 'Present'
                    : exp.end_date
                    ? new Date(exp.end_date).getFullYear()
                    : null;
                  const dateRange =
                    startDate && endDate
                      ? `${startDate} - ${endDate}`
                      : startDate
                      ? `${startDate}`
                      : '';

                  return (
                    <View key={exp.id || index} style={styles.cvEntry}>
                      <View style={styles.cvEntryLeftBorder} />
                      <View style={styles.cvEntryContent}>
                        {exp.title && (
                          <Text
                            style={[styles.cvEntryTitle, { color: '#3B82F6' }]}
                          >
                            {exp.title}
                          </Text>
                        )}
                        {exp.company && (
                          <Text
                            style={[
                              styles.cvEntrySubtitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            {exp.company}
                          </Text>
                        )}
                        {dateRange && (
                          <Text
                            style={[
                              styles.cvEntryDate,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {dateRange}
                          </Text>
                        )}
                        {exp.description && (
                          <Text
                            style={[
                              styles.cvEntryDescription,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {exp.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Education Section */}
            {educations.length > 0 && (
              <Card
                style={[
                  styles.cvSectionCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.cvSectionHeader}>
                  <View
                    style={[
                      styles.cvSectionIconContainer,
                      { backgroundColor: '#3B82F6' + '15' },
                    ]}
                  >
                    <GraduationCap
                      size={20}
                      color="#3B82F6"
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text
                    style={[
                      styles.cvSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Education
                  </Text>
                </View>
                {educations.map((edu, index) => {
                  const degreeLabel = getDegreeLevelLabel(edu.degree_level);
                  const fieldOfStudy = edu.field_of_study
                    ? ` in ${edu.field_of_study}`
                    : '';
                  const degreeText = `${degreeLabel}${fieldOfStudy}`;
                  const startYear = edu.start_year;
                  const endYear = edu.is_current
                    ? 'Present'
                    : edu.end_year
                    ? edu.end_year
                    : null;
                  const dateRange =
                    startYear && endYear
                      ? `${startYear} - ${endYear}`
                      : startYear
                      ? `${startYear}`
                      : '';

                  return (
                    <View key={edu.id || index} style={styles.cvEntry}>
                      <View style={styles.cvEntryLeftBorder} />
                      <View style={styles.cvEntryContent}>
                        <Text
                          style={[styles.cvEntryTitle, { color: '#3B82F6' }]}
                        >
                          {degreeText}
                        </Text>
                        {edu.institution && (
                          <Text
                            style={[
                              styles.cvEntrySubtitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            {edu.institution}
                          </Text>
                        )}
                        {dateRange && (
                          <Text
                            style={[
                              styles.cvEntryDate,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {dateRange}
                          </Text>
                        )}
                        {edu.description && (
                          <Text
                            style={[
                              styles.cvEntryDescription,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {edu.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Skills & Certifications Section */}
            {skills.length > 0 && (
              <Card
                style={[
                  styles.cvSectionCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.cvSectionHeader}>
                  <View
                    style={[
                      styles.cvSectionIconContainer,
                      { backgroundColor: '#3B82F6' + '15' },
                    ]}
                  >
                    <Award size={20} color="#3B82F6" strokeWidth={2.5} />
                  </View>
                  <Text
                    style={[
                      styles.cvSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Skills & Certifications
                  </Text>
                </View>
                <View style={styles.skillsContainer}>
                  {skills.map((skill, index) => (
                    <View
                      key={index}
                      style={[
                        styles.skillBadge,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: '#3B82F6',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.skillText, { color: theme.colors.text }]}
                      >
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        showLogo
        showBack
        rightButtons={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.surface,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'transparent',
                },
              ]}
              onPress={() => setQrScannerVisible(true)}
            >
              <QrCode size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.surface,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'transparent',
                },
              ]}
              onPress={() => setShareModalVisible(true)}
            >
              <Share2 size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                {
                  backgroundColor:
                    theme.name === 'dark' ? '#000000' : theme.colors.surface,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor:
                    theme.name === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'transparent',
                },
              ]}
              onPress={handleToggleFavorite}
              disabled={toggleFavoriteMutation.isPending}
            >
              <Heart
                size={20}
                color={isFavorite ? theme.colors.error : theme.colors.text}
                fill={isFavorite ? theme.colors.error : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Profile Header */}
        <View
          style={[
            styles.profileHeader,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            {(() => {
              const avatarUrl = professional.users?.avatar_url || '';
              const hasValidAvatar =
                avatarUrl &&
                typeof avatarUrl === 'string' &&
                avatarUrl.trim() !== '' &&
                !avatarUrl.includes('placeholder') &&
                !avatarUrl.includes('via.placeholder') &&
                !avatarError;

              return hasValidAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
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
                    {
                      backgroundColor: getAvatarColor(
                        professional.users?.name || 'Unknown'
                      ),
                    },
                  ]}
                >
                  <Text style={styles.avatarInitialsText}>
                    {getInitials(professional.users?.name || 'Unknown')}
                  </Text>
                </View>
              );
            })()}
            {isFavorite && (
              <View
                style={[
                  styles.favoriteIndicator,
                  {
                    backgroundColor: theme.colors.error,
                    borderColor: theme.colors.card,
                  },
                ]}
              >
                <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            )}
            <View
              style={[
                styles.onlineIndicator,
                {
                  backgroundColor: professional.is_available
                    ? '#10B981'
                    : '#EF4444',
                },
              ]}
            />
          </View>
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {professional.users?.name || 'Unknown Professional'}
              </Text>
              {professional.is_verified && (
                <ShieldCheck
                  size={24}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              )}
            </View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.textMuted }]}>
                {professional.title ||
                  professional.profession ||
                  'Professional'}
              </Text>
              {professional.is_featured && (
                <View
                  style={[
                    styles.featuredBadge,
                    { backgroundColor: theme.colors.accent + '20' },
                  ]}
                >
                  <Star
                    size={14}
                    color={theme.colors.accent}
                    fill={theme.colors.accent}
                  />
                  <Text
                    style={[
                      styles.featuredText,
                      { color: theme.colors.accent },
                    ]}
                  >
                    Featured
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Phone size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {professional.total_calls || 0}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.textMuted }]}
                >
                  calls
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Clock size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.durationContainer}>
                {(() => {
                  const totalMinutes = professional.total_minutes || 0;
                  if (totalMinutes < 60) {
                    return (
                      <Text
                        style={[
                          styles.durationValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {totalMinutes}
                        <Text
                          style={[
                            styles.durationUnit,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          m
                        </Text>
                      </Text>
                    );
                  }
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return (
                    <>
                      <Text
                        style={[
                          styles.durationValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {hours}
                        <Text
                          style={[
                            styles.durationUnit,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          h
                        </Text>
                      </Text>
                      {minutes > 0 && (
                        <Text
                          style={[
                            styles.durationValue,
                            { color: theme.colors.text },
                          ]}
                        >
                          {' '}
                          {minutes}
                          <Text
                            style={[
                              styles.durationUnit,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            m
                          </Text>
                        </Text>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <MessageCircle size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {feedCountData || 0}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.textMuted }]}
                >
                  {feedCountData === 1 ? 'post' : 'posts'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TabButtons
            selectedKey={activeTab}
            onSelect={(key: string) => setActiveTab(key as TabType)}
            options={[
              { key: 'about', label: 'About' },
              { key: 'feed', label: 'Feed' },
              { key: 'availability', label: 'Availability' },
              { key: 'cv', label: 'CV' },
            ]}
          />
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Call Actions */}
      <View
        style={[
          styles.callActionsWrapper,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View
          style={[
            styles.callActions,
            { borderTopColor: theme.colors.tabBarBorder },
          ]}
        >
          <View style={styles.priceRow}>
            {currentAvailability &&
            remainingTime !== null &&
            remainingTime > 0 ? (
              // Available time slot is active
              professional.is_available ? (
                // Available + Online → Green "Available Now"
                <>
                  <View style={styles.footerAvailabilityBadge}>
                    <Clock size={14} color="#10B981" strokeWidth={2.5} />
                    <Text
                      style={[
                        styles.footerAvailabilityText,
                        { color: '#10B981' },
                      ]}
                    >
                      Available Now
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.footerAvailabilityBadge,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Clock
                      size={14}
                      color={theme.colors.textMuted}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.footerAvailabilityText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {formatRemainingTime(remainingTime)}
                    </Text>
                  </View>
                </>
              ) : (
                // Available but Offline → Orange/Warning
                <>
                  <View
                    style={[
                      styles.footerAvailabilityBadge,
                      {
                        backgroundColor: '#F59E0B' + '15',
                        borderColor: '#F59E0B' + '40',
                      },
                    ]}
                  >
                    <AlertCircle size={14} color="#F59E0B" strokeWidth={2.5} />
                    <Text
                      style={[
                        styles.footerAvailabilityText,
                        { color: '#F59E0B' },
                      ]}
                    >
                      Available but Offline
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.footerAvailabilityBadge,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Clock
                      size={14}
                      color={theme.colors.textMuted}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.footerAvailabilityText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {formatRemainingTime(remainingTime)}
                    </Text>
                  </View>
                </>
              )
            ) : null}
          </View>
          <View style={styles.callButtonsRow}>
            {isBlockedByProfessional ? (
              // Professional has blocked us - show warning message
              <View
                style={[
                  styles.blockedWarningContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <AlertCircle
                  size={20}
                  color={theme.colors.error || '#EF4444'}
                />
                <Text
                  style={[
                    styles.blockedWarningText,
                    { color: theme.colors.text },
                  ]}
                >
                  This professional has blocked you. You cannot make calls.
                </Text>
              </View>
            ) : showUrgentCall ? (
              // Available değil ama Online → Urgent Call (sarı)
              <View style={styles.callButtonWrapper}>
                <TouchableOpacity
                  style={[
                    styles.callTypeButton,
                    {
                      backgroundColor:
                        buttonsEnabled && !isCalling
                          ? '#F59E0B'
                          : theme.colors.border,
                      opacity: buttonsEnabled && !isCalling ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleUrgentCall}
                  disabled={!buttonsEnabled || isCalling}
                >
                  {isCalling ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text
                        style={[
                          styles.callTypeText,
                          {
                            color: '#FFFFFF',
                          },
                        ]}
                      >
                        Calling...
                      </Text>
                    </>
                  ) : (
                    <View style={styles.callButtonContent}>
                      <View style={styles.callButtonTopRow}>
                        <Zap
                          size={20}
                          color={
                            buttonsEnabled ? '#FFFFFF' : theme.colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.callTypeText,
                            {
                              color: buttonsEnabled
                                ? '#FFFFFF'
                                : theme.colors.textMuted,
                            },
                          ]}
                        >
                          Urgent Call
                        </Text>
                      </View>
                      {(() => {
                        // Get urgent call price
                        let urgentPrice = 0;
                        if (
                          currentAvailability?.availability?.price_per_minute
                        ) {
                          urgentPrice =
                            currentAvailability.availability.price_per_minute;
                        } else {
                          // Find urgent availability
                          const urgentAvail = availabilitiesData.find(
                            (avail) => avail.available_at === 'urgent'
                          );
                          if (urgentAvail) {
                            urgentPrice = urgentAvail.price_per_minute;
                          } else {
                            urgentPrice = professional?.rate_per_minute || 0;
                          }
                        }
                        return (
                          <Text
                            style={[
                              styles.callButtonPriceInline,
                              {
                                color: buttonsEnabled
                                  ? '#FFFFFF'
                                  : theme.colors.textMuted,
                                opacity: 0.9,
                              },
                            ]}
                          >
                            ${urgentPrice.toFixed(2)}/min
                          </Text>
                        );
                      })()}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : showVoiceVideo ? (
              // Available → Voice ve Video butonları
              <>
                <View style={styles.callButtonWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.callTypeButton,
                      {
                        backgroundColor:
                          buttonsEnabled && !isCalling
                            ? theme.colors.primary
                            : theme.colors.border,
                        opacity: buttonsEnabled && !isCalling ? 1 : 0.5,
                      },
                    ]}
                    onPress={handleVoiceCall}
                    disabled={!buttonsEnabled || isCalling}
                  >
                    {isCalling ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text
                          style={[
                            styles.callTypeText,
                            {
                              color: '#FFFFFF',
                            },
                          ]}
                        >
                          Calling...
                        </Text>
                      </>
                    ) : (
                      <View style={styles.callButtonContent}>
                        <View style={styles.callButtonTopRow}>
                          <Phone
                            size={20}
                            color={
                              buttonsEnabled
                                ? '#FFFFFF'
                                : theme.colors.textMuted
                            }
                          />
                          <Text
                            style={[
                              styles.callTypeText,
                              {
                                color: buttonsEnabled
                                  ? '#FFFFFF'
                                  : theme.colors.textMuted,
                              },
                            ]}
                          >
                            Voice
                          </Text>
                        </View>
                        {currentAvailability && (
                          <Text
                            style={[
                              styles.callButtonPriceInline,
                              {
                                color: buttonsEnabled
                                  ? '#FFFFFF'
                                  : theme.colors.textMuted,
                                opacity: 0.9,
                              },
                            ]}
                          >
                            $
                            {currentAvailability.availability.price_per_minute.toFixed(
                              2
                            )}
                            /min
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                {/* Video Call Button - Only show if video call is enabled */}
                {currentAvailability?.availability.video_call_enabled &&
                  currentAvailability.availability
                    .video_call_rate_per_minute && (
                    <View style={styles.callButtonWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.callTypeButton,
                          {
                            backgroundColor:
                              buttonsEnabled && !isCalling
                                ? theme.colors.primary
                                : theme.colors.border,
                            opacity: buttonsEnabled && !isCalling ? 1 : 0.5,
                          },
                        ]}
                        onPress={handleVideoCall}
                        disabled={!buttonsEnabled || isCalling}
                      >
                        {isCalling ? (
                          <>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text
                              style={[
                                styles.callTypeText,
                                {
                                  color: '#FFFFFF',
                                },
                              ]}
                            >
                              Calling...
                            </Text>
                          </>
                        ) : (
                          <View style={styles.callButtonContent}>
                            <View style={styles.callButtonTopRow}>
                              <Video
                                size={20}
                                color={
                                  buttonsEnabled
                                    ? '#FFFFFF'
                                    : theme.colors.textMuted
                                }
                              />
                              <Text
                                style={[
                                  styles.callTypeText,
                                  {
                                    color: buttonsEnabled
                                      ? '#FFFFFF'
                                      : theme.colors.textMuted,
                                  },
                                ]}
                              >
                                Video
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.callButtonPriceInline,
                                {
                                  color: buttonsEnabled
                                    ? '#FFFFFF'
                                    : theme.colors.textMuted,
                                  opacity: 0.9,
                                },
                              ]}
                            >
                              $
                              {currentAvailability.availability.video_call_rate_per_minute.toFixed(
                                2
                              )}
                              /min
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
              </>
            ) : null}
          </View>
        </View>
      </View>

      <ShareProfileModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userId={professional.users?.id}
        username={professional.users?.name}
        professionalData={
          professional
            ? {
                id: professional.id,
                name: professional.users?.name || 'Unknown Professional',
                title:
                  professional.title ||
                  professional.profession ||
                  'Professional',
                avatar: professional.users?.avatar_url || '',
                rating:
                  professional.reviews && professional.reviews.length > 0
                    ? professional.reviews.reduce(
                        (sum, r) => sum + (r.rating || 0),
                        0
                      ) / professional.reviews.length
                    : 0,
                totalCalls: professional.total_calls || 0,
                isVerified: professional.is_verified || false,
                ratePerMinute: Number(professional.rate_per_minute) || 0,
                specialties: professional.specialties || [],
              }
            : undefined
        }
      />

      <QRCodeScanner
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
      />

      {/* Insufficient Balance Modal */}
      <Modal
        visible={insufficientBalanceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInsufficientBalanceModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setInsufficientBalanceModalVisible(false)}
        >
          <Pressable
            style={[
              styles.insufficientBalanceModalContent,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: theme.colors.warning + '20' },
              ]}
            >
              <Wallet size={32} color={theme.colors.warning} />
            </View>

            <Text
              style={[
                styles.insufficientBalanceModalTitle,
                { color: theme.colors.text },
              ]}
            >
              Insufficient Balance
            </Text>

            <Text
              style={[
                styles.insufficientBalanceModalDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              To make a call, you must have at least 5 minutes' worth of balance
              in your account.
            </Text>

            <View
              style={[
                styles.balanceInfoContainer,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.balanceInfoRow}>
                <Text
                  style={[
                    styles.balanceInfoLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Current Balance:
                </Text>
                <Text
                  style={[
                    styles.balanceInfoValue,
                    { color: theme.colors.text },
                  ]}
                >
                  ${walletBalance.toFixed(2)}
                </Text>
              </View>
              <View style={styles.balanceInfoRow}>
                <Text
                  style={[
                    styles.balanceInfoLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Required (5 min):
                </Text>
                <Text
                  style={[
                    styles.balanceInfoValue,
                    { color: theme.colors.primary },
                  ]}
                >
                  ${minimumRequiredBalance.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.insufficientBalanceModalButtons}>
              <TouchableOpacity
                style={[
                  styles.insufficientBalanceModalButton,
                  styles.insufficientBalanceModalButtonSecondary,
                  {
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setInsufficientBalanceModalVisible(false)}
              >
                <Text
                  style={[
                    styles.insufficientBalanceModalButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.insufficientBalanceModalButton,
                  styles.insufficientBalanceModalButtonPrimary,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => {
                  setInsufficientBalanceModalVisible(false);
                  router.push('/credit-selection');
                }}
              >
                <Text
                  style={[
                    styles.insufficientBalanceModalButtonText,
                    { color: '#FFFFFF' },
                  ]}
                >
                  Add Credits
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    padding: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
    width: 100,
    height: 100,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 2,
  },
  durationValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    lineHeight: 22,
  },
  durationUnit: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  feedContainer: {
    padding: 16,
  },
  aboutContainer: {
    padding: 16,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  aboutMeCard: {},
  specialtiesCard: {},
  languagesCard: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  bio: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  specialtyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  languagesText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  availabilityContainer: {
    padding: 16,
  },
  availabilityCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 12px rgba(0,0,0,0.08)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }),
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  availabilityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  availabilityHeaderText: {
    flex: 1,
  },
  availabilityTypeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  dayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  dateIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  availabilityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
    // borderTopColor is set dynamically in the component
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  timeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#10B981' + '12',
    borderWidth: 1,
    borderColor: '#10B981' + '30',
  },
  availabilityPriceText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  currentAvailabilityBanner: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  currentAvailabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentAvailabilityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentAvailabilityTextContainer: {
    flex: 1,
  },
  currentAvailabilityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  currentAvailabilitySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  currentAvailabilityPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
    borderRadius: 12,
    backgroundColor: '#10B981' + '20',
  },
  currentAvailabilityPrice: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  cvContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  feedCard: {
    marginBottom: 16,
    padding: 16,
  },
  feedHeader: {
    marginBottom: 12,
  },
  feedAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  feedAvatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarInitialsText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  feedAuthorInfo: {
    flex: 1,
  },
  feedAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  feedAuthorName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  pinnedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  feedTimestamp: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  feedContent: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  callActionsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  callActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginRight: 4,
  },
  priceText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    lineHeight: 24,
  },
  priceUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 2,
  },
  footerAvailabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#10B981' + '15',
    borderWidth: 1,
    borderColor: '#10B981' + '40',
  },
  footerAvailabilityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  footerRemainingTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  callButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callTypeButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  scheduleCallButton: {
    borderWidth: 1.5,
  },
  callTypeText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  callButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  callButtonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  callButtonPriceInline: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  availabilityPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceSeparator: {
    width: 1,
    height: 16,
    marginHorizontal: 4,
  },
  footerPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  footerPriceText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  callButtonWrapper: {
    flex: 1,
  },
  callButtonPrice: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  blockedWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    flex: 1,
  },
  blockedWarningText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
    textAlign: 'center',
  },
  cvSection: {
    marginBottom: 24,
  },
  cvSectionCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  cvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cvSectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cvSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  cvEntry: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingLeft: 16,
  },
  cvEntryLeftBorder: {
    width: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginRight: 16,
  },
  cvEntryContent: {
    flex: 1,
    paddingBottom: 4,
  },
  cvEntryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  cvEntrySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  cvEntryDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  cvEntryDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  skillText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  insufficientBalanceModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }),
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  insufficientBalanceModalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  insufficientBalanceModalDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  balanceInfoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  balanceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  balanceInfoValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  insufficientBalanceModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  insufficientBalanceModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  insufficientBalanceModalButtonSecondary: {
    borderWidth: 1,
  },
  insufficientBalanceModalButtonPrimary: {},
  insufficientBalanceModalButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
