import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/lib/toastService';
import {
  Rss,
  Plus,
  Edit2,
  Trash2,
  Pin,
  X,
  Clock,
} from 'lucide-react-native';
import {
  useProfessionalFeeds,
  useCreateFeed,
  useUpdateFeed,
  useDeleteFeed,
} from '@/hooks/useProfessionalFeeds';
import type {
  ProfessionalFeedWithDetails,
  CreateFeedRequest,
  UpdateFeedRequest,
} from '@/types/database.types';

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { profileData } = useProfile();

  const [showFeedModal, setShowFeedModal] = useState(false);
  const [editingFeed, setEditingFeed] =
    useState<ProfessionalFeedWithDetails | null>(null);
  const [feedContent, setFeedContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const professionalId = profileData?.professional?.id || '';

  const { data: feedsData, isLoading: feedsLoading } = useProfessionalFeeds(
    professionalId,
    100
  );

  const createFeedMutation = useCreateFeed();
  const updateFeedMutation = useUpdateFeed();
  const deleteFeedMutation = useDeleteFeed();

  const feeds = feedsData?.feeds || [];

  const handleAddFeed = () => {
    setEditingFeed(null);
    setFeedContent('');
    setIsPinned(false);
    setFeedError(null);
    setShowFeedModal(true);
  };

  const handleEditFeed = (feed: ProfessionalFeedWithDetails) => {
    setEditingFeed(feed);
    setFeedContent(feed.content);
    setIsPinned(feed.is_pinned);
    setFeedError(null);
    setShowFeedModal(true);
  };

  const handleSaveFeed = async () => {
    if (!professionalId) {
      toast.error({
        title: 'Error',
        message: 'Professional data not found',
      });
      return;
    }

    // Validation
    if (!feedContent.trim()) {
      setFeedError('Please enter feed content');
      return;
    }

    if (feedContent.length < 10) {
      setFeedError('Content must be at least 10 characters');
      return;
    }

    if (feedContent.length > 1000) {
      setFeedError('Content must be at most 1000 characters');
      return;
    }

    setFeedError(null);

    try {
      if (editingFeed) {
        // Update existing feed
        const result = await updateFeedMutation.mutateAsync({
          feedId: editingFeed.id,
          data: {
            content: feedContent.trim(),
            is_pinned: isPinned,
          },
        });

        if (!result.success) {
          toast.error({
            title: 'Error',
            message: result.error || 'Failed to update feed',
          });
          return;
        }

        toast.success({
          title: 'Success',
          message: 'Feed updated successfully',
        });
      } else {
        // Create new feed
        const result = await createFeedMutation.mutateAsync({
          professionalId,
          data: {
            content: feedContent.trim(),
            is_pinned: isPinned,
          },
        });

        if (!result.success) {
          toast.error({
            title: 'Error',
            message: result.error || 'Failed to create feed',
          });
          return;
        }

        toast.success({
          title: 'Success',
          message: 'Feed created successfully',
        });
      }

      setShowFeedModal(false);
      setEditingFeed(null);
      setFeedContent('');
      setIsPinned(false);
    } catch (error: any) {
      console.error('Error saving feed:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to save feed',
      });
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    try {
      const result = await deleteFeedMutation.mutateAsync(feedId);

      if (!result.success) {
        toast.error({
          title: 'Error',
          message: result.error || 'Failed to delete feed',
        });
        return;
      }

      toast.success({
        title: 'Success',
        message: 'Feed deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting feed:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to delete feed',
      });
    }
  };

  const handleTogglePin = async (feed: ProfessionalFeedWithDetails) => {
    try {
      const result = await updateFeedMutation.mutateAsync({
        feedId: feed.id,
        data: {
          is_pinned: !feed.is_pinned,
        },
      });

      if (!result.success) {
        toast.error({
          title: 'Error',
          message: result.error || 'Failed to update pin status',
        });
        return;
      }

      toast.success({
        title: 'Success',
        message: feed.is_pinned
          ? 'Feed unpinned successfully'
          : 'Feed pinned successfully',
      });
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to update pin status',
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (feedsLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textMuted }]}
          >
            Loading feeds...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Feed Management
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Manage your posts and content
          </Text>
        </View>

        {feeds.length === 0 ? (
          <Card
            style={[
              styles.emptyCard,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Rss size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Feeds Yet
            </Text>
            <Text
              style={[
                styles.emptyDescription,
                { color: theme.colors.textMuted },
              ]}
            >
              Share updates, tips, and insights with your audience
            </Text>
            <Button
              title="Create First Feed"
              onPress={handleAddFeed}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          <>
            {feeds.map((feed) => (
              <Card
                key={feed.id}
                style={[
                  styles.feedCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderLeftWidth: feed.is_pinned ? 4 : 1,
                    borderLeftColor: feed.is_pinned
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.feedHeader}>
                  <View style={styles.feedHeaderLeft}>
                    {feed.is_pinned && (
                      <View
                        style={[
                          styles.pinBadge,
                          { backgroundColor: theme.colors.primary + '20' },
                        ]}
                      >
                        <Pin size={14} color={theme.colors.primary} fill={theme.colors.primary} />
                      </View>
                    )}
                    <View style={styles.timeContainer}>
                      <Clock size={12} color={theme.colors.textMuted} />
                      <Text
                        style={[
                          styles.timeText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {formatTimeAgo(feed.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.feedActions}>
                    <TouchableOpacity
                      onPress={() => handleTogglePin(feed)}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: feed.is_pinned
                            ? theme.colors.primary + '20'
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <Pin
                        size={16}
                        color={
                          feed.is_pinned
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                        fill={
                          feed.is_pinned ? theme.colors.primary : 'transparent'
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleEditFeed(feed)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.colors.accent + '20' },
                      ]}
                    >
                      <Edit2 size={16} color={theme.colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteFeed(feed.id)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: '#ef444420' },
                      ]}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.feedContent, { color: theme.colors.text }]}>
                  {feed.content}
                </Text>
              </Card>
            ))}

            <TouchableOpacity
              onPress={handleAddFeed}
              style={[
                styles.addFeedButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                },
              ]}
            >
              <Plus size={20} color={theme.colors.primary} />
              <Text
                style={[
                  styles.addFeedText,
                  {
                    color: theme.colors.primary,
                    marginLeft: 8,
                    fontFamily: 'Inter-Bold',
                    fontSize: 15,
                  },
                ]}
              >
                Add New Feed
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Feed Modal */}
      {showFeedModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFeedModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowFeedModal(false)}
            />
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {editingFeed ? 'Edit Feed' : 'Create Feed'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFeedModal(false)}
                >
                  <Text
                    style={[styles.modalClose, { color: theme.colors.text }]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {feedError && (
                  <View
                    style={[
                      styles.errorContainer,
                      { backgroundColor: theme.colors.error + '10' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.errorText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {feedError}
                    </Text>
                  </View>
                )}

                {/* Content Input */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Content *
                  </Text>
                  <TextInput
                    value={feedContent}
                    onChangeText={(text) => {
                      setFeedContent(text);
                      setFeedError(null);
                    }}
                    placeholder="Share your thoughts, tips, or updates..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={6}
                    maxLength={1000}
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: feedError
                          ? theme.colors.error
                          : theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    textAlignVertical="top"
                  />
                  <Text
                    style={[
                      styles.charCount,
                      {
                        color:
                          feedContent.length > 1000
                            ? theme.colors.error
                            : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {feedContent.length} / 1000
                  </Text>
                </View>

                {/* Pin Toggle */}
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => setIsPinned(!isPinned)}
                    style={[
                      styles.pinToggle,
                      {
                        backgroundColor: isPinned
                          ? theme.colors.primary + '20'
                          : theme.colors.card,
                        borderColor: isPinned
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.pinToggleCircle,
                        {
                          borderColor: isPinned
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      {isPinned && (
                        <View
                          style={[
                            styles.pinToggleInner,
                            { backgroundColor: theme.colors.primary },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.pinToggleText}>
                      <Text style={[styles.pinToggleTitle, { color: theme.colors.text }]}>
                        Pin this feed
                      </Text>
                      <Text
                        style={[
                          styles.pinToggleDescription,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Pinned feeds appear at the top of your profile
                      </Text>
                    </View>
                    <Pin
                      size={20}
                      color={isPinned ? theme.colors.primary : theme.colors.textMuted}
                      fill={isPinned ? theme.colors.primary : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <Button
                  title={editingFeed ? 'Update' : 'Create'}
                  onPress={handleSaveFeed}
                  disabled={
                    createFeedMutation.isPending ||
                    updateFeedMutation.isPending ||
                    !feedContent.trim() ||
                    feedContent.length < 10
                  }
                  style={styles.modalButtonFullWidth}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
  feedCard: {
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  feedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedContent: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  addFeedButton: {
    marginTop: 16,
  },
  addFeedText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  modalClose: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalButtonFullWidth: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 6,
    textAlign: 'right',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  pinToggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinToggleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pinToggleText: {
    flex: 1,
  },
  pinToggleTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  pinToggleDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
});

