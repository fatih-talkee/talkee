import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Phone,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  PhoneCall,
} from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { useProfile } from '@/hooks/useProfile';
import { useCallDetails } from '@/hooks/useCallDetails';

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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // ✅ REFACTORED: Use custom hook for call details
  const { callDetails, isLoading: isLoadingDetails, loadCallDetails } =
    useCallDetails({
      call: callState.call,
      callInvite: callState.callInvite,
      currentUserId: currentUser?.id,
    });

  // ✅ Show overlay when call is connecting or connected
  // ⚠️ Do NOT show when status is 'ringing' AND callInvite exists (that's for IncomingCallHandler)
  useEffect(() => {
    // For incoming calls that haven't been accepted yet, don't show this overlay
    // (IncomingCallHandler handles that case)
    const isIncomingCallRinging = callState.status === 'ringing' && !!callState.callInvite;
    
    const shouldShow =
      !isIncomingCallRinging &&
      (callState.status === 'ringing' ||
       callState.status === 'connecting' ||
       callState.status === 'connected');

    logger.debug('[ActiveCallOverlay] 🔍 Call state changed', {
      status: callState.status,
      shouldShow,
      isIncomingCallRinging,
      hasCallInvite: !!callState.callInvite,
      hasCall: !!callState.call,
      timestamp: new Date().toISOString(),
    });

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

        // Retry after 2 seconds if details are still missing
        const retryTimeout = setTimeout(() => {
          logger.info(
            '[ActiveCallOverlay] 🔄 Retrying call details load after delay',
            {
              timestamp: new Date().toISOString(),
            }
          );
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
            toValue: 1.1,
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

  // ✅ REFACTORED: Memoized handlers
  const handleMuteToggle = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleMute();
      logger.info('[ActiveCallOverlay] 🔇 Mute toggled', {
        isMuted: callState.isMuted,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to toggle mute', error);
    }
  }, [toggleMute, callState.isMuted]);

  const handleSpeakerToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement speaker toggle via Twilio SDK or native audio routing
    setSpeakerEnabled((prev) => !prev);
    logger.info('[ActiveCallOverlay] 🔊 Speaker toggled', {
      enabled: !speakerEnabled,
      timestamp: new Date().toISOString(),
    });
  }, [speakerEnabled]);

  const handleEndCall = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      logger.info('[ActiveCallOverlay] 📞 Ending call', {
        status: callState.status,
        hasCall: !!callState.call,
        hasCallInvite: !!callState.callInvite,
        timestamp: new Date().toISOString(),
      });

      // ✅ FIX: If ringing (has callInvite but no active call), reject the callInvite
      if (callState.status === 'ringing' && callState.callInvite && !callState.call) {
        logger.info('[ActiveCallOverlay] 📞 Rejecting incoming call (ringing state)', {
          timestamp: new Date().toISOString(),
        });
        await rejectIncomingCall();
      } else {
        // Otherwise, disconnect the active call
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

  // ✅ REFACTORED: Memoized formatters
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const calculateCost = useCallback((duration: number, rate: number): string => {
    // Per-minute billing: Math.floor(duration / 60) + 1
    if (rate <= 0) {
      return '0.00';
    }
    const minutes = Math.floor(duration / 60) + 1;
    const cost = minutes * rate;
    return cost.toFixed(2);
  }, []);

  // ✅ REFACTORED: Memoized display details
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

  if (!showOverlay) {
    return null;
  }

  // Minimized view
  if (minimized) {
    return (
      <Pressable
        onPress={handleExpand}
        style={({ pressed }) => [
          styles.minimizedBubble,
          pressed && styles.minimizedBubblePressed,
        ]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary + 'DD']}
          style={styles.minimizedGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.minimizedContent}>
            <View style={styles.minimizedAvatarContainer}>
              {displayDetails.callerAvatar ? (
                <Image
                  source={{ uri: displayDetails.callerAvatar }}
                  style={[
                    styles.minimizedAvatar,
                    { borderColor: theme.colors.border },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.minimizedAvatarPlaceholder,
                    {
                      backgroundColor: theme.colors.surface + '80',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.minimizedAvatarText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {displayDetails.callerName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.minimizedPulseIndicator,
                  {
                    backgroundColor: theme.colors.success,
                    borderColor: theme.colors.surface,
                  },
                ]}
              />
            </View>
            <View style={styles.minimizedInfo}>
              {isLoadingDetails ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.minimizedName,
                      { color: theme.colors.textMuted, marginLeft: 8 },
                    ]}
                    numberOfLines={1}
                  >
                    Loading...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[styles.minimizedName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {displayDetails.callerName || 'Call'}
                </Text>
              )}
              <Text
                style={[
                  styles.minimizedDuration,
                  { color: theme.colors.textMuted },
                ]}
              >
                {callState.status === 'connected'
                  ? formatDuration(callState.duration)
                  : callState.status === 'ringing'
                  ? 'Ringing...'
                  : 'Connecting...'}
              </Text>
            </View>
            <Phone size={20} color={theme.colors.text} />
          </View>
        </LinearGradient>
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
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient
          colors={[
            theme.colors.background,
            theme.colors.background + 'F5',
            theme.colors.background + 'E0',
          ]}
          style={styles.gradientOverlay}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={handleMinimize}
                style={({ pressed }) => [
                  styles.minimizeButton,
                  {
                    backgroundColor: theme.colors.card + '40',
                  },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Minimize2 size={20} color={theme.colors.textMuted} />
              </Pressable>
              <View style={styles.statusIndicator}>
                {callState.status === 'connected' ? (
                  <>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: theme.colors.success },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      Connected
                    </Text>
                  </>
                ) : callState.status === 'ringing' ? (
                  <>
                    <Animated.View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: theme.colors.warning,
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: theme.colors.warning },
                      ]}
                    >
                      Ringing...
                    </Text>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Connecting...
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Caller Info */}
            <View style={styles.callerInfoWrapper}>
              <View style={styles.callerInfo}>
                <Animated.View
                  style={[
                    styles.avatarContainer,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  {isLoadingDetails ? (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.card + '40',
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                    </View>
                  ) : displayDetails.callerAvatar ? (
                    <Image
                      source={{ uri: displayDetails.callerAvatar }}
                      style={[
                        styles.avatar,
                        { borderColor: theme.colors.border },
                      ]}
                    />
                  ) : (
                    <LinearGradient
                      colors={[
                        theme.colors.primary,
                        theme.colors.primary + 'DD',
                      ]}
                      style={[
                        styles.avatarPlaceholder,
                        { borderColor: theme.colors.border },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {displayDetails.callerName
                          ? displayDetails.callerName.charAt(0).toUpperCase()
                          : '?'}
                      </Text>
                    </LinearGradient>
                  )}
                </Animated.View>

                {isLoadingDetails ? (
                  <View style={styles.loadingNameContainer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.callerName,
                        { color: theme.colors.textMuted, marginLeft: 8 },
                      ]}
                    >
                      Loading...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[styles.callerName, { color: theme.colors.text }]}
                  >
                    {displayDetails.callerName || 'Unknown'}
                  </Text>
                )}

                {displayDetails.category && (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: theme.colors.card + '80' },
                    ]}
                  >
                    <Text
                      style={[styles.category, { color: theme.colors.primary }]}
                    >
                      {displayDetails.category}
                    </Text>
                  </View>
                )}

                {isLoadingDetails ? (
                  <View style={styles.rateContainer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.rateUnit,
                        { color: theme.colors.textMuted, marginLeft: 8 },
                      ]}
                    >
                      Loading rate...
                    </Text>
                  </View>
                ) : displayDetails.ratePerMinute > 0 ? (
                  <View style={styles.rateContainer}>
                    <Text
                      style={[styles.rate, { color: theme.colors.textMuted }]}
                    >
                      ${displayDetails.ratePerMinute}
                    </Text>
                    <Text
                      style={[
                        styles.rateUnit,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      /min
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Call Stats - Only show duration/cost when connected */}
              {callState.status === 'connected' ? (
                <View
                  style={[
                    styles.statsContainer,
                    {
                      backgroundColor: theme.colors.card + '40',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.statText, { color: theme.colors.text }]}>
                    {formatDuration(callState.duration)}
                  </Text>
                  <Text
                    style={[
                      styles.statSeparator,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {' '}
                    |{' '}
                  </Text>
                  <Text style={[styles.statText, { color: theme.colors.text }]}>
                    ${calculateCost(callState.duration, displayDetails.ratePerMinute)}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.statsContainer,
                    {
                      backgroundColor: theme.colors.card + '40',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <PhoneCall
                    size={20}
                    color={theme.colors.warning}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[styles.statText, { color: theme.colors.textMuted }]}
                  >
                    {callState.status === 'ringing'
                      ? 'Waiting for answer...'
                      : 'Connecting...'}
                  </Text>
                </View>
              )}

              {/* Controls - Only show when connected */}
              {callState.status === 'connected' && (
                <View style={styles.controls}>
                  {/* Mute Button */}
                  <Pressable
                    onPress={handleMuteToggle}
                    style={({ pressed }) => [
                      styles.controlButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <BlurView
                      intensity={callState.isMuted ? 30 : 15}
                      style={[
                        styles.controlButtonContent,
                        callState.isMuted && {
                          backgroundColor: theme.colors.error + '40',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.controlIconContainer,
                          callState.isMuted &&
                            styles.controlIconContainerActive,
                          {
                            backgroundColor: callState.isMuted
                              ? theme.colors.error
                              : theme.colors.card + '40',
                          },
                        ]}
                      >
                        {callState.isMuted ? (
                          <MicOff size={18} color={theme.colors.text} />
                        ) : (
                          <Mic size={18} color={theme.colors.text} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.controlLabel,
                          {
                            color: theme.colors.text,
                          },
                        ]}
                      >
                        {callState.isMuted ? 'Muted' : 'Mute'}
                      </Text>
                    </BlurView>
                  </Pressable>

                  {/* Speaker Button */}
                  <Pressable
                    onPress={handleSpeakerToggle}
                    style={({ pressed }) => [
                      styles.controlButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <BlurView
                      intensity={speakerEnabled ? 30 : 15}
                      style={[
                        styles.controlButtonContent,
                        speakerEnabled && {
                          backgroundColor: theme.colors.primary + '40',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.controlIconContainer,
                          speakerEnabled && styles.controlIconContainerActive,
                          {
                            backgroundColor: speakerEnabled
                              ? theme.colors.primary
                              : theme.colors.card + '40',
                          },
                        ]}
                      >
                        {speakerEnabled ? (
                          <Volume2 size={18} color={theme.colors.text} />
                        ) : (
                          <VolumeX size={18} color={theme.colors.text} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.controlLabel,
                          {
                            color: theme.colors.text,
                          },
                        ]}
                      >
                        Speaker
                      </Text>
                    </BlurView>
                  </Pressable>
                </View>
              )}

              {/* End Call Button */}
              <Pressable
                onPress={handleEndCall}
                style={({ pressed }) => [
                  styles.endCallButton,
                  pressed && styles.endCallButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.error, theme.colors.error + 'DD']}
                  style={styles.endCallGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Phone size={24} color={theme.colors.text} />
                  <Text
                    style={[styles.endCallText, { color: theme.colors.text }]}
                  >
                    End Call
                  </Text>
                </LinearGradient>
              </Pressable>
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
  gradientOverlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  minimizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  callerInfoWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: 20,
  },
  callerInfo: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 64,
    fontFamily: 'Inter-Bold',
  },
  callerName: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  loadingNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  category: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rate: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  rateUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  statText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statSeparator: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  controlButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderRadius: 16,
  },
  controlIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconContainerActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  endCallButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  endCallButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  endCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  endCallText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  minimizedBubble: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    zIndex: 9999,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  minimizedBubblePressed: {
    transform: [{ scale: 0.95 }],
  },
  minimizedGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  minimizedAvatarContainer: {
    position: 'relative',
  },
  minimizedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  minimizedAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  minimizedAvatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  minimizedPulseIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -2,
    right: -2,
    borderWidth: 2,
  },
  minimizedInfo: {
    flex: 1,
    gap: 2,
  },
  minimizedName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  minimizedDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});

