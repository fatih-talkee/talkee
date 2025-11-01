import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { Play, Video, Mic, Clock, Calendar } from 'lucide-react-native';
import { RecordingPlaybackModal } from '@/components/recordings/RecordingPlaybackModal';

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

export default function RecordingsScreen() {
  const { theme } = useTheme();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    null
  );
  const [playbackModalVisible, setPlaybackModalVisible] = useState(false);

  const recordings: Recording[] = [
    {
      id: '1',
      title: 'Career Guidance Session',
      type: 'video',
      duration: '45:30',
      date: '2024-10-18',
      thumbnail:
        'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
      professionalName: 'Dr. Sarah Chen',
      fileUrl: 'https://example.com/recording1.mp4',
    },
    {
      id: '2',
      title: 'Life Coaching Call',
      type: 'audio',
      duration: '32:15',
      date: '2024-10-15',
      professionalName: 'Michael Roberts',
      fileUrl: 'https://example.com/recording2.mp3',
    },
    {
      id: '3',
      title: 'Business Strategy Discussion',
      type: 'video',
      duration: '1:12:45',
      date: '2024-10-12',
      thumbnail:
        'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400',
      professionalName: 'Jennifer Martinez',
      fileUrl: 'https://example.com/recording3.mp4',
    },
    {
      id: '4',
      title: 'Technical Consultation',
      type: 'audio',
      duration: '28:50',
      date: '2024-10-10',
      professionalName: 'David Park',
      fileUrl: 'https://example.com/recording4.mp3',
    },
    {
      id: '5',
      title: 'Financial Planning Session',
      type: 'video',
      duration: '55:20',
      date: '2024-10-08',
      thumbnail:
        'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400',
      professionalName: 'Emily Watson',
      fileUrl: 'https://example.com/recording5.mp4',
    },
  ];

  const handleRecordingPress = (recording: Recording) => {
    setSelectedRecording(recording);
    setPlaybackModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderRecordingItem = ({ item }: { item: Recording }) => (
    <TouchableOpacity
      style={[
        styles.recordingCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => handleRecordingPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.recordingContent}>
        {item.type === 'video' && item.thumbnail ? (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            <View
              style={[
                styles.playOverlay,
                { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
              ]}
            >
              <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View
              style={[
                styles.durationBadge,
                { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
              ]}
            >
              <Text style={styles.durationBadgeText}>{item.duration}</Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.audioIconContainer,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <Mic size={32} color={theme.colors.primary} />
          </View>
        )}

        <View style={styles.recordingInfo}>
          <View style={styles.typeRow}>
            {item.type === 'video' ? (
              <Video size={14} color={theme.colors.primary} />
            ) : (
              <Mic size={14} color={theme.colors.primary} />
            )}
            <Text style={[styles.typeText, { color: theme.colors.primary }]}>
              {item.type === 'video' ? 'Video' : 'Audio'}
            </Text>
          </View>

          <Text
            style={[styles.recordingTitle, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.professionalName,
              { color: theme.colors.textSecondary },
            ]}
          >
            with {item.professionalName}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={12} color={theme.colors.textMuted} />
              <Text
                style={[styles.metaText, { color: theme.colors.textMuted }]}
              >
                {formatDate(item.date)}
              </Text>
            </View>
            {item.type === 'audio' && (
              <View style={styles.metaItem}>
                <Clock size={12} color={theme.colors.textMuted} />
                <Text
                  style={[styles.metaText, { color: theme.colors.textMuted }]}
                >
                  {item.duration}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Your saved call recordings
          </Text>
          <Text style={[styles.count, { color: theme.colors.textMuted }]}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={recordings}
          renderItem={renderRecordingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {selectedRecording && (
        <RecordingPlaybackModal
          visible={playbackModalVisible}
          onClose={() => {
            setPlaybackModalVisible(false);
            setSelectedRecording(null);
          }}
          recording={selectedRecording}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    paddingVertical: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  listContainer: {
    paddingBottom: 20,
  },
  recordingCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingContent: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbnailContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  audioIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  recordingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
});
