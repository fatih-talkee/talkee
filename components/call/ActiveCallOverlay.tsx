import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  PhoneCall,
  PhoneOff,
} from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { useProfile } from '@/hooks/useProfile';
import { useCallDetails } from '@/hooks/useCallDetails';
import { isCallConnected } from '@/services/twilioVoice/utils/TwilioTypeGuards';

/**
 * ActiveCallOverlay
 *
 * Custom UI that appears OVER Twilio's native call screen
 * Shows caller info, duration, cost, and controls
 *
 * ✅ Appears when call is ringing, connecting, or connected
 * ✅ Shows caller avatar, name, category, rate
 * ✅ Shows real-time duration and cost
 * ✅ Mute, Speaker, End Call controls
 * ✅ Minimizable to show Twilio native UI
 */
export default function ActiveCallOverlay() {
  const { theme } = useTheme();
  const { callState, toggleMute, disconnect, rejectIncomingCall } = useTwilioVoice();
  const { user: currentUser } = useProfile();
  const [showOverlay, setShowOverlay] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [fallbackConnectedAt, setFallbackConnectedAt] = useState<number | null>(
    null
  );
  const [fallbackNow, setFallbackNow] = useState(() => Date.now());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // ✅ Use custom hook for call details
  const { callDetails, isLoading: isLoadingDetails, loadCallDetails } =
    useCallDetails({
      call: callState.call,
      callInvite: callState.callInvite,
      currentUserId: currentUser?.id,
    });

  // ✅ Show overlay when call is connecting or connected
  useEffect(() => {
    const isIncomingCallRinging = callState.status === 'ringing' && !!callState.callInvite;
    
    const shouldShow =
      !isIncomingCallRinging &&
      (callState.status === 'ringing' ||
       callState.status === 'connecting' ||
       callState.status === 'connected');

    setShowOverlay(shouldShow);

    if (shouldShow) {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Load call details if not already loaded
      if (!callDetails && !isLoadingDetails) {
        loadCallDetails();
        const retryTimeout = setTimeout(() => {
          loadCallDetails();
        }, 2000);
        return () => clearTimeout(retryTimeout);
      }
    } else {
      // Reset state when call ends
      setMinimized(false);
      fadeAnim.setValue(0);
    }
  }, [callState.status, callState.callInvite, callDetails, isLoadingDetails, loadCallDetails, fadeAnim]);

  // Pulse animation for active call
  useEffect(() => {
    if (showOverlay && !minimized) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showOverlay, minimized, pulseAnim]);

  // Memoized handlers (Preserving programmatic logic)
  const handleMuteToggle = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleMute();
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to toggle mute', error);
    }
  }, [toggleMute, callState.isMuted]);

  const handleSpeakerToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpeakerEnabled((prev) => !prev);
  }, [speakerEnabled]);

  const handleEndCall = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (callState.status === 'ringing' && callState.callInvite && !callState.call) {
        await rejectIncomingCall();
      } else {
        await disconnect();
      }
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to end call', error);
    }
  }, [disconnect, rejectIncomingCall, callState.status, callState.call, callState.callInvite]);

  const handleMinimize = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinimized(true);
  }, []);

  const handleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinimized(false);
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const calculateCost = useCallback((duration: number, rate: number): string => {
    if (rate <= 0) return '0.00';
    const minutes = Math.floor(duration / 60) + 1;
    const cost = minutes * rate;
    return cost.toFixed(2);
  }, []);

  const displayDetails = useMemo(
    () =>
      callDetails || {
        callerName: '',
        callerAvatar: null,
        category: null,
        ratePerMinute: 0,
      },
    [callDetails]
  );

  const isEffectivelyConnected = useMemo(() => {
    return (
      callState.status === 'connected' ||
      (!!callState.call && isCallConnected(callState.call))
    );
  }, [callState.status, callState.call]);

  useEffect(() => {
    if (isEffectivelyConnected) {
      setFallbackConnectedAt((prev) => prev ?? Date.now());
      return;
    }
    setFallbackConnectedAt(null);
  }, [isEffectivelyConnected]);

  useEffect(() => {
    if (!isEffectivelyConnected || callState.duration > 0) return;
    const interval = setInterval(() => {
      setFallbackNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isEffectivelyConnected, callState.duration]);

  const displayedDuration = useMemo(() => {
    if (callState.duration > 0) return callState.duration;
    if (!isEffectivelyConnected || !fallbackConnectedAt) return 0;
    return Math.max(0, Math.floor((fallbackNow - fallbackConnectedAt) / 1000));
  }, [callState.duration, isEffectivelyConnected, fallbackConnectedAt, fallbackNow]);

  if (!showOverlay) return null;

  // Minimized view
  if (minimized) {
    return (
      <View style={styles.minimizedWrapper}>
        <TouchableOpacity
          style={styles.minimizedContent}
          onPress={handleExpand}
          activeOpacity={0.8}
        >
          {displayDetails.callerAvatar ? (
            <Image
              source={{ uri: displayDetails.callerAvatar }}
              style={styles.minimizedAvatar}
            />
          ) : (
            <View style={[styles.minimizedAvatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{displayDetails.callerName?.charAt(0) || 'U'}</Text>
            </View>
          )}
          <View style={styles.minimizedInfo}>
            <Text style={styles.minimizedName} numberOfLines={1}>{displayDetails.callerName || 'Bilinmeyen'}</Text>
            <Text style={styles.minimizedDuration}>
              {isEffectivelyConnected ? formatDuration(displayedDuration) : 'Bağlanıyor...'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.minimizedEndCall}
            onPress={handleEndCall}
          >
            <PhoneOff size={16} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  }

  // Full overlay view (Modernized UI matching Photo 1)
  return (
    <Modal
      visible={showOverlay && !minimized}
      transparent
      animationType="fade"
      onRequestClose={handleEndCall}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#111827', '#1f2937']}
          style={styles.background}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleMinimize}
            >
              <Minimize2 size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerCallInfo}>
              <Text style={styles.headerStatusText}>
                {!isEffectivelyConnected ? 'Bağlanıyor...' : 'Bağlı'}
              </Text>
              <Text style={styles.headerTypeText}>Sesli Arama</Text>
            </View>
            <TouchableOpacity style={styles.headerIconButton}>
              <PhoneCall size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Caller Info Section */}
          <View style={styles.callerContainer}>
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              {displayDetails.callerAvatar ? (
                <Image
                  source={{ uri: displayDetails.callerAvatar }}
                  style={styles.callerAvatar}
                />
              ) : (
                <View style={[styles.callerAvatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 40, fontWeight: 'bold' }}>{displayDetails.callerName?.charAt(0) || 'U'}</Text>
                </View>
              )}
            </Animated.View>
            <Text style={styles.callerName}>{displayDetails.callerName || 'Yükleniyor...'}</Text>
            {displayDetails.category && (
              <Text style={styles.callerCategory}>{displayDetails.category}</Text>
            )}
          </View>

          {/* Stats Bar (Horizontal card from reference) */}
          <View style={styles.statsBar}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Süre</Text>
              <Text style={styles.statValue}>{formatDuration(displayedDuration)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Maliyet</Text>
              <Text style={styles.statValue}>
                {'$' + calculateCost(displayedDuration, displayDetails.ratePerMinute)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Ücret</Text>
              <Text style={styles.statValue}>
                {'$' + displayDetails.ratePerMinute.toFixed(2)}/dk
              </Text>
            </View>
          </View>

          {/* Call Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.roundControl, callState.isMuted && styles.roundControlActive]}
                onPress={handleMuteToggle}
              >
                {callState.isMuted ? <MicOff size={28} color="#ffffff" /> : <Mic size={28} color="#ffffff" />}
                <Text style={styles.controlLabel}>{callState.isMuted ? 'Aç' : 'Sustur'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roundControl, speakerEnabled && styles.roundControlActive]}
                onPress={handleSpeakerToggle}
              >
                {speakerEnabled ? <Volume2 size={28} color="#ffffff" /> : <VolumeX size={28} color="#ffffff" />}
                <Text style={styles.controlLabel}>Hoparlör</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.roundControl}>
                <PhoneCall size={28} color="#ffffff" />
                <Text style={styles.controlLabel}>Sohbet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.endCallCircle}
                onPress={handleEndCall}
              >
                <PhoneOff size={32} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCallInfo: {
    alignItems: 'center',
  },
  headerStatusText: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  headerTypeText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  callerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 20,
  },
  callerAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callerName: {
    color: '#ffffff',
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  callerCategory: {
    color: '#9ca3af',
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  controlsContainer: {
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundControl: {
    alignItems: 'center',
    gap: 8,
  },
  roundControlActive: {
    opacity: 0.6,
  },
  controlLabel: {
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  endCallCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  minimizedWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  minimizedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  minimizedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  minimizedName: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  minimizedDuration: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  minimizedEndCall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
