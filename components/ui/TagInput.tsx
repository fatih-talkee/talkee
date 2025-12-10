import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface TagInputProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxLength?: number;
  required?: boolean;
  helperText?: string;
}

export function TagInput({
  label,
  tags,
  onTagsChange,
  placeholder = 'Type and press + to add',
  maxTags = 10,
  maxLength = 50,
  required = false,
  helperText,
}: TagInputProps) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const trimmed = inputValue.trim();

    if (!trimmed) return;

    if (tags.length >= maxTags) {
      return;
    }

    if (tags.includes(trimmed)) {
      setInputValue('');
      return;
    }

    onTagsChange([...tags, trimmed]);
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {label}{' '}
        {required && (
          <Text style={{ color: theme.colors.error || '#ef4444' }}>*</Text>
        )}
      </Text>

      {/* Helper Text */}
      {helperText && (
        <Text
          style={[
            styles.helperText,
            { color: theme.colors.textMuted },
          ]}
        >
          {helperText}
        </Text>
      )}

      {/* Input Row */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text }]}
          maxLength={maxLength}
          onSubmitEditing={handleAddTag}
          onKeyPress={handleKeyPress}
          returnKeyType="done"
          editable={tags.length < maxTags}
        />
        <TouchableOpacity
          onPress={handleAddTag}
          disabled={!inputValue.trim() || tags.length >= maxTags}
          style={[
            styles.addButton,
            {
              backgroundColor:
                inputValue.trim() && tags.length < maxTags
                  ? theme.colors.primary
                  : theme.colors.border,
            },
          ]}
        >
          <Plus
            size={18}
            color={
              inputValue.trim() && tags.length < maxTags
                ? theme.colors.surface
                : theme.colors.textMuted
            }
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* Tags Count */}
      {tags.length > 0 && (
        <Text style={[styles.countText, { color: theme.colors.textMuted }]}>
          {tags.length} / {maxTags} tags
        </Text>
      )}

      {/* Tags Display */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScroll}
          contentContainerStyle={styles.tagsContainer}
        >
          {tags.map((tag, index) => (
            <View
              key={index}
              style={[
                styles.tag,
                {
                  backgroundColor: theme.colors.primary + '15',
                  borderColor: theme.colors.primary + '40',
                },
              ]}
            >
              <Text
                style={[styles.tagText, { color: theme.colors.primary }]}
                numberOfLines={1}
              >
                {tag}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(tag)}
                style={styles.removeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={theme.colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Empty State */}
      {tags.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            No tags added yet
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    paddingVertical: 8,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 6,
  },
  tagsScroll: {
    marginTop: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: 200,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  removeButton: {
    padding: 2,
  },
  emptyState: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
});
