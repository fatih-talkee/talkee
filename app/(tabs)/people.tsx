import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';
import { usePeople } from '@/hooks/usePeople';
import { useRemoveFavorite } from '@/hooks/useFavorites';
import { Header } from '@/components/ui/Header';
import { PageLoading } from '@/components/ui/PageLoading';
import { useToast } from '@/lib/toastService';
import type { ProfessionalWithRelations } from '@/types/database.types';

export default function PeopleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch people data
  const { people, isLoading, error } = usePeople();
  const removeFavoriteMutation = useRemoveFavorite();

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size;
    const itemText = count === 1 ? 'person' : 'people';

    Alert.alert(
      'Remove from List',
      `Are you sure you want to remove ${count} ${itemText} from your list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Remove from favorites (if they are favorites)
            for (const id of selectedIds) {
              try {
                await removeFavoriteMutation.mutateAsync(id);
              } catch (error) {
                // Silently fail for non-favorites
              }
            }
            
            setSelectedIds(new Set());
            setIsEditMode(false);
            
            toast.success({
              title: 'Removed',
              message: `${count} ${itemText} removed from your list`,
            });
          },
        },
      ]
    );
  }, [selectedIds, removeFavoriteMutation, toast]);

  const handleRemove = useCallback(async (id: string, name: string) => {
    Alert.alert(
      'Remove from List',
      `Are you sure you want to remove ${name} from your list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Try to remove from favorites
            try {
              await removeFavoriteMutation.mutateAsync(id);
              toast.success({
                title: 'Removed',
                message: `${name} removed from your list`,
              });
            } catch (error) {
              // If not in favorites, just show success anyway
              toast.success({
                title: 'Removed',
                message: `${name} removed from your list`,
              });
            }
          },
        },
      ]
    );
  }, [removeFavoriteMutation, toast]);

  const renderRightActions = useCallback((item: ProfessionalWithRelations) => {
    return (
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
        onPress={() => handleRemove(item.id, item.users?.name || 'Unknown')}
      >
        <Trash2 size={20} color="#FFFFFF" />
        <Text style={styles.deleteButtonText}>Remove</Text>
      </TouchableOpacity>
    );
  }, [theme.colors.error, handleRemove]);

  const renderPeopleItem = useCallback(({ item }: { item: ProfessionalWithRelations }) => {
    const isSelected = selectedIds.has(item.id);
    
    const itemContent = (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          {
            borderBottomColor: theme.colors.divider,
            backgroundColor: isEditMode && isSelected ? theme.colors.surface : theme.colors.background,
          },
        ]}
        onPress={() => {
          if (isEditMode) {
            toggleSelection(item.id);
          } else {
            router.push(`/professional/${item.id}` as any);
          }
        }}
        activeOpacity={0.7}
      >
        {isEditMode && (
          <View style={styles.selectionIndicator}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isSelected ? theme.colors.pinkTwo : theme.colors.textMuted}
            />
          </View>
        )}

        <View style={styles.avatarContainer}>
          {item.users?.avatar_url ? (
            <Image
              source={{ uri: item.users.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text }]}>
                {item.users?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {(Boolean((item as any).is_active) && Boolean((item as any).is_available)) && (
            <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success, borderColor: theme.colors.background }]} />
          )}
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {item.users?.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.title || item.categories?.name}
          </Text>
        </View>

        {!isEditMode && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        )}
      </TouchableOpacity>
    );

    if (isEditMode) {
      return itemContent;
    }

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        {itemContent}
      </Swipeable>
    );
  }, [isEditMode, selectedIds, router, toggleSelection, renderRightActions, theme.colors]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Header
          showLogo={false}
          title="My People"
        />
        <PageLoading message="Loading your people..." />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Header
          showLogo={false}
          title="My People"
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.error }]}>
            Error loading people
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Header
          showLogo={false}
          title="My People"
          titleColor={theme.colors.pinkTwo || theme.colors.primary}
          leftButtons={
            <TouchableOpacity
              onPress={() => {
                if (isEditMode) {
                  setSelectedIds(new Set());
                }
                setIsEditMode(!isEditMode);
              }}
            >
              <Text style={[styles.editButton, { color: theme.colors.pinkTwo || theme.colors.primary }]}>
                {isEditMode ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          }
          rightButton={
            <TouchableOpacity
              onPress={() => router.push('/search' as any)}
            >
              <Ionicons name="add" size={32} color={theme.colors.pinkTwo || theme.colors.primary} />
            </TouchableOpacity>
          }
        />

        {/* People List */}
        <FlatList
          data={people}
          renderItem={renderPeopleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.colors.textMuted} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No professionals found
              </Text>
            </View>
          }
        />

        {/* Delete Action Bar */}
        {isEditMode && selectedIds.size > 0 && (
          <SafeAreaView
            edges={['bottom']}
            style={[
              styles.deleteActionBar,
              {
                backgroundColor: theme.name === 'dark' ? '#000000' : theme.colors.card,
              },
            ]}
          >
            <View
              style={[
                styles.deleteActionContent,
                {
                  borderTopColor: theme.colors.border,
                  shadowColor: theme.colors.text,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.deleteActionButton, { backgroundColor: theme.colors.error }]}
                onPress={handleBatchDelete}
              >
                <Trash2 size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>
                  Remove {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  selectionIndicator: {
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  editButton: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
  },
  deleteActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  deleteActionContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
});
