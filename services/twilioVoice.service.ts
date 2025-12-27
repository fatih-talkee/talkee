import { Voice, Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { PermissionsAndroid, Platform, AppState } from 'react-native';
import { callsService } from '@/services/calls.service';
import { notificationsService } from '@/services/notifications.service';
import { usersService } from '@/services/supabase/user.service';
import { CallStatus as DbCallStatus } from '@/types/database.types';
import BillingService from '@/services/billingService';

export type CallStatus =
  | 'idle'
  | 'connecting'
  | 'ringing'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export interface CallState {
  status: CallStatus;
  call: Call | null;
  callInvite: CallInvite | null;
  isMuted: boolean;
  isOnHold: boolean;
  duration: number;
  error: Error | null;
}

class TwilioVoiceService {
  private voice: Voice | null = null;
  private activeCall: Call | null = null;
  private accessToken: string | null = null;
  private listeners: Map<string, Set<(state: CallState) => void>> = new Map();
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private perMinuteInterval: ReturnType<typeof setInterval> | null = null;
  private currentDbCallId: string | null = null;
  private lastChargedMinute: number = 0;
  private appStateSubscription: any = null;

  private state: CallState = {
    status: 'idle',
    call: null,
    callInvite: null,
    isMuted: false,
    isOnHold: false,
    duration: 0,
    error: null,
  };

  async initialize(): Promise<void> {
    const initStartTime = Date.now();
    logger.info('[TwilioVoice] 🎬 Initializing Twilio Voice SDK...', {
      hasVoice: !!this.voice,
      timestamp: new Date().toISOString(),
    });

    try {
      logger.debug('[TwilioVoice] 🔧 Creating Voice instance', {
        timestamp: new Date().toISOString(),
      });

      const voiceCreateStartTime = Date.now();
      this.voice = new Voice();
      const voiceCreateElapsed = Date.now() - voiceCreateStartTime;

      logger.info('[TwilioVoice] ✅ Voice instance created', {
        elapsed: `${voiceCreateElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      logger.debug('[TwilioVoice] 🔧 Setting up voice listeners', {
        timestamp: new Date().toISOString(),
      });

      const listenersStartTime = Date.now();
      this.setupVoiceListeners();
      const listenersElapsed = Date.now() - listenersStartTime;

      // ✅ NEW: Setup AppState listener for background handling
      this.setupAppStateListener();

      const totalElapsed = Date.now() - initStartTime;
      logger.info('[TwilioVoice] ✅ Initialized successfully', {
        voiceCreateElapsed: `${voiceCreateElapsed}ms`,
        listenersElapsed: `${listenersElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const totalElapsed = Date.now() - initStartTime;
      logger.error('[TwilioVoice] ❌ Initialization error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // ✅ NEW: Setup AppState listener
  private setupAppStateListener(): void {
    logger.info('[TwilioVoice] 🔧 Setting up AppState listener', {
      timestamp: new Date().toISOString(),
    });

    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        logger.debug('[TwilioVoice] 📱 AppState changed', {
          nextState,
          currentStatus: this.state.status,
          timestamp: new Date().toISOString(),
        });

        if (nextState === 'background') {
          // ✅ FIX: Only disconnect if call is actively connecting (outgoing)
          // Don't disconnect ringing calls (incoming) - user might be reviewing the modal
          const isOutgoingConnecting = this.state.status === 'connecting';

          logger.info('[TwilioVoice] 📱 App moved to background', {
            status: this.state.status,
            isOutgoingConnecting,
            timestamp: new Date().toISOString(),
          });

          if (isOutgoingConnecting) {
            logger.warn(
              '[TwilioVoice] ⚠️ Ending outgoing call - app moved to background during connection',
              {
                status: this.state.status,
                timestamp: new Date().toISOString(),
              }
            );

            void this.disconnect();
          }
        }
      }
    );

    logger.info('[TwilioVoice] ✅ AppState listener registered', {
      timestamp: new Date().toISOString(),
    });
  }

  isSdkInitialized(): boolean {
    const isInitialized = this.voice !== null;
    logger.debug('[TwilioVoice] 🔍 Checking SDK initialization status', {
      isInitialized,
      hasVoice: !!this.voice,
      timestamp: new Date().toISOString(),
    });
    return isInitialized;
  }

  async getAccessToken(): Promise<string> {
    const tokenStartTime = Date.now();
    logger.info('[TwilioVoice] 🔑 Fetching access token...', {
      hasExistingToken: !!this.accessToken,
      existingTokenLength: this.accessToken?.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const invokeStartTime = Date.now();
      logger.debug('[TwilioVoice] 📡 Invoking twilio-token function', {
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke('twilio-token');
      const invokeElapsed = Date.now() - invokeStartTime;

      if (error) {
        logger.error('[TwilioVoice] ❌ Token fetch error', error, {
          elapsed: `${invokeElapsed}ms`,
          errorMessage: error.message,
          errorName: error.name,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }

      logger.debug('[TwilioVoice] 📥 Token function response received', {
        hasData: !!data,
        hasToken: !!data?.token,
        hasIdentity: !!data?.identity,
        hasExpiresAt: !!data?.expiresAt,
        elapsed: `${invokeElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!data?.token) {
        logger.error(
          '[TwilioVoice] ❌ No token received from server',
          undefined,
          {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            elapsed: `${invokeElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error('No token received from server');
      }

      this.accessToken = data.token;
      const totalElapsed = Date.now() - tokenStartTime;

      logger.info('[TwilioVoice] ✅ Token received successfully', {
        tokenLength: data.token.length,
        identity: data.identity,
        expiresAt: data.expiresAt,
        invokeElapsed: `${invokeElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return data.token;
    } catch (error) {
      const totalElapsed = Date.now() - tokenStartTime;
      logger.error('[TwilioVoice] ❌ Token error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private isRegistered = false;
  private isRegistering = false;
  private registrationPromise: Promise<void> | null = null;

  async register(): Promise<void> {
    // ✅ Guard: If already registered, skip
    if (this.isRegistered) {
      logger.info('[TwilioVoice] ℹ️ Already registered, skipping', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ✅ Guard: If currently registering, return the existing promise
    if (this.isRegistering && this.registrationPromise) {
      logger.info('[TwilioVoice] ⏳ Registration in progress, waiting...', {
        timestamp: new Date().toISOString(),
      });
      return this.registrationPromise;
    }

    const registerStartTime = Date.now();
    logger.info('[TwilioVoice] 📱 Registering device...', {
      hasVoice: !!this.voice,
      hasAccessToken: !!this.accessToken,
      timestamp: new Date().toISOString(),
    });

    this.isRegistering = true;

    this.registrationPromise = (async () => {
      try {
        if (!this.voice) {
          logger.error(
            '[TwilioVoice] ❌ Voice SDK not initialized',
            undefined,
            {
              timestamp: new Date().toISOString(),
            }
          );
          throw new Error('Voice SDK not initialized');
        }

        const tokenStartTime = Date.now();
        const token = await this.getAccessToken();
        const tokenElapsed = Date.now() - tokenStartTime;

        logger.info('[TwilioVoice] 🔧 Registering device with Twilio...', {
          tokenLength: token.length,
          tokenElapsed: `${tokenElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        const registerCallStartTime = Date.now();
        await this.voice.register(token);
        const registerElapsed = Date.now() - registerCallStartTime;
        const totalElapsed = Date.now() - registerStartTime;

        this.isRegistered = true; // ✅ Mark as registered

        logger.info('[TwilioVoice] ✅ Device registered successfully', {
          registerElapsed: `${registerElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - registerStartTime;

        // ✅ If error is 31409 (Conflict), treat as already registered
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('31409') ||
          errorMessage.includes('Conflict')
        ) {
          logger.warn('[TwilioVoice] ⚠️ Already registered (31409 Conflict)', {
            elapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
          this.isRegistered = true; // ✅ Mark as registered anyway
          return; // Don't throw
        }

        logger.error('[TwilioVoice] ❌ Registration error', error, {
          elapsed: `${totalElapsed}ms`,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        throw error;
      } finally {
        this.isRegistering = false;
        this.registrationPromise = null;
      }
    })();

    return this.registrationPromise;
  }

  async unregister(): Promise<void> {
    const unregisterStartTime = Date.now();
    logger.info('[TwilioVoice] 📱 Unregistering device...', {
      hasVoice: !!this.voice,
      hasAccessToken: !!this.accessToken,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.voice) {
        logger.debug(
          '[TwilioVoice] ⏭️ No voice instance, skipping unregister',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      if (!this.accessToken) {
        logger.warn('[TwilioVoice] ⚠️ No access token; skipping unregister', {
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.debug('[TwilioVoice] 🔧 Calling voice.unregister', {
        tokenLength: this.accessToken.length,
        timestamp: new Date().toISOString(),
      });

      const unregisterCallStartTime = Date.now();
      await this.voice.unregister(this.accessToken!);
      const unregisterElapsed = Date.now() - unregisterCallStartTime;
      const totalElapsed = Date.now() - unregisterStartTime;

      this.isRegistered = false; // ✅ Reset registration flag

      logger.info('[TwilioVoice] ✅ Device unregistered', {
        unregisterElapsed: `${unregisterElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const totalElapsed = Date.now() - unregisterStartTime;
      logger.error('[TwilioVoice] ❌ Unregistration error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async makeCall(params: {
    professionalId: string;
    professionalUserId: string;
    callerId: string;
    type?: 'voice' | 'video';
    urgent?: boolean;
    debugId?: string;
    ratePerMinute?: number;
    userBalance?: number;
  }): Promise<Call> {
    const makeCallStartTime = Date.now();
    let createdCallId: string | null = null;

    logger.info('[TwilioVoice] 📞 makeCall function called', {
      debugId: params.debugId,
      professionalId: params.professionalId,
      professionalUserId: params.professionalUserId,
      callerId: params.callerId,
      type: params.type || 'voice',
      urgent: params.urgent || false,
      ratePerMinute: params.ratePerMinute,
      userBalance: params.userBalance,
      hasVoice: !!this.voice,
      hasAccessToken: !!this.accessToken,
      currentStatus: this.state.status,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.voice) {
        logger.error('[TwilioVoice] ❌ Voice SDK not initialized', undefined, {
          debugId: params.debugId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Voice SDK not initialized');
      }

      if (!this.accessToken) {
        logger.info('[TwilioVoice] 🔑 No access token, fetching...', {
          debugId: params.debugId,
          timestamp: new Date().toISOString(),
        });
        await this.getAccessToken();
        logger.debug('[TwilioVoice] ✅ Access token obtained', {
          debugId: params.debugId,
          tokenLength: this.accessToken?.length,
          timestamp: new Date().toISOString(),
        });
      }

      logger.debug('[TwilioVoice] 🎤 Ensuring microphone permission', {
        debugId: params.debugId,
        timestamp: new Date().toISOString(),
      });
      await this.ensureMicrophonePermission(params.debugId);

      logger.info('[TwilioVoice] 📞 Initiating call...', {
        debugId: params.debugId,
        professionalId: params.professionalId,
        professionalUserId: params.professionalUserId,
        callerId: params.callerId,
        type: params.type || 'voice',
        urgent: params.urgent || false,
        timestamp: new Date().toISOString(),
      });

      const callRecordStartTime = Date.now();
      logger.debug('[TwilioVoice] 📝 Creating call record in database', {
        debugId: params.debugId,
        professionalId: params.professionalId,
        type: params.type || 'voice',
        urgent: params.urgent || false,
        timestamp: new Date().toISOString(),
      });

      const callRecord = await callsService.initiateCall(
        params.professionalId,
        (params.type || 'voice') as any,
        Boolean(params.urgent)
      );
      const callRecordElapsed = Date.now() - callRecordStartTime;

      if (!callRecord) {
        logger.error(
          '[TwilioVoice] ❌ Failed to create call record',
          undefined,
          {
            debugId: params.debugId,
            elapsed: `${callRecordElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error('Failed to create call record');
      }
      createdCallId = callRecord.id;

      // ✅ NEW: Store DB call ID for per-minute billing
      this.currentDbCallId = callRecord.id;

      logger.info('[TwilioVoice] ✅ Call record created', {
        debugId: params.debugId,
        callId: callRecord.id,
        status: callRecord.status,
        ratePerMinute: callRecord.rate_per_minute,
        elapsed: `${callRecordElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // ✅ Send push notification ONLY if app is in background/closed
      // If app is in foreground, IncomingCallHandler modal will show automatically
      const currentAppState = AppState.currentState;
      const isAppInForeground = currentAppState === 'active';

      if (!isAppInForeground) {
        // ✅ App is in background/closed - send push notification
        try {
          logger.info(
            '[TwilioVoice] 🔔 Sending incoming call notification (app is background)',
            {
              debugId: params.debugId,
              callId: callRecord.id,
              professionalUserId: params.professionalUserId,
              appState: currentAppState,
              timestamp: new Date().toISOString(),
            }
          );

          const currentUser = await usersService.getCurrentUser();
          const callerName = currentUser?.name || 'Someone';
          const callerAvatar = currentUser?.avatar_url || null;

          logger.debug('[TwilioVoice] 👤 Caller info', {
            debugId: params.debugId,
            callerName,
            hasAvatar: !!callerAvatar,
            timestamp: new Date().toISOString(),
          });

          const pushResult = await notificationsService.sendPushNotification(
            params.professionalUserId,
            '📞 Incoming Call',
            `${callerName} is calling you`,
            {
              type: 'incoming_call',
              call_id: callRecord.id,
              caller_id: params.callerId,
              caller_name: callerName,
              caller_avatar: callerAvatar,
              call_type: params.type || 'voice',
              urgent: params.urgent || false,
              sent_at: new Date().toISOString(),
            },
            'INCOMING_CALL' // ✅ Category with Accept/Decline buttons
          );

          logger.info('[TwilioVoice] ✅ Push notification sent', {
            debugId: params.debugId,
            callId: callRecord.id,
            success: pushResult,
            timestamp: new Date().toISOString(),
          });
        } catch (pushError) {
          logger.error('[TwilioVoice] ❌ Push notification error', pushError, {
            debugId: params.debugId,
            callId: callRecord.id,
            errorMessage:
              pushError instanceof Error
                ? pushError.message
                : String(pushError),
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // ✅ App is in foreground - IncomingCallHandler modal will show
        logger.info(
          '[TwilioVoice] ℹ️ Skipping push notification (app is foreground)',
          {
            debugId: params.debugId,
            callId: callRecord.id,
            note: 'IncomingCallHandler modal will show instead',
            appState: currentAppState,
            timestamp: new Date().toISOString(),
          }
        );
      }

      if (!this.voice) {
        logger.error(
          '[TwilioVoice] ❌ Voice SDK was cleaned up before call could be made',
          undefined,
          {
            debugId: params.debugId,
            callId: callRecord.id,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error('Voice SDK was cleaned up before call could be made');
      }

      // Get caller info for display name
      const { data: callerUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', params.callerId)
        .single();

      const callerDisplayName = callerUser?.name || 'Talkee User';

      logger.info('[TwilioVoice] 📡 Connecting via Twilio SDK...', {
        debugId: params.debugId,
        to: params.professionalUserId,
        from: params.callerId,
        callerDisplayName,
        callId: callRecord.id,
        callType: params.type || 'voice',
        urgent: params.urgent || false,
        accessTokenLength: this.accessToken?.length,
        voiceInitialized: !!this.voice,
        timestamp: new Date().toISOString(),
      });

      const connectParams = {
        params: {
          To: params.professionalUserId,
          From: params.callerId,
          CallId: callRecord.id,
          CallType: params.type || 'voice',
          Urgent: params.urgent ? 'true' : 'false',
        },
        contactHandle: callerDisplayName, // ✅ Display name for CallKit/ConnectionService
      };

      logger.debug('[TwilioVoice] 🔧 Calling voice.connect', {
        debugId: params.debugId,
        connectParams,
        callerDisplayName,
        timestamp: new Date().toISOString(),
      });

      const connectStartTime = Date.now();
      const call = await this.voice.connect(this.accessToken!, connectParams);
      const connectElapsed = Date.now() - connectStartTime;

      logger.info('[TwilioVoice] ✅ voice.connect returned call object', {
        debugId: params.debugId,
        callId: callRecord.id,
        callState: (call as any)?.getState?.(),
        connectElapsed: `${connectElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      try {
        logger.debug('[TwilioVoice] 🔍 Extracting call SID', {
          debugId: params.debugId,
          callId: callRecord.id,
          timestamp: new Date().toISOString(),
        });

        const anyCall = call as any;
        const callSid =
          anyCall?.callSid ??
          anyCall?.sid ??
          (typeof anyCall?.getSid === 'function'
            ? anyCall.getSid()
            : undefined);

        logger.debug('[TwilioVoice] 📊 Call SID extraction result', {
          debugId: params.debugId,
          callId: callRecord.id,
          hasCallSid: !!callSid,
          callSid: callSid?.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        });

        if (callSid) {
          logger.info('[TwilioVoice] 💾 Saving call_sid to database', {
            debugId: params.debugId,
            callId: callRecord.id,
            callSid: callSid.substring(0, 20) + '...',
            timestamp: new Date().toISOString(),
          });

          const sidSaveStartTime = Date.now();
          const { error: sidErr } = await supabase
            .from('calls')
            .update({ call_sid: callSid })
            .eq('id', callRecord.id);
          const sidSaveElapsed = Date.now() - sidSaveStartTime;

          if (sidErr) {
            logger.warn('[TwilioVoice] ⚠️ Failed saving call_sid', {
              debugId: params.debugId,
              callId: callRecord.id,
              callSid: callSid.substring(0, 20) + '...',
              errorMessage: sidErr.message,
              elapsed: `${sidSaveElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.info('[TwilioVoice] ✅ Saved call_sid', {
              debugId: params.debugId,
              callId: callRecord.id,
              callSid: callSid.substring(0, 20) + '...',
              elapsed: `${sidSaveElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          logger.warn('[TwilioVoice] ⚠️ No call SID found in call object', {
            debugId: params.debugId,
            callId: callRecord.id,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        logger.warn('[TwilioVoice] ⚠️ call_sid persist failed (non-fatal)', {
          debugId: params.debugId,
          callId: callRecord.id,
          error: e instanceof Error ? e.message : String(e),
          timestamp: new Date().toISOString(),
        });
      }

      logger.debug('[TwilioVoice] 🔧 Setting active call and listeners', {
        debugId: params.debugId,
        callId: callRecord.id,
        timestamp: new Date().toISOString(),
      });

      this.activeCall = call;
      this.setupCallListeners(
        call,
        callRecord.id,
        params.debugId,
        params.ratePerMinute || Number(callRecord.rate_per_minute),
        params.userBalance
      );

      setTimeout(() => {
        this.updateState({ status: 'connecting', call });
      }, 0);

      const totalElapsed = Date.now() - makeCallStartTime;
      logger.info('[TwilioVoice] ✅ Call initiated successfully', {
        debugId: params.debugId,
        callId: callRecord.id,
        currentState: this.state.status,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return call;
    } catch (error) {
      const totalElapsed = Date.now() - makeCallStartTime;
      logger.error('[TwilioVoice] ❌ Call error', error, {
        debugId: params.debugId,
        createdCallId,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      if (createdCallId) {
        logger.info('[TwilioVoice] 🗑️ Cancelling call record due to error', {
          debugId: params.debugId,
          callId: createdCallId,
          timestamp: new Date().toISOString(),
        });

        supabase
          .from('calls')
          .update({
            status: DbCallStatus.CANCELLED,
            end_time: new Date().toISOString(),
          })
          .eq('id', createdCallId)
          .then(({ error: updateErr }) => {
            if (updateErr) {
              logger.warn('[TwilioVoice] ⚠️ Failed to cancel call record', {
                debugId: params.debugId,
                callId: createdCallId,
                errorMessage: updateErr.message,
                timestamp: new Date().toISOString(),
              });
            } else {
              logger.info('[TwilioVoice] ✅ Cancelled call record', {
                debugId: params.debugId,
                callId: createdCallId,
                timestamp: new Date().toISOString(),
              });
            }
          });
      }

      logger.debug('[TwilioVoice] 🔄 Resetting state to idle due to error', {
        debugId: params.debugId,
        timestamp: new Date().toISOString(),
      });

      this.updateState({
        status: 'idle',
        call: null,
        error: error as Error,
      });

      throw error;
    }
  }

  private async ensureMicrophonePermission(debugId?: string): Promise<void> {
    const permissionStartTime = Date.now();
    logger.debug('[TwilioVoice] 🎤 Checking microphone permission', {
      platform: Platform.OS,
      debugId,
      timestamp: new Date().toISOString(),
    });

    if (Platform.OS !== 'android') {
      logger.debug('[TwilioVoice] ⏭️ Skipping permission check (not Android)', {
        platform: Platform.OS,
        debugId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const checkStartTime = Date.now();
    const alreadyGranted = await PermissionsAndroid.check(permission);
    const checkElapsed = Date.now() - checkStartTime;

    logger.debug('[TwilioVoice] 🔍 Permission check result', {
      alreadyGranted,
      elapsed: `${checkElapsed}ms`,
      debugId,
      timestamp: new Date().toISOString(),
    });

    if (alreadyGranted) {
      logger.info('[TwilioVoice] ✅ RECORD_AUDIO permission already granted', {
        debugId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('[TwilioVoice] 🔔 Requesting RECORD_AUDIO permission', {
      debugId,
      timestamp: new Date().toISOString(),
    });

    const requestStartTime = Date.now();
    const result = await PermissionsAndroid.request(permission, {
      title: 'Microphone permission',
      message: 'Talkee needs microphone access to start a call.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    const requestElapsed = Date.now() - requestStartTime;
    const totalElapsed = Date.now() - permissionStartTime;

    logger.info('[TwilioVoice] 📊 RECORD_AUDIO permission result', {
      debugId,
      result,
      isGranted: result === PermissionsAndroid.RESULTS.GRANTED,
      requestElapsed: `${requestElapsed}ms`,
      totalElapsed: `${totalElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      logger.error(
        '[TwilioVoice] ❌ Microphone permission not granted',
        undefined,
        {
          debugId,
          result,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('Microphone permission not granted');
    }

    logger.info('[TwilioVoice] ✅ RECORD_AUDIO permission granted', {
      debugId,
      timestamp: new Date().toISOString(),
    });
  }

  async acceptIncomingCall(params?: {
    callId?: string;
    debugId?: string;
    ratePerMinute?: number;
    userBalance?: number;
  }): Promise<Call> {
    const acceptStartTime = Date.now();
    logger.info('[TwilioVoice] 📞 acceptIncomingCall function called', {
      debugId: params?.debugId,
      callId: params?.callId,
      ratePerMinute: params?.ratePerMinute,
      userBalance: params?.userBalance,
      hasVoice: !!this.voice,
      hasCallInvite: !!this.state.callInvite,
      currentStatus: this.state.status,
      timestamp: new Date().toISOString(),
    });

    if (!this.voice) {
      logger.error('[TwilioVoice] ❌ Voice SDK not initialized', undefined, {
        debugId: params?.debugId,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Voice SDK not initialized');
    }

    const callInvite = this.state.callInvite;
    if (!callInvite) {
      logger.error(
        '[TwilioVoice] ❌ No incoming call invite to accept',
        undefined,
        {
          debugId: params?.debugId,
          callId: params?.callId,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('No incoming call invite to accept');
    }

    logger.info('[TwilioVoice] 📞 Accepting incoming call', {
      debugId: params?.debugId,
      callId: params?.callId,
      inviteSid: callInvite.getCallSid?.(),
      timestamp: new Date().toISOString(),
    });

    logger.debug('[TwilioVoice] 🎤 Ensuring microphone permission', {
      debugId: params?.debugId,
      timestamp: new Date().toISOString(),
    });
    await this.ensureMicrophonePermission(params?.debugId);

    logger.debug('[TwilioVoice] 🔧 Calling callInvite.accept()', {
      debugId: params?.debugId,
      callId: params?.callId,
      timestamp: new Date().toISOString(),
    });

    // ✅ Get caller info from CallInvite
    const callInviteAny = callInvite as any;
    const fromField = callInviteAny._from || callInviteAny.from;
    const callerId = fromField?.replace('client:', '');

    // Get caller name for display
    let callerDisplayName = 'Talkee User';
    if (callerId) {
      try {
        const { data: callerUser } = await supabase
          .from('users')
          .select('name')
          .eq('id', callerId)
          .single();

        if (callerUser?.name) {
          callerDisplayName = callerUser.name;
        }
      } catch (error) {
        logger.warn('[TwilioVoice] ⚠️ Could not fetch caller name', {
          callerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.debug('[TwilioVoice] 📱 Accepting call with display name', {
      debugId: params?.debugId,
      callId: params?.callId,
      callerDisplayName,
      timestamp: new Date().toISOString(),
    });

    const acceptCallStartTime = Date.now();
    // ✅ Accept with contact handle for proper display name
    const call = await (callInvite as any).accept({
      contactHandle: callerDisplayName,
    });
    const acceptElapsed = Date.now() - acceptCallStartTime;

    logger.info('[TwilioVoice] ✅ Call invite accepted', {
      debugId: params?.debugId,
      callId: params?.callId,
      acceptElapsed: `${acceptElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ NEW: Store DB call ID for incoming calls
    if (params?.callId) {
      this.currentDbCallId = params.callId;

      try {
        logger.debug('[TwilioVoice] 🔍 Extracting invite SID', {
          debugId: params?.debugId,
          callId: params?.callId,
          timestamp: new Date().toISOString(),
        });

        const inviteSid = callInvite.getCallSid?.();
        if (inviteSid) {
          logger.info('[TwilioVoice] 💾 Saving invite call_sid to database', {
            debugId: params?.debugId,
            callId: params?.callId,
            inviteSid: inviteSid.substring(0, 20) + '...',
            timestamp: new Date().toISOString(),
          });

          const sidSaveStartTime = Date.now();
          await supabase
            .from('calls')
            .update({ call_sid: inviteSid })
            .eq('id', params.callId);
          const sidSaveElapsed = Date.now() - sidSaveStartTime;

          logger.info('[TwilioVoice] ✅ Invite call_sid saved', {
            debugId: params?.debugId,
            callId: params?.callId,
            elapsed: `${sidSaveElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.warn('[TwilioVoice] ⚠️ No invite SID found', {
            debugId: params?.debugId,
            callId: params?.callId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        logger.warn('[TwilioVoice] ⚠️ call_sid persist failed', {
          debugId: params?.debugId,
          callId: params?.callId,
          error: e instanceof Error ? e.message : String(e),
          timestamp: new Date().toISOString(),
        });
      }
    }

    logger.debug('[TwilioVoice] 🔧 Setting active call', {
      debugId: params?.debugId,
      callId: params?.callId,
      timestamp: new Date().toISOString(),
    });

    this.activeCall = call;

    setTimeout(() => {
      this.updateState({ status: 'connecting', call, callInvite: null });
    }, 0);

    logger.debug('[TwilioVoice] 🔧 Setting up call listeners', {
      debugId: params?.debugId,
      callId: params?.callId,
      timestamp: new Date().toISOString(),
    });

    this.setupCallListeners(
      call,
      params?.callId,
      params?.debugId,
      params?.ratePerMinute,
      params?.userBalance
    );

    const totalElapsed = Date.now() - acceptStartTime;
    logger.info('[TwilioVoice] ✅ Incoming call accepted', {
      debugId: params?.debugId,
      callId: params?.callId,
      totalElapsed: `${totalElapsed}ms`,
      timestamp: new Date().toISOString(),
    });
    return call;
  }

  async rejectIncomingCall(params?: {
    callId?: string;
    debugId?: string;
  }): Promise<void> {
    const rejectStartTime = Date.now();
    logger.info('[TwilioVoice] 📞 rejectIncomingCall function called', {
      debugId: params?.debugId,
      callId: params?.callId,
      hasCallInvite: !!this.state.callInvite,
      currentStatus: this.state.status,
      timestamp: new Date().toISOString(),
    });

    const callInvite = this.state.callInvite;
    if (!callInvite) {
      logger.warn('[TwilioVoice] ⚠️ No call invite to reject', {
        debugId: params?.debugId,
        callId: params?.callId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('[TwilioVoice] 📞 Rejecting incoming call', {
      debugId: params?.debugId,
      callId: params?.callId,
      inviteSid: callInvite.getCallSid?.(),
      timestamp: new Date().toISOString(),
    });

    try {
      logger.debug('[TwilioVoice] 🔧 Calling callInvite.reject()', {
        debugId: params?.debugId,
        callId: params?.callId,
        timestamp: new Date().toISOString(),
      });

      const rejectStartTime = Date.now();
      await (callInvite as any).reject?.();
      const rejectElapsed = Date.now() - rejectStartTime;

      logger.info('[TwilioVoice] ✅ Call invite rejected', {
        debugId: params?.debugId,
        callId: params?.callId,
        rejectElapsed: `${rejectElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (rejectError) {
      logger.error(
        '[TwilioVoice] ❌ Error rejecting call invite',
        rejectError,
        {
          debugId: params?.debugId,
          callId: params?.callId,
          errorMessage:
            rejectError instanceof Error
              ? rejectError.message
              : String(rejectError),
          timestamp: new Date().toISOString(),
        }
      );
    } finally {
      logger.debug('[TwilioVoice] 🔄 Resetting state to idle', {
        debugId: params?.debugId,
        callId: params?.callId,
        timestamp: new Date().toISOString(),
      });

      this.updateState({ status: 'idle', callInvite: null, call: null });
    }

    if (params?.callId) {
      logger.info('[TwilioVoice] 📝 Updating call record as MISSED', {
        debugId: params?.debugId,
        callId: params?.callId,
        timestamp: new Date().toISOString(),
      });

      supabase
        .from('calls')
        .update({
          status: DbCallStatus.MISSED,
          end_time: new Date().toISOString(),
        })
        .eq('id', params.callId)
        .then(({ error: updateErr }) => {
          if (updateErr) {
            logger.warn('[TwilioVoice] ⚠️ Failed to update call as MISSED', {
              debugId: params?.debugId,
              callId: params?.callId,
              errorMessage: updateErr.message,
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.info('[TwilioVoice] ✅ Call record updated as MISSED', {
              debugId: params?.debugId,
              callId: params?.callId,
              timestamp: new Date().toISOString(),
            });
          }
        });
    }

    const totalElapsed = Date.now() - rejectStartTime;
    logger.info('[TwilioVoice] ✅ Incoming call rejected', {
      debugId: params?.debugId,
      callId: params?.callId,
      totalElapsed: `${totalElapsed}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  async disconnect(): Promise<void> {
    const disconnectStartTime = Date.now();
    logger.info('[TwilioVoice] 📞 disconnect function called', {
      hasActiveCall: !!this.activeCall,
      currentStatus: this.state.status,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.activeCall) {
        logger.warn('[TwilioVoice] ⚠️ No active call to disconnect', {
          currentStatus: this.state.status,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('[TwilioVoice] 📞 Disconnecting call...', {
        callSid:
          (this.activeCall as any)?.callSid ?? (this.activeCall as any)?.sid,
        currentStatus: this.state.status,
        timestamp: new Date().toISOString(),
      });

      const disconnectCallStartTime = Date.now();
      await this.activeCall.disconnect();
      const disconnectElapsed = Date.now() - disconnectCallStartTime;

      logger.info('[TwilioVoice] ✅ Call disconnected', {
        disconnectElapsed: `${disconnectElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      this.activeCall = null;

      // ✅ Stop duration tracking
      this.stopDurationTracking();

      // ✅ Stop per-minute billing
      this.stopPerMinuteBilling();

      // ✅ Stop BillingService
      if (BillingService.isTracking()) {
        logger.info('[TwilioVoice] 💰 Stopping BillingService', {
          timestamp: new Date().toISOString(),
        });
        BillingService.stopTracking();
      }

      logger.debug('[TwilioVoice] 🔄 Resetting state to idle', {
        timestamp: new Date().toISOString(),
      });

      this.updateState({
        status: 'idle',
        call: null,
        error: null,
        isMuted: false,
        isOnHold: false,
        duration: 0,
      });

      const totalElapsed = Date.now() - disconnectStartTime;
      logger.info('[TwilioVoice] ✅ Call disconnected, state reset to idle', {
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const totalElapsed = Date.now() - disconnectStartTime;
      logger.error('[TwilioVoice] ❌ Disconnect error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      logger.debug('[TwilioVoice] 🔄 Resetting state to idle (error case)', {
        timestamp: new Date().toISOString(),
      });

      this.updateState({
        status: 'idle',
        call: null,
        error: error as Error,
        isMuted: false,
        isOnHold: false,
        duration: 0,
      });

      throw error;
    }
  }

  async toggleMute(): Promise<boolean> {
    const toggleStartTime = Date.now();
    logger.info('[TwilioVoice] 🔇 toggleMute function called', {
      hasActiveCall: !!this.activeCall,
      currentMuteState: this.state.isMuted,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.activeCall) {
        logger.error('[TwilioVoice] ❌ No active call', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('No active call');
      }

      const currentMuteState = this.activeCall.isMuted();
      const newMuteState = !currentMuteState;

      logger.info('[TwilioVoice] 🔇 Toggling mute', {
        currentMuteState,
        newMuteState,
        timestamp: new Date().toISOString(),
      });

      const muteStartTime = Date.now();
      await this.activeCall.mute(newMuteState);
      const muteElapsed = Date.now() - muteStartTime;

      this.updateState({ isMuted: newMuteState });

      const totalElapsed = Date.now() - toggleStartTime;
      logger.info('[TwilioVoice] ✅ Mute toggled', {
        previousMuteState: currentMuteState,
        newMuteState,
        muteElapsed: `${muteElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return newMuteState;
    } catch (error) {
      const totalElapsed = Date.now() - toggleStartTime;
      logger.error('[TwilioVoice] ❌ Toggle mute error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async toggleHold(): Promise<boolean> {
    const toggleStartTime = Date.now();
    logger.info('[TwilioVoice] ⏸️ toggleHold function called', {
      hasActiveCall: !!this.activeCall,
      currentHoldState: this.state.isOnHold,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.activeCall) {
        logger.error('[TwilioVoice] ❌ No active call', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('No active call');
      }

      const currentHoldState = this.activeCall.isOnHold();
      const newHoldState = !currentHoldState;

      logger.info('[TwilioVoice] ⏸️ Toggling hold', {
        currentHoldState,
        newHoldState,
        timestamp: new Date().toISOString(),
      });

      const holdStartTime = Date.now();
      await this.activeCall.hold(newHoldState);
      const holdElapsed = Date.now() - holdStartTime;

      this.updateState({ isOnHold: newHoldState });

      const totalElapsed = Date.now() - toggleStartTime;
      logger.info('[TwilioVoice] ✅ Hold toggled', {
        previousHoldState: currentHoldState,
        newHoldState,
        holdElapsed: `${holdElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return newHoldState;
    } catch (error) {
      const totalElapsed = Date.now() - toggleStartTime;
      logger.error('[TwilioVoice] ❌ Toggle hold error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async sendDigits(digits: string): Promise<void> {
    const sendStartTime = Date.now();
    logger.info('[TwilioVoice] 🔢 sendDigits function called', {
      digits: digits.replace(/\d/g, '*'),
      digitsLength: digits.length,
      hasActiveCall: !!this.activeCall,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.activeCall) {
        logger.error('[TwilioVoice] ❌ No active call', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('No active call');
      }

      logger.debug('[TwilioVoice] 🔢 Sending digits', {
        digitsLength: digits.length,
        timestamp: new Date().toISOString(),
      });

      const sendDigitsStartTime = Date.now();
      await this.activeCall.sendDigits(digits);
      const sendElapsed = Date.now() - sendDigitsStartTime;

      const totalElapsed = Date.now() - sendStartTime;
      logger.info('[TwilioVoice] ✅ Sent digits', {
        digitsLength: digits.length,
        sendElapsed: `${sendElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const totalElapsed = Date.now() - sendStartTime;
      logger.error('[TwilioVoice] ❌ Send digits error', error, {
        digitsLength: digits.length,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // ✅ NEW: Duration tracking (from CallScreen)
  private startDurationTracking(): void {
    logger.info('[TwilioVoice] ⏱️ Starting duration tracking', {
      timestamp: new Date().toISOString(),
    });

    if (this.durationInterval) {
      logger.warn('[TwilioVoice] ⚠️ Duration interval already running', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.durationInterval = setInterval(() => {
      this.updateState({ duration: this.state.duration + 1 });
    }, 1000);

    logger.info('[TwilioVoice] ✅ Duration tracking started', {
      timestamp: new Date().toISOString(),
    });
  }

  private stopDurationTracking(): void {
    logger.info('[TwilioVoice] ⏱️ Stopping duration tracking', {
      timestamp: new Date().toISOString(),
    });

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
      logger.info('[TwilioVoice] ✅ Duration tracking stopped', {
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ✅ NEW: Per-minute billing (from CallScreen)
  private startPerMinuteBilling(ratePerMinute: number): void {
    logger.info('[TwilioVoice] 💰 Starting per-minute billing', {
      ratePerMinute,
      callId: this.currentDbCallId,
      timestamp: new Date().toISOString(),
    });

    if (this.perMinuteInterval) {
      logger.warn('[TwilioVoice] ⚠️ Per-minute interval already running', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.lastChargedMinute = 0;

    // Check every second for minute boundaries
    this.perMinuteInterval = setInterval(async () => {
      const currentMinute = Math.floor(this.state.duration / 60) + 1;
      const isMinuteBoundary =
        this.state.duration > 0 && this.state.duration % 60 === 0;

      if (isMinuteBoundary && currentMinute > this.lastChargedMinute) {
        this.lastChargedMinute = currentMinute;

        logger.info('[TwilioVoice] 💰 Charging for minute', {
          callId: this.currentDbCallId,
          minute_number: currentMinute,
          duration: this.state.duration,
          timestamp: new Date().toISOString(),
        });

        try {
          const { data, error } = await supabase.functions.invoke(
            'charge-call-minute',
            {
              body: {
                call_id: this.currentDbCallId,
                minute_number: currentMinute,
              },
            }
          );

          if (error) {
            logger.error('[TwilioVoice] ❌ Per-minute charge failed', error, {
              callId: this.currentDbCallId,
              minute_number: currentMinute,
              errorMessage: error.message,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          logger.info('[TwilioVoice] ✅ Minute charged successfully', {
            callId: this.currentDbCallId,
            minute_number: currentMinute,
            cost: data?.cost,
            new_balance: data?.new_balance,
            next_minute_affordable: data?.next_minute_affordable,
            timestamp: new Date().toISOString(),
          });

          // Check if next minute is not affordable
          if (!data?.next_minute_affordable) {
            logger.warn('[TwilioVoice] ⚠️ Next minute not affordable', {
              callId: this.currentDbCallId,
              minute_number: currentMinute,
              new_balance: data?.new_balance,
              timestamp: new Date().toISOString(),
            });

            // BillingService will handle the low balance warning
          }
        } catch (err) {
          logger.error('[TwilioVoice] ❌ Per-minute charge error', err, {
            callId: this.currentDbCallId,
            minute_number: currentMinute,
            errorMessage: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, 1000);

    logger.info('[TwilioVoice] ✅ Per-minute billing started', {
      timestamp: new Date().toISOString(),
    });
  }

  private stopPerMinuteBilling(): void {
    logger.info('[TwilioVoice] 💰 Stopping per-minute billing', {
      timestamp: new Date().toISOString(),
    });

    if (this.perMinuteInterval) {
      clearInterval(this.perMinuteInterval);
      this.perMinuteInterval = null;
      this.lastChargedMinute = 0;
      logger.info('[TwilioVoice] ✅ Per-minute billing stopped', {
        timestamp: new Date().toISOString(),
      });
    }
  }

  getActiveCall(): Call | null {
    logger.debug('[TwilioVoice] 🔍 getActiveCall called', {
      hasActiveCall: !!this.activeCall,
      timestamp: new Date().toISOString(),
    });
    return this.activeCall;
  }

  getState(): CallState {
    logger.debug('[TwilioVoice] 🔍 getState called', {
      status: this.state.status,
      hasCall: !!this.state.call,
      hasCallInvite: !!this.state.callInvite,
      isMuted: this.state.isMuted,
      isOnHold: this.state.isOnHold,
      duration: this.state.duration,
      hasError: !!this.state.error,
      timestamp: new Date().toISOString(),
    });
    return this.state;
  }

  subscribe(callback: (state: CallState) => void): () => void {
    const id = Math.random().toString(36);
    logger.info('[TwilioVoice] 📡 subscribe called', {
      listenerId: id,
      currentListenersCount: this.listeners.get('stateChange')?.size || 0,
      timestamp: new Date().toISOString(),
    });

    if (!this.listeners.has('stateChange')) {
      this.listeners.set('stateChange', new Set());
    }
    this.listeners.get('stateChange')!.add(callback);

    logger.debug('[TwilioVoice] ✅ Listener added', {
      listenerId: id,
      totalListeners: this.listeners.get('stateChange')?.size || 0,
      timestamp: new Date().toISOString(),
    });

    return () => {
      logger.info('[TwilioVoice] 🔚 Unsubscribing listener', {
        listenerId: id,
        timestamp: new Date().toISOString(),
      });

      this.listeners.get('stateChange')?.delete(callback);

      logger.debug('[TwilioVoice] ✅ Listener removed', {
        listenerId: id,
        remainingListeners: this.listeners.get('stateChange')?.size || 0,
        timestamp: new Date().toISOString(),
      });
    };
  }

  private setupVoiceListeners(): void {
    logger.info('[TwilioVoice] 🔧 Setting up voice listeners', {
      hasVoice: !!this.voice,
      timestamp: new Date().toISOString(),
    });

    if (!this.voice) {
      logger.warn(
        '[TwilioVoice] ⚠️ No voice instance, skipping listener setup',
        {
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    logger.debug('[TwilioVoice] 📡 Registering CallInvite listener', {
      timestamp: new Date().toISOString(),
    });

    this.voice.on(Voice.Event.CallInvite, (callInvite: CallInvite) => {
      const inviteSid = callInvite.getCallSid?.();
      logger.info('[TwilioVoice] 📞 Incoming call invite received', {
        callSid: inviteSid,
        inviteSidPrefix: inviteSid ? inviteSid.substring(0, 20) + '...' : null,
        timestamp: new Date().toISOString(),
      });

      logger.debug('[TwilioVoice] 🔄 Updating state to ringing', {
        callSid: inviteSid,
        timestamp: new Date().toISOString(),
      });

      // ✅ IMPORTANT: Don't show Twilio native invitation UI
      // IncomingCallHandler will show custom modal
      this.updateState({ status: 'ringing', callInvite });

      try {
        logger.debug('[TwilioVoice] 🔧 Setting up CallInvite event listeners', {
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });

        const inviteAny = callInvite as any;
        const clearInvite = (reason: string) => {
          logger.info('[TwilioVoice] 📞 Incoming call ended', {
            reason,
            callSid: inviteSid,
            timestamp: new Date().toISOString(),
          });
          this.updateState({ status: 'idle', callInvite: null });
        };
        const typedEvents = (CallInvite as any)?.Event ?? {};
        const candidates = [
          typedEvents.Cancelled,
          typedEvents.Canceled,
          typedEvents.Rejected,
          typedEvents.Failed,
          'cancelled',
          'canceled',
          'rejected',
          'failed',
          'cancel',
        ].filter(Boolean);

        logger.debug('[TwilioVoice] 📋 Binding CallInvite event candidates', {
          candidatesCount: candidates.length,
          candidates,
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });

        for (const ev of candidates) {
          inviteAny?.on?.(ev, (err: any) => clearInvite(String(ev)));
        }

        logger.debug('[TwilioVoice] ✅ CallInvite event listeners bound', {
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        logger.warn('[TwilioVoice] ⚠️ Failed binding CallInvite listeners', {
          error: e instanceof Error ? e.message : String(e),
          callSid: inviteSid,
          timestamp: new Date().toISOString(),
        });
      }
    });

    logger.debug('[TwilioVoice] 📡 Registering Registered listener', {
      timestamp: new Date().toISOString(),
    });

    this.voice.on(Voice.Event.Registered, () => {
      logger.info('[TwilioVoice] ✅ Device registered', {
        timestamp: new Date().toISOString(),
      });
    });

    logger.debug('[TwilioVoice] 📡 Registering Unregistered listener', {
      timestamp: new Date().toISOString(),
    });

    this.voice.on(Voice.Event.Unregistered, () => {
      logger.info('[TwilioVoice] ✅ Device unregistered', {
        timestamp: new Date().toISOString(),
      });
    });

    logger.debug('[TwilioVoice] 📡 Registering Error listener', {
      timestamp: new Date().toISOString(),
    });

    this.voice.on(Voice.Event.Error, (error: any) => {
      logger.error('[TwilioVoice] ❌ SDK Error', error, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      this.updateState({ error });
    });

    logger.info('[TwilioVoice] ✅ Voice listeners set up successfully', {
      timestamp: new Date().toISOString(),
    });
  }

  private setupCallListeners(
    call: Call,
    callId?: string,
    debugId?: string,
    ratePerMinute?: number,
    userBalance?: number
  ): void {
    logger.info('[TwilioVoice] 🔧 Setting up call listeners', {
      debugId,
      callId,
      ratePerMinute,
      userBalance,
      hasCall: !!call,
      timestamp: new Date().toISOString(),
    });

    logger.debug('[TwilioVoice] 📡 Registering Connected listener', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    call.on(Call.Event.Connected, () => {
      logger.info('[TwilioVoice] ✅ Call connected', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });

      this.updateState({ status: 'connected' });

      if (callId) {
        logger.debug('[TwilioVoice] 📝 Updating call record on connect', {
          debugId,
          callId,
          timestamp: new Date().toISOString(),
        });
        void this.updateCallOnConnect(callId, debugId);
      }

      // ✅ NEW: Start duration tracking
      this.startDurationTracking();

      // ✅ NEW: Start per-minute billing (if rate provided)
      if (ratePerMinute && ratePerMinute > 0) {
        this.startPerMinuteBilling(ratePerMinute);
      }

      // ✅ NEW: Start BillingService for notifications
      if (ratePerMinute && userBalance !== undefined) {
        logger.info('[TwilioVoice] 💰 Starting BillingService', {
          debugId,
          callId,
          ratePerMinute,
          userBalance,
          timestamp: new Date().toISOString(),
        });

        BillingService.startTracking(call, ratePerMinute, userBalance);
      } else {
        logger.warn(
          '[TwilioVoice] ⚠️ BillingService not started - missing rate or balance',
          {
            debugId,
            callId,
            hasRate: !!ratePerMinute,
            hasBalance: userBalance !== undefined,
            timestamp: new Date().toISOString(),
          }
        );
      }
    });

    logger.debug('[TwilioVoice] 📡 Registering Reconnecting listener', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    call.on(Call.Event.Reconnecting, () => {
      logger.info('[TwilioVoice] 🔄 Call reconnecting', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });
      this.updateState({ status: 'reconnecting' });
    });

    logger.debug('[TwilioVoice] 📡 Registering Reconnected listener', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    call.on(Call.Event.Reconnected, () => {
      logger.info('[TwilioVoice] ✅ Call reconnected', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });
      this.updateState({ status: 'connected' });
    });

    logger.debug('[TwilioVoice] 📡 Registering Ringing listener', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    call.on(Call.Event.Ringing, () => {
      logger.info('[TwilioVoice] 📞 Call ringing', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });
      this.updateState({ status: 'ringing' });
    });

    logger.debug('[TwilioVoice] 📡 Registering Disconnected listener', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    call.on(Call.Event.Disconnected, (error?: any) => {
      const previousStatus = this.state.status;
      const wasConnected = previousStatus === 'connected';
      logger.info('[TwilioVoice] 📞 Call disconnected event', {
        debugId,
        callId,
        error: error
          ? error instanceof Error
            ? error.message
            : String(error)
          : null,
        wasConnected,
        previousStatus,
        timestamp: new Date().toISOString(),
      });

      this.activeCall = null;

      // ✅ Stop duration tracking
      this.stopDurationTracking();

      // ✅ Stop per-minute billing
      this.stopPerMinuteBilling();

      // ✅ Stop BillingService
      if (BillingService.isTracking()) {
        logger.info('[TwilioVoice] 💰 Stopping BillingService', {
          debugId,
          callId,
          timestamp: new Date().toISOString(),
        });
        BillingService.stopTracking();
      }

      logger.debug('[TwilioVoice] 🔄 Resetting state to idle', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });

      this.updateState({
        status: 'idle',
        call: null,
        error: error || null,
        isMuted: false,
        isOnHold: false,
        duration: 0,
      });

      logger.info(
        '[TwilioVoice] ✅ Call disconnected event handled, state reset to idle',
        {
          debugId,
          callId,
          timestamp: new Date().toISOString(),
        }
      );

      if (callId) {
        logger.debug('[TwilioVoice] 📝 Updating call record on disconnect', {
          debugId,
          callId,
          wasConnected,
          timestamp: new Date().toISOString(),
        });
        void this.updateCallOnDisconnect(callId, debugId, wasConnected);
      }

      // Clear DB call ID
      this.currentDbCallId = null;
    });

    logger.debug(
      '[TwilioVoice] 📡 Registering QualityWarningsChanged listener',
      {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      }
    );

    call.on(Call.Event.QualityWarningsChanged, (warnings: any) => {
      logger.warn('[TwilioVoice] ⚠️ Quality warnings', {
        debugId,
        callId,
        warnings,
        timestamp: new Date().toISOString(),
      });
    });

    logger.info('[TwilioVoice] ✅ Call listeners set up successfully', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });
  }

  private async updateCallOnConnect(
    callId: string,
    debugId?: string
  ): Promise<void> {
    const updateStartTime = Date.now();
    logger.info('[TwilioVoice] 📝 updateCallOnConnect called', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    const startedAt = new Date().toISOString();
    logger.debug('[TwilioVoice] 💾 Updating call start_time', {
      debugId,
      callId,
      startedAt,
      timestamp: new Date().toISOString(),
    });

    const startRes = await supabase
      .from('calls')
      .update({ start_time: startedAt })
      .eq('id', callId);

    if (startRes.error) {
      logger.error(
        '[TwilioVoice] ❌ Failed updating call start_time',
        startRes.error,
        {
          debugId,
          callId,
          errorMessage: startRes.error.message,
          errorCode: startRes.error.code,
          timestamp: new Date().toISOString(),
        }
      );
    } else {
      logger.info('[TwilioVoice] ✅ Call start_time updated', {
        debugId,
        callId,
        startedAt,
        timestamp: new Date().toISOString(),
      });
    }

    const candidates: string[] = ['active', 'in-progress', 'in_progress'];
    logger.debug('[TwilioVoice] 🔄 Trying status candidates', {
      debugId,
      callId,
      candidates,
      timestamp: new Date().toISOString(),
    });

    for (const status of candidates) {
      logger.debug('[TwilioVoice] 🔄 Trying status', {
        debugId,
        callId,
        status,
        timestamp: new Date().toISOString(),
      });

      const res = await supabase
        .from('calls')
        .update({ status })
        .eq('id', callId);

      if (!res.error) {
        const totalElapsed = Date.now() - updateStartTime;
        logger.info('[TwilioVoice] ✅ Call record updated (connected)', {
          debugId,
          callId,
          status,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        return;
      } else {
        logger.debug('[TwilioVoice] ⚠️ Status update failed, trying next', {
          debugId,
          callId,
          status,
          errorMessage: res.error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const totalElapsed = Date.now() - updateStartTime;
    logger.warn(
      '[TwilioVoice] ⚠️ Failed to update call status (all candidates failed)',
      {
        debugId,
        callId,
        candidates,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      }
    );
  }

  private async updateCallOnDisconnect(
    callId: string,
    debugId?: string,
    wasConnected?: boolean
  ): Promise<void> {
    const updateStartTime = Date.now();
    logger.info('[TwilioVoice] 📝 updateCallOnDisconnect called', {
      debugId,
      callId,
      wasConnected,
      timestamp: new Date().toISOString(),
    });

    const endedAt = new Date().toISOString();
    let startTime: string | null = null;
    let querySucceeded = false;

    logger.debug('[TwilioVoice] 🔍 Loading call record to check start_time', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });

    try {
      const loadStartTime = Date.now();
      const { data: row, error: loadErr } = await supabase
        .from('calls')
        .select('start_time, status')
        .eq('id', callId)
        .maybeSingle();
      const loadElapsed = Date.now() - loadStartTime;

      if (loadErr) {
        logger.warn('[TwilioVoice] ⚠️ Failed to load call record', {
          debugId,
          callId,
          errorMessage: loadErr.message,
          errorCode: loadErr.code,
          elapsed: `${loadElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        if (wasConnected === true) {
          startTime = 'connected';
          querySucceeded = false;
          logger.debug(
            '[TwilioVoice] ℹ️ Assuming connected (wasConnected=true)',
            {
              debugId,
              callId,
              timestamp: new Date().toISOString(),
            }
          );
        }
      } else {
        startTime = (row as any)?.start_time ?? null;
        querySucceeded = true;
        logger.debug('[TwilioVoice] ✅ Call record loaded', {
          debugId,
          callId,
          startTime,
          status: (row as any)?.status,
          elapsed: `${loadElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      logger.error('[TwilioVoice] ❌ Exception loading call record', e, {
        debugId,
        callId,
        errorMessage: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      });

      if (wasConnected === true) {
        startTime = 'connected';
        querySucceeded = false;
        logger.debug(
          '[TwilioVoice] ℹ️ Assuming connected (wasConnected=true, exception)',
          {
            debugId,
            callId,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    const neverConnected = !startTime;
    logger.debug('[TwilioVoice] 🔍 Determining call status', {
      debugId,
      callId,
      startTime,
      neverConnected,
      wasConnected,
      querySucceeded,
      timestamp: new Date().toISOString(),
    });

    if (neverConnected) {
      logger.info('[TwilioVoice] 🗑️ Call cancelled (never connected)', {
        debugId,
        callId,
        endedAt,
        timestamp: new Date().toISOString(),
      });

      const cancelStartTime = Date.now();
      await supabase
        .from('calls')
        .update({ status: DbCallStatus.CANCELLED, end_time: endedAt })
        .eq('id', callId);
      const cancelElapsed = Date.now() - cancelStartTime;
      const totalElapsed = Date.now() - updateStartTime;

      logger.info('[TwilioVoice] ✅ Call record updated as CANCELLED', {
        debugId,
        callId,
        cancelElapsed: `${cancelElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('[TwilioVoice] ✅ Call completed', {
      debugId,
      callId,
      endedAt,
      startTime,
      timestamp: new Date().toISOString(),
    });

    const completeStartTime = Date.now();
    await supabase
      .from('calls')
      .update({ status: DbCallStatus.COMPLETED, end_time: endedAt })
      .eq('id', callId);
    const completeElapsed = Date.now() - completeStartTime;
    const totalElapsed = Date.now() - updateStartTime;

    logger.info('[TwilioVoice] ✅ Call record updated as COMPLETED', {
      debugId,
      callId,
      completeElapsed: `${completeElapsed}ms`,
      totalElapsed: `${totalElapsed}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  private updateState(updates: Partial<CallState>): void {
    const updateStartTime = Date.now();
    const previousStatus = this.state.status;
    const previousState = { ...this.state };

    logger.debug('[TwilioVoice] 🔄 updateState called', {
      previousStatus,
      updates: Object.keys(updates),
      updateDetails: updates,
      timestamp: new Date().toISOString(),
    });

    this.state = { ...this.state, ...updates };
    const newStatus = this.state.status;

    logger.info('[TwilioVoice] ✅ State updated', {
      previousStatus,
      newStatus,
      statusChanged: previousStatus !== newStatus,
      updates: Object.keys(updates),
      stateChanges: {
        status:
          previousStatus !== newStatus
            ? { from: previousStatus, to: newStatus }
            : undefined,
        call:
          previousState.call !== this.state.call
            ? { from: !!previousState.call, to: !!this.state.call }
            : undefined,
        callInvite:
          previousState.callInvite !== this.state.callInvite
            ? { from: !!previousState.callInvite, to: !!this.state.callInvite }
            : undefined,
        isMuted:
          previousState.isMuted !== this.state.isMuted
            ? { from: previousState.isMuted, to: this.state.isMuted }
            : undefined,
        isOnHold:
          previousState.isOnHold !== this.state.isOnHold
            ? { from: previousState.isOnHold, to: this.state.isOnHold }
            : undefined,
        duration:
          previousState.duration !== this.state.duration
            ? { from: previousState.duration, to: this.state.duration }
            : undefined,
        error:
          previousState.error !== this.state.error
            ? { from: !!previousState.error, to: !!this.state.error }
            : undefined,
      },
      timestamp: new Date().toISOString(),
    });

    const state = this.state;
    const listeners = Array.from(this.listeners.get('stateChange') || []);

    logger.debug('[TwilioVoice] 📡 Preparing to notify listeners', {
      listenerCount: listeners.length,
      timestamp: new Date().toISOString(),
    });

    if (listeners.length > 0) {
      logger.info('[TwilioVoice] 📤 Notifying listeners', {
        listenerCount: listeners.length,
        timestamp: new Date().toISOString(),
      });

      listeners.forEach((callback, index) => {
        try {
          logger.debug('[TwilioVoice] 📞 Calling listener', {
            index: index + 1,
            total: listeners.length,
            timestamp: new Date().toISOString(),
          });

          const callbackStartTime = Date.now();
          callback(state);
          const callbackElapsed = Date.now() - callbackStartTime;

          logger.debug('[TwilioVoice] ✅ Listener callback completed', {
            index: index + 1,
            total: listeners.length,
            elapsed: `${callbackElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error(
            '[TwilioVoice] ❌ Error in state change callback',
            error,
            {
              index: index + 1,
              total: listeners.length,
              errorMessage:
                error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString(),
            }
          );
        }
      });

      const totalElapsed = Date.now() - updateStartTime;
      logger.debug('[TwilioVoice] ✅ All listeners notified', {
        listenerCount: listeners.length,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.debug('[TwilioVoice] ℹ️ No listeners to notify', {
        timestamp: new Date().toISOString(),
      });
    }
  }

  async cleanup(): Promise<void> {
    const cleanupStartTime = Date.now();
    logger.info('[TwilioVoice] 🧹 Cleaning up Twilio Voice service...', {
      hasActiveCall: !!this.activeCall,
      hasVoice: !!this.voice,
      hasAccessToken: !!this.accessToken,
      listenersCount: this.listeners.get('stateChange')?.size || 0,
      timestamp: new Date().toISOString(),
    });

    try {
      if (this.activeCall) {
        logger.info('[TwilioVoice] 📞 Disconnecting active call', {
          timestamp: new Date().toISOString(),
        });
        const disconnectStartTime = Date.now();
        await this.disconnect();
        const disconnectElapsed = Date.now() - disconnectStartTime;
        logger.info('[TwilioVoice] ✅ Active call disconnected', {
          elapsed: `${disconnectElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Stop tracking
      this.stopDurationTracking();
      this.stopPerMinuteBilling();

      // ✅ Stop AppState listener
      if (this.appStateSubscription) {
        logger.info('[TwilioVoice] 🔇 Removing AppState listener', {
          timestamp: new Date().toISOString(),
        });
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      if (this.voice) {
        logger.info('[TwilioVoice] 📱 Unregistering device', {
          timestamp: new Date().toISOString(),
        });
        const unregisterStartTime = Date.now();
        await this.unregister();
        const unregisterElapsed = Date.now() - unregisterStartTime;
        logger.info('[TwilioVoice] ✅ Device unregistered', {
          elapsed: `${unregisterElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        logger.debug('[TwilioVoice] 🔧 Clearing voice instance', {
          timestamp: new Date().toISOString(),
        });
        this.voice = null;
      }

      logger.debug('[TwilioVoice] 🗑️ Clearing listeners', {
        listenersCount: this.listeners.get('stateChange')?.size || 0,
        timestamp: new Date().toISOString(),
      });
      this.listeners.clear();

      logger.debug('[TwilioVoice] 🔑 Clearing access token', {
        timestamp: new Date().toISOString(),
      });
      this.accessToken = null;
      this.currentDbCallId = null;

      const totalElapsed = Date.now() - cleanupStartTime;
      logger.info('[TwilioVoice] ✅ Cleanup complete', {
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const totalElapsed = Date.now() - cleanupStartTime;
      logger.error('[TwilioVoice] ❌ Cleanup error', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const twilioVoiceService = new TwilioVoiceService();
