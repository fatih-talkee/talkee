import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

interface CallDetails {
  callerName: string;
  callerAvatar: string | null;
  ratePerMinute: number;
  callId: string | null;
}

export default function IncomingCallHandler() {
  const { theme } = useTheme();
  const { callState, acceptIncomingCall, rejectIncomingCall } =
    useTwilioVoice();
  const [showModal, setShowModal] = useState(false);
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | undefined>(undefined);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (callState.status === 'ringing' && callState.callInvite) {
      setShowModal(true);
      loadIncomingCallDetails();
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
    } else {
      setShowModal(false);
      setCallDetails(null);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [callState.status, callState.callInvite]);

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
  }, [showModal, callDetails]);

  const loadIncomingCallDetails = async () => {
    if (!callState.callInvite) return;

    const callInvite = callState.callInvite as any;

    logger.info('[IncomingCallHandler] 📞 Loading incoming call details', {
      status: callState.status,
      hasCallInvite: !!callState.callInvite,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ FIX: Extract caller ID from CallInvite.from
      // Format: "client:USER_ID"
      const fromField = callInvite._from || callInvite.from;
      const callerId = fromField?.replace('client:', '') || null;

      logger.debug('[IncomingCallHandler] 📋 Call invite details', {
        from: fromField,
        callerId,
        to: callInvite._to || callInvite.to,
        callSid: callInvite._callSid?.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
      });

      if (!callerId) {
        logger.error('[IncomingCallHandler] ❌ No caller ID found', undefined, {
          fromField,
          timestamp: new Date().toISOString(),
        });

        setCallDetails({
          callerName: 'Unknown Caller',
          callerAvatar: null,
          ratePerMinute: 0,
          callId: null,
        });
        return;
      }

      // ✅ Load caller user info
      logger.debug('[IncomingCallHandler] 🔍 Querying user info', {
        callerId,
        timestamp: new Date().toISOString(),
      });

      const { data: callerUser, error: userError } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', callerId)
        .single();

      if (userError) {
        logger.error(
          '[IncomingCallHandler] ❌ Failed to load caller user',
          userError,
          {
            callerId,
            errorMessage: userError.message,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // ✅ Load user's own balance
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('wallet_balance')
          .eq('id', userData.user.id)
          .single();

        setUserBalance(
          profile?.wallet_balance ? Number(profile.wallet_balance) : undefined
        );
      }

      // ✅ Try to find call record by call_sid (might not exist yet)
      const callSid = callInvite._callSid || callInvite.callSid;
      let callRecord = null;
      let ratePerMinute = 0;

      if (callSid) {
        logger.debug('[IncomingCallHandler] 🔍 Looking for call record', {
          callSid: callSid.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        });

        const { data: foundCall } = await supabase
          .from('calls')
          .select('id, rate_per_minute')
          .eq('call_sid', callSid)
          .maybeSingle();

        if (foundCall) {
          callRecord = foundCall;
          ratePerMinute = Number(foundCall.rate_per_minute || 0);

          logger.info('[IncomingCallHandler] ✅ Call record found', {
            callId: foundCall.id,
            ratePerMinute,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.warn('[IncomingCallHandler] ⚠️ Call record not found yet', {
            callSid: callSid.substring(0, 20) + '...',
            note: 'Will retry or use default rate',
            timestamp: new Date().toISOString(),
          });
        }
      }

      setCallDetails({
        callerName: callerUser?.name || 'Unknown Caller',
        callerAvatar: callerUser?.avatar_url || null,
        ratePerMinute,
        callId: callRecord?.id || null,
      });

      logger.info('[IncomingCallHandler] ✅ Call details loaded', {
        callerName: callerUser?.name || 'Unknown',
        hasAvatar: !!callerUser?.avatar_url,
        ratePerMinute,
        hasCallId: !!callRecord?.id,
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

      setCallDetails({
        callerName: 'Unknown Caller',
        callerAvatar: null,
        ratePerMinute: 0,
        callId: null,
      });
    }
  };

  const handleAccept = async () => {
    if (!callState.callInvite || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    logger.info('[IncomingCallHandler] ✅ User accepted call', {
      callerName: callDetails?.callerName,
      ratePerMinute: callDetails?.ratePerMinute,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ Close modal IMMEDIATELY
      setShowModal(false);

      // ✅ Accept call via Twilio
      await acceptIncomingCall({
        callId: callDetails?.callId || undefined,
        ratePerMinute: callDetails?.ratePerMinute,
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

      // Re-show modal on error
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
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
  };

  if (!showModal || !callDetails) {
    return null;
  }

  return (
    <View
      style={[styles.overlay, { backgroundColor: theme.colors.background }]}
    >
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
                style={[styles.avatar, { borderColor: theme.colors.border }]}
              />
            ) : (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary + 'DD']}
                style={[
                  styles.avatarPlaceholder,
                  { borderColor: theme.colors.border },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.avatarText, { color: theme.colors.text }]}>
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

          {/* Call Type Badge */}
          <View
            style={[
              styles.callTypeBadge,
              { backgroundColor: theme.colors.card + '80' },
            ]}
          >
            <Text style={[styles.callType, { color: theme.colors.textMuted }]}>
              📞 Incoming Call
            </Text>
          </View>

          {/* Rate */}
          {callDetails.ratePerMinute > 0 && (
            <View style={styles.rateContainer}>
              <Text style={[styles.rate, { color: theme.colors.textMuted }]}>
                ${callDetails.ratePerMinute.toFixed(2)}
              </Text>
              <Text
                style={[styles.rateUnit, { color: theme.colors.textMuted }]}
              >
                /min
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttons}>
            {/* Decline Button */}
            <Pressable
              onPress={handleDecline}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
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
                      style={[styles.buttonText, { color: theme.colors.text }]}
                    >
                      Decline
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Accept Button */}
            <Pressable
              onPress={handleAccept}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.acceptButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={[theme.colors.success, theme.colors.success + 'DD']}
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
                      style={[styles.buttonText, { color: theme.colors.text }]}
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
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
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
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 40,
  },
  rate: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  rateUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
