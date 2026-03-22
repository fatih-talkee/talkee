import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { CallSidExtractor, isCallInvitePending, getCallInviteState } from '@/services/twilioVoice/utils';
import {
  loadIncomingCallDetails,
  loadUserBalance,
} from '@/services/incomingCallDetails.service';

interface CallDetails {
  callerName: string;
  callerAvatar: string | null;
  callId: string | null;
}

const INCOMING_CALL_TIMEOUT_MS = 60 * 1000;

export default function IncomingCallHandler() {
  const { theme } = useTheme();
  const { callState, acceptIncomingCall, rejectIncomingCall } = useTwilioVoice();
  const { user: currentUser, isLoading: profileLoading } = useProfile();
  const [showModal, setShowModal] = useState(false);
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | undefined>(undefined);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const loadingDetailsRef = useRef(false);
  const lastCallSidRef = useRef<string | null>(null);
  const callDetailsRef = useRef<CallDetails | null>(null);

  const loadIncomingCallDetailsData = useCallback(async () => {
    if (!callState.callInvite || loadingDetailsRef.current) return;
    const callInvite = callState.callInvite;
    const currentCallSid = CallSidExtractor.extractFromCallInvite(callInvite, 'IncomingCallHandler');
    if (lastCallSidRef.current === currentCallSid) return;

    loadingDetailsRef.current = true;
    lastCallSidRef.current = currentCallSid || null;

    try {
      const details = await loadIncomingCallDetails(callInvite, currentCallSid || undefined);
      setCallDetails(details);
      callDetailsRef.current = details;
      if (currentUser?.id) {
        const balance = await loadUserBalance(currentUser.id);
        setUserBalance(balance);
      }
    } catch (error) {
      const fallback = { callerName: 'Bilinmeyen Arama', callerAvatar: null, callId: null };
      setCallDetails(fallback);
      callDetailsRef.current = fallback;
    } finally {
      loadingDetailsRef.current = false;
    }
  }, [callState.callInvite, currentUser?.id]);

  useEffect(() => {
    if (!currentUser && !profileLoading) {
      if (callState.callInvite) void rejectIncomingCall();
      setShowModal(false);
      setCallDetails(null);
      return;
    }

    if (!currentUser && profileLoading) return;

    const isPending = callState.callInvite ? isCallInvitePending(callState.callInvite) : false;
    const shouldShow = !!callState.callInvite && isPending && callState.status === 'ringing';

    if (shouldShow) {
      setShowModal(true);
      const currentCallSid = callState.callInvite ? CallSidExtractor.extractFromCallInvite(callState.callInvite) : null;
      if (lastCallSidRef.current !== currentCallSid) void loadIncomingCallDetailsData();

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();

      if (timeoutId) clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(() => {
        if (callState.callInvite) void rejectIncomingCall();
        setShowModal(false);
        setCallDetails(null);
      }, INCOMING_CALL_TIMEOUT_MS);
      setTimeoutId(newTimeoutId as unknown as NodeJS.Timeout);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      setShowModal(false);
      setCallDetails(null);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [callState.status, callState.callInvite, currentUser, profileLoading]);

  useEffect(() => {
    if (showModal && callDetails) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showModal, callDetails]);

  const handleAccept = useCallback(async () => {
    if (!currentUser || !callState.callInvite || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      setShowModal(false);
      await acceptIncomingCall({
        callId: callDetails?.callId || undefined,
        userBalance,
        debugId: `accept-${Date.now()}`,
      });
    } catch (error) {
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser, callState.callInvite, loading, callDetails, userBalance]);

  const handleDecline = useCallback(async () => {
    if (!callState.callInvite || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      setShowModal(false);
      await rejectIncomingCall({
        callId: callDetails?.callId || undefined,
        debugId: `decline-${Date.now()}`,
      });
    } finally {
      setLoading(false);
    }
  }, [callState.callInvite, loading, callDetails]);

  if (!showModal) return null;

  const callerName = callDetails?.callerName || 'Bilinmeyen Arama';
  const callerAvatar = callDetails?.callerAvatar;

  return (
    <Modal visible={showModal} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#1f2937', '#111827']} style={styles.card}>
            <View style={styles.typeBadge}>
              <Phone size={14} color="#10b981" />
              <Text style={styles.typeText}>Incoming Voice Call</Text>
            </View>

            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              {callerAvatar ? (
                <Image source={{ uri: callerAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 40, fontWeight: 'bold' }}>{callerName.charAt(0)}</Text>
                </View>
              )}
            </Animated.View>

            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.statusText}>Calling...</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={handleDecline} disabled={loading}>
                <PhoneOff size={24} color="#ffffff" />
                <Text style={styles.btnLabel}>Reddet</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Phone size={24} color="#ffffff" />
                    <Text style={styles.btnLabel}>Cevapla</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  typeText: {
    color: '#10b981',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  avatarWrapper: {
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  callerName: {
    color: '#ffffff',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 6,
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  declineBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  btnLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
});
