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
  call_sid: string;
  caller_id: string;
  caller_name: string;
  caller_avatar?: string;
  call_id?: string;
}

export function IncomingCallHandler() {
  const { theme } = useTheme();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for incoming call notifications
    const unsubscribe = notificationsService.onNotificationReceived(
      (notification) => {
        logger.info('[IncomingCall] Notification received', {
          type: notification.data?.type,
          call_sid: notification.data?.call_sid,
        });

        if (notification.data?.type === 'incoming_call') {
          const callData: IncomingCallData = {
            call_sid: notification.data.call_sid,
            caller_id: notification.data.caller_id,
            caller_name: notification.data.caller_name || 'Unknown',
            caller_avatar: notification.data.caller_avatar,
            call_id: notification.data.call_id,
          };

          setIncomingCall(callData);
          setIsVisible(true);

          logger.info('[IncomingCall] Showing incoming call modal', {
            call_sid: callData.call_sid,
            caller_id: callData.caller_id,
            caller_name: callData.caller_name,
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAccept = async () => {
    if (!incomingCall) return;

    try {
      logger.info('[IncomingCall] Accepting call', {
        call_sid: incomingCall.call_sid,
      });

      // Hide modal immediately
      setIsVisible(false);

      // Navigate to call screen
      router.push({
        pathname: '/call/[id]',
        params: {
          id: incomingCall.caller_id,
          type: 'voice',
          incoming: 'true',
          call_sid: incomingCall.call_sid,
        },
      });

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
      });

      // Disconnect the call
      await twilioVoiceService.disconnect();

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
