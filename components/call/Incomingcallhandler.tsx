import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';

interface IncomingCallData {
  call_id: string;
  caller_name: string;
  caller_avatar?: string;
  call_type?: 'voice' | 'video';
  urgent?: boolean;
}

// CRITICAL: Global listeners to prevent memory leaks
let globalForegroundListener: Notifications.Subscription | null = null;
let globalBackgroundListener: Notifications.Subscription | null = null;

export function IncomingCallHandler() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const mountTimeRef = useRef<number>(Date.now());
  const incomingCallRef = useRef<IncomingCallData | null>(null);

  const twilioVoice = useTwilioVoice();

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    incomingCallRef.current = incomingCall;
    logger.debug('[IncomingCallHandler] 🔄 IncomingCall ref updated', {
      call_id: incomingCall?.call_id,
      timestamp: new Date().toISOString(),
    });
  }, [incomingCall]);

  // 🔥 LOG: Component Mount
  useEffect(() => {
    const mountTime = Date.now();
    mountTimeRef.current = mountTime;

    logger.info('[IncomingCallHandler] 🎬 Component mounted', {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      mountTime,
    });

    return () => {
      logger.info('[IncomingCallHandler] 🔚 Component unmounting', {
        timestamp: new Date().toISOString(),
        lifespan: `${Date.now() - mountTime}ms`,
      });

      // Clean up global listeners on unmount
      if (globalForegroundListener) {
        logger.debug(
          '[IncomingCallHandler] 🧹 Cleaning up foreground listener on unmount'
        );
        globalForegroundListener.remove();
        globalForegroundListener = null;
      }
      if (globalBackgroundListener) {
        logger.debug(
          '[IncomingCallHandler] 🧹 Cleaning up background listener on unmount'
        );
        globalBackgroundListener.remove();
        globalBackgroundListener = null;
      }
    };
  }, []);

  // 🔥 LOG: Twilio State Changes
  useEffect(() => {
    const callSid = twilioVoice.callState.call
      ? (twilioVoice.callState.call as any)?.callSid ??
        (twilioVoice.callState.call as any)?.sid ??
        (twilioVoice.callState.call as any)?.getSid?.()
      : null;
    const inviteSid = twilioVoice.callState.callInvite
      ? (twilioVoice.callState.callInvite as any)?.getCallSid?.()
      : null;
    logger.info('[IncomingCallHandler] 📡 Twilio state changed', {
      status: twilioVoice.callState.status,
      hasCall: !!twilioVoice.callState.call,
      hasCallInvite: !!twilioVoice.callState.callInvite,
      callSid,
      inviteSid,
      timestamp: new Date().toISOString(),
    });
  }, [
    twilioVoice.callState.status,
    twilioVoice.callState.call,
    twilioVoice.callState.callInvite,
  ]);

  // ========================================
  // 1. FOREGROUND NOTIFICATION LISTENER
  // ========================================
  useEffect(() => {
    logger.info(
      '[IncomingCallHandler] 📬 Setting up FOREGROUND notification listener',
      {
        hasExistingListener: !!globalForegroundListener,
        timestamp: new Date().toISOString(),
      }
    );

    // Clean up existing listener
    if (globalForegroundListener) {
      logger.debug(
        '[IncomingCallHandler] 🧹 Removing existing foreground listener'
      );
      globalForegroundListener.remove();
      globalForegroundListener = null;
    }

    // Listen for notifications while app is in FOREGROUND
    globalForegroundListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        logger.info(
          '[IncomingCallHandler] 🔔 FOREGROUND notification received',
          {
            identifier: notification.request.identifier,
            trigger: JSON.stringify(notification.request.trigger),
            contentTitle: notification.request.content.title,
            contentBody: notification.request.content.body,
            hasData: !!notification.request.content.data,
            timestamp: new Date().toISOString(),
          }
        );

        const data = notification.request.content.data as any;

        logger.info(
          '[IncomingCallHandler] 🔍 FOREGROUND notification data parsed',
          {
            type: data?.type,
            hasCallId: !!data?.call_id,
            callId: data?.call_id,
            callSid: data?.callSid,
            callerName: data?.caller_name,
            from: data?.from,
            urgent: data?.urgent,
            allKeys: Object.keys(data || {}),
            fullData: JSON.stringify(data, null, 2),
            timestamp: new Date().toISOString(),
          }
        );

        // Handle incoming call notification
        if (data?.type === 'incoming_call' || data?.type === 'call_request') {
          logger.info(
            '[IncomingCallHandler] ✅ FOREGROUND incoming call notification detected',
            {
              call_id: data.call_id,
              callSid: data.callSid,
              caller_name: data.caller_name,
              from: data.from,
              call_type: data.call_type,
              urgent: data.urgent,
              timestamp: new Date().toISOString(),
            }
          );

          // Show modal with call data
          const callData: IncomingCallData = {
            call_id: data.call_id || data.callSid || '',
            caller_name: data.caller_name || data.from || 'Unknown Caller',
            caller_avatar: data.caller_avatar,
            call_type: data.call_type || 'voice',
            urgent: data.urgent,
          };

          logger.info(
            '[IncomingCallHandler] 🎭 Showing modal from FOREGROUND notification',
            {
              callData: JSON.stringify(callData),
              timestamp: new Date().toISOString(),
            }
          );

          setIncomingCall(callData);
          setShowModal(true);

          logger.info(
            '[IncomingCallHandler] ✅ Modal state updated (FOREGROUND)',
            {
              call_id: callData.call_id,
              timestamp: new Date().toISOString(),
            }
          );
        } else {
          logger.warn(
            '[IncomingCallHandler] ⚠️ FOREGROUND non-call notification received',
            {
              type: data?.type,
              allTypes: Object.keys(data || {}),
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    );

    logger.info(
      '[IncomingCallHandler] ✅ FOREGROUND notification listener registered',
      {
        timestamp: new Date().toISOString(),
      }
    );

    return () => {
      if (globalForegroundListener) {
        logger.info(
          '[IncomingCallHandler] 🔇 Removing FOREGROUND notification listener',
          {
            timestamp: new Date().toISOString(),
          }
        );
        globalForegroundListener.remove();
        globalForegroundListener = null;
      }
    };
  }, []);

  // ========================================
  // 2. BACKGROUND NOTIFICATION RESPONSE LISTENER
  // ========================================
  useEffect(() => {
    logger.info(
      '[IncomingCallHandler] 📬 Setting up BACKGROUND notification response listener',
      {
        hasExistingListener: !!globalBackgroundListener,
        timestamp: new Date().toISOString(),
      }
    );

    // Clean up existing listener
    if (globalBackgroundListener) {
      logger.debug(
        '[IncomingCallHandler] 🧹 Removing existing background listener'
      );
      globalBackgroundListener.remove();
      globalBackgroundListener = null;
    }

    // Listen for notification taps (when app is in BACKGROUND/KILLED)
    globalBackgroundListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        logger.info('[IncomingCallHandler] 👆 BACKGROUND notification tapped', {
          actionIdentifier: response.actionIdentifier,
          notificationIdentifier: response.notification.request.identifier,
          timestamp: new Date().toISOString(),
        });

        const data = response.notification.request.content.data as any;

        logger.info('[IncomingCallHandler] 🔍 BACKGROUND tap data parsed', {
          type: data?.type,
          hasCallId: !!data?.call_id,
          callId: data?.call_id,
          callSid: data?.callSid,
          callerName: data?.caller_name,
          from: data?.from,
          allKeys: Object.keys(data || {}),
          fullData: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString(),
        });

        if (data?.type === 'incoming_call' || data?.type === 'call_request') {
          const callId = data.call_id || data.callSid || '';

          logger.info(
            '[IncomingCallHandler] 📞 Navigating to call screen from BACKGROUND tap',
            {
              call_id: callId,
              caller_name: data.caller_name,
              from: data.from,
              timestamp: new Date().toISOString(),
            }
          );

          try {
            router.push({
              pathname: '/call/[id]' as any,
              params: {
                id: callId,
                call_id: callId,
                incoming: 'true',
                caller_name: data.caller_name || data.from || 'Unknown Caller',
              },
            });
            logger.info(
              '[IncomingCallHandler] ✅ Navigation triggered (BACKGROUND)',
              {
                call_id: callId,
                timestamp: new Date().toISOString(),
              }
            );
          } catch (error) {
            logger.error(
              '[IncomingCallHandler] ❌ Navigation error (BACKGROUND)',
              error,
              {
                call_id: callId,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } else {
          logger.warn(
            '[IncomingCallHandler] ⚠️ BACKGROUND non-call notification tapped',
            {
              type: data?.type,
              timestamp: new Date().toISOString(),
            }
          );
        }
      });

    logger.info(
      '[IncomingCallHandler] ✅ BACKGROUND notification response listener registered',
      {
        timestamp: new Date().toISOString(),
      }
    );

    return () => {
      if (globalBackgroundListener) {
        logger.info(
          '[IncomingCallHandler] 🔇 Removing BACKGROUND notification response listener',
          {
            timestamp: new Date().toISOString(),
          }
        );
        globalBackgroundListener.remove();
        globalBackgroundListener = null;
      }
    };
  }, []);

  // ========================================
  // 3. TWILIO CALLINVITE LISTENER
  // ========================================
  useEffect(() => {
    logger.info('[IncomingCallHandler] 📞 Checking Twilio CallInvite state', {
      twilioStatus: twilioVoice.callState.status,
      hasCall: !!twilioVoice.callState.call,
      hasCallInvite: !!twilioVoice.callState.callInvite,
      timestamp: new Date().toISOString(),
    });

    // Check for incoming call from Twilio (use callInvite, not call)
    if (
      twilioVoice.callState.callInvite &&
      twilioVoice.callState.status === 'ringing'
    ) {
      const callInvite = twilioVoice.callState.callInvite;
      const callSid = (callInvite as any)?.getCallSid?.();
      const customParams = (callInvite as any)?.getCustomParameters?.();

      logger.info(
        '[IncomingCallHandler] 🔔 Twilio CallInvite received (ringing)',
        {
          callSid,
          customParams: JSON.stringify(customParams),
          hasCustomParams: !!customParams,
          customParamsKeys: customParams ? Object.keys(customParams) : [],
          timestamp: new Date().toISOString(),
        }
      );

      // Extract caller info from custom parameters
      const callerName = customParams?.caller_name || 'Unknown Caller';
      const callerAvatar = customParams?.caller_avatar;
      const callType = customParams?.call_type || 'voice';
      const urgent = customParams?.urgent === 'true';
      const callId = customParams?.call_id;

      logger.info(
        '[IncomingCallHandler] 📋 Caller info extracted from Twilio',
        {
          callSid,
          callId,
          callerName,
          hasAvatar: !!callerAvatar,
          callType,
          urgent,
          timestamp: new Date().toISOString(),
        }
      );

      // Show incoming call modal
      logger.info(
        '[IncomingCallHandler] 🎭 Showing incoming call modal from Twilio',
        {
          callSid,
          callId,
          callerName,
          timestamp: new Date().toISOString(),
        }
      );

      const callData: IncomingCallData = {
        call_id: callId || callSid,
        caller_name: callerName,
        caller_avatar: callerAvatar,
        call_type: callType as 'voice' | 'video',
        urgent,
      };

      logger.debug(
        '[IncomingCallHandler] 📝 Setting incoming call state from Twilio',
        {
          callData: JSON.stringify(callData),
          timestamp: new Date().toISOString(),
        }
      );

      setIncomingCall(callData);
      setShowModal(true);

      logger.info('[IncomingCallHandler] ✅ Modal state updated from Twilio', {
        call_id: callData.call_id,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.debug(
        '[IncomingCallHandler] ℹ️ Twilio state check (no incoming call)',
        {
          status: twilioVoice.callState.status,
          hasCall: !!twilioVoice.callState.call,
          hasCallInvite: !!twilioVoice.callState.callInvite,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }, [twilioVoice.callState.callInvite, twilioVoice.callState.status]);

  // 🔥 DECLINE HANDLER (useCallback ile sarmalandı)
  const handleDecline = useCallback(async () => {
    const currentCall = incomingCallRef.current;

    logger.info(
      '[IncomingCallHandler] ❌ User declined call (or auto-dismissed)',
      {
        call_id: currentCall?.call_id,
        caller_name: currentCall?.caller_name,
        timestamp: new Date().toISOString(),
      }
    );

    // Clear timers
    if (dismissTimeoutRef.current) {
      logger.debug('[IncomingCallHandler] ⏰ Clearing dismiss timeout', {
        timestamp: new Date().toISOString(),
      });
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      logger.debug('[IncomingCallHandler] 🔄 Clearing polling interval', {
        timestamp: new Date().toISOString(),
      });
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Reject Twilio call if present (use callInvite for incoming calls)
    if (twilioVoice.callState.callInvite) {
      const callInvite = twilioVoice.callState.callInvite;
      const callSid = (callInvite as any)?.getCallSid?.();
      logger.info('[IncomingCallHandler] 📞 Rejecting Twilio call invite', {
        callSid,
        timestamp: new Date().toISOString(),
      });
      try {
        (callInvite as any)?.reject?.();
        logger.info(
          '[IncomingCallHandler] ✅ Twilio call invite rejected successfully',
          {
            callSid,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        logger.error(
          '[IncomingCallHandler] ❌ Error rejecting Twilio call invite',
          error,
          {
            callSid,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    // Update DB status
    if (currentCall?.call_id) {
      logger.info(
        '[IncomingCallHandler] 💾 Updating call status to no-answer',
        {
          call_id: currentCall.call_id,
          timestamp: new Date().toISOString(),
        }
      );

      (async () => {
        try {
          const { error, data } = await supabase
            .from('calls')
            .update({
              status: 'no-answer',
              ended_at: new Date().toISOString(),
            })
            .eq('id', currentCall.call_id);

          if (error) {
            logger.error('[IncomingCallHandler] ❌ DB update error', {
              call_id: currentCall.call_id,
              error: error.message,
              errorCode: error.code,
              errorDetails: error.details,
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.info('[IncomingCallHandler] ✅ DB updated successfully', {
              call_id: currentCall.call_id,
              updatedData: data,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          logger.error('[IncomingCallHandler] ❌ DB update exception', err, {
            call_id: currentCall.call_id,
            timestamp: new Date().toISOString(),
          });
        }
      })();
    } else {
      logger.warn('[IncomingCallHandler] ⚠️ No call_id to update in DB', {
        timestamp: new Date().toISOString(),
      });
    }

    // Hide modal
    logger.debug('[IncomingCallHandler] 🎭 Hiding modal', {
      timestamp: new Date().toISOString(),
    });
    setShowModal(false);
    setIncomingCall(null);
  }, [twilioVoice.callState.callInvite]);

  // 🔥 ACCEPT HANDLER (useCallback ile sarmalandı)
  const handleAccept = useCallback(() => {
    const currentCall = incomingCallRef.current;

    logger.info('[IncomingCallHandler] ✅ User accepted call', {
      call_id: currentCall?.call_id,
      caller_name: currentCall?.caller_name,
      timestamp: new Date().toISOString(),
    });

    if (!currentCall?.call_id) {
      logger.error('[IncomingCallHandler] ❌ Cannot accept: no call_id', {
        hasCall: !!currentCall,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const callIdToNavigate = currentCall.call_id;

    // Clear timers
    if (dismissTimeoutRef.current) {
      logger.debug(
        '[IncomingCallHandler] ⏰ Clearing dismiss timeout on accept',
        {
          timestamp: new Date().toISOString(),
        }
      );
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      logger.debug(
        '[IncomingCallHandler] 🔄 Clearing polling interval on accept',
        {
          timestamp: new Date().toISOString(),
        }
      );
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Hide modal
    logger.debug('[IncomingCallHandler] 🎭 Hiding modal before navigation', {
      call_id: callIdToNavigate,
      timestamp: new Date().toISOString(),
    });
    setShowModal(false);
    setIncomingCall(null);

    // Navigate to call screen
    logger.info('[IncomingCallHandler] 🚀 Navigating to call screen', {
      call_id: callIdToNavigate,
      timestamp: new Date().toISOString(),
    });

    try {
      router.push({
        pathname: '/call/[id]' as any,
        params: {
          id: callIdToNavigate,
          call_id: callIdToNavigate,
          incoming: 'true',
        },
      });
      logger.info('[IncomingCallHandler] ✅ Navigation triggered', {
        call_id: callIdToNavigate,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[IncomingCallHandler] ❌ Navigation error', error, {
        call_id: callIdToNavigate,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // 🔥 AUTO-DISMISS TIMER
  useEffect(() => {
    if (showModal && incomingCall) {
      logger.info(
        '[IncomingCallHandler] ⏰ Starting auto-dismiss timer (45s)',
        {
          call_id: incomingCall.call_id,
          caller_name: incomingCall.caller_name,
          timestamp: new Date().toISOString(),
        }
      );

      dismissTimeoutRef.current = setTimeout(() => {
        logger.warn(
          '[IncomingCallHandler] ⏰ Auto-dismissing modal (timeout)',
          {
            call_id: incomingCall.call_id,
            elapsedTime: '45s',
            timestamp: new Date().toISOString(),
          }
        );
        handleDecline();
      }, 45000); // 45 seconds

      return () => {
        if (dismissTimeoutRef.current) {
          logger.info('[IncomingCallHandler] ⏰ Clearing auto-dismiss timer', {
            call_id: incomingCall.call_id,
            timestamp: new Date().toISOString(),
          });
          clearTimeout(dismissTimeoutRef.current);
          dismissTimeoutRef.current = null;
        }
      };
    } else {
      logger.debug('[IncomingCallHandler] ⏰ Auto-dismiss timer not started', {
        showModal,
        hasIncomingCall: !!incomingCall,
        timestamp: new Date().toISOString(),
      });
    }
  }, [showModal, incomingCall, handleDecline]);

  // 🔥 DB POLLING (check if caller hung up)
  useEffect(() => {
    if (showModal && incomingCall?.call_id) {
      logger.info(
        '[IncomingCallHandler] 🔄 Starting DB polling (2.5s interval)',
        {
          call_id: incomingCall.call_id,
          timestamp: new Date().toISOString(),
        }
      );

      let pollCount = 0;
      pollingIntervalRef.current = setInterval(async () => {
        pollCount++;
        logger.info('[IncomingCallHandler] 🔍 Polling call status from DB', {
          call_id: incomingCall.call_id,
          pollCount,
          timestamp: new Date().toISOString(),
        });

        try {
          const { data, error } = await supabase
            .from('calls')
            .select('status, ended_at')
            .eq('id', incomingCall.call_id)
            .single();

          if (error) {
            logger.error('[IncomingCallHandler] ❌ DB polling error', {
              call_id: incomingCall.call_id,
              error: error.message,
              errorCode: error.code,
              errorDetails: error.details,
              pollCount,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          logger.info('[IncomingCallHandler] ✅ DB polling result', {
            call_id: incomingCall.call_id,
            status: data?.status,
            ended_at: data?.ended_at,
            pollCount,
            timestamp: new Date().toISOString(),
          });

          // If caller hung up, dismiss modal
          if (
            data?.status === 'cancelled' ||
            data?.status === 'no-answer' ||
            data?.ended_at
          ) {
            logger.warn(
              '[IncomingCallHandler] 📞 Caller hung up, dismissing modal',
              {
                call_id: incomingCall.call_id,
                status: data.status,
                ended_at: data.ended_at,
                pollCount,
                timestamp: new Date().toISOString(),
              }
            );
            handleDecline();
          } else {
            logger.debug('[IncomingCallHandler] ✅ Call still active', {
              call_id: incomingCall.call_id,
              status: data?.status,
              pollCount,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          logger.error('[IncomingCallHandler] ❌ DB polling exception', {
            call_id: incomingCall.call_id,
            error: String(err),
            errorStack: err instanceof Error ? err.stack : undefined,
            pollCount,
            timestamp: new Date().toISOString(),
          });
        }
      }, 2500); // Check every 2.5 seconds

      return () => {
        if (pollingIntervalRef.current) {
          logger.info('[IncomingCallHandler] 🔄 Stopping DB polling', {
            call_id: incomingCall.call_id,
            timestamp: new Date().toISOString(),
          });
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      logger.debug('[IncomingCallHandler] 🔄 DB polling not started', {
        showModal,
        hasCallId: !!incomingCall?.call_id,
        timestamp: new Date().toISOString(),
      });
    }
  }, [showModal, incomingCall?.call_id, handleDecline]);

  // 🔥 LOG: Modal State Changes
  useEffect(() => {
    logger.info('[IncomingCallHandler] 🎭 Modal state changed', {
      showModal,
      hasIncomingCall: !!incomingCall,
      call_id: incomingCall?.call_id,
      caller_name: incomingCall?.caller_name,
      timestamp: new Date().toISOString(),
    });
  }, [showModal, incomingCall]);

  // 🔥 LOG: Render cycle (useEffect içine taşındı)
  useEffect(() => {
    logger.debug('[IncomingCallHandler] 🎨 Render cycle', {
      showModal,
      hasIncomingCall: !!incomingCall,
      call_id: incomingCall?.call_id,
      twilioStatus: twilioVoice.callState.status,
      componentAge: `${Date.now() - mountTimeRef.current}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  if (!showModal || !incomingCall) {
    return null;
  }

  logger.debug('[IncomingCallHandler] 🎨 Rendering modal', {
    call_id: incomingCall.call_id,
    caller_name: incomingCall.caller_name,
    timestamp: new Date().toISOString(),
  });

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Caller Avatar */}
          {incomingCall.caller_avatar ? (
            <Image
              source={{ uri: incomingCall.caller_avatar }}
              style={styles.avatar}
              onLoad={() => {
                logger.debug('[IncomingCallHandler] 🖼️ Avatar image loaded', {
                  call_id: incomingCall.call_id,
                  timestamp: new Date().toISOString(),
                });
              }}
              onError={(error) => {
                logger.error(
                  '[IncomingCallHandler] ❌ Avatar image load error',
                  error,
                  {
                    call_id: incomingCall.call_id,
                    avatarUri: incomingCall.caller_avatar,
                    timestamp: new Date().toISOString(),
                  }
                );
              }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {incomingCall.caller_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Caller Name */}
          <Text style={styles.callerName}>{incomingCall.caller_name}</Text>
          <Text style={styles.callType}>
            {incomingCall.urgent ? '🚨 Urgent ' : ''}
            {incomingCall.call_type === 'video' ? 'Video' : 'Voice'} Call
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={() => {
                logger.debug(
                  '[IncomingCallHandler] 👆 Decline button pressed',
                  {
                    call_id: incomingCall.call_id,
                    timestamp: new Date().toISOString(),
                  }
                );
                handleDecline();
              }}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => {
                logger.debug('[IncomingCallHandler] 👆 Accept button pressed', {
                  call_id: incomingCall.call_id,
                  timestamp: new Date().toISOString(),
                });
                handleAccept();
              }}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
