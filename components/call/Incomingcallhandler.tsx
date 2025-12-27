import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
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

  useEffect(() => {
    if (callState.status === 'ringing' && callState.callInvite) {
      setShowModal(true);
      loadIncomingCallDetails();
    } else {
      setShowModal(false);
      setCallDetails(null);
    }
  }, [callState.status, callState.callInvite]);

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
    if (!callState.callInvite) return;

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
    if (!callState.callInvite) return;

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
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
        >
          {/* Caller Avatar */}
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

          {/* Caller Name */}
          <Text style={[styles.callerName, { color: theme.colors.text }]}>
            {callDetails.callerName}
          </Text>

          {/* Call Type */}
          <Text style={[styles.callType, { color: theme.colors.textMuted }]}>
            Incoming Call
          </Text>

          {/* Rate */}
          {callDetails.ratePerMinute > 0 && (
            <Text style={[styles.rate, { color: theme.colors.textMuted }]}>
              ${callDetails.ratePerMinute.toFixed(2)}/min
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.buttons}>
            {/* Decline Button */}
            <Pressable
              onPress={handleDecline}
              disabled={loading}
              style={[
                styles.button,
                styles.declineButton,
                { backgroundColor: theme.colors.error },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <PhoneOff size={24} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Decline</Text>
                </>
              )}
            </Pressable>

            {/* Accept Button */}
            <Pressable
              onPress={handleAccept}
              disabled={loading}
              style={[
                styles.button,
                styles.acceptButton,
                { backgroundColor: theme.colors.success },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Phone size={24} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Accept</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
  },
  callerName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  rate: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  declineButton: {},
  acceptButton: {},
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
