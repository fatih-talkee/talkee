import { Voice, CallInvite } from '@twilio/voice-react-native-sdk';
import { logger } from '@/lib/logger';
import { usersService } from '@/services/supabase/user.service';
import { CallSidExtractor, addCallInviteEventListener, getCallInviteEventNames } from '../utils';
import { VoiceEventListenerDependencies } from '../types';

export class VoiceEventListener {
  private voice: Voice;
  private deps: VoiceEventListenerDependencies;
  private listeners: Map<string, any> = new Map();

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

    logger.info('[VoiceEventListener] ✅ Voice listeners set up successfully', {
      timestamp: new Date().toISOString(),
    });
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

