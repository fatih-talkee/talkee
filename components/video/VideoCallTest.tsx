import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TwilioVideoLocalView, TwilioVideo, TwilioVideoParticipantView } from '@twilio/video-react-native-sdk';
import { useTwilioVideo } from '@/hooks/useTwilioVideo';
import { logger } from '@/lib/logger';

export function VideoCallTest() {
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
    removeParticipant
  } = useTwilioVideo();

  const [roomId] = useState('test-video-room-1');

  // --- Room Events ---
  const onRoomDidConnect = () => {
    logger.info('✅ [VideoCallTest] Room connected!');
    setRoomState('connected');
  };

  const onRoomDidDisconnect = ({ error }: any) => {
    logger.info('👋 [VideoCallTest] Room disconnected.', { error });
    setRoomState('disconnected');
    if (error) setError(error.message || 'Disconnected with error');
  };

  const onRoomDidFailToConnect = ({ error }: any) => {
    const rawErrorStr = error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'null';
    logger.error('❌ [VideoCallTest] Failed to connect to room', { 
      rawError: rawErrorStr,
      message: error?.message,
      code: error?.code
    });
    setRoomState('disconnected');
    setError(`code: ${error?.code || 'N/A'} / message: ${error?.message || 'Unknown'}`);
  };

  // --- Participant Events ---
  const onRoomParticipantDidConnect = ({ participant }: any) => {
    logger.info('👤 [VideoCallTest] Participant joined room:', { identity: participant.identity, sid: participant.sid });
  };

  const onRoomParticipantDidDisconnect = ({ participant }: any) => {
    logger.info('👋 [VideoCallTest] Participant left room:', { identity: participant.identity, sid: participant.sid });
    removeParticipant(participant);
  };

  const onParticipantAddedVideoTrack = ({ participant, track }: any) => {
    logger.info('📹 [VideoCallTest] Participant added video track', { participantSid: participant.sid, trackSid: track.trackSid });
    addRemoteVideoTrack(participant, track);
  };

  const onParticipantRemovedVideoTrack = ({ participant, track }: any) => {
    logger.info('🚫 [VideoCallTest] Participant removed video track', { participantSid: participant.sid, trackSid: track.trackSid });
    removeRemoteVideoTrack(participant, track);
  };

  // Convert map to array for rendering
  const remoteTracks = Object.values(remoteParticipantTracks);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Twilio Video MVP Test</Text>
      
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>State: {roomState}</Text>
        <Text style={styles.statusText}>Participants: {remoteTracks.length}</Text>
        {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}
      </View>

      <View style={styles.videoContainer}>
        {/* If we have remote tracks, show the first one as main view */}
        {remoteTracks.length > 0 ? (
          <TwilioVideoParticipantView
            style={styles.mainVideo}
            trackIdentifier={{
              participantSid: remoteTracks[0].participantSid,
              videoTrackSid: remoteTracks[0].videoTrackSid
            }}
            scaleType="fill"
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>Waiting for participant...</Text>
          </View>
        )}

        {/* Local Preview (Floating Corner) */}
        {roomState === 'connected' && (
          <View style={styles.localVideoWrapper}>
            <TwilioVideoLocalView
              enabled={true}
              style={styles.localVideo}
              scaleType="fill"
            />
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {roomState === 'disconnected' ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={() => connectToRoom(roomId)}
          >
            <Text style={styles.buttonText}>Start Video Call</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={disconnect}
          >
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Twilio Video Core Component */}
      <TwilioVideo
        ref={videoRef}
        onRoomDidConnect={onRoomDidConnect}
        onRoomDidDisconnect={onRoomDidDisconnect}
        onRoomDidFailToConnect={onRoomDidFailToConnect}
        onRoomParticipantDidConnect={onRoomParticipantDidConnect}
        onRoomParticipantDidDisconnect={onRoomParticipantDidDisconnect}
        onParticipantAddedVideoTrack={onParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={onParticipantRemovedVideoTrack}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#111827',
  },
  statusBox: {
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 5,
  },
  videoContainer: {
    height: 350,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  localVideoWrapper: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderColor: '#374151',
    borderWidth: 2,
  },
  localVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  startButton: {
    backgroundColor: '#10b981',
  },
  endButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
