import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { CallSidExtractor } from '@/services/twilioVoice/utils';
import {
  loadIncomingCallDetails,
  loadUserBalance,
} from '@/services/incomingCallDetails.service';

interface CallDetails {
  callerName: string;
  callerAvatar: string | null;
  callId: string | null;
}

// ✅ Timeout for incoming calls (60 seconds - industry standard)
const INCOMING_CALL_TIMEOUT_MS = 60 * 1000;

export default function IncomingCallHandler() {
  const { theme } = useTheme();
  const { callState, acceptIncomingCall, rejectIncomingCall } =
    useTwilioVoice();
  const { user: currentUser } = useProfile();
  const [showModal, setShowModal] = useState(false);
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | undefined>(undefined);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const loadingDetailsRef = useRef(false);
  const lastCallSidRef = useRef<string | null>(null);
  const callDetailsRef = useRef<CallDetails | null>(null);

  // ✅ REFACTORED: Use service for loading call details
  const loadIncomingCallDetailsData = useCallback(async () => {
    if (!callState.callInvite || loadingDetailsRef.current) return;

    const callInvite = callState.callInvite;
    const currentCallSid = CallSidExtractor.extractFromCallInvite(
      callInvite,
      'IncomingCallHandler'
    );

    // Skip if we already loaded details for this call
    if (lastCallSidRef.current === currentCallSid) {
      logger.debug(
        '[IncomingCallHandler] ⏭️ Skipping load - already loaded for this call',
        {
          callSid: currentCallSid?.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    loadingDetailsRef.current = true;
    lastCallSidRef.current = currentCallSid || null;

    logger.info('[IncomingCallHandler] 📞 Loading incoming call details', {
      status: callState.status,
      hasCallInvite: !!callState.callInvite,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ REFACTORED: Use service for loading details
      const details = await loadIncomingCallDetails(
        callInvite,
        currentCallSid || undefined
      );
      setCallDetails(details);
      callDetailsRef.current = details;

      // ✅ REFACTORED: Load user balance using service
      if (currentUser?.id) {
        const balance = await loadUserBalance(currentUser.id);
        setUserBalance(balance);
      }

      logger.info('[IncomingCallHandler] ✅ Call details loaded', {
        callerName: details.callerName,
        hasAvatar: !!details.callerAvatar,
        hasCallId: !!details.callId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        '[IncomingCallHandler] ❌ Failed to load call details',
        error,
        {
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }
      );

      const fallbackCallDetails: CallDetails = {
        callerName: 'Unknown Caller',
        callerAvatar: null,
        callId: null,
      };
      setCallDetails(fallbackCallDetails);
      callDetailsRef.current = fallbackCallDetails;
    } finally {
      loadingDetailsRef.current = false;
    }
  }, [callState.callInvite, callState.status, currentUser?.id]);

  useEffect(() => {
    // ✅ SECURITY: Don't show incoming call modal if user is not authenticated
    if (!currentUser) {
      logger.warn(
        '[IncomingCallHandler] ⚠️ Incoming call received but user is not authenticated, rejecting',
        {
          hasCallInvite: !!callState.callInvite,
          status: callState.status,
          timestamp: new Date().toISOString(),
        }
      );
      if (callState.callInvite) {
        void rejectIncomingCall();
      }
      setShowModal(false);
      setCallDetails(null);
      lastCallSidRef.current = null;
      return;
    }

    // ✅ FIX: Show modal if we have a callInvite, even if status is not exactly 'ringing'
    // This handles cases where status might be 'connecting' or other states but callInvite exists
    const shouldShow = !!callState.callInvite && 
      (callState.status === 'ringing' || callState.status === 'connecting');

    logger.info('[IncomingCallHandler] 🔍 Checking if should show modal', {
      status: callState.status,
      hasCallInvite: !!callState.callInvite,
      hasCurrentUser: !!currentUser,
      shouldShow,
      currentShowModal: showModal,
      callInviteSid: callState.callInvite
        ? CallSidExtractor.extractFromCallInvite(
            callState.callInvite,
            'IncomingCallHandler-check'
          )?.substring(0, 20) + '...'
        : null,
      timestamp: new Date().toISOString(),
    });

    if (shouldShow) {
      if (!showModal) {
        logger.info('[IncomingCallHandler] ✅ Showing incoming call modal', {
          status: callState.status,
          hasCallInvite: !!callState.callInvite,
          timestamp: new Date().toISOString(),
        });
      }
      setShowModal(true);

      // Load details if not already loaded for this call
      const currentCallSid = callState.callInvite
        ? CallSidExtractor.extractFromCallInvite(
            callState.callInvite,
            'IncomingCallHandler'
          )
        : null;
      if (lastCallSidRef.current !== currentCallSid) {
        void loadIncomingCallDetailsData();
      }

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Set timeout to auto-reject if not answered
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const newTimeoutId = setTimeout(() => {
        const currentCallDetails = callDetailsRef.current;
        logger.warn(
          '[IncomingCallHandler] ⏰ Incoming call timeout - auto-rejecting',
          {
            timeoutMs: INCOMING_CALL_TIMEOUT_MS,
            status: callState.status,
            hasCallInvite: !!callState.callInvite,
            callId: currentCallDetails?.callId,
            timestamp: new Date().toISOString(),
          }
        );
        if (callState.callInvite) {
          void rejectIncomingCall({
            callId: currentCallDetails?.callId || undefined,
            debugId: `timeout-${Date.now()}`,
          });
        }
        setShowModal(false);
        setCallDetails(null);
        callDetailsRef.current = null;
        lastCallSidRef.current = null;
        setTimeoutId(null);
      }, INCOMING_CALL_TIMEOUT_MS);
      setTimeoutId(newTimeoutId as unknown as NodeJS.Timeout);
    } else {
      // Clear timeout when call is no longer ringing
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      if (showModal) {
        logger.debug('[IncomingCallHandler] 🔄 Hiding modal', {
          status: callState.status,
          hasCallInvite: !!callState.callInvite,
          timestamp: new Date().toISOString(),
        });
      }
      setShowModal(false);
      setCallDetails(null);
      callDetailsRef.current = null;
      lastCallSidRef.current = null;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    callState.status,
    callState.callInvite,
    currentUser,
    rejectIncomingCall,
    loadIncomingCallDetailsData,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    };
  }, [timeoutId]);

  // Pulse animation for incoming call
  useEffect(() => {
    if (showModal && callDetails) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [showModal, callDetails, pulseAnim]);

  // ✅ REFACTORED: Memoized handlers
  const handleAccept = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to accept calls');
      void rejectIncomingCall();
      setShowModal(false);
      return;
    }

    if (!callState.callInvite || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    logger.info('[IncomingCallHandler] ✅ User accepted call', {
      callerName: callDetails?.callerName,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
    });

    try {
      // Double-check authentication
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setLoading(false);
        Alert.alert('Error', 'You must be logged in to accept calls');
        void rejectIncomingCall();
        setShowModal(false);
        return;
      }

      setShowModal(false);

      await acceptIncomingCall({
        callId: callDetails?.callId || undefined,
        ratePerMinute: undefined,
        userBalance,
        debugId: `accept-${Date.now()}`,
      });

      logger.info('[IncomingCallHandler] ✅ Call accepted successfully', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[IncomingCallHandler] ❌ Failed to accept call', error, {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }, [
    currentUser,
    callState.callInvite,
    loading,
    callDetails,
    userBalance,
    acceptIncomingCall,
    rejectIncomingCall,
  ]);

  const handleDecline = useCallback(async () => {
    if (!callState.callInvite || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    logger.info('[IncomingCallHandler] ❌ User declined call', {
      callerName: callDetails?.callerName,
      timestamp: new Date().toISOString(),
    });

    try {
      setShowModal(false);
      await rejectIncomingCall({
        callId: callDetails?.callId || undefined,
        debugId: `decline-${Date.now()}`,
      });

      logger.info('[IncomingCallHandler] ✅ Call declined successfully', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[IncomingCallHandler] ❌ Failed to decline call', error, {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [callState.callInvite, loading, callDetails, rejectIncomingCall]);

  if (!showModal) {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.content}>
            {callDetails ? (
              <>
                {/* Caller Avatar */}
                <Animated.View
                  style={[
                    styles.avatarContainer,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  {callDetails.callerAvatar ? (
                    <Image
                      source={{ uri: callDetails.callerAvatar }}
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
                        {callDetails.callerName.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                  <View
                    style={[
                      styles.avatarRing,
                      { borderColor: theme.colors.primary + '40' },
                    ]}
                  />
                  <View
                    style={[
                      styles.avatarRingOuter,
                      { borderColor: theme.colors.primary + '20' },
                    ]}
                  />
                </Animated.View>

                {/* Caller Name */}
                <Text style={[styles.callerName, { color: theme.colors.text }]}>
                  {callDetails.callerName}
                </Text>
              </>
            ) : (
              <>
                {/* Loading State */}
                <View style={styles.avatarContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.callerName, { color: theme.colors.text }]}>
                  Loading...
                </Text>
              </>
            )}

            {/* Call Type Badge */}
            <View
              style={[
                styles.callTypeBadge,
                { backgroundColor: theme.colors.card + '80' },
              ]}
            >
              <Text
                style={[styles.callType, { color: theme.colors.textMuted }]}
              >
                📞 Incoming Call
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttons}>
              {/* Decline Button */}
              <Pressable
                onPress={handleDecline}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.error, theme.colors.error + 'DD']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                  ) : (
                    <>
                      <PhoneOff size={20} color={theme.colors.text} />
                      <Text
                        style={[
                          styles.buttonText,
                          { color: theme.colors.text },
                        ]}
                      >
                        Decline
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Accept Button - Always render, but disable if no callInvite */}
              <Pressable
                onPress={handleAccept}
                disabled={loading || !callState.callInvite}
                style={({ pressed }) => [
                  styles.button,
                  styles.acceptButton,
                  pressed && styles.buttonPressed,
                  (loading || !callState.callInvite) && styles.buttonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    loading || !callState.callInvite
                      ? [theme.colors.textMuted, theme.colors.textMuted + 'DD']
                      : [theme.colors.success, theme.colors.success + 'DD']
                  }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                  ) : (
                    <>
                      <Phone size={20} color={theme.colors.text} />
                      <Text
                        style={[
                          styles.buttonText,
                          { color: theme.colors.text },
                        ]}
                      >
                        Accept
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 56,
    fontFamily: 'Inter-Bold',
  },
  avatarRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    top: -10,
    left: -10,
  },
  avatarRingOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    top: -20,
    left: -20,
  },
  callerName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  callTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  callType: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  acceptButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
});
