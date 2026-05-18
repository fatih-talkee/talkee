import {
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
  useRef,
} from 'react';
import { twilioVoiceService } from '@/services/twilioVoice.service';
import type { CallState } from '@/services/twilioVoice.service';
import { logger } from '@/lib/logger';
import { useProfile } from './useProfile';
import BillingService from '@/services/billingService';
import { supabase } from '@/lib/supabase';

export function useTwilioVoice() {
  const mountTimeRef = useRef<number>(Date.now());
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // ✅ Düzeltme: Kayıt için tam profili değil, sadece session'ı bekliyoruz
  // profileLoading (profil fetch'i) kayıtı bloke etmemeli
  const { user, userId, isSessionLoading, isLoading: profileLoading } = useProfile();

  // ✅ DEBUG: Use INFO level to ensure visibility
  logger.info('[useTwilioVoice] 🎬 Hook rendering (FIRST CALL CHECK)', {
    hasUser: !!user,
    userId: user?.id,
    profileLoading,
    isInitialized,
    hasError: !!error,
    timestamp: new Date().toISOString(),
  });

  // Get call state from service using useSyncExternalStore
  logger.debug('[useTwilioVoice] 🔧 Setting up useSyncExternalStore', {
    timestamp: new Date().toISOString(),
  });

  const callState = useSyncExternalStore(
    (callback) => {
      logger.debug('[useTwilioVoice] 🔧 Subscribing to Twilio state changes', {
        timestamp: new Date().toISOString(),
      });
      return twilioVoiceService.subscribe(callback);
    },
    () => {
      const state = twilioVoiceService.getState();
      logger.debug('[useTwilioVoice] 📡 Getting Twilio state (client)', {
        status: state.status,
        hasCall: !!state.call,
        hasCallInvite: !!state.callInvite,
        isMuted: state.isMuted,
        timestamp: new Date().toISOString(),
      });
      return state;
    },
    () => {
      const state = twilioVoiceService.getState();
      logger.debug('[useTwilioVoice] 📡 Getting Twilio state (server)', {
        status: state.status,
        hasCall: !!state.call,
        hasCallInvite: !!state.callInvite,
        isMuted: state.isMuted,
        timestamp: new Date().toISOString(),
      });
      return state;
    }
  );

  useEffect(() => {
    logger.debug('[useTwilioVoice] 📡 Call state changed', {
      status: callState.status,
      hasCall: !!callState.call,
      hasCallInvite: !!callState.callInvite,
      isMuted: callState.isMuted,
      isOnHold: callState.isOnHold,
      duration: callState.duration,
      hasError: !!callState.error,
      errorMessage: callState.error?.message,
      timestamp: new Date().toISOString(),
    });
  }, [callState]);

  useEffect(() => {
    const mountTime = Date.now();
    mountTimeRef.current = mountTime;
    logger.info('[useTwilioVoice] 🎬 Hook mounted', {
      hasUser: !!user,
      userId: user?.id,
      profileLoading,
      timestamp: new Date().toISOString(),
    });

    return () => {
      logger.info('[useTwilioVoice] 🔚 Hook unmounting', {
        hasUser: !!user,
        userId: user?.id,
        lifespan: `${Date.now() - mountTime}ms`,
        timestamp: new Date().toISOString(),
      });

      // ✅ Stop billing tracking on unmount
      if (BillingService.isTracking()) {
        logger.warn(
          '[useTwilioVoice] ⚠️ Stopping billing tracking on unmount',
          {
            timestamp: new Date().toISOString(),
          }
        );
        BillingService.stopTracking();
      }
    };
  }, []);

  // ✅ FIX: Initialize + Auto-register (proper async handling)
  useEffect(() => {
    const initStartTime = Date.now();
    let mounted = true;

    logger.info('[useTwilioVoice] 🔧 Initialization effect triggered', {
      hasUser: !!user,
      userId: user?.id,
      profileLoading,
      isSdkInitialized: twilioVoiceService.isSdkInitialized(),
      timestamp: new Date().toISOString(),
    });

    // ✅ IIFE (Immediately Invoked Function Expression)
    (async () => {
      try {
        // Initialize SDK if not already initialized
        const isSdkInitialized = twilioVoiceService.isSdkInitialized();
        logger.debug('[useTwilioVoice] 🔍 Checking SDK initialization status', {
          isSdkInitialized,
          timestamp: new Date().toISOString(),
        });

        if (!isSdkInitialized) {
          const initStartTime = Date.now();
          logger.info('[useTwilioVoice] 🔧 Initializing Twilio Voice SDK...', {
            timestamp: new Date().toISOString(),
          });
          await twilioVoiceService.initialize();
          const initElapsed = Date.now() - initStartTime;
          logger.info('[useTwilioVoice] ✅ Twilio Voice SDK initialized', {
            elapsed: `${initElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.debug(
            '[useTwilioVoice] ℹ️ SDK already initialized (skipping)',
            {
              timestamp: new Date().toISOString(),
            }
          );
        }

        if (mounted) {
          logger.debug('[useTwilioVoice] 🔧 Setting isInitialized to true', {
            timestamp: new Date().toISOString(),
          });
          setIsInitialized(true);
          logger.info('[useTwilioVoice] ✅ Hook state: SDK initialized', {
            timestamp: new Date().toISOString(),
          });
        }

        // AUTO-REGISTER: Session yüklendi ve userId varsa kaydet
        // ✅ Düzeltme: Tam profili (user) bekleme — userId + session yeterlii
        // Profil fetch'i (Supabase sorgusu) kayıtı geciktirmemeli
        const canRegister = !!userId && !isSessionLoading && mounted;
        logger.debug('[useTwilioVoice] 🔍 Kayıt koşulu kontrolü', {
          userId: userId?.substring(0, 8),
          isSessionLoading,
          mounted,
          canRegister,
          timestamp: new Date().toISOString(),
        });

        if (canRegister) {
          try {
            const registerStartTime = Date.now();
            logger.info(
              '[useTwilioVoice] 🔧 Cihaz kayıt ediliyor (session hazır)',
              {
                userId: userId?.substring(0, 8),
                timestamp: new Date().toISOString(),
              }
            );

            await twilioVoiceService.register();

            const registerElapsed = Date.now() - registerStartTime;
            logger.info('[useTwilioVoice] ✅ Cihaz başarıyla kaydedildi', {
              userId: userId?.substring(0, 8),
              elapsed: `${registerElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
          } catch (regError) {
            logger.error(
              '[useTwilioVoice] ❌ Otomatik kayıt başarısız',
              regError,
              {
                userId: userId?.substring(0, 8),
                errorMessage:
                  regError instanceof Error
                    ? regError.message
                    : String(regError),
                timestamp: new Date().toISOString(),
              }
            );
            // Kayıt hatası UI'yi bloke etmemeli
          }
        } else if (!userId && !isSessionLoading) {
          logger.info(
            '[useTwilioVoice] ⏭️ Kimlik doğrulanmamış kullanıcı, kayıt atlaniyor',
            {
              userId,
              isSessionLoading,
              timestamp: new Date().toISOString(),
            }
          );
        } else {
          logger.debug('[useTwilioVoice] ⏭️ Kayıt atlaniyor', {
            userId: userId?.substring(0, 8),
            isSessionLoading,
            mounted,
            reason: !userId
              ? 'userId yok'
              : isSessionLoading
              ? 'session yüklüyor'
              : 'unmounted',
            timestamp: new Date().toISOString(),
          });
        }

        const totalElapsed = Date.now() - initStartTime;
        logger.info('[useTwilioVoice] ✅ Başlatma tamamlandı', {
          totalElapsed: `${totalElapsed}ms`,
          isInitialized: mounted ? true : false,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const totalElapsed = Date.now() - initStartTime;
        logger.error('[useTwilioVoice] ❌ Başlatma hatası', err, {
          elapsed: `${totalElapsed}ms`,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();

    return () => {
      logger.debug('[useTwilioVoice] 🗑️ Başlatma effect temizleniyor', {
        timestamp: new Date().toISOString(),
      });
      mounted = false;
    };
  }, [userId, isSessionLoading]); // ✅ userId + session değişince yeniden kaydet (tam profil bekleme)

  // 🚨 FALLBACK: Profil yÜklenmesi başarısız olursa doğrudan session'dan kaydet
  // Artık profileLoading yerine isSessionLoading bakıyoruz
  useEffect(() => {
    // SDK henüz hazır değilse veya userId zaten varsa gerek yok
    if (!isInitialized || userId) {
      return;
    }

    let mounted = true;

    logger.debug('[useTwilioVoice] 🚨 Session bitmesini 10s bekleme timerı kuruluyor', {
      isSessionLoading,
      timestamp: new Date().toISOString(),
    });

    const fallbackTimer = setTimeout(async () => {
      if (!mounted) return;

      // userId yüklendi ise atla
      if (userId) {
        logger.info('[useTwilioVoice] ✅ userId doğal olarak yüklündi, fallback atlanıyor', {
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Session hala yükleniyor ise bekle
      if (isSessionLoading) {
        logger.debug('[useTwilioVoice] ⏳ Session 10s sonra hala yükleniyor, bekleniyor', {
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // userId yok ve session bitti = session yok (oturum açılmamış)
      try {
        logger.warn('[useTwilioVoice] 🚨 Session kontrolü yapılıyor (profil yüklenemedi)', {
          timestamp: new Date().toISOString(),
        });

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          logger.warn('[useTwilioVoice] ⏭️ Session yok, fallback kayıt atlanıyor', {
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info('[useTwilioVoice] 🚨 Session bulundu, fallback kayıt yapılıyor', {
          sessionUserId: session.user.id.substring(0, 8),
          timestamp: new Date().toISOString(),
        });

        await twilioVoiceService.register();

        logger.info('[useTwilioVoice] ✅ Fallback kayıt başarılı', {
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('[useTwilioVoice] ❌ Fallback kayıt başarısız', err, {
          errorMessage: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [isInitialized, userId, isSessionLoading]);

  // ✅ NEW: Monitor call state changes for billing
  useEffect(() => {
    // Start billing when call connects
    if (
      callState.status === 'connected' &&
      callState.call &&
      !BillingService.isTracking()
    ) {
      logger.info(
        '[useTwilioVoice] 📞 Call connected - checking if billing should start',
        {
          status: callState.status,
          hasCall: !!callState.call,
          isTracking: BillingService.isTracking(),
          timestamp: new Date().toISOString(),
        }
      );

      // Note: Billing will be started by makeCall or acceptIncomingCall
      // This is just a safety check
    }

    // Stop billing when call disconnects
    if (callState.status === 'disconnected' && BillingService.isTracking()) {
      logger.info('[useTwilioVoice] 📞 Call disconnected - stopping billing', {
        status: callState.status,
        isTracking: BillingService.isTracking(),
        timestamp: new Date().toISOString(),
      });
      BillingService.stopTracking();
    }
  }, [callState.status, callState.call]);

  // ✅ UPDATED: makeCall with object parameters
  const makeCall = useCallback(
    async (params: {
      professionalId: string;
      professionalUserId: string;
      type?: 'voice' | 'video';
      urgent?: boolean;
      debugId?: string;
      ratePerMinute?: number;
      userBalance?: number;
    }) => {
      const makeCallStartTime = Date.now();
      logger.info('[useTwilioVoice] 📞 makeCall function called', {
        professionalId: params.professionalId,
        professionalUserId: params.professionalUserId,
        type: params.type || 'voice',
        urgent: params.urgent || false,
        debugId: params.debugId,
        ratePerMinute: params.ratePerMinute,
        userBalance: params.userBalance,
        timestamp: new Date().toISOString(),
      });

      try {
        if (!user) {
          logger.error(
            '[useTwilioVoice] ❌ User not authenticated',
            undefined,
            {
              hasUser: !!user,
              timestamp: new Date().toISOString(),
            }
          );
          throw new Error('User not authenticated');
        }

        logger.debug('[useTwilioVoice] 🔍 Checking call state', {
          currentStatus: callState.status,
          isIdle: callState.status === 'idle',
          timestamp: new Date().toISOString(),
        });

        if (callState.status !== 'idle') {
          logger.warn('[useTwilioVoice] ⚠️ Cannot make call - not idle', {
            currentStatus: callState.status,
            hasCall: !!callState.call,
            hasCallInvite: !!callState.callInvite,
            timestamp: new Date().toISOString(),
          });
          throw new Error(
            `Cannot make call - current status: ${callState.status}`
          );
        }

        // ✅ PATCH C: Readiness guard
        if (!twilioVoiceService.isReadyForCalls()) {
          logger.warn('[useTwilioVoice] ⚠️ Cannot make call - SDK not ready', {
            timestamp: new Date().toISOString(),
          });
          throw new Error('Twilio SDK is not fully initialized and registered. Please try again.');
        }

        logger.info('[useTwilioVoice] 📞 Making call...', {
          debugId: params.debugId,
          professionalId: params.professionalId,
          professionalUserId: params.professionalUserId,
          callerId: user.id,
          callType: params.type || 'voice',
          urgent: params.urgent || false,
          ratePerMinute: params.ratePerMinute,
          userBalance: params.userBalance,
          timestamp: new Date().toISOString(),
        });

        const serviceCallStartTime = Date.now();
        await twilioVoiceService.makeCall({
          professionalId: params.professionalId,
          professionalUserId: params.professionalUserId,
          callerId: user.id,
          type: params.type,
          urgent: params.urgent,
          debugId: params.debugId,
          ratePerMinute: params.ratePerMinute,
          userBalance: params.userBalance,
        });

        const serviceCallElapsed = Date.now() - serviceCallStartTime;
        const totalElapsed = Date.now() - makeCallStartTime;
        logger.info('[useTwilioVoice] ✅ Call initiated successfully', {
          debugId: params.debugId,
          professionalId: params.professionalId,
          professionalUserId: params.professionalUserId,
          serviceElapsed: `${serviceCallElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        logger.info(
          '[useTwilioVoice] 💰 Billing will be tracked once call connects',
          {
            debugId: params.debugId,
            ratePerMinute: params.ratePerMinute,
            userBalance: params.userBalance,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        const totalElapsed = Date.now() - makeCallStartTime;
        logger.error('[useTwilioVoice] ❌ Make call error', error, {
          debugId: params.debugId,
          professionalId: params.professionalId,
          professionalUserId: params.professionalUserId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [callState.status, user]
  );

  // ✅ UPDATED: acceptIncomingCall with object parameters
  const acceptIncomingCall = useCallback(
    async (params: {
      callId?: string;
      debugId?: string;
      ratePerMinute?: number;
      userBalance?: number;
    }) => {
      const acceptStartTime = Date.now();
      logger.info('[useTwilioVoice] 📞 acceptIncomingCall function called', {
        debugId: params.debugId,
        callId: params.callId,
        ratePerMinute: params.ratePerMinute,
        userBalance: params.userBalance,
        currentStatus: callState.status,
        hasCallInvite: !!callState.callInvite,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.info('[useTwilioVoice] 📞 Accepting incoming call...', {
          debugId: params.debugId,
          callId: params.callId,
          ratePerMinute: params.ratePerMinute,
          userBalance: params.userBalance,
          currentStatus: callState.status,
          hasCallInvite: !!callState.callInvite,
          timestamp: new Date().toISOString(),
        });

        // ✅ PATCH C: Readiness guard
        if (!twilioVoiceService.isReadyForCalls()) {
          logger.warn('[useTwilioVoice] ⚠️ Cannot accept call - SDK not ready', {
            debugId: params.debugId,
            timestamp: new Date().toISOString(),
          });
          throw new Error('Twilio SDK is not fully initialized and registered. Please try again.');
        }

        const serviceAcceptStartTime = Date.now();
        await twilioVoiceService.acceptIncomingCall(params);

        const serviceAcceptElapsed = Date.now() - serviceAcceptStartTime;
        const totalElapsed = Date.now() - acceptStartTime;
        logger.info('[useTwilioVoice] ✅ Incoming call accepted successfully', {
          debugId: params.debugId,
          callId: params.callId,
          serviceElapsed: `${serviceAcceptElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          newStatus: callState.status,
          timestamp: new Date().toISOString(),
        });

        logger.info(
          '[useTwilioVoice] 💰 Billing will be tracked once call connects',
          {
            debugId: params.debugId,
            callId: params.callId,
            ratePerMinute: params.ratePerMinute,
            userBalance: params.userBalance,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        const totalElapsed = Date.now() - acceptStartTime;
        logger.error('[useTwilioVoice] ❌ Accept call error', error, {
          debugId: params.debugId,
          callId: params.callId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          currentStatus: callState.status,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [callState.status, callState.callInvite]
  );

  // ✅ rejectIncomingCall - keep as is (object parameter)
  const rejectIncomingCall = useCallback(
    async (params?: { callId?: string; debugId?: string }) => {
      const rejectStartTime = Date.now();
      logger.info('[useTwilioVoice] 📞 rejectIncomingCall function called', {
        debugId: params?.debugId,
        callId: params?.callId,
        currentStatus: callState.status,
        hasCallInvite: !!callState.callInvite,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.info('[useTwilioVoice] 📞 Rejecting incoming call...', {
          debugId: params?.debugId,
          callId: params?.callId,
          currentStatus: callState.status,
          hasCallInvite: !!callState.callInvite,
          timestamp: new Date().toISOString(),
        });

        const serviceRejectStartTime = Date.now();
        await twilioVoiceService.rejectIncomingCall(params);

        const serviceRejectElapsed = Date.now() - serviceRejectStartTime;
        const totalElapsed = Date.now() - rejectStartTime;
        logger.info('[useTwilioVoice] ✅ Incoming call rejected successfully', {
          debugId: params?.debugId,
          callId: params?.callId,
          serviceElapsed: `${serviceRejectElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          newStatus: callState.status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - rejectStartTime;
        logger.error('[useTwilioVoice] ❌ Reject call error', error, {
          debugId: params?.debugId,
          callId: params?.callId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          currentStatus: callState.status,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [callState.status, callState.callInvite]
  );

  const disconnect = useCallback(async () => {
    const disconnectStartTime = Date.now();
    logger.info('[useTwilioVoice] 📞 disconnect function called', {
      currentStatus: callState.status,
      hasCall: !!callState.call,
      hasCallInvite: !!callState.callInvite,
      timestamp: new Date().toISOString(),
    });

    try {
      logger.info('[useTwilioVoice] 📞 Disconnecting call...', {
        currentStatus: callState.status,
        hasCall: !!callState.call,
        callSid:
          (callState.call as any)?.callSid ?? (callState.call as any)?.sid,
        timestamp: new Date().toISOString(),
      });

      const serviceDisconnectStartTime = Date.now();
      await twilioVoiceService.disconnect();
      const serviceDisconnectElapsed = Date.now() - serviceDisconnectStartTime;

      const totalElapsed = Date.now() - disconnectStartTime;
      logger.info('[useTwilioVoice] ✅ Call disconnected successfully', {
        serviceElapsed: `${serviceDisconnectElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        previousStatus: callState.status,
        timestamp: new Date().toISOString(),
      });

      // ✅ Stop billing tracking
      if (BillingService.isTracking()) {
        logger.info(
          '[useTwilioVoice] 💰 Stopping billing tracking after disconnect',
          {
            timestamp: new Date().toISOString(),
          }
        );
        BillingService.stopTracking();
      }
    } catch (error) {
      const totalElapsed = Date.now() - disconnectStartTime;
      logger.error('[useTwilioVoice] ❌ Disconnect error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        currentStatus: callState.status,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [callState.status, callState.call, callState.callInvite]);

  const toggleMute = useCallback(async () => {
    const toggleStartTime = Date.now();
    const currentMuteState = callState.isMuted;
    logger.info('[useTwilioVoice] 📞 toggleMute function called', {
      currentMuteState,
      timestamp: new Date().toISOString(),
    });

    try {
      logger.debug(
        '[useTwilioVoice] 🔧 Calling twilioVoiceService.toggleMute',
        {
          currentMuteState,
          timestamp: new Date().toISOString(),
        }
      );

      const serviceToggleStartTime = Date.now();
      const newMuteState = await twilioVoiceService.toggleMute();
      const serviceToggleElapsed = Date.now() - serviceToggleStartTime;

      const totalElapsed = Date.now() - toggleStartTime;
      logger.info('[useTwilioVoice] ✅ Mute toggled successfully', {
        previousMuteState: currentMuteState,
        newMuteState,
        serviceElapsed: `${serviceToggleElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return newMuteState;
    } catch (error) {
      const totalElapsed = Date.now() - toggleStartTime;
      logger.error('[useTwilioVoice] ❌ Toggle mute error', error, {
        currentMuteState,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [callState.isMuted]);

  // Log computed values changes
  useEffect(() => {
    logger.debug('[useTwilioVoice] 📊 Computed state values', {
      isIdle: callState.status === 'idle',
      isConnecting: callState.status === 'connecting',
      isRinging: callState.status === 'ringing',
      isConnected: callState.status === 'connected',
      isReconnecting: callState.status === 'reconnecting',
      isDisconnected: callState.status === 'disconnected',
      status: callState.status,
      timestamp: new Date().toISOString(),
    });
  }, [callState.status]);

  // Log initialization state changes
  useEffect(() => {
    logger.debug('[useTwilioVoice] 🔧 Initialization state changed', {
      isInitialized,
      timestamp: new Date().toISOString(),
    });
  }, [isInitialized]);

  // Log error state changes
  useEffect(() => {
    if (error) {
      logger.error('[useTwilioVoice] ❌ Error state set', error, {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }, [error]);

  logger.debug('[useTwilioVoice] 🎨 Returning hook values', {
    hasCallState: !!callState,
    isInitialized,
    hasError: !!error,
    computedStates: {
      isIdle: callState.status === 'idle',
      isConnecting: callState.status === 'connecting',
      isRinging: callState.status === 'ringing',
      isConnected: callState.status === 'connected',
    },
    timestamp: new Date().toISOString(),
  });

  return {
    // State
    callState,
    isInitialized,
    error,

    // Computed
    isIdle: callState.status === 'idle',
    isConnecting: callState.status === 'connecting',
    isRinging: callState.status === 'ringing',
    isConnected: callState.status === 'connected',
    isReconnecting: callState.status === 'reconnecting',
    isDisconnected: callState.status === 'disconnected',

    // Methods
    makeCall,
    acceptIncomingCall,
    rejectIncomingCall,
    disconnect,
    toggleMute,
  };
}
