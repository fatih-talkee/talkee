import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { notificationsService } from '@/services';

// ✅ TWILIO IMPORTS
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useProfessional } from '@/hooks/useProfessionals';
import { useProfile } from '@/hooks/useProfile';

export default function CallScreen() {
  const mountTimeRef = useRef<number>(Date.now());
  const { id, type, urgent, incoming, rate_per_minute } =
    useLocalSearchParams();

  logger.info('[CallScreen] 🎬 Component rendering', {
    routeParams: { id, type, urgent, incoming, rate_per_minute },
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  });

  const isIncoming = incoming === 'true';
  const insets = useSafeAreaInsets();
  const { user, isLoading: profileLoading } = useProfile();

  const professionalId = (id as string) || '';

  const { data: professionalData, isLoading: professionalLoading } =
    useProfessional(professionalId, {
      enabled: !isIncoming && !!professionalId,
    });
  const professional = professionalData || null;

  const {
    callState,
    isInitialized,
    isConnecting,
    isConnected,
    isIdle,
    error: twilioError,
    makeCall,
    acceptIncomingCall,
    rejectIncomingCall,
    disconnect,
    toggleMute,
  } = useTwilioVoice();

  const isMuted = callState.isMuted;
  const callSid =
    (callState.call as any)?.callSid ??
    (callState.call as any)?.sid ??
    (callState.call as any)?.getSid?.();
  const inviteSid = (callState.callInvite as any)?.getCallSid?.();

  useEffect(() => {
    logger.debug('[CallScreen] 📡 Twilio call state changed', {
      status: callState.status,
      isMuted,
      hasCall: !!callState.call,
      hasCallInvite: !!callState.callInvite,
      callSid,
      inviteSid,
      isInitialized,
      isConnecting,
      isConnected,
      isIdle,
      hasError: !!twilioError,
      timestamp: new Date().toISOString(),
    });
  }, [
    callState.status,
    callState.call,
    callState.callInvite,
    isMuted,
    callSid,
    inviteSid,
    isInitialized,
    isConnecting,
    isConnected,
    isIdle,
    twilioError,
  ]);

  const [duration, setDuration] = useState(0);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const [dbCallId, setDbCallId] = useState<string | null>(null);
  const pendingDbCallIdRef = useRef<string | null>(null);
  const [incomingCallDetails, setIncomingCallDetails] = useState<{
    callId: string;
    callerId?: string;
    callerName?: string;
    callerAvatarUrl?: string;
    callType?: string;
    ratePerMinute?: number;
  } | null>(null);

  const ratePerMinuteParam = useMemo(() => {
    const raw = rate_per_minute;
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (!s) {
      logger.debug('[CallScreen] 💰 No rate_per_minute param', {
        raw,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
    const n = Number(s);
    const result = Number.isFinite(n) ? n : null;
    logger.debug('[CallScreen] 💰 Rate per minute param parsed', {
      raw,
      parsed: result,
      timestamp: new Date().toISOString(),
    });
    return result;
  }, [rate_per_minute]);

  const effectiveRatePerMinute = useMemo(() => {
    let result: number;
    if (isIncoming) {
      result = incomingCallDetails?.ratePerMinute ?? ratePerMinuteParam ?? 0;
    } else {
      result = ratePerMinuteParam ?? Number(professional?.rate_per_minute || 0);
    }
    logger.debug('[CallScreen] 💰 Effective rate per minute calculated', {
      isIncoming,
      incomingRate: incomingCallDetails?.ratePerMinute,
      paramRate: ratePerMinuteParam,
      professionalRate: professional?.rate_per_minute,
      effectiveRate: result,
      timestamp: new Date().toISOString(),
    });
    return result;
  }, [
    isIncoming,
    incomingCallDetails?.ratePerMinute,
    ratePerMinuteParam,
    professional?.rate_per_minute,
  ]);

  const costPerSecond = useMemo(() => {
    const result = effectiveRatePerMinute > 0 ? effectiveRatePerMinute / 60 : 0;
    logger.debug('[CallScreen] 💰 Cost per second calculated', {
      effectiveRatePerMinute,
      costPerSecond: result,
      timestamp: new Date().toISOString(),
    });
    return result;
  }, [effectiveRatePerMinute]);

  const callAttemptId = useMemo(() => {
    const rand = Math.random().toString(36).slice(2, 8);
    const attemptId = `call_${Date.now()}_${rand}`;
    logger.info('[CallScreen] 🆔 Call attempt ID generated', {
      callAttemptId: attemptId,
      timestamp: new Date().toISOString(),
    });
    return attemptId;
  }, []);

  const hasEndedRef = useRef(false);
  const callStateRef = useRef(callState);
  const lowBalanceWarnedRef = useRef(false);
  const lastChargedMinuteRef = useRef<number>(0);
  const nextMinuteLowBalancePushSentRef = useRef(false);
  const lastBalanceAfterChargeRef = useRef<number | null>(null);

  useEffect(() => {
    callStateRef.current = callState;
    logger.debug('[CallScreen] 🔄 callStateRef updated', {
      status: callState.status,
      hasCall: !!callState.call,
      hasCallInvite: !!callState.callInvite,
      timestamp: new Date().toISOString(),
    });
  }, [callState]);

  useEffect(() => {
    logger.debug(
      '[CallScreen] 🔧 Setting up disconnect check timeout (100ms)',
      {
        callAttemptId,
        timestamp: new Date().toISOString(),
      }
    );

    const timeoutId = setTimeout(() => {
      const currentStatus = callStateRef.current.status;
      const currentCall = callStateRef.current.call;

      logger.debug('[CallScreen] 🔍 Disconnect check timeout triggered', {
        callAttemptId,
        currentStatus,
        hasCall: !!currentCall,
        hasEnded: hasEndedRef.current,
        isIncoming,
        timestamp: new Date().toISOString(),
      });

      if (hasEndedRef.current || isIncoming) {
        logger.debug('[CallScreen] ⏭️ Skipping disconnect check', {
          callAttemptId,
          reason: hasEndedRef.current ? 'already ended' : 'incoming call',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const wasConnected = callSid || dbCallId || pendingDbCallIdRef.current;
      const isDisconnected =
        currentStatus === 'disconnected' ||
        (wasConnected && !currentCall && callInitiated);

      if (isDisconnected) {
        const currentCallSid = callSid;
        const currentDbCallId = dbCallId || pendingDbCallIdRef.current;

        if (!currentCallSid && !currentDbCallId && !callInitiated) {
          return;
        }

        logger.info('[CallScreen] Disconnect detected via callStateRef check', {
          callAttemptId,
          status: currentStatus,
          hasCall: !!currentCall,
          wasConnected,
          callSid: currentCallSid,
          dbCallId: currentDbCallId,
          callInitiated,
          professionalId: professional?.id,
          timestamp: Date.now(),
        });

        if (hasEndedRef.current) {
          return;
        }

        hasEndedRef.current = true;
        const professionalIdToUse =
          professional?.id || (!isIncoming ? (id as string) : null);

        logger.info('[CallScreen] 🔧 Scheduling navigation (100ms delay)', {
          callAttemptId,
          professionalIdToUse,
          willNavigateTo:
            professionalIdToUse && !isIncoming
              ? `/professional/${professionalIdToUse}`
              : 'back()',
          timestamp: new Date().toISOString(),
        });

        setTimeout(() => {
          try {
            if (professionalIdToUse && !isIncoming) {
              logger.info(
                '[CallScreen] 🚀 Navigating to professional profile',
                {
                  callAttemptId,
                  professionalId: professionalIdToUse,
                  timestamp: new Date().toISOString(),
                }
              );
              router.replace(`/professional/${professionalIdToUse}`);
            } else {
              logger.info('[CallScreen] 🚀 Using router.back()', {
                callAttemptId,
                timestamp: new Date().toISOString(),
              });
              router.back();
            }
          } catch (navError) {
            logger.error('[CallScreen] ❌ Navigation error', navError, {
              callAttemptId,
              professionalIdToUse,
              timestamp: new Date().toISOString(),
            });
          }
        }, 100);
      }
    }, 100);

    return () => {
      logger.debug('[CallScreen] 🔧 Cleaning up disconnect check timeout', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      clearTimeout(timeoutId);
    };
  }, [
    callState.status,
    callState.call,
    callSid,
    dbCallId,
    callInitiated,
    isIncoming,
    professional?.id,
    id,
    callAttemptId,
  ]);

  useEffect(() => {
    const currentStatus = callStateRef.current.status;
    const currentCallState = callStateRef.current;

    logger.info('[CallScreen] Disconnect check effect triggered', {
      callAttemptId,
      status: callState.status,
      callStateRefStatus: currentStatus,
      hasEnded: hasEndedRef.current,
      isIncoming,
      callInitiated,
      callSid,
      dbCallId,
      pendingDbCallId: pendingDbCallIdRef.current,
      professionalId: professional?.id,
      routeId: id,
      timestamp: Date.now(),
    });

    if (hasEndedRef.current) {
      logger.info('[CallScreen] Skipping disconnect check (already ended)', {
        callAttemptId,
      });
      return;
    }
    if (isIncoming) {
      logger.info('[CallScreen] Skipping disconnect check (incoming call)', {
        callAttemptId,
      });
      return;
    }

    const currentCallSid = callSid;
    const currentDbCallId = dbCallId || pendingDbCallIdRef.current;

    if (!currentCallSid && !currentDbCallId && !callInitiated) {
      logger.info(
        '[CallScreen] Skipping disconnected state (no call identifiers yet)',
        {
          callAttemptId,
          callInitiated,
          hasCallSid: !!currentCallSid,
          hasDbCallId: !!currentDbCallId,
          hasPendingDbCallId: !!pendingDbCallIdRef.current,
        }
      );
      return;
    }

    if (currentCallState.callInvite && !isIncoming) {
      logger.warn(
        '[CallScreen] Ignoring callInvite state update for outgoing call',
        {
          callAttemptId,
          callSid: currentCallSid,
          dbCallId: currentDbCallId,
        }
      );
      return;
    }

    const wasConnected = currentCallSid || currentDbCallId;
    const callDisappeared =
      wasConnected && !currentCallState.call && callInitiated;
    const isDisconnected =
      callState.status === 'disconnected' ||
      currentStatus === 'disconnected' ||
      callDisappeared;

    if (isDisconnected) {
      logger.info('[CallScreen] Disconnected state detected', {
        callAttemptId,
        callSid: currentCallSid,
        dbCallId: currentDbCallId,
        callInitiated,
        status: callState.status,
        callStateRefStatus: currentStatus,
        hasCall: !!currentCallState.call,
        callDisappeared,
        wasConnected,
        error: callState.error
          ? {
              message: callState.error.message,
              name: callState.error.name,
              code: (callState.error as any)?.code,
            }
          : null,
        professionalId: professional?.id,
        routeId: id,
        hasProfessional: !!professional,
        isIncoming,
        hasEnded: hasEndedRef.current,
      });

      if (hasEndedRef.current) {
        logger.warn('[CallScreen] Already ended, skipping navigation', {
          callAttemptId,
        });
        return;
      }

      hasEndedRef.current = true;

      const errorDetails = callState.error
        ? {
            message: callState.error.message,
            name: callState.error.name,
            code: (callState.error as any)?.code,
            stack: callState.error.stack,
          }
        : null;

      logger.info('[CallScreen] Call ended/cancelled; leaving screen', {
        callAttemptId,
        callSid: currentCallSid,
        dbCallId: currentDbCallId,
        pendingDbCallId: pendingDbCallIdRef.current,
        callInitiated,
        status: callState.status,
        error: errorDetails,
        professionalId: professional?.id,
        professionalUserId: professional?.user_id,
        routeId: id,
        hasProfessional: !!professional,
        isIncoming,
        timestamp: Date.now(),
      });

      const professionalIdToUse =
        professional?.id || (!isIncoming ? (id as string) : null);

      logger.info('[CallScreen] Preparing navigation', {
        callAttemptId,
        professionalIdToUse,
        hasProfessionalId: !!professional?.id,
        hasRouteId: !!id,
        isIncoming,
        willNavigateTo:
          professionalIdToUse && !isIncoming
            ? `/professional/${professionalIdToUse}`
            : 'back()',
      });

      setTimeout(() => {
        try {
          if (professionalIdToUse && !isIncoming) {
            logger.info('[CallScreen] Navigating to professional profile', {
              callAttemptId,
              professionalId: professionalIdToUse,
              source: professional?.id ? 'professional.id' : 'route.id',
            });
            router.replace(`/professional/${professionalIdToUse}`);
          } else {
            logger.info('[CallScreen] Using router.back()', {
              callAttemptId,
              isIncoming,
            });
            router.back();
          }
        } catch (navError) {
          logger.error('[CallScreen] Navigation error', navError, {
            callAttemptId,
            professionalIdToUse,
            isIncoming,
          });
        }
      }, 100);
    }
  }, [
    callState.status,
    callState.callInvite,
    callState.error,
    callState.call,
    callInitiated,
    callAttemptId,
    callSid,
    dbCallId,
    isIncoming,
    professional?.id,
    id,
  ]);

  const safeEndCall = async (reason: string) => {
    logger.info('[CallScreen] 🔧 safeEndCall called', {
      callAttemptId,
      reason,
      hasEnded: hasEndedRef.current,
      currentStatus: callStateRef.current.status,
      timestamp: new Date().toISOString(),
    });

    if (hasEndedRef.current) {
      logger.debug('[CallScreen] ⏭️ Call already ended, skipping', {
        callAttemptId,
        reason,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const active =
      callStateRef.current.status === 'connecting' ||
      callStateRef.current.status === 'ringing' ||
      callStateRef.current.status === 'connected' ||
      !!callStateRef.current.callInvite;

    logger.debug('[CallScreen] 🔍 Checking if call is active', {
      callAttemptId,
      reason,
      active,
      status: callStateRef.current.status,
      hasCallInvite: !!callStateRef.current.callInvite,
      timestamp: new Date().toISOString(),
    });

    if (!active) {
      logger.debug('[CallScreen] ⏭️ Call not active, skipping end', {
        callAttemptId,
        reason,
        status: callStateRef.current.status,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    hasEndedRef.current = true;
    logger.info('[CallScreen] 📞 Auto-ending call', {
      callAttemptId,
      reason,
      status: callStateRef.current.status,
      timestamp: new Date().toISOString(),
    });
    try {
      const disconnectStartTime = Date.now();
      await disconnect();
      logger.info('[CallScreen] ✅ Call disconnected successfully', {
        callAttemptId,
        reason,
        elapsed: `${Date.now() - disconnectStartTime}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      logger.error('[CallScreen] ❌ Auto-end call failed', e, {
        callAttemptId,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    logger.info('[CallScreen] 🔧 Setting up AppState listener', {
      callAttemptId,
      timestamp: new Date().toISOString(),
    });

    const sub = AppState.addEventListener('change', (nextState) => {
      logger.debug('[CallScreen] 📱 AppState changed', {
        callAttemptId,
        nextState,
        currentStatus: callStateRef.current.status,
        timestamp: new Date().toISOString(),
      });

      if (nextState === 'background') {
        const status = callStateRef.current.status;
        const stillConnecting = status === 'connecting' || status === 'ringing';
        logger.info('[CallScreen] 📱 App moved to background', {
          callAttemptId,
          status,
          stillConnecting,
          timestamp: new Date().toISOString(),
        });

        if (stillConnecting) {
          logger.warn(
            '[CallScreen] ⚠️ Ending call - app moved to background during connection',
            {
              callAttemptId,
              status,
              timestamp: new Date().toISOString(),
            }
          );
          void safeEndCall(`appstate:${nextState}`);
        }
      }
    });

    logger.info('[CallScreen] ✅ AppState listener registered', {
      callAttemptId,
      timestamp: new Date().toISOString(),
    });

    return () => {
      logger.info('[CallScreen] 🔧 Removing AppState listener', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      sub.remove();
    };
  }, []);

  useEffect(() => {
    logger.debug(
      '[CallScreen] 🔧 Component lifecycle effect (no auto-hangup on unmount)',
      {
        callAttemptId,
        timestamp: new Date().toISOString(),
      }
    );

    return () => {
      logger.debug(
        '[CallScreen] 🔚 Component lifecycle cleanup (no auto-hangup)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      // Do not auto-hangup on unmount
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!isIncoming) {
      logger.debug(
        '[CallScreen] ⏭️ Skipping incoming call details load (not incoming)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }
    if (!id) {
      logger.warn('[CallScreen] ⚠️ No call ID provided for incoming call', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('[CallScreen] 🔧 Dismissing incoming call notifications', {
      callAttemptId,
      callId: id as string,
      callSid,
      timestamp: new Date().toISOString(),
    });

    void notificationsService
      .dismissIncomingCallNotifications({
        callId: id as string,
        callSid: callSid as any,
      })
      .then(() => {
        logger.info('[CallScreen] ✅ Incoming call notifications dismissed', {
          callAttemptId,
          callId: id as string,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((error) => {
        logger.error('[CallScreen] ❌ Failed to dismiss notifications', error, {
          callAttemptId,
          callId: id as string,
          timestamp: new Date().toISOString(),
        });
      });

    (async () => {
      const loadStartTime = Date.now();
      try {
        logger.info('[CallScreen] 🔧 Loading incoming call details', {
          callAttemptId,
          callId: id,
          timestamp: new Date().toISOString(),
        });

        logger.debug('[CallScreen] 🔧 Creating query promise', {
          callAttemptId,
          callId: id,
          timestamp: new Date().toISOString(),
        });

        const queryPromise = supabase
          .from('calls')
          .select(
            `
            id,
            call_type,
            rate_per_minute,
            caller:users!caller_id(id, name, avatar_url)
          `
          )
          .eq('id', id as string)
          .single();

        logger.debug('[CallScreen] 🔧 Creating timeout promise (30s)', {
          callAttemptId,
          callId: id,
          timestamp: new Date().toISOString(),
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            logger.warn('[CallScreen] ⏰ Query timeout after 30 seconds', {
              callAttemptId,
              callId: id,
              timestamp: new Date().toISOString(),
            });
            reject(
              new Error(
                'Query timeout: Failed to load call details within 30 seconds'
              )
            );
          }, 30_000);
        });

        logger.debug('[CallScreen] 🔧 Racing query and timeout promises', {
          callAttemptId,
          callId: id,
          timestamp: new Date().toISOString(),
        });

        const { data, error } = (await Promise.race([
          queryPromise,
          timeoutPromise,
        ])) as any;

        const loadElapsed = Date.now() - loadStartTime;
        logger.info('[CallScreen] ✅ Query completed', {
          callAttemptId,
          callId: id,
          elapsed: `${loadElapsed}ms`,
          hasError: !!error,
          hasData: !!data,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          logger.error('[CallScreen] ❌ Query error', error, {
            callAttemptId,
            callId: id,
            errorMessage: error.message,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
          });
          throw error;
        }

        if (!mounted) {
          logger.warn('[CallScreen] ⚠️ Component unmounted during query', {
            callAttemptId,
            callId: id,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.debug('[CallScreen] 🔍 Parsing query result', {
          callAttemptId,
          callId: id,
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          timestamp: new Date().toISOString(),
        });

        const caller = Array.isArray((data as any)?.caller)
          ? (data as any).caller[0]
          : (data as any)?.caller;
        const callId = data?.id;

        logger.info('[CallScreen] 📋 Incoming call details parsed', {
          callAttemptId,
          callId,
          callType: data?.call_type,
          ratePerMinute: data?.rate_per_minute,
          callerId: caller?.id,
          callerName: caller?.name,
          hasCallerAvatar: !!caller?.avatar_url,
          timestamp: new Date().toISOString(),
        });

        const callDetails = {
          callId: callId,
          callType: data?.call_type,
          ratePerMinute: data?.rate_per_minute
            ? Number(data.rate_per_minute)
            : 0,
          callerId: caller?.id,
          callerName: caller?.name,
          callerAvatarUrl: caller?.avatar_url,
        };

        logger.debug('[CallScreen] 🔧 Setting incoming call details state', {
          callAttemptId,
          callDetails,
          timestamp: new Date().toISOString(),
        });

        setIncomingCallDetails(callDetails);
        if (callId) {
          logger.debug('[CallScreen] 🔧 Setting dbCallId', {
            callAttemptId,
            callId,
            timestamp: new Date().toISOString(),
          });
          setDbCallId(callId);
        }

        logger.info(
          '[CallScreen] ✅ Incoming call details loaded successfully',
          {
            callAttemptId,
            callId,
            elapsed: `${Date.now() - loadStartTime}ms`,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (e) {
        const loadElapsed = Date.now() - loadStartTime;
        logger.error(
          '[CallScreen] ❌ Failed to load incoming call details',
          e,
          {
            callAttemptId,
            callId: id,
            error: e instanceof Error ? e.message : String(e),
            errorStack: e instanceof Error ? e.stack : undefined,
            elapsed: `${loadElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        if (mounted) {
          logger.warn('[CallScreen] ⚠️ Setting fallback call details', {
            callAttemptId,
            callId: id as string,
            ratePerMinute: ratePerMinuteParam ?? undefined,
            timestamp: new Date().toISOString(),
          });
          setIncomingCallDetails({
            callId: id as string,
            ratePerMinute: ratePerMinuteParam ?? undefined,
          });
          setDbCallId(id as string);
        }
      }
    })();

    return () => {
      logger.debug('[CallScreen] 🔧 Cleaning up incoming call details loader', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      mounted = false;
    };
  }, [isIncoming, id, callAttemptId, ratePerMinuteParam, callSid]);

  useEffect(() => {
    if (pendingDbCallIdRef.current && !dbCallId) {
      logger.info('[CallScreen] 🔧 Setting dbCallId from pending ref', {
        callAttemptId,
        pendingDbCallId: pendingDbCallIdRef.current,
        timestamp: new Date().toISOString(),
      });
      setDbCallId(pendingDbCallIdRef.current);
      pendingDbCallIdRef.current = null;
      logger.info('[CallScreen] ✅ dbCallId set from pending ref', {
        callAttemptId,
        dbCallId: pendingDbCallIdRef.current,
        timestamp: new Date().toISOString(),
      });
    }
  }, [dbCallId]);

  useEffect(() => {
    if (!isIncoming) {
      logger.debug(
        '[CallScreen] ⏭️ Skipping notification listener (not incoming)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    logger.info(
      '[CallScreen] 🔧 Setting up notification listener for incoming call',
      {
        callAttemptId,
        callId: incomingCallDetails?.callId,
        callSid,
        inviteSid,
        timestamp: new Date().toISOString(),
      }
    );

    const unsubscribe = notificationsService.onNotificationReceived(
      (notification) => {
        logger.debug('[CallScreen] 🔔 Notification received', {
          callAttemptId,
          notificationType: notification.data?.type,
          timestamp: new Date().toISOString(),
        });

        const type = notification.data?.type;
        if (type !== 'call_ended' && type !== 'call_missed') {
          logger.debug(
            '[CallScreen] ⏭️ Ignoring notification (not call_ended/call_missed)',
            {
              callAttemptId,
              type,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }

        const endedCallId = notification.data?.call_id;
        const endedCallSid = notification.data?.call_sid;

        logger.debug('[CallScreen] 🔍 Checking notification match', {
          callAttemptId,
          type,
          endedCallId,
          endedCallSid,
          currentCallId: incomingCallDetails?.callId,
          currentCallSid: callSid,
          currentInviteSid: inviteSid,
          timestamp: new Date().toISOString(),
        });

        const matchesCallId =
          Boolean(endedCallId) &&
          Boolean(incomingCallDetails?.callId) &&
          endedCallId === incomingCallDetails?.callId;

        const matchesSid =
          Boolean(endedCallSid) &&
          (endedCallSid === callSid || endedCallSid === inviteSid);

        logger.debug('[CallScreen] 🔍 Match results', {
          callAttemptId,
          matchesCallId,
          matchesSid,
          timestamp: new Date().toISOString(),
        });

        if (!matchesCallId && !matchesSid) {
          logger.debug(
            '[CallScreen] ⏭️ Notification does not match current call',
            {
              callAttemptId,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }
        if (hasEndedRef.current) {
          logger.debug(
            '[CallScreen] ⏭️ Call already ended, ignoring notification',
            {
              callAttemptId,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }

        hasEndedRef.current = true;
        logger.info(
          '[CallScreen] 📞 Incoming call ended before answer; leaving screen',
          {
            callAttemptId,
            type,
            endedCallId,
            endedCallSid,
            callSid,
            inviteSid,
            timestamp: new Date().toISOString(),
          }
        );
        router.back();
      }
    );

    logger.info('[CallScreen] ✅ Notification listener registered', {
      callAttemptId,
      timestamp: new Date().toISOString(),
    });

    return () => {
      logger.info('[CallScreen] 🔧 Removing notification listener', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      unsubscribe();
    };
  }, [
    isIncoming,
    incomingCallDetails?.callId,
    callAttemptId,
    callSid,
    inviteSid,
  ]);

  useEffect(() => {
    logger.info('[CallScreen] Auto-init check', {
      callAttemptId,
      callInitiated,
      hasProfessional: !!professional,
      hasUser: !!user,
      profileLoading,
      isInitialized,
      callStatus: callState.status,
      route: { id, type, urgent, incoming },
    });

    if (isIncoming) return;

    if (callState.callInvite && !isIncoming) {
      logger.warn(
        '[CallScreen] Ignoring callInvite state update for outgoing call',
        {
          callAttemptId,
          hasCallInvite: !!callState.callInvite,
          isIncoming,
        }
      );
      return;
    }

    if (profileLoading) {
      logger.info('[CallScreen] Waiting for user profile to load...', {
        callAttemptId,
        profileLoading: true,
      });
      return;
    }

    if (!user) {
      logger.error(
        '[CallScreen] User not authenticated, cannot make call',
        undefined,
        {
          callAttemptId,
          profileLoading: false,
          hasUser: false,
        }
      );
      setTimeout(() => {
        Alert.alert(
          'Authentication Required',
          'Please sign in to make a call.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
      }, 100);
      return;
    }

    if (!callInitiated && professional && user && isInitialized && isIdle) {
      logger.info('[CallScreen] All conditions met, initiating call...', {
        callAttemptId,
        hasProfessional: !!professional,
        hasUser: !!user,
        isInitialized,
        isIdle,
      });
      initiateCall();
    }
  }, [
    callAttemptId,
    callInitiated,
    professional,
    user,
    profileLoading,
    isInitialized,
    isIdle,
    callState.status,
    callState.callInvite,
    id,
    type,
    urgent,
    incoming,
    isIncoming,
  ]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const hasOwnCall = !!callSid || !!dbCallId || !!pendingDbCallIdRef.current;
    const shouldStartTimer =
      isConnected && hasOwnCall && (callInitiated || !isIncoming);

    logger.info('[CallScreen] Duration timer effect', {
      callAttemptId,
      isConnected,
      hasOwnCall,
      hasCallSid: !!callSid,
      hasDbCallId: !!dbCallId,
      hasPendingDbCallId: !!pendingDbCallIdRef.current,
      callInitiated,
      isIncoming,
      shouldStartTimer,
      currentDuration: duration,
      timestamp: Date.now(),
    });

    if (shouldStartTimer) {
      logger.info('[CallScreen] Starting duration timer', {
        callAttemptId,
        callSid,
        dbCallId,
        pendingDbCallId: pendingDbCallIdRef.current,
        timestamp: Date.now(),
      });

      interval = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration % 10 === 0) {
            logger.info('[CallScreen] Duration timer tick', {
              callAttemptId,
              duration: newDuration,
              timestamp: Date.now(),
            });
          }
          return newDuration;
        });
      }, 1000);
    } else {
      logger.info('[CallScreen] Not starting duration timer', {
        callAttemptId,
        reason: !isConnected
          ? 'not connected'
          : !hasOwnCall
          ? 'no own call'
          : 'call not initiated',
        isConnected,
        hasOwnCall,
        callInitiated,
        isIncoming,
        timestamp: Date.now(),
      });
    }

    return () => {
      if (interval) {
        logger.info('[CallScreen] Clearing duration timer', {
          callAttemptId,
          timestamp: Date.now(),
        });
        clearInterval(interval);
      }
    };
  }, [
    isConnected,
    callSid,
    dbCallId,
    callInitiated,
    isIncoming,
    callAttemptId,
  ]);

  useEffect(() => {
    logger.debug('[CallScreen] 🔍 Per-minute charge check', {
      callAttemptId,
      isIncoming,
      isConnected,
      hasDbCallId: !!dbCallId,
      effectiveRatePerMinute,
      duration,
      timestamp: new Date().toISOString(),
    });

    if (isIncoming) {
      logger.debug(
        '[CallScreen] ⏭️ Skipping per-minute charge (incoming call)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }
    if (!isConnected) {
      logger.debug(
        '[CallScreen] ⏭️ Skipping per-minute charge (not connected)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }
    if (!dbCallId) {
      logger.debug('[CallScreen] ⏭️ Skipping per-minute charge (no dbCallId)', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (effectiveRatePerMinute <= 0) {
      logger.debug('[CallScreen] ⏭️ Skipping per-minute charge (rate is 0)', {
        callAttemptId,
        effectiveRatePerMinute,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const currentMinute = Math.floor(duration / 60) + 1;
    const isMinuteBoundary = duration > 0 && duration % 60 === 0;

    logger.debug('[CallScreen] 🔍 Minute boundary check', {
      callAttemptId,
      duration,
      currentMinute,
      isMinuteBoundary,
      lastChargedMinute: lastChargedMinuteRef.current,
      shouldCharge:
        isMinuteBoundary && currentMinute > lastChargedMinuteRef.current,
      timestamp: new Date().toISOString(),
    });

    if (isMinuteBoundary && currentMinute > lastChargedMinuteRef.current) {
      logger.info('[CallScreen] 💰 Charging for minute', {
        callAttemptId,
        callId: dbCallId,
        minute_number: currentMinute,
        duration,
        timestamp: new Date().toISOString(),
      });

      lastChargedMinuteRef.current = currentMinute;

      (async () => {
        const chargeStartTime = Date.now();
        try {
          logger.debug('[CallScreen] 🔧 Invoking charge-call-minute function', {
            callAttemptId,
            callId: dbCallId,
            minute_number: currentMinute,
            timestamp: new Date().toISOString(),
          });

          const { data, error } = await supabase.functions.invoke(
            'charge-call-minute',
            {
              body: {
                call_id: dbCallId,
                minute_number: currentMinute,
              },
            }
          );

          const chargeElapsed = Date.now() - chargeStartTime;
          logger.debug('[CallScreen] ✅ Charge function completed', {
            callAttemptId,
            callId: dbCallId,
            minute_number: currentMinute,
            elapsed: `${chargeElapsed}ms`,
            hasError: !!error,
            hasData: !!data,
            timestamp: new Date().toISOString(),
          });

          if (error) {
            logger.error('[CallScreen] ❌ Per-minute charge failed', error, {
              callAttemptId,
              callId: dbCallId,
              minute_number: currentMinute,
              errorMessage: error.message,
              errorCode: error.code,
              elapsed: `${chargeElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          const nextMinuteAffordable = data?.next_minute_affordable ?? true;
          const newBalance = data?.new_balance ?? 0;

          logger.info('[CallScreen] ✅ Minute charged successfully', {
            callAttemptId,
            callId: dbCallId,
            minute_number: currentMinute,
            cost: data?.cost,
            new_balance: newBalance,
            next_minute_affordable: nextMinuteAffordable,
            elapsed: `${chargeElapsed}ms`,
            timestamp: new Date().toISOString(),
          });

          if (user && (user as any).wallet_balance !== undefined) {
            const oldBalance = (user as any).wallet_balance;
            (user as any).wallet_balance = newBalance;
            logger.debug('[CallScreen] 🔧 Updated user wallet balance', {
              callAttemptId,
              oldBalance,
              newBalance,
              timestamp: new Date().toISOString(),
            });
          }

          if (!nextMinuteAffordable) {
            logger.warn('[CallScreen] ⚠️ Next minute not affordable', {
              callAttemptId,
              callId: dbCallId,
              minute_number: currentMinute,
              newBalance,
              nextMinuteCost: effectiveRatePerMinute,
              hasSentPush: nextMinuteLowBalancePushSentRef.current,
              timestamp: new Date().toISOString(),
            });

            if (!nextMinuteLowBalancePushSentRef.current) {
              nextMinuteLowBalancePushSentRef.current = true;
              logger.info(
                '[CallScreen] 🔧 Sending low balance push notification',
                {
                  callAttemptId,
                  callId: dbCallId,
                  userId: user?.id,
                  timestamp: new Date().toISOString(),
                }
              );

              try {
                await notificationsService.sendPushNotification(
                  user?.id || '',
                  'Low Balance Warning',
                  `Your balance is low. Please add credits to continue the call.`,
                  {
                    type: 'low_balance_warning',
                    call_id: dbCallId,
                    action_url: 'talkee://credit-selection',
                  }
                );
                logger.info(
                  '[CallScreen] ✅ Low balance push sent successfully',
                  {
                    callAttemptId,
                    callId: dbCallId,
                    userId: user?.id,
                    timestamp: new Date().toISOString(),
                  }
                );
              } catch (pushErr) {
                logger.error(
                  '[CallScreen] ❌ Failed to send low balance push',
                  pushErr,
                  {
                    callAttemptId,
                    callId: dbCallId,
                    userId: user?.id,
                    error:
                      pushErr instanceof Error
                        ? pushErr.message
                        : String(pushErr),
                    timestamp: new Date().toISOString(),
                  }
                );
              }

              logger.info('[CallScreen] 🔧 Showing low balance alert', {
                callAttemptId,
                callId: dbCallId,
                timestamp: new Date().toISOString(),
              });

              Alert.alert(
                'Low Balance',
                'Your balance is low. Please add credits to continue the call.',
                [
                  {
                    text: 'Add Credits',
                    onPress: () => {
                      router.push('/credit-selection');
                    },
                  },
                  { text: 'Continue', style: 'cancel' },
                ]
              );
            }
          } else {
            logger.debug('[CallScreen] ✅ Next minute is affordable', {
              callAttemptId,
              callId: dbCallId,
              minute_number: currentMinute,
              newBalance,
              nextMinuteCost: effectiveRatePerMinute,
              timestamp: new Date().toISOString(),
            });
            nextMinuteLowBalancePushSentRef.current = false;
          }

          const nextMinute = currentMinute + 1;
          const nextMinuteCost = effectiveRatePerMinute;
          const balanceAfterThisMinute = newBalance;

          logger.debug(
            '[CallScreen] 🔍 Checking if balance sufficient for next minute',
            {
              callAttemptId,
              callId: dbCallId,
              currentMinute,
              nextMinute,
              balanceAfterThisMinute,
              nextMinuteCost,
              isSufficient: balanceAfterThisMinute >= nextMinuteCost,
              timestamp: new Date().toISOString(),
            }
          );

          if (
            balanceAfterThisMinute < nextMinuteCost &&
            nextMinuteLowBalancePushSentRef.current &&
            !hasEndedRef.current
          ) {
            logger.warn(
              '[CallScreen] ⚠️ Ending call - insufficient balance for next minute',
              {
                callAttemptId,
                callId: dbCallId,
                currentMinute,
                nextMinute,
                balanceAfterThisMinute,
                nextMinuteCost,
                timestamp: new Date().toISOString(),
              }
            );

            Alert.alert(
              'Call Ended',
              'Your call has ended because your balance is insufficient for the next minute.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    void safeEndCall('insufficient_balance_next_minute').then(
                      () => {
                        router.back();
                      }
                    );
                  },
                },
              ],
              { cancelable: false }
            );
          }
        } catch (err) {
          logger.error('[CallScreen] ❌ Per-minute charge error', err, {
            callAttemptId,
            callId: dbCallId,
            minute_number: currentMinute,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
          });
        }
      })();
    }
  }, [
    isIncoming,
    isConnected,
    dbCallId,
    duration,
    effectiveRatePerMinute,
    callAttemptId,
    user,
  ]);

  const maxAffordableSeconds = useMemo(() => {
    if (isIncoming) {
      logger.debug(
        '[CallScreen] ⏭️ Skipping max affordable calculation (incoming)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
    const bal = Number((user as any)?.wallet_balance ?? 0);
    if (!Number.isFinite(bal) || bal <= 0) {
      logger.debug('[CallScreen] 💰 Max affordable: 0 (no balance)', {
        callAttemptId,
        balance: bal,
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
    if (costPerSecond <= 0) {
      logger.debug(
        '[CallScreen] 💰 Max affordable: null (no cost per second)',
        {
          callAttemptId,
          costPerSecond,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
    const result = Math.floor(bal / costPerSecond);
    logger.debug('[CallScreen] 💰 Max affordable seconds calculated', {
      callAttemptId,
      balance: bal,
      costPerSecond,
      maxAffordableSeconds: result,
      timestamp: new Date().toISOString(),
    });
    return result;
  }, [isIncoming, user, costPerSecond]);

  useEffect(() => {
    logger.debug('[CallScreen] 🔍 Balance depletion check', {
      callAttemptId,
      isIncoming,
      isConnected,
      maxAffordableSeconds,
      duration,
      remaining:
        maxAffordableSeconds != null ? maxAffordableSeconds - duration : null,
      lowBalanceWarned: lowBalanceWarnedRef.current,
      timestamp: new Date().toISOString(),
    });

    if (isIncoming) {
      logger.debug('[CallScreen] ⏭️ Skipping balance check (incoming)', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (!isConnected) {
      logger.debug('[CallScreen] ⏭️ Skipping balance check (not connected)', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (maxAffordableSeconds == null) {
      logger.debug(
        '[CallScreen] ⏭️ Skipping balance check (no max affordable)',
        {
          callAttemptId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    const remaining = maxAffordableSeconds - duration;
    logger.debug('[CallScreen] 🔍 Balance remaining check', {
      callAttemptId,
      remaining,
      maxAffordableSeconds,
      duration,
      lowBalanceWarned: lowBalanceWarnedRef.current,
      timestamp: new Date().toISOString(),
    });

    if (remaining <= 60 && remaining > 0 && !lowBalanceWarnedRef.current) {
      logger.warn('[CallScreen] ⚠️ Low balance warning (60s remaining)', {
        callAttemptId,
        remaining,
        timestamp: new Date().toISOString(),
      });
      lowBalanceWarnedRef.current = true;
      Alert.alert(
        'Low balance',
        'Your balance is almost depleted. The call may end automatically soon.'
      );
    }

    if (remaining <= 0 && !hasEndedRef.current) {
      logger.warn('[CallScreen] ⚠️ Balance depleted - ending call', {
        callAttemptId,
        remaining,
        maxAffordableSeconds,
        duration,
        timestamp: new Date().toISOString(),
      });
      Alert.alert(
        'Balance depleted',
        'Your call has ended because your balance is depleted.'
      );
      void safeEndCall('balance_depleted').then(() => {
        logger.info('[CallScreen] 🚀 Navigating back after balance depletion', {
          callAttemptId,
          timestamp: new Date().toISOString(),
        });
        router.back();
      });
    }
  }, [isIncoming, isConnected, maxAffordableSeconds, duration]);

  useEffect(() => {
    if (twilioError) {
      logger.error('[CallScreen] ❌ Twilio error detected', twilioError, {
        callAttemptId,
        errorMessage: twilioError.message,
        errorName: twilioError.name,
        errorStack: twilioError.stack,
        timestamp: new Date().toISOString(),
      });
      logger.info('[CallScreen] 🔧 Showing Twilio error alert', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      Alert.alert(
        'Call Error',
        twilioError.message || 'Failed to connect call',
        [
          {
            text: 'OK',
            onPress: () => {
              logger.info(
                '[CallScreen] 🚀 Navigating back after Twilio error',
                {
                  callAttemptId,
                  timestamp: new Date().toISOString(),
                }
              );
              router.back();
            },
          },
        ]
      );
    }
  }, [twilioError]);

  const handleAcceptIncoming = async () => {
    logger.info('[CallScreen] 👆 Accept button pressed', {
      callAttemptId,
      hasIncomingCallDetails: !!incomingCallDetails,
      callId: incomingCallDetails?.callId,
      timestamp: new Date().toISOString(),
    });

    if (!incomingCallDetails?.callId) {
      logger.warn('[CallScreen] ⚠️ Cannot accept incoming call - no callId', {
        callAttemptId,
        hasIncomingCallDetails: !!incomingCallDetails,
        incomingCallDetails,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const acceptStartTime = Date.now();
      logger.info('[CallScreen] 📞 Accepting incoming call', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        inviteSid: inviteSid,
        status: callState.status,
        callSid,
        timestamp: new Date().toISOString(),
      });

      await acceptIncomingCall(incomingCallDetails.callId, callAttemptId);

      const acceptElapsed = Date.now() - acceptStartTime;
      logger.info('[CallScreen] ✅ Incoming call accepted successfully', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        newStatus: callState.status,
        elapsed: `${acceptElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      logger.debug('[CallScreen] 🔧 Setting callInitiated to true', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      setCallInitiated(true);
    } catch (e) {
      logger.error('[CallScreen] ❌ Accept incoming call failed', e, {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        inviteSid: inviteSid,
        status: callState.status,
        errorMessage: e instanceof Error ? e.message : String(e),
        errorStack: e instanceof Error ? e.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleRejectIncoming = async () => {
    logger.info('[CallScreen] 👆 Reject button pressed', {
      callAttemptId,
      hasIncomingCallDetails: !!incomingCallDetails,
      callId: incomingCallDetails?.callId,
      timestamp: new Date().toISOString(),
    });

    if (!incomingCallDetails?.callId) {
      logger.warn('[CallScreen] ⚠️ Cannot reject - no callId', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const rejectStartTime = Date.now();
      logger.info('[CallScreen] 📞 Rejecting incoming call', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        status: callState.status,
        timestamp: new Date().toISOString(),
      });
      await rejectIncomingCall(incomingCallDetails.callId, callAttemptId);
      const rejectElapsed = Date.now() - rejectStartTime;
      logger.info('[CallScreen] ✅ Incoming call rejected successfully', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        elapsed: `${rejectElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      logger.info('[CallScreen] 🚀 Navigating back after reject', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      router.back();
    } catch (e) {
      logger.error('[CallScreen] ❌ Reject incoming call failed', e, {
        callAttemptId,
        callId: incomingCallDetails.callId,
        errorMessage: e instanceof Error ? e.message : String(e),
        errorStack: e instanceof Error ? e.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      logger.info('[CallScreen] 🚀 Navigating back after reject error', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      router.back();
    }
  };

  const initiateCall = async () => {
    if (!user) {
      logger.error(
        '[CallScreen] User not authenticated in initiateCall',
        undefined,
        {
          callAttemptId,
          profileLoading: profileLoading || false,
          hasUser: false,
        }
      );
      setTimeout(() => {
        Alert.alert(
          'Authentication Required',
          'Please sign in to make a call.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
      }, 100);
      return;
    }

    if (!professional) {
      logger.error('[CallScreen] Missing professional data', {
        callAttemptId,
        hasProfessional: false,
        professionalId: null,
      });
      Alert.alert(
        'Call Failed',
        'Professional information not found. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }

    if (!professional.id || !professional.user_id) {
      logger.error('[CallScreen] Invalid professional data', {
        callAttemptId,
        professionalId: professional.id,
        professionalUserId: professional.user_id,
      });
      Alert.alert(
        'Call Failed',
        'Invalid professional information. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }

    try {
      const initiateStartTime = Date.now();
      logger.info('[CallScreen] 🔧 Setting callInitiated to true', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      setCallInitiated(true);

      logger.info('[CallScreen] 📞 Initiating call', {
        callAttemptId,
        routeProfessionalId: id,
        professionalId: professional.id,
        professionalUserId: professional.user_id,
        callType: type,
        urgent: urgent === 'true',
        twilio: {
          isInitialized,
          status: callState.status,
        },
        timestamp: new Date().toISOString(),
      });

      logger.debug('[CallScreen] 🔧 Calling makeCall function', {
        callAttemptId,
        professionalId: professional.id,
        professionalUserId: professional.user_id,
        callType: type as 'voice' | 'video',
        urgent: urgent === 'true',
        timestamp: new Date().toISOString(),
      });

      await makeCall(
        professional.id,
        professional.user_id,
        type as 'voice' | 'video',
        urgent === 'true',
        callAttemptId,
        user
      );

      const makeCallElapsed = Date.now() - initiateStartTime;
      logger.info('[CallScreen] ✅ makeCall completed', {
        callAttemptId,
        elapsed: `${makeCallElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      try {
        const fetchStartTime = Date.now();
        logger.debug(
          '[CallScreen] 🔧 Fetching call_id for per-minute billing',
          {
            callAttemptId,
            callerId: user.id,
            professionalId: professional.id,
            timestamp: new Date().toISOString(),
          }
        );

        const { data: recentCall, error: fetchErr } = await supabase
          .from('calls')
          .select('id')
          .eq('caller_id', user.id)
          .eq('professional_id', professional.id)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const fetchElapsed = Date.now() - fetchStartTime;

        if (!fetchErr && recentCall?.id) {
          pendingDbCallIdRef.current = recentCall.id;
          logger.info(
            '[CallScreen] ✅ Retrieved call_id for per-minute billing',
            {
              callAttemptId,
              callId: recentCall.id,
              elapsed: `${fetchElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
        } else if (fetchErr) {
          logger.warn('[CallScreen] ⚠️ Failed to fetch call_id', {
            callAttemptId,
            error: fetchErr.message,
            errorCode: fetchErr.code,
            elapsed: `${fetchElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.debug('[CallScreen] ℹ️ No recent call found', {
            callAttemptId,
            elapsed: `${fetchElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (fetchErr) {
        logger.error('[CallScreen] ❌ Exception fetching call_id', fetchErr, {
          callAttemptId,
          error:
            fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          errorStack: fetchErr instanceof Error ? fetchErr.stack : undefined,
          timestamp: new Date().toISOString(),
        });
      }

      const totalElapsed = Date.now() - initiateStartTime;
      logger.info('[CallScreen] ✅ Call initiated successfully', {
        callAttemptId,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[CallScreen] ❌ Failed to initiate call', error, {
        callAttemptId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      Alert.alert(
        'Call Failed',
        'Could not start the call. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const currentCost = duration * costPerSecond;

  const handleEndCall = async () => {
    logger.info('[CallScreen] 👆 End call button pressed', {
      callAttemptId,
      currentStatus: callState.status,
      timestamp: new Date().toISOString(),
    });

    try {
      const endStartTime = Date.now();
      logger.info('[CallScreen] 📞 Ending call', {
        callAttemptId,
        currentStatus: callState.status,
        callSid,
        dbCallId,
        timestamp: new Date().toISOString(),
      });
      await disconnect();
      const endElapsed = Date.now() - endStartTime;
      logger.info('[CallScreen] ✅ Call disconnected successfully', {
        callAttemptId,
        elapsed: `${endElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      logger.info('[CallScreen] 🚀 Navigating back after end call', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      router.back();
    } catch (error) {
      logger.error('[CallScreen] ❌ Error ending call', error, {
        callAttemptId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      logger.info('[CallScreen] 🚀 Navigating back after end call error', {
        callAttemptId,
        timestamp: new Date().toISOString(),
      });
      router.back();
    }
  };

  const handleMuteToggle = async () => {
    logger.info('[CallScreen] 👆 Mute toggle button pressed', {
      callAttemptId,
      currentMuteState: isMuted,
      timestamp: new Date().toISOString(),
    });

    try {
      const toggleStartTime = Date.now();
      logger.debug('[CallScreen] 🔧 Calling toggleMute', {
        callAttemptId,
        currentMuteState: isMuted,
        timestamp: new Date().toISOString(),
      });
      await toggleMute();
      const toggleElapsed = Date.now() - toggleStartTime;
      logger.info('[CallScreen] ✅ Mute toggled successfully', {
        callAttemptId,
        previousMuteState: isMuted,
        newMuteState: !isMuted,
        elapsed: `${toggleElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[CallScreen] ❌ Error toggling mute', error, {
        callAttemptId,
        currentMuteState: isMuted,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const otherParty = useMemo(() => {
    if (isIncoming) {
      return {
        name: incomingCallDetails?.callerName || 'Unknown caller',
        avatarUrl: incomingCallDetails?.callerAvatarUrl || '',
        title: 'Caller',
      };
    }
    return {
      name: professional?.users?.name || 'Unknown',
      avatarUrl: professional?.users?.avatar_url || '',
      title: professional?.title || professional?.profession || 'Professional',
    };
  }, [
    isIncoming,
    incomingCallDetails?.callerName,
    incomingCallDetails?.callerAvatarUrl,
    professional?.users?.name,
    professional?.users?.avatar_url,
    professional?.title,
    professional?.profession,
  ]);

  const effectiveCallType: 'voice' | 'video' = useMemo(() => {
    const t = (isIncoming ? incomingCallDetails?.callType : type) as any;
    return t === 'video' ? 'video' : 'voice';
  }, [isIncoming, incomingCallDetails?.callType, type]);

  if (!isIncoming && (professionalLoading || !professional)) {
    logger.debug('[CallScreen] ⏸️ Showing loading screen', {
      callAttemptId,
      professionalLoading,
      hasProfessional: !!professional,
      timestamp: new Date().toISOString(),
    });
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1f2937', '#374151']}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (isIncoming && !callInitiated) {
    const canAccept = !!callState.callInvite;
    logger.debug('[CallScreen] 📞 Rendering incoming call screen', {
      callAttemptId,
      callInitiated,
      canAccept,
      hasCallInvite: !!callState.callInvite,
      callerName: otherParty.name,
      timestamp: new Date().toISOString(),
    });
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#111827', '#1f2937']}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Incoming call</Text>
            <Text style={[styles.loadingText, { fontSize: 18, marginTop: 8 }]}>
              {otherParty.name}
            </Text>
            {otherParty.avatarUrl ? (
              <Image
                source={{ uri: otherParty.avatarUrl }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  marginTop: 18,
                }}
              />
            ) : null}

            <Text style={[styles.loadingText, { marginTop: 18, opacity: 0.8 }]}>
              {callState.callInvite
                ? 'Tap accept to answer'
                : 'Waiting for call invite...'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 18, marginTop: 22 }}>
              <TouchableOpacity
                style={[styles.endCallButton, { backgroundColor: '#EF4444' }]}
                onPress={handleRejectIncoming}
              >
                <PhoneOff size={22} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.endCallButton,
                  { backgroundColor: canAccept ? '#10B981' : '#374151' },
                ]}
                onPress={handleAcceptIncoming}
                disabled={!canAccept}
              >
                <Phone size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  logger.debug('[CallScreen] 🎨 Rendering active call screen', {
    callAttemptId,
    isIncoming,
    isConnected,
    isConnecting,
    duration,
    isMuted,
    isVideoOff,
    effectiveCallType,
    timestamp: new Date().toISOString(),
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1f2937', '#374151']} style={styles.background}>
        <View style={styles.header}>
          <View style={styles.callInfo}>
            <Text style={styles.callStatus}>
              {isConnecting
                ? 'Connecting...'
                : isConnected
                ? 'Connected'
                : 'Initiating...'}
            </Text>
            <Text style={styles.callType}>
              {effectiveCallType === 'video' ? 'Video Call' : 'Voice Call'}
              {urgent === 'true' && ' (Urgent)'}
            </Text>
          </View>
        </View>

        <View style={styles.professionalInfo}>
          <View style={styles.professionalCard}>
            <Image
              source={{ uri: otherParty.avatarUrl || '' }}
              style={styles.professionalAvatar}
            />
            <Text style={styles.professionalName}>
              {otherParty.name || 'Unknown'}
            </Text>
            <Text style={styles.professionalTitle}>
              {otherParty.title || ''}
            </Text>
          </View>
        </View>

        <View style={styles.callStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>
              {'$' + Number(effectiveRatePerMinute || 0).toFixed(2)}/min
            </Text>
          </View>
          {!isIncoming && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Cost</Text>
                <Text style={styles.statValue}>
                  {'$' + currentCost.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {effectiveCallType === 'video' && !isVideoOff && (
          <View style={styles.videoContainer}>
            <View style={styles.localVideo}>
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>You</Text>
              </View>
            </View>
          </View>
        )}

        <View
          style={[
            styles.callControls,
            {
              paddingBottom:
                (Platform.OS === 'android' ? 64 : 40) + (insets.bottom || 0),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.controlButton,
              isMuted && styles.controlButtonActive,
            ]}
            onPress={handleMuteToggle}
            disabled={!isConnected}
          >
            {isMuted ? (
              <MicOff size={24} color="#ffffff" />
            ) : (
              <Mic size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {type === 'video' && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                isVideoOff && styles.controlButtonActive,
              ]}
              onPress={() => {
                logger.info('[CallScreen] 👆 Video toggle button pressed', {
                  callAttemptId,
                  currentVideoState: isVideoOff,
                  newVideoState: !isVideoOff,
                  timestamp: new Date().toISOString(),
                });
                setIsVideoOff(!isVideoOff);
              }}
              disabled={!isConnected}
            >
              {isVideoOff ? (
                <VideoOff size={24} color="#ffffff" />
              ) : (
                <Video size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <PhoneOff size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {__DEV__ && callSid && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Call SID: {callSid}</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  callInfo: {
    alignItems: 'center',
  },
  callStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
  },
  callType: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  professionalInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalCard: {
    alignItems: 'center',
  },
  professionalAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  professionalName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  professionalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
  },
  callStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  localVideo: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#ef4444',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
});
