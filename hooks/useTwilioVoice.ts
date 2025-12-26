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

export function useTwilioVoice() {
  const mountTimeRef = useRef<number>(Date.now());
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, isLoading: profileLoading } = useProfile();

  logger.debug('[useTwilioVoice] 🎬 Hook rendering', {
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

        // AUTO-REGISTER: Register with Twilio when user is authenticated
        logger.debug('[useTwilioVoice] 🔍 Checking registration conditions', {
          hasUser: !!user,
          profileLoading,
          mounted,
          shouldRegister: !!(user && !profileLoading && mounted),
          timestamp: new Date().toISOString(),
        });

        if (user && !profileLoading && mounted) {
          try {
            const registerStartTime = Date.now();
            logger.info(
              '[useTwilioVoice] 🔧 Auto-registering device for incoming calls',
              {
                userId: user.id,
                userName: user.name,
                timestamp: new Date().toISOString(),
              }
            );

            await twilioVoiceService.register();

            const registerElapsed = Date.now() - registerStartTime;
            logger.info('[useTwilioVoice] ✅ Device registered successfully', {
              userId: user.id,
              elapsed: `${registerElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
          } catch (regError) {
            logger.error(
              '[useTwilioVoice] ❌ Auto-registration failed',
              regError,
              {
                userId: user?.id,
                errorMessage:
                  regError instanceof Error
                    ? regError.message
                    : String(regError),
                errorStack:
                  regError instanceof Error ? regError.stack : undefined,
                timestamp: new Date().toISOString(),
              }
            );
            // Don't throw - registration failure shouldn't block UI
          }
        } else if (!user && !profileLoading) {
          logger.info(
            '[useTwilioVoice] ⏭️ No authenticated user, skipping auto-registration',
            {
              hasUser: !!user,
              profileLoading,
              timestamp: new Date().toISOString(),
            }
          );
        } else {
          logger.debug('[useTwilioVoice] ⏭️ Skipping registration', {
            hasUser: !!user,
            profileLoading,
            mounted,
            reason: !user
              ? 'no user'
              : profileLoading
              ? 'profile loading'
              : 'not mounted',
            timestamp: new Date().toISOString(),
          });
        }

        const totalElapsed = Date.now() - initStartTime;
        logger.info('[useTwilioVoice] ✅ Initialization effect completed', {
          totalElapsed: `${totalElapsed}ms`,
          isInitialized: mounted ? true : false,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const totalElapsed = Date.now() - initStartTime;
        logger.error('[useTwilioVoice] ❌ Initialization failed', err, {
          elapsed: `${totalElapsed}ms`,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        if (mounted) {
          logger.debug('[useTwilioVoice] 🔧 Setting error state', {
            error: err instanceof Error ? err : new Error(String(err)),
            timestamp: new Date().toISOString(),
          });
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();

    return () => {
      logger.debug('[useTwilioVoice] 🔧 Cleaning up initialization effect', {
        timestamp: new Date().toISOString(),
      });
      mounted = false;
    };
  }, [user, profileLoading]); // Re-register when user changes

  const makeCall = useCallback(
    async (
      professionalId: string,
      professionalUserId: string,
      type: 'voice' | 'video' = 'voice',
      urgent: boolean = false,
      debugId?: string,
      userOverride?: any
    ) => {
      const makeCallStartTime = Date.now();
      logger.info('[useTwilioVoice] 📞 makeCall function called', {
        professionalId,
        professionalUserId,
        type,
        urgent,
        debugId,
        hasUserOverride: !!userOverride,
        timestamp: new Date().toISOString(),
      });

      try {
        const effectiveUser = userOverride || user;
        logger.debug('[useTwilioVoice] 🔍 Determining effective user', {
          hasUserOverride: !!userOverride,
          hasUser: !!user,
          effectiveUserId: effectiveUser?.id,
          timestamp: new Date().toISOString(),
        });

        if (!effectiveUser) {
          logger.error(
            '[useTwilioVoice] ❌ User not authenticated',
            undefined,
            {
              hasUserOverride: !!userOverride,
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

        logger.info('[useTwilioVoice] 📞 Making call...', {
          debugId,
          professionalId,
          professionalUserId,
          callerId: effectiveUser.id,
          callType: type,
          urgent,
          timestamp: new Date().toISOString(),
        });

        const serviceCallStartTime = Date.now();
        await twilioVoiceService.makeCall({
          professionalId,
          professionalUserId,
          callerId: effectiveUser.id,
          type,
          urgent,
          debugId,
        });

        const serviceCallElapsed = Date.now() - serviceCallStartTime;
        const totalElapsed = Date.now() - makeCallStartTime;
        logger.info('[useTwilioVoice] ✅ Call initiated successfully', {
          debugId,
          professionalId,
          professionalUserId,
          serviceElapsed: `${serviceCallElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - makeCallStartTime;
        logger.error('[useTwilioVoice] ❌ Make call error', error, {
          debugId,
          professionalId,
          professionalUserId,
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

  const acceptIncomingCall = useCallback(
    async (callId: string, debugId?: string) => {
      const acceptStartTime = Date.now();
      logger.info('[useTwilioVoice] 📞 acceptIncomingCall function called', {
        debugId,
        callId,
        currentStatus: callState.status,
        hasCallInvite: !!callState.callInvite,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.info('[useTwilioVoice] 📞 Accepting incoming call...', {
          debugId,
          callId,
          currentStatus: callState.status,
          hasCallInvite: !!callState.callInvite,
          timestamp: new Date().toISOString(),
        });

        const serviceAcceptStartTime = Date.now();
        await twilioVoiceService.acceptIncomingCall({
          callId,
          debugId,
        });

        const serviceAcceptElapsed = Date.now() - serviceAcceptStartTime;
        const totalElapsed = Date.now() - acceptStartTime;
        logger.info('[useTwilioVoice] ✅ Incoming call accepted successfully', {
          debugId,
          callId,
          serviceElapsed: `${serviceAcceptElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          newStatus: callState.status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - acceptStartTime;
        logger.error('[useTwilioVoice] ❌ Accept call error', error, {
          debugId,
          callId,
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

  const rejectIncomingCall = useCallback(
    async (callId: string, debugId?: string) => {
      const rejectStartTime = Date.now();
      logger.info('[useTwilioVoice] 📞 rejectIncomingCall function called', {
        debugId,
        callId,
        currentStatus: callState.status,
        hasCallInvite: !!callState.callInvite,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.info('[useTwilioVoice] 📞 Rejecting incoming call...', {
          debugId,
          callId,
          currentStatus: callState.status,
          hasCallInvite: !!callState.callInvite,
          timestamp: new Date().toISOString(),
        });

        const serviceRejectStartTime = Date.now();
        await twilioVoiceService.rejectIncomingCall({
          callId,
          debugId,
        });

        const serviceRejectElapsed = Date.now() - serviceRejectStartTime;
        const totalElapsed = Date.now() - rejectStartTime;
        logger.info('[useTwilioVoice] ✅ Incoming call rejected successfully', {
          debugId,
          callId,
          serviceElapsed: `${serviceRejectElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          newStatus: callState.status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - rejectStartTime;
        logger.error('[useTwilioVoice] ❌ Reject call error', error, {
          debugId,
          callId,
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
