import { useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { supabase } from '@/lib/supabase';
import { TwilioVideo } from '@twilio/video-react-native-sdk';
import { logger } from '@/lib/logger';

export type RoomState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface RemoteParticipantTrack {
  participantSid: string;
  videoTrackSid: string;
  identity: string;
}

export function useTwilioVideo() {
  const videoRef = useRef<TwilioVideo | null>(null);
  
  const [roomState, setRoomState] = useState<RoomState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // ParticipantSid -> VideoTrackSid eşleşmesi (basit MVP için her participant'tan ilk video track'i tutuyoruz)
  const [remoteParticipantTracks, setRemoteParticipantTracks] = useState<Record<string, RemoteParticipantTrack>>({});

  const connectToRoom = useCallback(async (roomName: string) => {
    try {
      logger.info('🎥 [useTwilioVideo] Starting connection process...', { roomName });
      
      // --- Android Permission Preflight ---
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          throw new Error('Camera/Microphone permission denied');
        }
      }
      // ----------------------------------

      setRoomState('connecting');
      setError(null);
      setRemoteParticipantTracks({}); 

      const { data, error: tokenError } = await supabase.functions.invoke(
        'twilio-token',
        { body: { mode: 'video', roomName } }
      );

      if (tokenError) {
        throw new Error(`Token error: ${tokenError.message}`);
      }

      if (!data?.token) {
        throw new Error('No token returned from edge function');
      }

      logger.info('🔑 [useTwilioVideo] Token received successfully');

      videoRef.current?.connect({
        roomName,
        accessToken: data.token,
        enableAudio: true,
        enableVideo: true,
      });

    } catch (e: any) {
      const rawErrorStr = JSON.stringify(e, Object.getOwnPropertyNames(e));
      logger.error('❌ [useTwilioVideo] Connection failed', { 
        rawError: rawErrorStr,
        message: e.message,
        code: e.code,
        userInfo: e.userInfo,
        nativeStackAndroid: e.nativeStackAndroid
      });
      setError(e.message || 'Unknown connection error');
      setRoomState('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    logger.info('👋 [useTwilioVideo] Disconnecting from room...');
    videoRef.current?.disconnect();
    setRoomState('disconnected');
    setRemoteParticipantTracks({});
  }, []);

  // --- Remote Track Management Helpers ---
  const addRemoteVideoTrack = useCallback((participant: any, track: any) => {
    logger.info('📹 [useTwilioVideo] Remote video track added:', { identity: participant.identity, trackSid: track.trackSid });
    setRemoteParticipantTracks((prev) => ({
      ...prev,
      [participant.sid]: {
        participantSid: participant.sid,
        videoTrackSid: track.trackSid,
        identity: participant.identity,
      },
    }));
  }, []);

  const removeRemoteVideoTrack = useCallback((participant: any, track: any) => {
    logger.info('🚫 [useTwilioVideo] Remote video track removed:', { identity: participant.identity, trackSid: track.trackSid });
    setRemoteParticipantTracks((prev) => {
      const newState = { ...prev };
      if (newState[participant.sid]?.videoTrackSid === track.trackSid) {
        delete newState[participant.sid];
      }
      return newState;
    });
  }, []);

  const removeParticipant = useCallback((participant: any) => {
    logger.info('👋 [useTwilioVideo] Participant disconnected object cleanup:', { identity: participant.identity });
    setRemoteParticipantTracks((prev) => {
      const newState = { ...prev };
      delete newState[participant.sid];
      return newState;
    });
  }, []);

  return {
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
    removeParticipant
  };
}
