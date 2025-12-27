import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Phone, Mic, MicOff, Volume2, VolumeX } from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

interface CallDetails {
  callerName: string;
  callerAvatar: string | null;
  category: string | null;
  ratePerMinute: number;
}

/**
 * ActiveCallOverlay
 *
 * Custom UI that appears OVER Twilio's native call screen
 * Shows caller info, duration, cost, and controls
 *
 * ✅ Appears when call is connected
 * ✅ Shows caller avatar, name, category, rate
 * ✅ Shows real-time duration and cost
 * ✅ Mute, Speaker, End Call controls
 * ✅ Minimizable to show Twilio native UI
 */
export default function ActiveCallOverlay() {
  const { theme } = useTheme();
  const { callState, toggleMute, disconnect } = useTwilioVoice();
  const [showOverlay, setShowOverlay] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);

  // Show overlay when call is connected
  useEffect(() => {
    const isConnected = callState.status === 'connected';
    setShowOverlay(isConnected);

    if (isConnected && !callDetails) {
      loadCallDetails();
    }

    // Reset state when call ends
    if (!isConnected) {
      setMinimized(false);
      setCallDetails(null);
    }
  }, [callState.status]);

  const loadCallDetails = async () => {
    logger.info('[ActiveCallOverlay] 📞 Loading call details', {
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ Get call details from current call state
      const call = callState.call as any;

      // Try to get the other party's user ID
      let otherUserId: string | null = null;

      // For incoming calls: get from CallInvite
      if (callState.callInvite) {
        const invite = callState.callInvite as any;
        const fromField = invite._from || invite.from;
        otherUserId = fromField?.replace('client:', '') || null;

        logger.debug('[ActiveCallOverlay] 📥 Incoming call - caller ID', {
          otherUserId,
          timestamp: new Date().toISOString(),
        });
      }

      // For outgoing calls: get from call parameters
      if (!otherUserId && call) {
        const customParams =
          call._customParameters || call.customParameters || {};
        otherUserId = customParams.To || null;

        logger.debug('[ActiveCallOverlay] 📤 Outgoing call - callee ID', {
          otherUserId,
          timestamp: new Date().toISOString(),
        });
      }

      if (!otherUserId) {
        logger.warn(
          '[ActiveCallOverlay] ⚠️ Could not determine other party user ID',
          {
            hasCall: !!call,
            hasCallInvite: !!callState.callInvite,
            timestamp: new Date().toISOString(),
          }
        );

        // Use placeholder
        setCallDetails({
          callerName: 'User',
          callerAvatar: null,
          category: null,
          ratePerMinute: 0,
        });
        return;
      }

      logger.debug('[ActiveCallOverlay] 🔍 Fetching user details', {
        userId: otherUserId,
        timestamp: new Date().toISOString(),
      });

      // ✅ Load user info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (userError) {
        logger.error('[ActiveCallOverlay] ❌ Failed to load user', userError, {
          userId: otherUserId,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Load professional info (if other party is professional)
      const { data: professional } = await supabase
        .from('professionals')
        .select(
          `
          rate_per_minute,
          categories (
            name
          )
        `
        )
        .eq('user_id', otherUserId)
        .single();

      const ratePerMinute = professional?.rate_per_minute
        ? Number(professional.rate_per_minute)
        : 0;

      const category = professional?.categories?.[0]?.name || null;

      setCallDetails({
        callerName: user?.name || 'User',
        callerAvatar: user?.avatar_url || null,
        category,
        ratePerMinute,
      });

      logger.info('[ActiveCallOverlay] ✅ Call details loaded', {
        name: user?.name,
        hasAvatar: !!user?.avatar_url,
        category,
        ratePerMinute,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        '[ActiveCallOverlay] ❌ Failed to load call details',
        error,
        {
          timestamp: new Date().toISOString(),
        }
      );

      // Fallback
      setCallDetails({
        callerName: 'User',
        callerAvatar: null,
        category: null,
        ratePerMinute: 0,
      });
    }
  };

  const handleMuteToggle = async () => {
    try {
      await toggleMute();
      logger.info('[ActiveCallOverlay] 🔇 Mute toggled', {
        isMuted: callState.isMuted,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to toggle mute', error);
    }
  };

  const handleSpeakerToggle = () => {
    // TODO: Implement speaker toggle via Twilio SDK or native audio routing
    setSpeakerEnabled(!speakerEnabled);
    logger.info('[ActiveCallOverlay] 🔊 Speaker toggled', {
      enabled: !speakerEnabled,
      timestamp: new Date().toISOString(),
    });
  };

  const handleEndCall = async () => {
    try {
      logger.info('[ActiveCallOverlay] 📞 Ending call', {
        timestamp: new Date().toISOString(),
      });
      await disconnect();
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to end call', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const calculateCost = (duration: number, rate: number): string => {
    const minutes = duration / 60;
    const cost = minutes * rate;
    return cost.toFixed(2);
  };

  if (!showOverlay || !callDetails) {
    return null;
  }

  // Minimized view - small floating bubble
  if (minimized) {
    return (
      <Pressable
        onPress={() => setMinimized(false)}
        style={[
          styles.minimizedBubble,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text style={styles.minimizedText}>
          {formatDuration(callState.duration)}
        </Text>
        <Phone size={16} color="#FFFFFF" />
      </Pressable>
    );
  }

  // Full overlay view
  return (
    <Modal
      visible={!minimized}
      transparent
      animationType="fade"
      onRequestClose={handleEndCall}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {/* Minimize Button */}
          <Pressable
            onPress={() => setMinimized(true)}
            style={styles.minimizeButton}
          >
            <Text
              style={[styles.minimizeText, { color: theme.colors.textMuted }]}
            >
              Minimize
            </Text>
          </Pressable>

          {/* Caller Info */}
          <View style={styles.callerInfo}>
            {callDetails.callerAvatar ? (
              <Image
                source={{ uri: callDetails.callerAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Text
                  style={[styles.avatarText, { color: theme.colors.primary }]}
                >
                  {callDetails.callerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={[styles.callerName, { color: theme.colors.text }]}>
              {callDetails.callerName}
            </Text>

            {callDetails.category && (
              <Text
                style={[styles.category, { color: theme.colors.textMuted }]}
              >
                {callDetails.category}
              </Text>
            )}

            {callDetails.ratePerMinute > 0 && (
              <Text style={[styles.rate, { color: theme.colors.textMuted }]}>
                ${callDetails.ratePerMinute}/min
              </Text>
            )}
          </View>

          {/* Call Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statLabel, { color: theme.colors.textMuted }]}
              >
                Duration
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatDuration(callState.duration)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text
                style={[styles.statLabel, { color: theme.colors.textMuted }]}
              >
                Cost
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                ${calculateCost(callState.duration, callDetails.ratePerMinute)}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Mute Button */}
            <Pressable
              onPress={handleMuteToggle}
              style={[
                styles.controlButton,
                callState.isMuted && styles.controlButtonActive,
                {
                  backgroundColor: callState.isMuted
                    ? theme.colors.error
                    : theme.colors.card,
                },
              ]}
            >
              {callState.isMuted ? (
                <MicOff size={24} color="#FFFFFF" />
              ) : (
                <Mic size={24} color={theme.colors.text} />
              )}
              <Text
                style={[
                  styles.controlLabel,
                  { color: callState.isMuted ? '#FFFFFF' : theme.colors.text },
                ]}
              >
                {callState.isMuted ? 'Muted' : 'Mute'}
              </Text>
            </Pressable>

            {/* Speaker Button */}
            <Pressable
              onPress={handleSpeakerToggle}
              style={[
                styles.controlButton,
                speakerEnabled && styles.controlButtonActive,
                {
                  backgroundColor: speakerEnabled
                    ? theme.colors.primary
                    : theme.colors.card,
                },
              ]}
            >
              {speakerEnabled ? (
                <Volume2 size={24} color="#FFFFFF" />
              ) : (
                <VolumeX size={24} color={theme.colors.text} />
              )}
              <Text
                style={[
                  styles.controlLabel,
                  { color: speakerEnabled ? '#FFFFFF' : theme.colors.text },
                ]}
              >
                {speakerEnabled ? 'Speaker' : 'Speaker'}
              </Text>
            </Pressable>
          </View>

          {/* End Call Button */}
          <Pressable
            onPress={handleEndCall}
            style={[
              styles.endCallButton,
              { backgroundColor: theme.colors.error },
            ]}
          >
            <Phone size={24} color="#FFFFFF" />
            <Text style={styles.endCallText}>End Call</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    justifyContent: 'space-between', // ✅ Space between content and footer
  },
  minimizeButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  minimizeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: 20, // ✅ Reduced top margin
    flex: 1, // ✅ Take available space
    justifyContent: 'center', // ✅ Center vertically
  },
  avatar: {
    width: 140, // ✅ Larger avatar
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 140, // ✅ Larger avatar
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 56, // ✅ Larger text
    fontFamily: 'Inter-Bold',
  },
  callerName: {
    fontSize: 32, // ✅ Larger name
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  category: {
    fontSize: 18, // ✅ Larger category
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  rate: {
    fontSize: 16, // ✅ Larger rate
    fontFamily: 'Inter-Medium',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24, // ✅ More padding
    marginTop: 30,
    marginBottom: 0, // ✅ Remove bottom margin
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28, // ✅ Larger values
    fontFamily: 'Inter-Bold',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 30, // ✅ Add top margin
    marginBottom: 20,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24, // ✅ More padding
    borderRadius: 20,
    gap: 10,
  },
  controlButtonActive: {},
  controlLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 22, // ✅ More padding
    borderRadius: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 10, // ✅ Bottom spacing
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 20, // ✅ Larger text
    fontFamily: 'Inter-Bold',
  },
  minimizedBubble: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  minimizedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
});
