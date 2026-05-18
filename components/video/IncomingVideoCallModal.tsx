import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/lib/logger';

interface VideoCallRecord {
  id: string;
  caller_id: string;
  professional_id: string;
  room_sid: string;
  status: string;
  rate_per_minute: number | null;
  caller?: {
    name: string | null;
    avatar_url: string | null;
  };
}

export default function IncomingVideoCallModal() {
  const { theme } = useTheme();
  const { professional, isProfessional } = useProfile();
  const [callRecord, setCallRecord] = useState<VideoCallRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [pulseAnim] = useState(new Animated.Value(1));
  const channelRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showModal = !!callRecord;

  useEffect(() => {
    if (showModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [showModal, fadeAnim, scaleAnim, pulseAnim]);

  useEffect(() => {
    if (!isProfessional || !professional?.id) return;

    const channel = supabase
      .channel(`incoming_video_${professional.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `professional_id=eq.${professional.id}` },
        async (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.call_type !== 'video' || newRecord.status !== 'pending') return;

          const { data: callerData } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', newRecord.caller_id)
            .single();

          setCallRecord({ ...newRecord, caller: callerData || undefined });

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(async () => {
            await handleDecline(newRecord);
          }, 60_000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `professional_id=eq.${professional.id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.call_type === 'video' && (updated.status === 'cancelled' || updated.status === 'ended')) {
            setCallRecord(null);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isProfessional, professional?.id]);

  const handleDecline = useCallback(async (targetRecord?: any) => {
    const active = targetRecord || callRecord;
    if (!active) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setLoading(true);
      setCallRecord(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      await supabase.from('calls').update({ status: 'cancelled' }).eq('id', active.id);
    } catch (e) {
      logger.error('[IncomingVideoCallModal] ❌ Decline error', e);
    } finally {
      setLoading(false);
    }
  }, [callRecord]);

  const handleAccept = useCallback(async () => {
    if (!callRecord || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setLoading(true);
      await supabase.from('calls').update({ status: 'accepted' }).eq('id', callRecord.id);
      const current = callRecord;
      setCallRecord(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      router.push({
        pathname: `/video-call/${current.room_sid}` as any,
        params: {
          callerName: current.caller?.name || '',
          callerAvatar: current.caller?.avatar_url || '',
          ratePerMinute: current.rate_per_minute?.toString() || '0',
          inviteId: current.id,
          autoConnect: 'true',
        },
      });
    } catch (e) {
      logger.error('[IncomingVideoCallModal] ❌ Accept error', e);
      setLoading(false);
    }
  }, [callRecord, loading]);

  if (!showModal) return null;

  const callerName = callRecord?.caller?.name || 'Unknown';
  const callerAvatar = callRecord?.caller?.avatar_url;
  const rate = callRecord?.rate_per_minute;

  return (
    <Modal visible={showModal} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#1f2937', '#111827']} style={styles.card}>
            {/* Call Type Badge */}
            <View style={styles.typeBadge}>
              <Video size={14} color="#3b82f6" />
              <Text style={styles.typeText}>Incoming Video Call</Text>
            </View>

            {/* Avatar Section */}
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
            {rate && rate > 0 && (
                <Text style={styles.rateText}>${rate.toFixed(2)} / minute</Text>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleDecline()}
                disabled={loading}
              >
                <PhoneOff size={24} color="#ffffff" />
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={handleAccept}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Phone size={24} color="#ffffff" />
                    <Text style={styles.btnLabel}>Answer</Text>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  typeText: {
    color: '#3b82f6',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  avatarWrapper: {
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
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
  rateText: {
    color: '#9ca3af',
    fontSize: 15,
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
