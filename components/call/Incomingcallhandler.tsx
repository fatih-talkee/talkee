import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { notificationsService } from '@/services';
import { twilioVoiceService } from '@/services/twilioVoice.service';
import { router } from 'expo-router';
import { logger } from '@/lib/logger';
import { LinearGradient } from 'expo-linear-gradient';

interface IncomingCallData {
  call_sid?: string;
  caller_id?: string;
  caller_name: string;
  caller_avatar?: string;
  call_id?: string;
  call_type?: 'voice' | 'video';
}

export function IncomingCallHandler() {
  const { theme } = useTheme();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for incoming call notifications (app-level)
    const unsubscribe = notificationsService.onNotificationReceived(
      (notification) => {
        logger.info('[IncomingCall] Notification received', {
          type: notification.data?.type,
          call_sid: notification.data?.call_sid,
          call_id: notification.data?.call_id,
        });

        // If we receive an "ended/missed" signal, clear the in-app incoming UI.
        if (
          notification.data?.type === 'call_missed' ||
          notification.data?.type === 'call_ended'
        ) {
          const endedCallId = notification.data?.call_id;
          const endedCallSid = notification.data?.call_sid;

          setIncomingCall((prev) => {
            if (!prev) return null;

            // If payload includes identifiers, only clear when it matches the current modal call.
            if (endedCallId && prev.call_id && endedCallId !== prev.call_id) return prev;
            if (endedCallSid && prev.call_sid && endedCallSid !== prev.call_sid) return prev;

            return null;
          });

          setIsVisible(false);

          logger.info('[IncomingCall] Dismissing incoming call modal (ended/missed)', {
            type: notification.data?.type,
            call_id: endedCallId,
            call_sid: endedCallSid,
          });
          return;
        }

        // We currently send "call_request" from our backend/app when a user is calling a professional.
        // Twilio's own call invite is handled via the Voice SDK (see second effect below).
        if (
          notification.data?.type === 'incoming_call' ||
          notification.data?.type === 'call_request'
        ) {
          const callData: IncomingCallData = {
            call_sid: notification.data?.call_sid,
            call_id: notification.data?.call_id,
            caller_id: notification.data?.caller_id,
            caller_name: notification.data?.caller_name || 'Unknown',
            caller_avatar: notification.data?.caller_avatar,
            call_type: notification.data?.call_type,
          };

          setIncomingCall(callData);
          setIsVisible(true);

          logger.info('[IncomingCall] Showing incoming call modal', {
            call_sid: callData.call_sid,
            caller_id: callData.caller_id,
            caller_name: callData.caller_name,
            call_id: callData.call_id,
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Listen for Twilio Voice CallInvite (SDK-level "ringing" when app is foreground)
    const unsubscribe = twilioVoiceService.subscribe((state) => {
      if (!state.callInvite) return;

      const invite = state.callInvite as any;
      const callSid = invite.getCallSid?.();
      const from = invite.getFrom?.() || invite.getCaller?.() || 'Unknown';
      const custom = invite.getCustomParameters?.() as any;
      const callIdFromCustom =
        custom?.CallId || custom?.call_id || custom?.callId || undefined;

      setIncomingCall((prev) => ({
        call_sid: prev?.call_sid || callSid,
        call_id: prev?.call_id || callIdFromCustom,
        caller_id: prev?.caller_id || from,
        caller_name: prev?.caller_name || from || 'Unknown',
        caller_avatar: prev?.caller_avatar,
        call_type: prev?.call_type || 'voice',
      }));
      setIsVisible(true);

      logger.info('[IncomingCall] Twilio CallInvite received (ringing)', {
        call_sid: callSid,
        from,
        call_id: callIdFromCustom,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAccept = async () => {
    if (!incomingCall) return;

    try {
      logger.info('[IncomingCall] Accepting call', {
        call_sid: incomingCall.call_sid,
        call_id: incomingCall.call_id,
      });

      // Hide modal immediately
      setIsVisible(false);

      // Navigate to call screen (incoming=true). We prefer DB call_id if present.
      if (incomingCall.call_id) {
        router.push({
          pathname: '/call/[id]',
          params: {
            id: incomingCall.call_id,
            type: incomingCall.call_type || 'voice',
            incoming: 'true',
          },
        });
      } else {
        // If we don't have a DB call record id, we can still show the modal UI;
        // call screen currently expects a DB call id for details/accept flow.
        logger.warn('[IncomingCall] Missing call_id; staying on modal', {
          call_sid: incomingCall.call_sid,
        });
        setIsVisible(true);
        return;
      }

      // Clear incoming call state
      setIncomingCall(null);
    } catch (error) {
      logger.error('[IncomingCall] Accept error:', error);
      setIsVisible(false);
      setIncomingCall(null);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    try {
      logger.info('[IncomingCall] Declining call', {
        call_sid: incomingCall.call_sid,
        call_id: incomingCall.call_id,
      });

      // Reject call invite if present (Twilio SDK)
      await twilioVoiceService.rejectIncomingCall({
        callId: incomingCall.call_id,
      });

      setIsVisible(false);
      setIncomingCall(null);
    } catch (error) {
      logger.error('[IncomingCall] Decline error:', error);
      setIsVisible(false);
      setIncomingCall(null);
    }
  };

  if (!incomingCall) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#1f2937', '#374151']}
          style={styles.container}
        >
          {/* Caller Avatar */}
          <View style={styles.avatarContainer}>
            {incomingCall.caller_avatar ? (
              <Image
                source={{ uri: incomingCall.caller_avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {incomingCall.caller_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.pulseRing} />
            <View style={[styles.pulseRing, styles.pulseRingDelay]} />
          </View>

          {/* Caller Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.callerName}>{incomingCall.caller_name}</Text>
            <Text style={styles.callStatus}>Incoming voice call...</Text>
          </View>

          {/* Call Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
            >
              <PhoneOff size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Phone size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Action Labels */}
          <View style={styles.labelsContainer}>
            <Text style={styles.actionLabel}>Decline</Text>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 32px rgba(0,0,0,0.4)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 32,
          elevation: 16,
        }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 2,
  },
  avatarPlaceholder: {
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  pulseRing: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#10B981',
    opacity: 0.6,
    zIndex: 1,
  },
  pulseRingDelay: {
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 80,
    opacity: 0.3,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  callerName: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callStatus: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 60,
    marginBottom: 16,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 16px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }),
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  labelsContainer: {
    flexDirection: 'row',
    gap: 60,
    paddingHorizontal: 36,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    textAlign: 'center',
    width: 72,
  },
});
