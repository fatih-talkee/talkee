import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Smartphone, Monitor, Tablet, Trash2, MapPin } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

interface Device {
  id: string;
  name: string;
  type: 'ios' | 'android' | 'browser' | 'tablet';
  location?: string;
  ipAddress?: string;
  lastActive: string;
  isCurrentDevice: boolean;
}

const mockDevices: Device[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    type: 'ios',
    location: 'Istanbul, Turkey',
    ipAddress: '192.168.1.100',
    lastActive: new Date().toISOString(),
    isCurrentDevice: true,
  },
  {
    id: '2',
    name: 'Chrome Browser',
    type: 'browser',
    location: 'Istanbul, Turkey',
    ipAddress: '192.168.1.101',
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    isCurrentDevice: false,
  },
  {
    id: '3',
    name: 'Samsung Galaxy S24',
    type: 'android',
    location: 'Ankara, Turkey',
    ipAddress: '192.168.1.102',
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    isCurrentDevice: false,
  },
];

export default function DevicesScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const [devices, setDevices] = useState<Device[]>(mockDevices);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'ios':
      case 'android':
        return <Smartphone size={24} color={theme.colors.primary} />;
      case 'browser':
        return <Monitor size={24} color={theme.colors.primary} />;
      case 'tablet':
        return <Tablet size={24} color={theme.colors.primary} />;
      default:
        return <Smartphone size={24} color={theme.colors.primary} />;
    }
  };

  const handleRemoveDevice = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    
    if (device?.isCurrentDevice) {
      Alert.alert(
        'Cannot Remove Current Device',
        'You cannot remove the device you are currently using.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove ${device?.name}? You will need to sign in again on this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDevices((prev) => prev.filter((d) => d.id !== deviceId));
            toast.success({
              title: 'Device Removed',
              message: `${device?.name} has been removed from your account`,
            });
          },
        },
      ]
    );
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <Card
      style={[
        styles.deviceCard,
        {
          backgroundColor: theme.name === 'dark' ? '#000000' : theme.colors.card,
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme.colors.border,
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={styles.deviceContainer}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceLeft}>
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {getDeviceIcon(item.type)}
            </View>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceNameRow}>
                <Text style={[styles.deviceName, { color: theme.colors.text }]}>
                  {item.name}
                </Text>
                {item.isCurrentDevice && (
                  <View
                    style={[
                      styles.currentBadge,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              {item.location && (
                <View style={styles.metaRow}>
                  <MapPin size={12} color={theme.colors.textMuted} />
                  <Text
                    style={[styles.metaText, { color: theme.colors.textMuted }]}
                  >
                    {item.location}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.lastActiveText, { color: theme.colors.textMuted }]}
              >
                Last active: {formatDate(item.lastActive)}
              </Text>
            </View>
          </View>
          {!item.isCurrentDevice && (
            <TouchableOpacity
              style={[
                styles.removeButton,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => handleRemoveDevice(item.id)}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.name === 'dark' ? '#000000' : theme.colors.background },
      ]}
    >
      <Header showLogo showBack backPosition="right" />

      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Smartphone size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Devices
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Devices where you're logged in will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDeviceItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  deviceCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  deviceContainer: {
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  lastActiveText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});

