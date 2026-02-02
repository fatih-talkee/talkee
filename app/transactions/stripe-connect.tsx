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
  CreditCard,
  CheckCircle,
  ExternalLink,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/lib/toastService';

type AccountStatus = 'active' | 'pending_verification';

export default function StripeConnectScreen() {
  const { theme } = useTheme();
  const toast = useToast();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState('');
  const [connectedDate, setConnectedDate] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('active');
  const [showOAuthModal, setShowOAuthModal] = useState(false);

  const handleConnect = () => {
    // Show OAuth modal
    setShowOAuthModal(true);

    // Simulate OAuth redirect and callback
    setTimeout(() => {
      setShowOAuthModal(false);
      setIsConnected(true);
      setConnectedEmail('user@example.com');
      setAccountStatus('active');

      // Format current date
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setConnectedDate(formattedDate);

      toast.success({
        title: 'Stripe Connected',
        message: 'Your Stripe account has been linked successfully',
      });
    }, 2000);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Stripe',
      'Are you sure you want to disconnect your Stripe account? You will need to reconnect it to receive payouts.',
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
            setAccountStatus('active');
            toast.success({
              title: 'Stripe Disconnected',
              message: 'Your Stripe account has been disconnected',
            });
          },
        },
      ]
    );
  };

  const handleOpenDashboard = () => {
    toast.info({
      title: 'Coming Soon',
      message: 'This will open the Stripe Dashboard in production',
    });
  };

  const getAccountStatusText = () => {
    if (accountStatus === 'active') {
      return 'Your account is ready to receive payouts.';
    } else {
      return 'Your account is pending verification. This may take 1-2 business days.';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={false}
        title="Stripe Connect"
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
              {/* Stripe Logo/Icon */}
              <View style={[styles.logoContainer, { backgroundColor: '#635bff' }]}>
                <CreditCard size={48} color="#FFFFFF" />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Connect your Stripe Account
              </Text>

              {/* Description */}
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                Connect to Stripe to receive secure payouts and access your earnings.
              </Text>

              {/* Connect Button */}
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: '#635bff' }]}
                onPress={handleConnect}
                activeOpacity={0.8}
              >
                <CreditCard size={20} color="#FFFFFF" />
                <Text style={styles.connectButtonText}>Connect with Stripe</Text>
              </TouchableOpacity>
            </Card>

            {/* Info Note */}
            <View style={[styles.infoNote, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                This is a placeholder for Stripe Connect OAuth integration. In production, this will redirect you to Stripe's secure authorization page to connect your account.
              </Text>
            </View>
          </>
        ) : (
          /* Connected State */
          <>
            <Card style={styles.connectionCard}>
              {/* Stripe Avatar */}
              <View style={[styles.avatarContainer, { backgroundColor: '#635bff' }]}>
                <Text style={styles.avatarText}>ST</Text>
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

              {/* Account Status Text */}
              <Text style={[styles.accountStatusText, { color: theme.colors.textSecondary }]}>
                {getAccountStatusText()}
              </Text>

              {/* Connected Date */}
              <Text style={[styles.connectedDate, { color: theme.colors.textMuted }]}>
                Connected on {connectedDate}
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonGroup}>
                {/* Open Dashboard Button */}
                <TouchableOpacity
                  style={[styles.dashboardButton, { borderColor: theme.colors.border }]}
                  onPress={handleOpenDashboard}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={18} color={theme.colors.text} />
                  <Text style={[styles.dashboardButtonText, { color: theme.colors.text }]}>
                    Open Dashboard
                  </Text>
                </TouchableOpacity>

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
              </View>
            </Card>

            {/* Payout Information Card */}
            <Card style={styles.infoCard}>
              <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                Payout Information
              </Text>

              <View style={styles.infoItem}>
                <View style={styles.bullet} />
                <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                  Payouts are processed within 2-7 business days
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.bullet} />
                <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                  Standard Stripe fees apply based on your region
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.bullet} />
                <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                  Funds are transferred directly to your bank account
                </Text>
              </View>
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
            {/* Stripe Logo */}
            <View style={[styles.modalLogo, { backgroundColor: '#635bff' }]}>
              <CreditCard size={32} color="#FFFFFF" />
            </View>

            {/* Loading Text */}
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Redirecting to Stripe...
            </Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Please wait while we connect to Stripe
            </Text>

            {/* Loading Spinner */}
            <ActivityIndicator
              size="large"
              color="#635bff"
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
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  accountStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  connectedDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 32,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  dashboardButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dashboardButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  disconnectButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#635bff',
    marginTop: 7,
    marginRight: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 21,
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
