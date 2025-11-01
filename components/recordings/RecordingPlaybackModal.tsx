import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { X, Play, Pause, Volume2, Download, Share2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Recording {
  id: string;
  title: string;
  type: 'video' | 'audio';
  duration: string;
  date: string;
  thumbnail?: string;
  professionalName: string;
  fileUrl: string;
}

interface RecordingPlaybackModalProps {
  visible: boolean;
  onClose: () => void;
  recording: Recording;
}

export function RecordingPlaybackModal({
  visible,
  onClose,
  recording,
}: RecordingPlaybackModalProps) {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    console.log('Download recording:', recording.id);
  };

  const handleShare = () => {
    console.log('Share recording:', recording.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {recording.title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {recording.type === 'video' && recording.thumbnail ? (
              <View style={styles.videoContainer}>
                <Image
                  source={{ uri: recording.thumbnail }}
                  style={styles.videoThumbnail}
                />
                <View
                  style={[
                    styles.playButtonOverlay,
                    { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.playButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause size={32} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.audioContainer,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View
                  style={[
                    styles.audioIconCircle,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                >
                  <Volume2 size={48} color={theme.colors.primary} />
                </View>
                <TouchableOpacity
                  style={[
                    styles.audioPlayButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause size={24} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                  <Text style={styles.playButtonText}>
                    {isPlaying ? 'Pause' : 'Play'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.progressSection}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: theme.colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: '30%',
                    },
                  ]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text
                  style={[styles.timeText, { color: theme.colors.textMuted }]}
                >
                  {currentTime}
                </Text>
                <Text
                  style={[styles.timeText, { color: theme.colors.textMuted }]}
                >
                  {recording.duration}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.infoSection,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textMuted }]}
                >
                  Professional
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {recording.professionalName}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textMuted }]}
                >
                  Recorded
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {formatDate(recording.date)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textMuted }]}
                >
                  Duration
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {recording.duration}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handleDownload}
              >
                <Download size={20} color={theme.colors.text} />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Download
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handleShare}
              >
                <Share2 size={20} color={theme.colors.text} />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Share
                </Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  videoContainer: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  audioContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  audioIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  audioPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  infoSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
});
