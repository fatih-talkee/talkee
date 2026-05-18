import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  Wallet,
  CheckCircle,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

export default function PayPalScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState('');
  const [connectedDate, setConnectedDate] = useState('');
  const [showOAuthModal, setShowOAuthModal] = useState(false);

  const handleConnect = () => {
    // Show OAuth modal
    setShowOAuthModal(true);

    // Simulate OAuth redirect and callback
    setTimeout(() => {
      setShowOAuthModal(false);
      setIsConnected(true);
      setConnectedEmail('user@example.com');

      // Format current date
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setConnectedDate(formattedDate);

      toast.success({
        title: 'PayPal Connected',
        message: 'Your PayPal account has been linked successfully',
      });
    }, 2000);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect PayPal',
      'Are you sure you want to disconnect your PayPal account? You will need to reconnect it to receive payouts.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setIsConnected(false);
            setConnectedEmail('');
            setConnectedDate('');
            toast.success({
              title: 'PayPal Disconnected',
              message: 'Your PayPal account has been disconnected',
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="PayPal"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!isConnected ? (
          /* Not Connected State */
          <>
            <Card style={styles.connectionCard}>
              {/* PayPal Logo/Icon */}
              <View style={[styles.logoContainer, { backgroundColor: '#0070ba' }]}>
                <Wallet size={48} color="#FFFFFF" />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Connect your PayPal Account
              </Text>

              {/* Description */}
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                Link your PayPal account to receive payouts securely and efficiently.
              </Text>

              {/* Connect Button */}
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: '#0070ba' }]}
                onPress={handleConnect}
                activeOpacity={0.8}
              >
                <Wallet size={20} color="#FFFFFF" />
                <Text style={styles.connectButtonText}>Connect with PayPal</Text>
              </TouchableOpacity>
            </Card>

            {/* Info Note */}
            <View style={[styles.infoNote, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                This is a placeholder for PayPal OAuth integration. In production, this will redirect you to PayPal's secure login page to authorize the connection.
              </Text>
            </View>
          </>
        ) : (
          /* Connected State */
          <>
            <Card style={styles.connectionCard}>
              {/* PayPal Avatar */}
              <View style={[styles.avatarContainer, { backgroundColor: '#0070ba' }]}>
                <Text style={styles.avatarText}>PP</Text>
              </View>

              {/* Connected Email */}
              <Text style={[styles.connectedEmail, { color: theme.colors.text }]}>
                {connectedEmail}
              </Text>

              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <CheckCircle size={16} color={theme.colors.success} />
                <Text style={[styles.statusText, { color: theme.colors.success }]}>
                  Connected
                </Text>
              </View>

              {/* Connected Date */}
              <Text style={[styles.connectedDate, { color: theme.colors.textMuted }]}>
                Connected on {connectedDate}
              </Text>

              {/* Disconnect Button */}
              <TouchableOpacity
                style={[styles.disconnectButton, { borderColor: theme.colors.error }]}
                onPress={handleDisconnect}
                activeOpacity={0.7}
              >
                <Text style={[styles.disconnectButtonText, { color: theme.colors.error }]}>
                  Disconnect
                </Text>
              </TouchableOpacity>
            </Card>

            {/* Payment Info Card */}
            <Card style={styles.infoCard}>
              <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                Payout Information
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                Payouts will be sent to your connected PayPal account within 3-5 business days after withdrawal request.
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                PayPal may charge transaction fees based on your account type and location.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      {/* OAuth Placeholder Modal */}
      <Modal
        visible={showOAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {/* PayPal Logo */}
            <View style={[styles.modalLogo, { backgroundColor: '#0070ba' }]}>
              <Wallet size={32} color="#FFFFFF" />
            </View>

            {/* Loading Text */}
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Redirecting to PayPal...
            </Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Please wait while we connect to PayPal
            </Text>

            {/* Loading Spinner */}
            <ActivityIndicator
              size="large"
              color="#0070ba"
              style={styles.modalSpinner}
            />

            {/* Placeholder Note */}
            <Text style={[styles.modalNote, { color: theme.colors.textMuted }]}>
              (Placeholder - simulating OAuth flow)
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  connectionCard: {
    padding: 32,
    alignItems: 'center',
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  connectButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    width: '100%',
  },
  connectButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  infoNote: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 21,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  connectedEmail: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  connectedDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 32,
  },
  disconnectButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  disconnectButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  infoCard: {
    padding: 20,
    marginTop: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  infoCardText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 21,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  modalLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalSpinner: {
    marginBottom: 16,
  },
  modalNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
