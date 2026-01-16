import { Voice, CallInvite, Call } from '@twilio/voice-react-native-sdk';
import { logger } from '@/lib/logger';
import { usersService } from '@/services/supabase/user.service';
import { CallSidExtractor, addCallInviteEventListener, getCallInviteEventNames, getCallInviteState, isCallInviteAccepted, getActiveCalls } from '../utils';
import { VoiceEventListenerDependencies } from '../types';

export class VoiceEventListener {
  private voice: Voice;
  private deps: VoiceEventListenerDependencies;
  private listeners: Map<string, any> = new Map();
  private stateSyncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncCheck: number = 0;

  constructor(
    voice: Voice,
    deps: VoiceEventListenerDependencies
  ) {
    this.voice = voice;
    this.deps = deps;
  }

  setup(): void {
    logger.info('[VoiceEventListener] 🔧 Setting up voice listeners', {
      hasVoice: !!this.voice,
      timestamp: new Date().toISOString(),
    });

    this.setupCallInviteListener();
    this.setupRegisteredListener();
    this.setupUnregisteredListener();
    this.setupErrorListener();
    this.setupStateSyncChecker();

    logger.info('[VoiceEventListener] ✅ Voice listeners set up successfully', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Periodically check for state mismatches between native SDK and JS state.
   * This handles cases where VoiceActivityProxy accepts a call natively
   * but JS state is not updated.
   */
  private setupStateSyncChecker(): void {
    // Check every 1 second while in ringing state
    this.stateSyncInterval = setInterval(() => {
      this.checkAndSyncState();
    }, 1000);

    logger.debug('[VoiceEventListener] 🔄 State sync checker started', {
      interval: '1000ms',
      timestamp: new Date().toISOString(),
    });
  }

  private async checkAndSyncState(): Promise<void> {
    // Throttle checks to avoid excessive logging
    const now = Date.now();
    if (now - this.lastSyncCheck < 900) return;
    this.lastSyncCheck = now;

    try {
      const currentState = this.deps.getState();
      
      // Only check when in ringing state
      if (currentState.status !== 'ringing') return;
      if (!currentState.callInvite) return;

      // Check if call invite has been accepted natively
      const inviteState = getCallInviteState(currentState.callInvite);
      const isAccepted = isCallInviteAccepted(currentState.callInvite);

      if (isAccepted) {
        logger.info('[VoiceEventListener] 🔔 Detected native accept - call invite state is "accepted"', {
          inviteState,
          jsStatus: currentState.status,
          timestamp: new Date().toISOString(),
        });

        // Try to get the active call from SDK
        await this.syncActiveCallFromNative();
      }
    } catch (error) {
      // Silently ignore errors in sync checker
    }
  }

  /**
   * Attempt to sync active call from native SDK when state mismatch is detected
   */
  private async syncActiveCallFromNative(): Promise<void> {
    try {
      const activeCalls = await getActiveCalls(this.voice);
      
      logger.info('[VoiceEventListener] 🔍 Checking for active calls from native SDK', {
        activeCallsCount: activeCalls.size,
        activeCallSids: Array.from(activeCalls.keys()),
        timestamp: new Date().toISOString(),
      });

      if (activeCalls.size > 0) {
        // Get the first (and usually only) active call
        const activeCall = activeCalls.values().next().value as Call;
        const callSid = activeCall?.getSid?.();
        
        // Check the actual call state from native
        const callAny = activeCall as any;
        const nativeCallState = callAny?.state || callAny?._state || callAny?.getState?.();
        const isAlreadyConnected = nativeCallState === 'connected' || nativeCallState === 'CONNECTED';

        logger.info('[VoiceEventListener] ✅ Found active call from native SDK', {
          callSid,
          nativeCallState,
          isAlreadyConnected,
          timestamp: new Date().toISOString(),
        });

        // Determine the correct status based on native call state
        const newStatus = isAlreadyConnected ? 'connected' : 'connecting';

        // ✅ CRITICAL: Set the active call in the service so disconnect works
        this.deps.setActiveCall(activeCall);

        // Update state to reflect the connected call
        this.deps.updateState({
          status: newStatus,
          call: activeCall,
          callInvite: null,
        });

        // Set up call listeners
        this.deps.setupCallListeners(activeCall, undefined, `native-sync-${Date.now()}`, 0, 0);

        logger.info('[VoiceEventListener] ✅ State synced with native call', {
          callSid,
          newStatus,
          nativeCallState,
          timestamp: new Date().toISOString(),
        });

        // If already connected, start duration tracking
        if (isAlreadyConnected) {
          logger.info('[VoiceEventListener] 📞 Call is already connected, duration tracking should start from CallEventListener', {
            callSid,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Call invite is accepted but no active call found - this is an error state
        logger.warn('[VoiceEventListener] ⚠️ Call invite accepted but no active call found', {
          note: 'Resetting to idle state',
          timestamp: new Date().toISOString(),
        });

        this.deps.updateState({
          status: 'idle',
          callInvite: null,
        });
      }
    } catch (error) {
      logger.error('[VoiceEventListener] ❌ Error syncing active call from native', error instanceof Error ? error : undefined, {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  private setupCallInviteListener(): void {
    logger.debug('[VoiceEventListener] 📡 Registering CallInvite listener', {
      timestamp: new Date().toISOString(),
    });

    const callInviteHandler = async (callInvite: CallInvite) => {
      const inviteSid = CallSidExtractor.extractFromCallInvite(callInvite);
      logger.info('[VoiceEventListener] 📞 Incoming call invite received', {
        callSid: inviteSid,
        inviteSidPrefix: inviteSid ? inviteSid.substring(0, 20) + '...' : null,
        timestamp: new Date().toISOString(),
      });

      // ✅ Store callInvite in state IMMEDIATELY so notification handlers can access it
      logger.info('[VoiceEventListener] 🔄 Updating state to ringing (immediate)', {
        callSid: inviteSid,
        inviteSidPrefix: inviteSid ? inviteSid.substring(0, 20) + '...' : null,
        timestamp: new Date().toISOString(),
      });

      this.deps.updateState({ status: 'ringing', callInvite });

      logger.info('[VoiceEventListener] ✅ State updated to ringing with callInvite', {
        callSid: inviteSid,
        timestamp: new Date().toISOString(),
      });

      // ✅ SECURITY: Check authentication AFTER storing callInvite in state
      try {
        const currentUser = await usersService.getCurrentUser();
        if (!currentUser) {
          logger.error(
            '[VoiceEventListener] ❌ Incoming call rejected - user not authenticated',
            undefined,
            {
              callSid: inviteSid,
              timestamp: new Date().toISOString(),
            }
          );
          try {
            await callInvite.reject();
            logger.info(
              '[VoiceEventListener] ✅ Call invite rejected (unauthenticated user)',
              {
                callSid: inviteSid,
                timestamp: new Date().toISOString(),
              }
            );
          } catch (rejectError) {
            logger.error(
              '[VoiceEventListener] ❌ Failed to reject call invite',
              rejectError instanceof Error ? rejectError : undefined,
              {
                callSid: inviteSid,
                errorMessage:
                  rejectError instanceof Error
                    ? rejectError.message
                    : String(rejectError),
                timestamp: new Date().toISOString(),
              }
            );
          }
          this.deps.updateState({ status: 'idle', callInvite: null });
          return;
        }
      } catch (authError) {
        logger.error(
          '[VoiceEventListener] ❌ Authentication check failed, rejecting call',
          authError instanceof Error ? authError : undefined,
          {
            callSid: inviteSid,
            errorMessage:
              authError instanceof Error ? authError.message : String(authError),
            timestamp: new Date().toISOString(),
          }
        );
        try {
          await callInvite.reject();
          logger.info(
            '[VoiceEventListener] ✅ Call invite rejected (auth check failed)',
            {
              callSid: inviteSid,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (rejectError) {
          logger.error(
            '[VoiceEventListener] ❌ Failed to reject call invite',
            rejectError instanceof Error ? rejectError : undefined,
            {
              callSid: inviteSid,
              timestamp: new Date().toISOString(),
            }
          );
        }
        this.deps.updateState({ status: 'idle', callInvite: null });
        return;
      }

      // Setup CallInvite event listeners
      try {
        logger.debug('[VoiceEventListener] 🔧 Setting up CallInvite event listeners', {
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });

        const clearInvite = (reason: string) => {
          logger.info('[VoiceEventListener] 📞 Incoming call ended', {
            reason,
            callSid: inviteSid,
            timestamp: new Date().toISOString(),
          });

          this.deps.cleanupCallInviteListeners(callInvite);
          this.deps.updateState({ status: 'idle', callInvite: null });
        };

        const candidates = getCallInviteEventNames();

        logger.debug('[VoiceEventListener] 📋 Binding CallInvite event candidates', {
          candidatesCount: candidates.length,
          candidates,
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });

        for (const ev of candidates) {
          const handler = (err?: any) => clearInvite(String(ev));
          addCallInviteEventListener(callInvite, ev, handler);
        }

        logger.debug('[VoiceEventListener] ✅ CallInvite event listeners bound', {
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        logger.warn('[VoiceEventListener] ⚠️ Failed binding CallInvite listeners', {
          error: e instanceof Error ? e.message : String(e),
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });
      }
    };

    this.voice.on(Voice.Event.CallInvite, callInviteHandler);
    this.listeners.set('CallInvite', callInviteHandler);
  }

  private setupRegisteredListener(): void {
    logger.debug('[VoiceEventListener] 📡 Registering Registered listener', {
      timestamp: new Date().toISOString(),
    });

    const registeredHandler = () => {
      logger.info('[VoiceEventListener] ✅ Device registered', {
        timestamp: new Date().toISOString(),
      });
    };

    this.voice.on(Voice.Event.Registered, registeredHandler);
    this.listeners.set('Registered', registeredHandler);
  }

  private setupUnregisteredListener(): void {
    logger.debug('[VoiceEventListener] 📡 Registering Unregistered listener', {
      timestamp: new Date().toISOString(),
    });

    const unregisteredHandler = () => {
      logger.info('[VoiceEventListener] ✅ Device unregistered', {
        timestamp: new Date().toISOString(),
      });
    };

    this.voice.on(Voice.Event.Unregistered, unregisteredHandler);
    this.listeners.set('Unregistered', unregisteredHandler);
  }

  private setupErrorListener(): void {
    logger.debug('[VoiceEventListener] 📡 Registering Error listener', {
      timestamp: new Date().toISOString(),
    });

    const errorHandler = (error: any) => {
      logger.error('[VoiceEventListener] ❌ SDK Error', error, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      this.deps.updateState({ error });
    };

    this.voice.on(Voice.Event.Error, errorHandler);
    this.listeners.set('Error', errorHandler);
  }

  cleanup(): void {
    logger.debug('[VoiceEventListener] 🧹 Cleaning up voice listeners', {
      listenerCount: this.listeners.size,
      timestamp: new Date().toISOString(),
    });

    // Stop state sync checker
    if (this.stateSyncInterval) {
      clearInterval(this.stateSyncInterval);
      this.stateSyncInterval = null;
      logger.debug('[VoiceEventListener] 🛑 State sync checker stopped', {
        timestamp: new Date().toISOString(),
      });
    }

    try {
      for (const [eventName, handler] of this.listeners.entries()) {
        try {
          this.voice.off?.(eventName as any, handler);
        } catch (e) {
          logger.warn('[VoiceEventListener] ⚠️ Error removing voice listener', {
            eventName,
            error: e instanceof Error ? e.message : String(e),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      logger.warn('[VoiceEventListener] ⚠️ Error during voice listener cleanup', {
        error: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      });
    }

    this.listeners.clear();
  }
}

