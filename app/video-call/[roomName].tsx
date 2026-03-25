import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
} from '@twilio/video-react-native-sdk';
import {
  PhoneOff,
  VideoOff,
  Video,
  Mic,
  MicOff,
  CameraIcon,
  Minimize2,
  PhoneCall,
} from 'lucide-react-native';
import { useTwilioVideo } from '@/hooks/useTwilioVideo';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useTheme } from '@/contexts/ThemeContext';
import { PerMinuteBilling } from '@/services/twilioVoice/billing/PerMinuteBilling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoCallScreen() {
  const { roomName, callerName, callerAvatar, ratePerMinute, inviteId, autoConnect } =
    useLocalSearchParams<{
      roomName: string;
      callerName?: string;
      callerAvatar?: string;
      ratePerMinute?: string;
      inviteId?: string;
      autoConnect?: string;
    }>();

  const { theme } = useTheme();

  const {
    videoRef,
    roomState,
    error,
    remoteParticipantTracks,
    connectToRoom,
    disconnect,
    setRoomState,
    setError,
    addRemoteVideoTrack,
    removeRemoteVideoTrack,
    removeParticipant,
  } = useTwilioVideo();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [duration, setDuration] = useState(0);
  const [durationTimer, setDurationTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const billingRef = React.useRef<PerMinuteBilling | null>(null);
  const callStartTimeRef = React.useRef<number | null>(null);

  const remoteTracks = Object.values(remoteParticipantTracks);
  const rate = ratePerMinute ? parseFloat(ratePerMinute) : 0;

  // --- Helper Functions ---
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const calculateCost = (secs: number, rateVal: number) => {
    if (rateVal <= 0) return '0.00';
    const minutes = Math.floor(secs / 60) + 1;
    return (minutes * rateVal).toFixed(2);
  };

  // --- IMPORTANT: Logic Functions (Define before Effects) ---
  const handleEndCall = useCallback(async () => {
    try {
      logger.info('🔚 [VideoCallScreen] Ending call...');
      disconnect();
      if (durationTimer) clearInterval(durationTimer);
      if (billingRef.current) {
        billingRef.current.stop();
        billingRef.current = null;
      }
      if (inviteId) {
        await supabase.from('calls').update({ status: 'ended' }).eq('id', inviteId);
      }
    } catch (e) {
      logger.error('[VideoCallScreen] ❌ Error while ending call', e);
    } finally {
      router.back();
    }
  }, [disconnect, durationTimer, inviteId]);

  const handleConnect = useCallback(() => {
    if (roomName) connectToRoom(roomName);
  }, [roomName, connectToRoom]);

  // --- Effects ---
  useEffect(() => {
    if (autoConnect === 'true' && roomName && roomState === 'disconnected') {
      connectToRoom(roomName);
    }
  }, [autoConnect, roomName, roomState, connectToRoom]);

  // ✅ Supabase Status Listener: Auto-end if status becomes ended/cancelled
  useEffect(() => {
    if (!inviteId) return;

    logger.info('🔌 [VideoCallScreen] Setting up Supabase listener for inviteId:', inviteId);
    
    const channel = supabase
      .channel(`call_status_${inviteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${inviteId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === 'ended' || updated.status === 'cancelled') {
            logger.info('🔔 [VideoCallScreen] Call status updated externally:', updated.status);
            handleEndCall();
          }
        }
      )
      .subscribe();

    return () => {
      logger.info('🔌 [VideoCallScreen] Removing Supabase listener');
      supabase.removeChannel(channel);
    };
  }, [inviteId, handleEndCall]);

  // --- Room Events ---
  const onRoomDidConnect = useCallback(() => {
    logger.info('✅ [VideoCallScreen] Connected to room');
    setRoomState('connected');
    
    // Eğer odaya girdiğimizde zaten buralarda biri varsa (biz alıcıysak) sayacı ve ücretlendirmeyi başlat
    if (remoteTracks.length > 0 && !durationTimer) {
      logger.info('⏱️ [VideoCallScreen] Remote participant already present, starting timer and billing');
      const now = Date.now();
      callStartTimeRef.current = now;
      
      const timer = setInterval(() => setDuration((d) => d + 1), 1000);
      setDurationTimer(timer);

      if (inviteId && rate > 0) {
        billingRef.current = new PerMinuteBilling(
          inviteId,
          rate,
          () => Math.floor((Date.now() - (callStartTimeRef.current || Date.now())) / 1000)
        );
        billingRef.current.start();
      }
    }
  }, [setRoomState, remoteTracks.length, durationTimer]);

  const onRoomDidDisconnect = useCallback(
    ({ error: err }: any) => {
      logger.info('👋 [VideoCallScreen] Left the room', { err });
      setRoomState('disconnected');
      if (err) setError(err.message || 'Error while leaving');
      if (durationTimer) clearInterval(durationTimer);
    },
    [setRoomState, setError, durationTimer]
  );

  const onRoomDidFailToConnect = useCallback(
    ({ error: err }: any) => {
      logger.error('❌ [VideoCallScreen] Connection failed', err);
      setRoomState('disconnected');
      setError(err?.message || 'Could not establish connection');
    },
    [setRoomState, setError]
  );

  const onParticipantAddedVideoTrack = useCallback(
    ({ participant, track }: any) => {
      addRemoteVideoTrack(participant, track);
    },
    [addRemoteVideoTrack]
  );

  const onParticipantRemovedVideoTrack = useCallback(
    ({ participant, track }: any) => {
      removeRemoteVideoTrack(participant, track);
    },
    [removeRemoteVideoTrack]
  );

  const onRoomParticipantDidDisconnect = useCallback(
    ({ participant }: any) => {
      removeParticipant(participant);
      logger.info('👋 [VideoCallScreen] Remote participant left, ending call...');
      // Bu bir 1-on-1 uygulama olduğu için, diğer katılımcı ayrıldığında arama bitmelidir.
      handleEndCall();
    },
    [removeParticipant, handleEndCall]
  );

  // --- Control Interactions ---
  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      (videoRef.current as any).setLocalAudioEnabled(!newMutedState);
    }
  }, [isMuted, videoRef]);

  const handleToggleCamera = useCallback(() => {
    if (videoRef.current) {
      const newState = !isCameraOff;
      setIsCameraOff(newState);
      (videoRef.current as any).setLocalVideoEnabled(!newState);
    }
  }, [isCameraOff, videoRef]);

  const handleFlipCamera = useCallback(() => {
    if (videoRef.current) {
      (videoRef.current as any).flipCamera();
      setIsFrontCamera((prev) => !prev);
    }
  }, [videoRef]);

  return (
    <View style={styles.container}>
      {/* Background Layer: Remote Video or Placeholder */}
      <View style={styles.backgroundLayer}>
        {remoteTracks.length > 0 ? (
          <TwilioVideoParticipantView
            style={StyleSheet.absoluteFill}
            trackIdentifier={{
              participantSid: remoteTracks[0].participantSid,
              videoTrackSid: remoteTracks[0].videoTrackSid,
            }}
            scaleType="fill"
          />
        ) : (
          <LinearGradient colors={['#111827', '#1f2937']} style={StyleSheet.absoluteFill}>
            <View style={styles.waitingContainer}>
              {callerAvatar ? (
                <Image source={{ uri: callerAvatar }} style={styles.waitingAvatar} />
              ) : (
                <View style={[styles.waitingAvatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 40, fontWeight: 'bold' }}>{callerName?.charAt(0) || '?'}</Text>
                </View>
              )}
              <Text style={styles.waitingName}>{callerName || 'Waiting for Participant'}</Text>
              <Text style={styles.waitingStatus}>
                {roomState === 'connecting' ? 'Connecting...' : 'Waiting for Connection'}
              </Text>
            </View>
          </LinearGradient>
        )}
      </View>

      {/* Local Video PIP (Picture-in-Picture) */}
      {roomState === 'connected' && (
        <View style={styles.pipContainer}>
          {!isCameraOff ? (
            <TwilioVideoLocalView enabled={true} style={styles.pipVideo} scaleType="fill" />
          ) : (
            <View style={styles.pipCameraOff}>
              <VideoOff size={24} color="#9ca3af" />
            </View>
          )}
        </View>
      )}

      {/* Header Over Video */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Minimize2 size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerStatusText}>
            {roomState === 'connected' ? 'Connected' : 'Preparing'}
          </Text>
          <Text style={styles.headerTypeText}>Video Call</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <PhoneCall size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Bottom Content Area */}
      <View style={styles.bottomArea}>
        {/* Stats Card (Horizontal from reference) */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Cost</Text>
            <Text style={styles.statValue}>{'$' + calculateCost(duration, rate)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>{'$' + rate.toFixed(2)}/min</Text>
          </View>
        </View>

        {/* Call Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.roundControl, isMuted && styles.roundControlActive]}
            onPress={handleToggleMute}
          >
            {isMuted ? <MicOff size={28} color="#ffffff" /> : <Mic size={28} color="#ffffff" />}
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roundControl, isCameraOff && styles.roundControlActive]}
            onPress={handleToggleCamera}
          >
            {isCameraOff ? <VideoOff size={28} color="#ffffff" /> : <Video size={28} color="#ffffff" />}
            <Text style={styles.controlLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.roundControl} onPress={handleFlipCamera}>
            <CameraIcon size={28} color="#ffffff" />
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallCircle} onPress={handleEndCall}>
            <PhoneOff size={32} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Twilio Video Engine */}
      <TwilioVideo
        ref={videoRef}
        onRoomDidConnect={onRoomDidConnect}
        onRoomDidDisconnect={onRoomDidDisconnect}
        onRoomDidFailToConnect={onRoomDidFailToConnect}
        onRoomParticipantDidConnect={() => {
          logger.info('👥 [VideoCallScreen] Remote participant connected');
          if (!durationTimer) {
            logger.info('⏱️ [VideoCallScreen] Starting duration timer and billing');
            const now = Date.now();
            callStartTimeRef.current = now;

            const timer = setInterval(() => setDuration((d) => d + 1), 1000);
            setDurationTimer(timer);

            if (inviteId && rate > 0) {
              billingRef.current = new PerMinuteBilling(
                inviteId,
                rate,
                () => Math.floor((Date.now() - (callStartTimeRef.current || Date.now())) / 1000)
              );
              billingRef.current.start();
            }
          }
        }}
        onRoomParticipantDidDisconnect={onRoomParticipantDidDisconnect}
        onParticipantAddedVideoTrack={onParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={onParticipantRemovedVideoTrack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  waitingName: {
    color: '#ffffff',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  waitingStatus: {
    color: '#9ca3af',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  pipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 },
      android: { elevation: 15 },
    }),
  },
  pipVideo: {
    flex: 1,
  },
  pipCameraOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerStatusText: {
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  headerTypeText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundControl: {
    alignItems: 'center',
    gap: 6,
  },
  roundControlActive: {
    opacity: 0.6,
  },
  controlLabel: {
    color: '#d1d5db',
    fontSize: 11,
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
});
