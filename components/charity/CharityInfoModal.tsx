import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Heart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { height: windowHeight } = Dimensions.get('window');

interface CharityInfo {
  id?: string;
  name: string;
  logo?: string;
  percentage: number;
}

interface CharityInfoModalProps {
  visible: boolean;
  onClose: () => void;
  charities?: CharityInfo[];
}

export function CharityInfoModal({
  visible,
  onClose,
  charities = [],
}: CharityInfoModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Heart size={24} color={theme.colors.success} fill={theme.colors.success} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Charity Donations
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Explanation */}
          <View style={[styles.explanatorySection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.explanatoryText, { color: theme.colors.textSecondary }]}>
              A portion of this professional's earnings from your calls will be automatically donated to the organizations you see below. The percentages represent how your contribution will be allocated.
            </Text>
          </View>

          {/* Scrollable List */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {charities.length > 0 ? (
              charities.map((charity, index) => (
                <View key={index}>
                  <View style={styles.charityRow}>
                    <Text style={[styles.charityName, { color: theme.colors.text }]} numberOfLines={3}>
                      {charity.name}
                    </Text>
                    <View style={[styles.percentageBadge, { backgroundColor: theme.colors.success + '15' }]}>
                      <Text style={[styles.charityPercentage, { color: theme.colors.success }]}>
                        %{charity.percentage}
                      </Text>
                    </View>
                  </View>
                  {index < charities.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.colors.textMuted }]}>
                  No charity organizations configured yet.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    height: windowHeight * 0.5, // <-- bu kısım değiştirildi
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanatorySection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 8,
  },
  explanatoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    textAlign: 'left',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  charityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 16,
  },
  charityName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    lineHeight: 22,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charityPercentage: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    width: '100%',
    opacity: 0.5,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});