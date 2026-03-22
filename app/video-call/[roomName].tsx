import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
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
} from 'lucide-react-native';
import { useTwilioVideo } from '@/hooks/useTwilioVideo';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useTheme } from '@/contexts/ThemeContext';

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

  const remoteTracks = Object.values(remoteParticipantTracks);
  const rate = ratePerMinute ? parseFloat(ratePerMinute) : 0;

  // autoConnect=true ise mount anında otomatik bağlan
  useEffect(() => {
    if (autoConnect === 'true' && roomName && roomState === 'disconnected') {
      connectToRoom(roomName);
    }
    // Yalnızca mount anında çalışsın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- Room Events ---
  const onRoomDidConnect = useCallback(() => {
    logger.info('✅ [VideoCallScreen] Odaya bağlandı');
    setRoomState('connected');
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    setDurationTimer(timer);
  }, [setRoomState]);

  const onRoomDidDisconnect = useCallback(
    ({ error: err }: any) => {
      logger.info('👋 [VideoCallScreen] Odadan ayrıldı', { err });
      setRoomState('disconnected');
      if (err) setError(err.message || 'Ayrılırken hata oluştu');
      if (durationTimer) clearInterval(durationTimer);
    },
    [setRoomState, setError, durationTimer]
  );

  const onRoomDidFailToConnect = useCallback(
    ({ error: err }: any) => {
      logger.error('❌ [VideoCallScreen] Bağlantı başarısız', err);
      setRoomState('disconnected');
      setError(err?.message || 'Bağlantı kurulamadı');
    },
    [setRoomState, setError]
  );

  const onParticipantAddedVideoTrack = useCallback(
    ({ participant, track }: any) => {
      logger.info('📹 [VideoCallScreen] Katılımcı video ekledi', {
        identity: participant.identity,
      });
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
      logger.info('👋 [VideoCallScreen] Katılımcı ayrıldı', {
        identity: participant.identity,
      });
      removeParticipant(participant);
    },
    [removeParticipant]
  );

  // --- Kontrol İşlevleri ---
  const handleConnect = useCallback(() => {
    if (roomName) connectToRoom(roomName);
  }, [roomName, connectToRoom]);

  const handleEndCall = useCallback(async () => {
    try {
      disconnect();
      if (durationTimer) clearInterval(durationTimer);

      // calls tablosunda status'u 'ended' olarak güncelle
      if (inviteId) {
        await supabase
          .from('calls')
          .update({ status: 'ended' })
          .eq('id', inviteId);
      }
    } catch (e) {
      logger.error('[VideoCallScreen] ❌ Arama bitirilirken hata', e);
    } finally {
      router.back();
    }
  }, [disconnect, durationTimer, inviteId]);

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      // Twilio Video yerel ses track'ini enable/disable et
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
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Üst Bilgi Şeridi */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => {}}>
            <Minimize2 size={18} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {roomState === 'connected' && (
              <View style={styles.durationBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.durationText}>
                  {formatDuration(duration)}
                </Text>
              </View>
            )}
            {roomState === 'connecting' && (
              <Text style={styles.statusText}>Bağlanıyor...</Text>
            )}
            {roomState === 'disconnected' && (
              <Text style={styles.statusText}>Bağlantı kesildi</Text>
            )}
          </View>

          {rate > 0 && (
            <View style={styles.rateChip}>
              <Text style={styles.rateText}>${rate.toFixed(2)}/dk</Text>
            </View>
          )}
        </View>

        {/* Ana Video Alanı */}
        <View style={styles.mainVideoArea}>
          {remoteTracks.length > 0 ? (
            // Uzak katılımcının video'su tam ekran
            <TwilioVideoParticipantView
              style={StyleSheet.absoluteFill}
              trackIdentifier={{
                participantSid: remoteTracks[0].participantSid,
                videoTrackSid: remoteTracks[0].videoTrackSid,
              }}
              scaleType="fill"
            />
          ) : (
            // Bekleme ekranı — karşı taraf yoksa
            <View style={styles.waitingContainer}>
              {callerAvatar ? (
                <Image
                  source={{ uri: callerAvatar }}
                  style={styles.callerAvatar}
                />
              ) : (
                <LinearGradient
                  colors={['#3b82f6', '#1d4ed8']}
                  style={styles.callerAvatarPlaceholder}
                >
                  <Text style={styles.callerAvatarText}>
                    {callerName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}

              {callerName && (
                <Text style={styles.callerName}>{callerName}</Text>
              )}

              <Text style={styles.waitingText}>
                {roomState === 'connected'
                  ? 'Katılımcı bekleniyor...'
                  : roomState === 'connecting'
                  ? 'Bağlanıyor...'
                  : 'Video Call'}
              </Text>

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {/* Kendi Kamerası — Köşede Küçük */}
          {roomState === 'connected' && !isCameraOff && (
            <View style={styles.localVideoWrapper}>
              <TwilioVideoLocalView
                enabled={true}
                style={styles.localVideo}
                scaleType="fill"
              />
              <View style={styles.localLabel}>
                <Text style={styles.localLabelText}>Siz</Text>
              </View>
            </View>
          )}

          {/* Kamera kapalıysa "Kameranız Kapalı" göster */}
          {roomState === 'connected' && isCameraOff && (
            <View style={styles.localVideoOff}>
              <VideoOff size={16} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Alt Kontrol Çubuğu */}
        <View style={styles.controls}>
          {/* Başlat butonu (henüz bağlanmadıysa) */}
          {roomState === 'disconnected' && !error && (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleConnect}
            >
              <Text style={styles.startBtnText}>Aramayı Başlat</Text>
            </TouchableOpacity>
          )}

          {/* Bağlanınca kontroller */}
          {(roomState === 'connecting' || roomState === 'connected') && (
            <View style={styles.callControls}>
              {/* Mute */}
              <TouchableOpacity
                style={[
                  styles.ctrlBtn,
                  isMuted && styles.ctrlBtnActive,
                ]}
                onPress={handleToggleMute}
              >
                {isMuted ? (
                  <MicOff size={22} color="#fff" />
                ) : (
                  <Mic size={22} color="#fff" />
                )}
                <Text style={styles.ctrlLabel}>
                  {isMuted ? 'Susturuldu' : 'Mikrofon'}
                </Text>
              </TouchableOpacity>

              {/* Kamerayı Çevir */}
              <TouchableOpacity style={styles.ctrlBtn} onPress={handleFlipCamera}>
                <CameraIcon size={22} color="#fff" />
                <Text style={styles.ctrlLabel}>Çevir</Text>
              </TouchableOpacity>

              {/* Kamera Kapat */}
              <TouchableOpacity
                style={[styles.ctrlBtn, isCameraOff && styles.ctrlBtnActive]}
                onPress={handleToggleCamera}
              >
                {isCameraOff ? (
                  <VideoOff size={22} color="#fff" />
                ) : (
                  <Video size={22} color="#fff" />
                )}
                <Text style={styles.ctrlLabel}>
                  {isCameraOff ? 'Kamera Kapalı' : 'Kamera'}
                </Text>
              </TouchableOpacity>

              {/* Aramayı Bitir */}
              <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
                <PhoneOff size={26} color="#fff" />
                <Text style={styles.ctrlLabel}>Bitir</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Twilio Video Motoru */}
        <TwilioVideo
          ref={videoRef}
          onRoomDidConnect={onRoomDidConnect}
          onRoomDidDisconnect={onRoomDidDisconnect}
          onRoomDidFailToConnect={onRoomDidFailToConnect}
          onRoomParticipantDidConnect={() => {}}
          onRoomParticipantDidDisconnect={onRoomParticipantDidDisconnect}
          onParticipantAddedVideoTrack={onParticipantAddedVideoTrack}
          onParticipantRemovedVideoTrack={onParticipantRemovedVideoTrack}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  durationText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Inter-Medium',
    letterSpacing: 1,
  },
  statusText: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: 'Inter-Regular',
  },
  rateChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rateText: {
    fontSize: 12,
    color: '#e5e7eb',
    fontFamily: 'Inter-Medium',
  },
  // --- Ana Video ---
  mainVideoArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  callerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  callerAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  callerAvatarText: {
    fontSize: 40,
    color: '#fff',
    fontFamily: 'Inter-Bold',
  },
  callerName: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'Inter-Bold',
  },
  waitingText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // --- Yerel Video (köşe) ---
  localVideoWrapper: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }
      : { elevation: 8 }),
  },
  localVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  localLabel: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  localLabelText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'Inter-Medium',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  localVideoOff: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // --- Alt Kontroller ---
  controls: {
    paddingBottom: Platform.OS === 'android' ? 24 : 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  startBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ctrlBtn: {
    alignItems: 'center',
    gap: 6,
    width: 70,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ctrlBtnActive: {
    backgroundColor: '#ef4444',
  },
  ctrlLabel: {
    fontSize: 10,
    color: '#e5e7eb',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  endBtn: {
    alignItems: 'center',
    gap: 6,
    width: 70,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ef4444',
  },
});
