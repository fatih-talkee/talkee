import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

// calls tablosundaki video çağrısı kaydının tipi
interface VideoCallRecord {
  id: string;
  caller_id: string;
  professional_id: string;
  room_sid: string;        // video oda adı burada
  status: string;
  rate_per_minute: number | null;
  // JOIN ile gelen caller bilgisi
  caller?: {
    name: string | null;
    avatar_url: string | null;
  };
}

/**
 * IncomingVideoCallModal
 *
 * Mevcut `calls` tablosunu Supabase Realtime ile dinler.
 * call_type='video' ve status='pending' olan yeni kayıt gelince modal gösterir.
 *
 * ✅ Ses araması sistemine (IncomingCallHandler) dokunmaz
 * ✅ Twilio Voice credential hatası (52003) olmaz — Video kendi token'ını alır
 */
export default function IncomingVideoCallModal() {
  const { theme } = useTheme();
  const { professional, isProfessional } = useProfile();
  const [callRecord, setCallRecord] = useState<VideoCallRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.85));
  const [pulseAnim] = useState(new Animated.Value(1));
  const channelRef = useRef<any>(null);
  // 60 saniye içinde cevaplanmazsa otomatik reddet
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showModal = !!callRecord;

  // Modal açılınca animasyon başlat
  useEffect(() => {
    if (showModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      pulseAnim.setValue(1);
    }
  }, [showModal, fadeAnim, scaleAnim, pulseAnim]);

  // Supabase Realtime — calls tablosunu dinle
  useEffect(() => {
    // Sadece professional olan kullanıcılar gelen video call alabilir
    if (!isProfessional || !professional?.id) return;

    logger.info('[IncomingVideoCallModal] 👂 Realtime aboneliği başlatılıyor', {
      professionalId: professional.id,
    });

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`incoming_video_${professional.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          // professional_id'ye göre filtrele — bu professional'ın gelen aramaları
          filter: `professional_id=eq.${professional.id}`,
        },
        async (payload) => {
          const newRecord = payload.new as any;

          // Sadece video call ve pending durumundakileri işle
          if (newRecord.call_type !== 'video' || newRecord.status !== 'pending') return;

          logger.info('[IncomingVideoCallModal] 📹 Video arama geldi!', {
            callId: newRecord.id,
            roomSid: newRecord.room_sid,
            callerId: newRecord.caller_id,
          });

          // Caller bilgisini getir
          const { data: callerData } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', newRecord.caller_id)
            .single();

          setCallRecord({
            ...newRecord,
            caller: callerData || undefined,
          });

          // 60 saniye timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(async () => {
            logger.warn('[IncomingVideoCallModal] ⏰ Video arama zaman aşımına uğradı');
            await handleDecline(newRecord);
          }, 60_000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `professional_id=eq.${professional.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          // Arayan iptal etti
          if (
            updated.call_type === 'video' &&
            (updated.status === 'cancelled' || updated.status === 'ended')
          ) {
            logger.info('[IncomingVideoCallModal] 📵 Arama iptal edildi');
            setCallRecord(null);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isProfessional, professional?.id]);

  const handleDecline = useCallback(
    async (targetRecord?: any) => {
      const active = targetRecord || callRecord;
      if (!active) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        setLoading(true);
        setCallRecord(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        await supabase
          .from('calls')
          .update({ status: 'cancelled' })
          .eq('id', active.id);

        logger.info('[IncomingVideoCallModal] ❌ Video arama reddedildi', { callId: active.id });
      } catch (e) {
        logger.error('[IncomingVideoCallModal] ❌ Reddetme hatası', e);
      } finally {
        setLoading(false);
      }
    },
    [callRecord]
  );

  const handleAccept = useCallback(async () => {
    if (!callRecord || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setLoading(true);

      // Status'u 'accepted' yap
      await supabase
        .from('calls')
        .update({ status: 'accepted' })
        .eq('id', callRecord.id);

      logger.info('[IncomingVideoCallModal] ✅ Video arama kabul edildi', {
        callId: callRecord.id,
        roomName: callRecord.room_sid,
      });

      const current = callRecord;
      setCallRecord(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // VideoCallScreen'e git — aynı room_name ile bağlan
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
      logger.error('[IncomingVideoCallModal] ❌ Kabul hatası', e);
      setLoading(false);
    }
  }, [callRecord, loading]);

  if (!showModal) return null;

  const callerName = callRecord?.caller?.name || 'Bilinmeyen';
  const callerAvatar = callRecord?.caller?.avatar_url;
  const rate = callRecord?.rate_per_minute;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => handleDecline()}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.card, theme.colors.surface]}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Video Call Badge */}
            <View style={[styles.callTypeBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Video size={14} color={theme.colors.primary} />
              <Text style={[styles.callTypeText, { color: theme.colors.primary }]}>
                Gelen Video Arama
              </Text>
            </View>

            {/* Avatar */}
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              {callerAvatar ? (
                <Image
                  source={{ uri: callerAvatar }}
                  style={[styles.avatar, { borderColor: theme.colors.border }]}
                />
              ) : (
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                  style={[styles.avatarPlaceholder, { borderColor: theme.colors.border }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarText}>
                    {callerName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={[styles.avatarRing, { borderColor: theme.colors.primary + '30' }]} />
              <View style={[styles.avatarRingOuter, { borderColor: theme.colors.primary + '15' }]} />
            </Animated.View>

            {/* Arayan Adı */}
            <Text style={[styles.callerName, { color: theme.colors.text }]}>
              {callerName}
            </Text>

            {rate && rate > 0 && (
              <Text style={[styles.rate, { color: theme.colors.textMuted }]}>
                ${rate.toFixed(2)}/dk
              </Text>
            )}

            {/* Butonlar */}
            <View style={styles.buttons}>
              {/* Reddet */}
              <Pressable
                onPress={() => handleDecline()}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.error, theme.colors.error + 'DD']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <PhoneOff size={20} color="#fff" />
                      <Text style={styles.buttonText}>Reddet</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Kabul Et */}
              <Pressable
                onPress={handleAccept}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    loading
                      ? [theme.colors.textMuted, theme.colors.textMuted]
                      : [theme.colors.success, theme.colors.success + 'DD']
                  }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Phone size={20} color="#fff" />
                      <Text style={styles.buttonText}>Kabul Et</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30 }
      : { elevation: 20 }),
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  callTypeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 18,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 48,
    color: '#fff',
    fontFamily: 'Inter-Bold',
  },
  avatarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    top: -10,
    left: -10,
  },
  avatarRingOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    top: -20,
    left: -20,
  },
  callerName: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  rate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 28,
  },
  buttons: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 }
      : { elevation: 10 }),
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
});
