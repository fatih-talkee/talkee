import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageCircle,
  MoveVertical as MoreVertical,
  Minimize2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { notificationsService } from '@/services';

// ✅ TWILIO IMPORTS
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useProfessional } from '@/hooks/useProfessionals';
import { useProfile } from '@/hooks/useProfile';
import { getSpeakerEnabled, setSpeakerEnabled } from '@/lib/audioRoute';

export default function CallScreen() {
  const { id, type, urgent, incoming } = useLocalSearchParams();
  const isIncoming = incoming === 'true';
  const insets = useSafeAreaInsets();
  const { user } = useProfile();

  const professionalId = isIncoming ? '' : (id as string);

  // ✅ FETCH PROFESSIONAL DATA (outgoing calls)
  const { data: professionalData, isLoading: professionalLoading } =
    useProfessional(professionalId);
  const professional = professionalData || null;

  // ✅ TWILIO VOICE HOOK
  const {
    callState,
    isInitialized,
    isConnecting,
    isConnected,
    isIdle,
    error: twilioError,
    makeCall,
    acceptIncomingCall,
    rejectIncomingCall,
    disconnect,
    toggleMute,
  } = useTwilioVoice();

  // Derive UI state from Twilio call state
  const isMuted = callState.isMuted;
  const callSid =
    (callState.call as any)?.callSid ??
    (callState.call as any)?.sid ??
    (callState.call as any)?.getSid?.();
  const inviteSid = (callState.callInvite as any)?.getCallSid?.();

  // ✅ LOCAL STATE
  const [duration, setDuration] = useState(0);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [incomingCallDetails, setIncomingCallDetails] = useState<{
    callId: string;
    callerId?: string;
    callerName?: string;
    callerAvatarUrl?: string;
    callType?: string;
  } | null>(null);
  const [costPerSecond] = useState(
    professional ? Number(professional.rate_per_minute) / 60 : 0
  );

  const callAttemptId = useMemo(() => {
    const rand = Math.random().toString(36).slice(2, 8);
    return `call_${Date.now()}_${rand}`;
  }, []);

  // End the call if the user leaves this screen or backgrounds the app.
  // (We can't reliably run code on process-kill; Twilio status callbacks + webhook push are the safety net.)
  const hasEndedRef = useRef(false);
  const callStateRef = useRef(callState);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // If the remote party ends the call, the Twilio SDK will transition our call state to "disconnected".
  // In that case, exit the call screen automatically (otherwise the user gets stuck on the call UI).
  useEffect(() => {
    if (!callInitiated) return;
    if (hasEndedRef.current) return;

    if (callState.status === 'disconnected') {
      hasEndedRef.current = true;
      logger.info('[CallScreen] Call ended by remote/SDK; leaving screen', {
        callAttemptId,
      });
      // Don't call disconnect() here; SDK already disconnected.
      router.back();
    }
  }, [callState.status, callInitiated, callAttemptId]);

  const safeEndCall = async (reason: string) => {
    if (hasEndedRef.current) return;

    // If there's no active call/invite, don't spam disconnect.
    const active =
      callStateRef.current.status === 'connecting' ||
      callStateRef.current.status === 'ringing' ||
      callStateRef.current.status === 'connected' ||
      !!callStateRef.current.callInvite;

    if (!active) return;

    hasEndedRef.current = true;
    logger.info('[CallScreen] Auto-ending call', {
      callAttemptId,
      reason,
      status: callStateRef.current.status,
    });
    try {
      await disconnect();
    } catch (e) {
      logger.warn('[CallScreen] Auto-end call failed', {
        callAttemptId,
        reason,
      });
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      // Don't auto-hangup on transient 'inactive' (common on iOS during interruptions/overlays).
      // Only auto-end when the app is truly backgrounded AND we haven't connected yet.
      if (nextState === 'background') {
        const status = callStateRef.current.status;
        const stillConnecting = status === 'connecting' || status === 'ringing';
        if (stillConnecting) {
          void safeEndCall(`appstate:${nextState}`);
        }
      }
    });

    return () => {
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      void safeEndCall('unmount');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ LOAD CALL DETAILS (incoming calls)
  useEffect(() => {
    let mounted = true;
    if (!isIncoming) return;
    if (!id) return;

    // If the user opened this screen from an OS notification, dismiss the original call_request
    // so it doesn't stay in the tray while they're viewing/answering.
    void notificationsService.dismissIncomingCallNotifications({
      callId: id as string,
      callSid: callSid as any,
    });

    (async () => {
      try {
        logger.info('[CallScreen] Loading incoming call details', {
          callAttemptId,
          callId: id,
        });

        const { data, error } = await supabase
          .from('calls')
          .select(
            `
            id,
            call_type,
            caller:users!caller_id(id, name, avatar_url)
          `
          )
          .eq('id', id as string)
          .single();

        if (error) {
          throw error;
        }

        if (!mounted) return;
        setIncomingCallDetails({
          callId: data?.id,
          callType: data?.call_type,
          callerId: data?.caller?.id,
          callerName: data?.caller?.name,
          callerAvatarUrl: data?.caller?.avatar_url,
        });
      } catch (e) {
        logger.error('[CallScreen] Failed to load incoming call details', e, {
          callAttemptId,
          callId: id,
        });
        if (mounted) {
          setIncomingCallDetails({
            callId: id as string,
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isIncoming, id, callAttemptId]);

  // Incoming screen: if the caller hangs up before we accept (or before invite arrives),
  // we might be sitting on this screen. Listen for webhook follow-up pushes and exit.
  useEffect(() => {
    if (!isIncoming) return;

    const unsubscribe = notificationsService.onNotificationReceived(
      (notification) => {
        const type = notification.data?.type;
        if (type !== 'call_ended' && type !== 'call_missed') return;

        const endedCallId = notification.data?.call_id;
        const endedCallSid = notification.data?.call_sid;

        const matchesCallId =
          Boolean(endedCallId) &&
          Boolean(incomingCallDetails?.callId) &&
          endedCallId === incomingCallDetails?.callId;

        const matchesSid =
          Boolean(endedCallSid) &&
          (endedCallSid === callSid || endedCallSid === inviteSid);

        if (!matchesCallId && !matchesSid) return;
        if (hasEndedRef.current) return;

        hasEndedRef.current = true;
        logger.info(
          '[CallScreen] Incoming call ended before answer; leaving screen',
          {
            callAttemptId,
            type,
            endedCallId,
            endedCallSid,
            callSid,
            inviteSid,
          }
        );
        router.back();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    isIncoming,
    incomingCallDetails?.callId,
    callAttemptId,
    callSid,
    inviteSid,
  ]);

  // ✅ INITIATE CALL ON MOUNT (outgoing only)
  useEffect(() => {
    logger.info('[CallScreen] Auto-init check', {
      callAttemptId,
      callInitiated,
      hasProfessional: !!professional,
      hasUser: !!user,
      isInitialized,
      callStatus: callState.status,
      route: { id, type, urgent, incoming },
    });

    if (isIncoming) return;

    if (!callInitiated && professional && user && isInitialized && isIdle) {
      initiateCall();
    }
  }, [
    callAttemptId,
    callInitiated,
    professional,
    user,
    isInitialized,
    isIdle,
    callState.status,
    id,
    type,
    urgent,
    incoming,
    isIncoming,
  ]);

  // ✅ DURATION TIMER (only when connected)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isConnected) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  // ✅ HANDLE TWILIO ERRORS
  useEffect(() => {
    if (twilioError) {
      logger.error('[CallScreen] Twilio error:', twilioError);
      Alert.alert(
        'Call Error',
        twilioError.message || 'Failed to connect call',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [twilioError]);

  const handleAcceptIncoming = async () => {
    if (!incomingCallDetails?.callId) return;
    try {
      logger.info('[CallScreen] Accepting incoming call', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        status: callState.status,
      });
      await acceptIncomingCall(incomingCallDetails.callId, callAttemptId);
      setCallInitiated(true);
    } catch (e) {
      logger.error('[CallScreen] Accept incoming call failed', e, {
        callAttemptId,
        callId: incomingCallDetails.callId,
      });
    }
  };

  const handleRejectIncoming = async () => {
    if (!incomingCallDetails?.callId) return;
    try {
      logger.info('[CallScreen] Rejecting incoming call', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        status: callState.status,
      });
      await rejectIncomingCall(incomingCallDetails.callId, callAttemptId);
      router.back();
    } catch (e) {
      logger.error('[CallScreen] Reject incoming call failed', e, {
        callAttemptId,
        callId: incomingCallDetails.callId,
      });
      router.back();
    }
  };

  // ✅ INITIATE CALL FUNCTION
  const initiateCall = async () => {
    if (!professional || !user) {
      logger.error('[CallScreen] Missing professional or user data');
      return;
    }

    try {
      setCallInitiated(true);

      logger.info('[CallScreen] Initiating call', {
        callAttemptId,
        routeProfessionalId: id,
        professionalId: professional.id,
        professionalUserId: professional.user_id,
        callType: type,
        urgent: urgent === 'true',
        twilio: {
          isInitialized,
          status: callState.status,
        },
      });

      // Call Twilio makeCall
      await makeCall(
        professional.id, // DB: professionals.id
        professional.user_id, // Twilio: users.id identity of callee
        type as 'voice' | 'video',
        urgent === 'true',
        callAttemptId
      );

      logger.info('[CallScreen] Call initiated successfully');
    } catch (error) {
      logger.error('[CallScreen] Failed to initiate call:', error);
      Alert.alert(
        'Call Failed',
        'Could not start the call. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  // ✅ FORMAT DURATION
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // ✅ CALCULATE CURRENT COST
  const currentCost = duration * costPerSecond;

  // ✅ HANDLE END CALL
  const handleEndCall = async () => {
    try {
      logger.info('[CallScreen] Ending call');

      // Disconnect Twilio call
      await disconnect();

      // Go back to previous screen
      router.back();
    } catch (error) {
      logger.error('[CallScreen] Error ending call:', error);
      // Go back anyway
      router.back();
    }
  };

  // ✅ HANDLE MUTE TOGGLE
  const handleMuteToggle = () => {
    try {
      toggleMute();
      logger.info('[CallScreen] Mute toggled', { callAttemptId });
    } catch (error) {
      logger.error('[CallScreen] Error toggling mute:', error);
    }
  };

  const handleSpeakerToggle = async () => {
    try {
      // Prefer local state for UX responsiveness; then verify actual route.
      const desired = !isSpeakerOn;
      const ok = await setSpeakerEnabled(desired);
      const actual = ok
        ? await getSpeakerEnabled().catch(() => desired)
        : isSpeakerOn;
      setIsSpeakerOn(actual);

      logger.info('[CallScreen] Speaker toggled', {
        callAttemptId,
        desired,
        ok,
        actual,
      });
    } catch (e) {
      logger.error('[CallScreen] Speaker toggle failed', e, { callAttemptId });
    }
  };

  // Keep the speaker UI in sync with the real audio route after connect.
  useEffect(() => {
    if (!isConnected) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      const current = await getSpeakerEnabled().catch(() => false);
      if (!cancelled) setIsSpeakerOn(current);
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  // ✅ LOADING STATE
  if (isIncoming) {
    // Incoming call screen doesn't need professional profile; show incoming UI
    const callerName = incomingCallDetails?.callerName || 'Unknown caller';
    const callerAvatarUrl = incomingCallDetails?.callerAvatarUrl || '';
    const canAccept = !!callState.callInvite;

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#111827', '#1f2937']}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Incoming call</Text>
            <Text style={[styles.loadingText, { fontSize: 18, marginTop: 8 }]}>
              {callerName}
            </Text>
            {callerAvatarUrl ? (
              <Image
                source={{ uri: callerAvatarUrl }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  marginTop: 18,
                }}
              />
            ) : null}

            <Text style={[styles.loadingText, { marginTop: 18, opacity: 0.8 }]}>
              {callState.callInvite
                ? 'Tap accept to answer'
                : 'Waiting for call invite...'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 18, marginTop: 22 }}>
              <TouchableOpacity
                style={[styles.endCallButton, { backgroundColor: '#EF4444' }]}
                onPress={handleRejectIncoming}
              >
                <PhoneOff size={22} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.endCallButton,
                  { backgroundColor: canAccept ? '#10B981' : '#374151' },
                ]}
                onPress={handleAcceptIncoming}
                disabled={!canAccept}
              >
                <Phone size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (professionalLoading || !professional) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1f2937', '#374151']}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ✅ MINIMIZED VIEW
  if (isMinimized) {
    return (
      <View style={styles.minimizedCall}>
        <TouchableOpacity
          style={styles.minimizedContent}
          onPress={() => setIsMinimized(false)}
        >
          <Image
            source={{ uri: professional.users?.avatar_url || '' }}
            style={styles.minimizedAvatar}
          />
          <View style={styles.minimizedInfo}>
            <Text style={styles.minimizedName}>
              {professional.users?.name || 'Unknown'}
            </Text>
            <Text style={styles.minimizedDuration}>
              {formatDuration(duration)}
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

  // ✅ MAIN CALL SCREEN
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1f2937', '#374151']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={() => setIsMinimized(true)}
          >
            <Minimize2 size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.callInfo}>
            <Text style={styles.callStatus}>
              {isConnecting
                ? 'Connecting...'
                : isConnected
                ? 'Connected'
                : 'Initiating...'}
            </Text>
            <Text style={styles.callType}>
              {type === 'video' ? 'Video Call' : 'Voice Call'}
              {urgent === 'true' && ' (Urgent)'}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Professional Info */}
        <View style={styles.professionalInfo}>
          <View style={styles.professionalCard}>
            <Image
              source={{ uri: professional.users?.avatar_url || '' }}
              style={styles.professionalAvatar}
            />
            <Text style={styles.professionalName}>
              {professional.users?.name || 'Unknown Professional'}
            </Text>
            <Text style={styles.professionalTitle}>
              {professional.title || professional.profession || 'Professional'}
            </Text>
          </View>
        </View>

        {/* Call Stats */}
        <View style={styles.callStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cost</Text>
            <Text style={styles.statValue}>{'$' + currentCost.toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>
              {'$' + Number(professional.rate_per_minute || 0).toFixed(2)}/min
            </Text>
          </View>
        </View>

        {/* Video Preview (for video calls) */}
        {type === 'video' && !isVideoOff && (
          <View style={styles.videoContainer}>
            <View style={styles.localVideo}>
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>You</Text>
              </View>
            </View>
          </View>
        )}

        {/* Call Controls */}
        <View
          style={[
            styles.callControls,
            {
              // Keep controls above Android system navigation bar / gesture area
              paddingBottom:
                (Platform.OS === 'android' ? 64 : 40) + (insets.bottom || 0),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.controlButton,
              isMuted && styles.controlButtonActive,
            ]}
            onPress={handleMuteToggle}
            disabled={!isConnected}
          >
            {isMuted ? (
              <MicOff size={24} color="#ffffff" />
            ) : (
              <Mic size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isSpeakerOn && styles.controlButtonActiveSpeaker,
            ]}
            onPress={handleSpeakerToggle}
            disabled={!isConnected || Platform.OS === 'web'}
          >
            {isSpeakerOn ? (
              <Volume2 size={24} color="#ffffff" />
            ) : (
              <VolumeX size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {type === 'video' && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                isVideoOff && styles.controlButtonActive,
              ]}
              onPress={() => setIsVideoOff(!isVideoOff)}
              disabled={!isConnected}
            >
              {isVideoOff ? (
                <VideoOff size={24} color="#ffffff" />
              ) : (
                <Video size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlButton}
            disabled={!isConnected}
          >
            <MessageCircle size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <PhoneOff size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Call SID Debug Info (remove in production) */}
        {__DEV__ && callSid && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Call SID: {callSid}</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: {
    alignItems: 'center',
  },
  callStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
  },
  callType: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalCard: {
    alignItems: 'center',
  },
  professionalAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  professionalName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  professionalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
  },
  callStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  localVideo: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#ef4444',
  },
  controlButtonActiveSpeaker: {
    backgroundColor: '#10B981',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedCall: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  minimizedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  minimizedInfo: {
    flex: 1,
  },
  minimizedName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  minimizedDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
  },
  minimizedEndCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
});
