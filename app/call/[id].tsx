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
  Volume2,
  VolumeX,
  MessageCircle,
  MoveVertical as MoreVertical,
  Minimize2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { notificationsService } from '@/services';
import { callsService } from '@/services/calls.service';

// ✅ TWILIO IMPORTS
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useProfessional } from '@/hooks/useProfessionals';
import { useProfile } from '@/hooks/useProfile';
import { getSpeakerEnabled, setSpeakerEnabled } from '@/lib/audioRoute';

export default function CallScreen() {
  const { id, type, urgent, incoming, rate_per_minute } =
    useLocalSearchParams();
  const isIncoming = incoming === 'true';
  const insets = useSafeAreaInsets();
  const { user, isLoading: profileLoading } = useProfile();

  const professionalId = isIncoming ? '' : (id as string);

  // ✅ FETCH PROFESSIONAL DATA (outgoing calls)
  const { data: professionalData, isLoading: professionalLoading } =
    useProfessional(professionalId);
  const professional = professionalData || null;

  // ✅ TWILIO VOICE HOOK
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

  // Derive UI state from Twilio call state
  const isMuted = callState.isMuted;
  const callSid =
    (callState.call as any)?.callSid ??
    (callState.call as any)?.sid ??
    (callState.call as any)?.getSid?.();
  const inviteSid = (callState.callInvite as any)?.getCallSid?.();

  // ✅ LOCAL STATE
  const [duration, setDuration] = useState(0);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [dbCallId, setDbCallId] = useState<string | null>(null); // DB call record id (for per-minute billing)
  const [incomingCallDetails, setIncomingCallDetails] = useState<{
    callId: string;
    callerId?: string;
    callerName?: string;
    callerAvatarUrl?: string;
    callType?: string;
    ratePerMinute?: number;
  } | null>(null);

  // If we were navigated here from the professional profile, the UI can pass a rate snapshot.
  // This avoids showing "$0.00" while the professional query is still loading.
  const ratePerMinuteParam = useMemo(() => {
    const raw = rate_per_minute;
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, [rate_per_minute]);

  const effectiveRatePerMinute = useMemo(() => {
    // Incoming (callee) should primarily trust the DB call row rate.
    if (isIncoming) {
      return incomingCallDetails?.ratePerMinute ?? ratePerMinuteParam ?? 0;
    }

    // Outgoing (caller): prefer explicit param, then professional default rate.
    return ratePerMinuteParam ?? Number(professional?.rate_per_minute || 0);
  }, [
    isIncoming,
    incomingCallDetails?.ratePerMinute,
    ratePerMinuteParam,
    professional?.rate_per_minute,
  ]);

  const costPerSecond = useMemo(() => {
    return effectiveRatePerMinute > 0 ? effectiveRatePerMinute / 60 : 0;
  }, [effectiveRatePerMinute]);

  const callAttemptId = useMemo(() => {
    const rand = Math.random().toString(36).slice(2, 8);
    return `call_${Date.now()}_${rand}`;
  }, []);

  // End the call if the user leaves this screen or backgrounds the app.
  // (We can't reliably run code on process-kill; Twilio status callbacks + webhook push are the safety net.)
  const hasEndedRef = useRef(false);
  const callStateRef = useRef(callState);
  const lowBalanceWarnedRef = useRef(false);
  const lastChargedMinuteRef = useRef<number>(0); // Track last charged minute (1-based)
  const nextMinuteLowBalancePushSentRef = useRef(false); // Track if we sent push for next minute
  const lastBalanceAfterChargeRef = useRef<number | null>(null); // Track balance after last charge

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // If the remote party ends the call, the Twilio SDK will transition our call state to "disconnected".
  // In that case, exit the call screen automatically (otherwise the user gets stuck on the call UI).
  // IMPORTANT: Only handle state updates for our own call, not for other calls (e.g., incoming calls on other screens)
  useEffect(() => {
    if (!callInitiated) return;
    if (hasEndedRef.current) return;
    if (isIncoming) return; // Only for outgoing calls

    // Filter: Only handle state updates if we have our own call SID or DB call ID
    // This prevents handling state updates from other calls (e.g., when callee receives incoming call)
    const currentCallSid = callSid;
    const currentDbCallId = dbCallId;

    // If we don't have a call SID or DB call ID yet, this might be a state update from another call
    // Wait until we have our own call identifiers
    if (!currentCallSid && !currentDbCallId) {
      return;
    }

    // Additional filter: If we have a callInvite but this is an outgoing call, ignore it
    // (incoming call invites should only be handled by incoming call screens)
    if (callState.callInvite && !isIncoming) {
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

    if (callState.status === 'disconnected') {
      hasEndedRef.current = true;
      logger.info('[CallScreen] Call ended by remote/SDK; leaving screen', {
        callAttemptId,
        callSid: currentCallSid,
        dbCallId: currentDbCallId,
      });
      // Don't call disconnect() here; SDK already disconnected.
      router.back();
    }
  }, [
    callState.status,
    callState.callInvite,
    callInitiated,
    callAttemptId,
    callSid,
    dbCallId,
    isIncoming,
  ]);

  const safeEndCall = async (reason: string) => {
    if (hasEndedRef.current) return;

    // If there's no active call/invite, don't spam disconnect.
    const active =
      callStateRef.current.status === 'connecting' ||
      callStateRef.current.status === 'ringing' ||
      callStateRef.current.status === 'connected' ||
      !!callStateRef.current.callInvite;

    if (!active) return;

    hasEndedRef.current = true;
    logger.info('[CallScreen] Auto-ending call', {
      callAttemptId,
      reason,
      status: callStateRef.current.status,
    });
    try {
      await disconnect();
    } catch (e) {
      logger.warn('[CallScreen] Auto-end call failed', {
        callAttemptId,
        reason,
      });
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      // Don't auto-hangup on transient 'inactive' (common on iOS during interruptions/overlays).
      // Only auto-end when the app is truly backgrounded AND we haven't connected yet.
      if (nextState === 'background') {
        const status = callStateRef.current.status;
        const stillConnecting = status === 'connecting' || status === 'ringing';
        if (stillConnecting) {
          void safeEndCall(`appstate:${nextState}`);
        }
      }
    });

    return () => {
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      // IMPORTANT:
      // Do not auto-hangup on unmount. In practice, this screen can unmount/re-mount due to
      // auth redirects, cache invalidations, or navigation reshuffles while a call is still connecting.
      // Auto-ending here caused the caller to hang up right as the callee answered.
      //
      // Call teardown is handled explicitly via the hangup button and by Twilio SDK/webhooks.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ LOAD CALL DETAILS (incoming calls)
  useEffect(() => {
    let mounted = true;
    if (!isIncoming) return;
    if (!id) return;

    // If the user opened this screen from an OS notification, dismiss the original call_request
    // so it doesn't stay in the tray while they're viewing/answering.
    void notificationsService.dismissIncomingCallNotifications({
      callId: id as string,
      callSid: callSid as any,
    });

    (async () => {
      try {
        logger.info('[CallScreen] Loading incoming call details', {
          callAttemptId,
          callId: id,
        });

        // Add timeout wrapper to prevent SocketTimeoutException
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

        // Add explicit timeout (30 seconds) to prevent SocketTimeoutException
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                'Query timeout: Failed to load call details within 30 seconds'
              )
            );
          }, 30_000);
        });

        const { data, error } = (await Promise.race([
          queryPromise,
          timeoutPromise,
        ])) as any;

        if (error) {
          throw error;
        }

        if (!mounted) return;
        const caller = Array.isArray((data as any)?.caller)
          ? (data as any).caller[0]
          : (data as any)?.caller;
        const callId = data?.id;
        setIncomingCallDetails({
          callId: callId,
          callType: data?.call_type,
          ratePerMinute: data?.rate_per_minute
            ? Number(data.rate_per_minute)
            : 0,
          callerId: caller?.id,
          callerName: caller?.name,
          callerAvatarUrl: caller?.avatar_url,
        });
        // Set DB call ID for incoming calls
        if (callId) {
          setDbCallId(callId);
        }
      } catch (e) {
        logger.error('[CallScreen] Failed to load incoming call details', e, {
          callAttemptId,
          callId: id,
          error: e instanceof Error ? e.message : String(e),
        });
        if (mounted) {
          // Set minimal call details to allow screen to render
          setIncomingCallDetails({
            callId: id as string,
            ratePerMinute: ratePerMinuteParam ?? undefined,
          });
          // Set DB call ID from route param
          setDbCallId(id as string);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isIncoming, id, callAttemptId, ratePerMinuteParam]);

  // Incoming screen: if the caller hangs up before we accept (or before invite arrives),
  // we might be sitting on this screen. Listen for webhook follow-up pushes and exit.
  useEffect(() => {
    if (!isIncoming) return;

    const unsubscribe = notificationsService.onNotificationReceived(
      (notification) => {
        const type = notification.data?.type;
        if (type !== 'call_ended' && type !== 'call_missed') return;

        const endedCallId = notification.data?.call_id;
        const endedCallSid = notification.data?.call_sid;

        const matchesCallId =
          Boolean(endedCallId) &&
          Boolean(incomingCallDetails?.callId) &&
          endedCallId === incomingCallDetails?.callId;

        const matchesSid =
          Boolean(endedCallSid) &&
          (endedCallSid === callSid || endedCallSid === inviteSid);

        if (!matchesCallId && !matchesSid) return;
        if (hasEndedRef.current) return;

        hasEndedRef.current = true;
        logger.info(
          '[CallScreen] Incoming call ended before answer; leaving screen',
          {
            callAttemptId,
            type,
            endedCallId,
            endedCallSid,
            callSid,
            inviteSid,
          }
        );
        router.back();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    isIncoming,
    incomingCallDetails?.callId,
    callAttemptId,
    callSid,
    inviteSid,
  ]);

  // ✅ INITIATE CALL ON MOUNT (outgoing only)
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

    // IMPORTANT: Filter out state updates from other calls (e.g., incoming calls on other screens)
    // If we have a callInvite but this is an outgoing call, ignore it
    // (incoming call invites should only be handled by incoming call screens)
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

    // Wait for profile to load before initiating call
    if (profileLoading) {
      logger.info('[CallScreen] Waiting for user profile to load...', {
        callAttemptId,
        profileLoading: true,
      });
      return;
    }

    // Ensure user is authenticated before making call
    // Only show error if profile has finished loading and user is still null
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
      // Use setTimeout to avoid showing alert during navigation
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

    // All conditions met - initiate call
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

  // ✅ DURATION TIMER (only when connected)
  // IMPORTANT: Only start timer for our own call, not for other calls
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    // Only start timer if:
    // 1. We have a call SID or DB call ID (our own call)
    // 2. We're connected
    // 3. This is not an incoming call OR we've accepted the incoming call
    const hasOwnCall = !!callSid || !!dbCallId;
    const shouldStartTimer =
      isConnected && hasOwnCall && (callInitiated || !isIncoming);

    if (shouldStartTimer) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, callSid, dbCallId, callInitiated, isIncoming]);

  // ✅ PER-MINUTE BILLING (caller only, prepaid-style)
  // Her dakika başında (00:01, 01:00, 02:00, ...) o dakikanın parası kesilir.
  // Bir sonraki dakika için bakiye kontrol edilir; yoksa push gönderilir.
  // Eğer hala yüklenmezse ve bir sonraki dakikaya girildiğinde bakiye yoksa → call kapatılır.
  useEffect(() => {
    if (isIncoming) return; // Only for caller
    if (!isConnected) return;
    if (!dbCallId) return; // Need call ID to charge
    if (effectiveRatePerMinute <= 0) return;

    // Her dakika başında (duration % 60 === 0 && duration > 0) charge this minute
    const currentMinute = Math.floor(duration / 60) + 1; // 1-based minute number
    const isMinuteBoundary = duration > 0 && duration % 60 === 0;

    if (isMinuteBoundary && currentMinute > lastChargedMinuteRef.current) {
      lastChargedMinuteRef.current = currentMinute;

      // Charge this minute
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke(
            'charge-call-minute',
            {
              body: {
                call_id: dbCallId,
                minute_number: currentMinute,
              },
            }
          );

          if (error) {
            logger.error('[CallScreen] Per-minute charge failed', {
              callAttemptId,
              callId: dbCallId,
              minute_number: currentMinute,
              error: error.message,
            });
            return;
          }

          const nextMinuteAffordable = data?.next_minute_affordable ?? true;
          const newBalance = data?.new_balance ?? 0;

          logger.info('[CallScreen] Minute charged', {
            callAttemptId,
            callId: dbCallId,
            minute_number: currentMinute,
            cost: data?.cost,
            new_balance: newBalance,
            next_minute_affordable: nextMinuteAffordable,
          });

          // Update user balance in local state (optimistic update)
          if (user && (user as any).wallet_balance !== undefined) {
            (user as any).wallet_balance = newBalance;
          }

          // Check if next minute is affordable
          if (!nextMinuteAffordable) {
            // This is the first time we detect next minute is not affordable
            if (!nextMinuteLowBalancePushSentRef.current) {
              nextMinuteLowBalancePushSentRef.current = true;

              // Send push notification about low balance (one time)
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
              } catch (pushErr) {
                logger.warn('[CallScreen] Failed to send low balance push', {
                  callAttemptId,
                  error:
                    pushErr instanceof Error
                      ? pushErr.message
                      : String(pushErr),
                });
              }

              // Show in-app alert (one time)
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
            // Balance was added, reset the warning flag
            nextMinuteLowBalancePushSentRef.current = false;
          }

          // Check if we're starting a minute we can't afford
          // This happens when we charge minute N, but minute N+1 is not affordable
          // and we've already sent the warning. At the start of minute N+1, end the call.
          const nextMinute = currentMinute + 1;
          const nextMinuteCost = effectiveRatePerMinute;
          const balanceAfterThisMinute = newBalance;

          // At the start of the next minute (when we're about to charge it),
          // if we can't afford it, end the call
          // We check this by seeing if we just charged minute N and we're about to charge minute N+1
          if (
            balanceAfterThisMinute < nextMinuteCost &&
            nextMinuteLowBalancePushSentRef.current &&
            !hasEndedRef.current
          ) {
            // We warned the user, but they didn't add credits, and we're about to start an unaffordable minute
            logger.warn(
              '[CallScreen] Ending call - insufficient balance for next minute',
              {
                callAttemptId,
                callId: dbCallId,
                currentMinute,
                nextMinute,
                balanceAfterThisMinute,
                nextMinuteCost,
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
          logger.error('[CallScreen] Per-minute charge error', err, {
            callAttemptId,
            callId: dbCallId,
            minute_number: currentMinute,
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

  // Caller-side guardrail: best-effort auto-end when balance is depleted.
  // (The server/webhook still decides final billing; this is UX + fraud/overrun prevention.)
  const maxAffordableSeconds = useMemo(() => {
    if (isIncoming) return null;
    const bal = Number((user as any)?.wallet_balance ?? 0);
    if (!Number.isFinite(bal) || bal <= 0) return 0;
    if (costPerSecond <= 0) return null;
    return Math.floor(bal / costPerSecond);
  }, [isIncoming, user, costPerSecond]);

  useEffect(() => {
    if (isIncoming) return;
    if (!isConnected) return;
    if (maxAffordableSeconds == null) return;

    const remaining = maxAffordableSeconds - duration;
    if (remaining <= 60 && remaining > 0 && !lowBalanceWarnedRef.current) {
      lowBalanceWarnedRef.current = true;
      Alert.alert(
        'Low balance',
        'Your balance is almost depleted. The call may end automatically soon.'
      );
    }

    if (remaining <= 0 && !hasEndedRef.current) {
      Alert.alert(
        'Balance depleted',
        'Your call has ended because your balance is depleted.'
      );
      void safeEndCall('balance_depleted').then(() => {
        router.back();
      });
    }
  }, [isIncoming, isConnected, maxAffordableSeconds, duration]);

  // ✅ HANDLE TWILIO ERRORS
  useEffect(() => {
    if (twilioError) {
      logger.error('[CallScreen] Twilio error:', twilioError);
      Alert.alert(
        'Call Error',
        twilioError.message || 'Failed to connect call',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [twilioError]);

  const handleAcceptIncoming = async () => {
    if (!incomingCallDetails?.callId) return;
    try {
      logger.info('[CallScreen] Accepting incoming call', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        status: callState.status,
      });
      await acceptIncomingCall(incomingCallDetails.callId, callAttemptId);
      setCallInitiated(true);
    } catch (e) {
      logger.error('[CallScreen] Accept incoming call failed', e, {
        callAttemptId,
        callId: incomingCallDetails.callId,
      });
    }
  };

  const handleRejectIncoming = async () => {
    if (!incomingCallDetails?.callId) return;
    try {
      logger.info('[CallScreen] Rejecting incoming call', {
        callAttemptId,
        callId: incomingCallDetails.callId,
        hasInvite: !!callState.callInvite,
        status: callState.status,
      });
      await rejectIncomingCall(incomingCallDetails.callId, callAttemptId);
      router.back();
    } catch (e) {
      logger.error('[CallScreen] Reject incoming call failed', e, {
        callAttemptId,
        callId: incomingCallDetails.callId,
      });
      router.back();
    }
  };

  // ✅ INITIATE CALL FUNCTION
  const initiateCall = async () => {
    // Double-check user is authenticated (defensive check)
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
      // Use setTimeout to avoid showing alert during navigation
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
        hasProfessional: !!professional,
        professionalId: professional?.id,
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

    // Validate professional has required fields
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
      setCallInitiated(true);

      logger.info('[CallScreen] Initiating call', {
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
      });

      // Call Twilio makeCall (this will create call record internally)
      // Pass user explicitly to avoid race condition with useTwilioVoice's useProfile
      await makeCall(
        professional.id, // DB: professionals.id
        professional.user_id, // Twilio: users.id identity of callee
        type as 'voice' | 'video',
        urgent === 'true',
        callAttemptId,
        user // Pass user explicitly to avoid race condition
      );

      // After makeCall, fetch the most recent pending/active call for this user to get call_id
      // (makeCall creates the call record, but doesn't return it to CallScreen)
      try {
        const { data: recentCall, error: fetchErr } = await supabase
          .from('calls')
          .select('id')
          .eq('caller_id', user.id)
          .eq('professional_id', professional.id)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!fetchErr && recentCall?.id) {
          setDbCallId(recentCall.id);
          logger.info('[CallScreen] Retrieved call_id for per-minute billing', {
            callAttemptId,
            callId: recentCall.id,
          });
        }
      } catch (fetchErr) {
        logger.warn(
          '[CallScreen] Failed to fetch call_id (per-minute billing may not work)',
          {
            callAttemptId,
            error:
              fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          }
        );
      }

      logger.info('[CallScreen] Call initiated successfully');
    } catch (error) {
      logger.error('[CallScreen] Failed to initiate call:', error);
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

  // ✅ FORMAT DURATION
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // ✅ CALCULATE CURRENT COST
  const currentCost = duration * costPerSecond;

  // ✅ HANDLE END CALL
  const handleEndCall = async () => {
    try {
      logger.info('[CallScreen] Ending call');

      // Disconnect Twilio call
      await disconnect();

      // Go back to previous screen
      router.back();
    } catch (error) {
      logger.error('[CallScreen] Error ending call:', error);
      // Go back anyway
      router.back();
    }
  };

  // ✅ HANDLE MUTE TOGGLE
  const handleMuteToggle = () => {
    try {
      toggleMute();
      logger.info('[CallScreen] Mute toggled', { callAttemptId });
    } catch (error) {
      logger.error('[CallScreen] Error toggling mute:', error);
    }
  };

  const handleSpeakerToggle = async () => {
    try {
      // Prefer local state for UX responsiveness; then verify actual route.
      const desired = !isSpeakerOn;
      const ok = await setSpeakerEnabled(desired);
      const actual = ok
        ? await getSpeakerEnabled().catch(() => desired)
        : isSpeakerOn;
      setIsSpeakerOn(actual);

      logger.info('[CallScreen] Speaker toggled', {
        callAttemptId,
        desired,
        ok,
        actual,
      });
    } catch (e) {
      logger.error('[CallScreen] Speaker toggle failed', e, { callAttemptId });
    }
  };

  // Keep the speaker UI in sync with the real audio route after connect.
  useEffect(() => {
    if (!isConnected) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      const current = await getSpeakerEnabled().catch(() => false);
      if (!cancelled) setIsSpeakerOn(current);
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  // ✅ LOADING STATE (outgoing only)
  if (!isIncoming && (professionalLoading || !professional)) {
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

  // Incoming UI: show "answer" modal-style screen until user accepts/rejects.
  // After accept, we render the normal in-call UI (controls/timer).
  if (isIncoming && !callInitiated) {
    const canAccept = !!callState.callInvite;
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

  // ✅ MINIMIZED VIEW
  if (isMinimized) {
    return (
      <View style={styles.minimizedCall}>
        <TouchableOpacity
          style={styles.minimizedContent}
          onPress={() => setIsMinimized(false)}
        >
          <Image
            source={{ uri: otherParty.avatarUrl || '' }}
            style={styles.minimizedAvatar}
          />
          <View style={styles.minimizedInfo}>
            <Text style={styles.minimizedName}>
              {otherParty.name || 'Unknown'}
            </Text>
            <Text style={styles.minimizedDuration}>
              {formatDuration(duration)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.minimizedEndCall}
            onPress={handleEndCall}
          >
            <PhoneOff size={16} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ MAIN CALL SCREEN
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1f2937', '#374151']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={() => setIsMinimized(true)}
          >
            <Minimize2 size={20} color="#ffffff" />
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Other Party Info */}
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

        {/* Call Stats */}
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

        {/* Video Preview (for video calls) */}
        {effectiveCallType === 'video' && !isVideoOff && (
          <View style={styles.videoContainer}>
            <View style={styles.localVideo}>
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>You</Text>
              </View>
            </View>
          </View>
        )}

        {/* Call Controls */}
        <View
          style={[
            styles.callControls,
            {
              // Keep controls above Android system navigation bar / gesture area
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

          <TouchableOpacity
            style={[
              styles.controlButton,
              isSpeakerOn && styles.controlButtonActiveSpeaker,
            ]}
            onPress={handleSpeakerToggle}
            disabled={!isConnected || Platform.OS === 'web'}
          >
            {isSpeakerOn ? (
              <Volume2 size={24} color="#ffffff" />
            ) : (
              <VolumeX size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {type === 'video' && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                isVideoOff && styles.controlButtonActive,
              ]}
              onPress={() => setIsVideoOff(!isVideoOff)}
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
            style={styles.controlButton}
            disabled={!isConnected}
          >
            <MessageCircle size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <PhoneOff size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Call SID Debug Info (remove in production) */}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  controlButtonActiveSpeaker: {
    backgroundColor: '#10B981',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedCall: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  minimizedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  minimizedInfo: {
    flex: 1,
  },
  minimizedName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  minimizedDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
  },
  minimizedEndCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
