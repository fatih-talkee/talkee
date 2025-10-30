import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, MessageCircle, MoveVertical as MoreVertical, Minimize2 } from 'lucide-react-native';
import { mockProfessionals } from '@/mockData/professionals';
import { LinearGradient } from 'expo-linear-gradient';

export default function CallScreen() {
  const { id, type } = useLocalSearchParams();
  const professional = mockProfessionals.find(p => p.id === id);
  const [isConnected, setIsConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [costPerSecond] = useState(professional ? professional.ratePerMinute / 60 : 0);

  useEffect(() => {
    // Simulate call connection
    const connectTimer = setTimeout(() => {
      setIsConnected(true);
    }, 3000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentCost = duration * costPerSecond;

  const handleEndCall = () => {
    router.replace(`/call-review/${professional.id}`);
  };

  if (!professional) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Professional not found</Text>
      </SafeAreaView>
    );
  }

  if (isMinimized) {
    return (
      <View style={styles.minimizedCall}>
        <TouchableOpacity 
          style={styles.minimizedContent}
          onPress={() => setIsMinimized(false)}
        >
          <Image source={{ uri: professional.avatar }} style={styles.minimizedAvatar} />
          <View style={styles.minimizedInfo}>
            <Text style={styles.minimizedName}>{professional.name}</Text>
            <Text style={styles.minimizedDuration}>{formatDuration(duration)}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1f2937', '#374151']}
        style={styles.background}
      >
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
              {!isConnected ? 'Connecting...' : 'Connected'}
            </Text>
            <Text style={styles.callType}>
              {type === 'video' ? 'Video Call' : 'Voice Call'}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Professional Info */}
        <View style={styles.professionalInfo}>
          <View style={styles.professionalCard}>
            <Image source={{ uri: professional.avatar }} style={styles.professionalAvatar} />
            <Text style={styles.professionalName}>{professional.name}</Text>
            <Text style={styles.professionalTitle}>{professional.title}</Text>
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
            <Text style={styles.statValue}>${currentCost.toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>${professional.ratePerMinute}/min</Text>
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
        <View style={styles.callControls}>
          <TouchableOpacity 
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <MicOff size={24} color="#ffffff" />
            ) : (
              <Mic size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {type === 'video' && (
            <TouchableOpacity 
              style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
              onPress={() => setIsVideoOff(!isVideoOff)}
            >
              {isVideoOff ? (
                <VideoOff size={24} color="#ffffff" />
              ) : (
                <Video size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlButton}>
            <MessageCircle size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <PhoneOff size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
});