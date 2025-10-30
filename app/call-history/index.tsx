import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Phone, Video, Clock, DollarSign } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { mockCallHistory, CallHistory } from '@/mockData/professionals';

export default function CallHistoryScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'missed'>('all');

  const filteredHistory = mockCallHistory.filter(call => {
    const matchesSearch = call.professional.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || call.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const filters = [
    { key: 'all', label: 'All Calls', count: mockCallHistory.length },
    { key: 'completed', label: 'Completed', count: mockCallHistory.filter(c => c.status === 'completed').length },
    { key: 'missed', label: 'Missed', count: mockCallHistory.filter(c => c.status === 'missed').length },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0 min';
    return `${minutes} min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'missed': return theme.colors.error;
      case 'cancelled': return theme.colors.textMuted;
      default: return theme.colors.textMuted;
    }
  };

  const renderCallItem = ({ item }: { item: CallHistory }) => (
    <Card style={[styles.callCard, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity 
        style={styles.callItem}
        onPress={() => router.push(`/professional/${item.professionalId}`)}
      >
        <View style={styles.callLeft}>
          <Image source={{ uri: item.professional.avatar }} style={styles.avatar} />
          <View style={[styles.callTypeIcon, { backgroundColor: theme.colors.primary }]}>
            {item.type === 'video' ? (
              <Video size={14} color="#ffffff" />
            ) : (
              <Phone size={14} color="#ffffff" />
            )}
          </View>
        </View>

        <View style={styles.callInfo}>
          <Text style={[styles.professionalName, { color: theme.colors.text }]}>{item.professional.name}</Text>
          <Text style={[styles.professionalTitle, { color: theme.colors.textMuted }]}>{item.professional.title}</Text>
          <View style={styles.callDetails}>
            <Text style={[styles.callDate, { color: theme.colors.text }]}>{formatDate(item.date)}</Text>
            <Text style={[styles.callTime, { color: theme.colors.textMuted }]}>{formatTime(item.date)}</Text>
          </View>
        </View>

        <View style={styles.callRight}>
          <View style={styles.callStats}>
            <View style={styles.durationRow}>
              <Clock size={14} color={theme.colors.textMuted} />
              <Text style={[styles.duration, { color: theme.colors.textMuted }]}>{formatDuration(item.duration)}</Text>
            </View>
            <View style={styles.costRow}>
              <DollarSign size={14} color={theme.colors.textMuted} />
              <Text style={[styles.cost, { color: theme.colors.text } ]}>${item.cost.toFixed(2)}</Text>
            </View>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo showBack backPosition="right" />

      <View style={[styles.searchSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.tabBarBorder }]}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search call history..."
          leftIcon={<Search size={20} color={theme.colors.textMuted} />}
          style={[styles.searchInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        />

        <View style={styles.filters}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterText,
                { color: theme.colors.textSecondary },
                selectedFilter === filter.key && { color: '#000000' }
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No call history</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Your call history will appear here once you start connecting with professionals
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 24,
  },
  callCard: {
    marginBottom: 12,
    padding: 0,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  callLeft: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  callTypeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  professionalTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  callDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  callDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  callTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  callRight: {
    alignItems: 'flex-end',
  },
  callStats: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    marginLeft: 4,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cost: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginLeft: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});