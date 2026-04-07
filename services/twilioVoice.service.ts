import { Voice, Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { AppState, Platform } from 'react-native';
import { usersService } from '@/services/supabase/user.service';
import BillingService from '@/services/billingService';
import { DurationTracker, PerMinuteBilling } from './twilioVoice/billing';
import { CallRepository } from './twilioVoice/database';
import { OutgoingCallHandler, IncomingCallHandler } from './twilioVoice/call';
import { VoiceEventListener, CallEventListener } from './twilioVoice/events';
import { CallStateManager } from './twilioVoice/state';
import {
  CallState,
  CallStatus,
  DurationUpdateCallback,
  DurationGetter,
  LowBalanceCallback,
  StateUpdateCallback,
  CallEventListenerDependencies,
  VoiceEventListenerDependencies,
} from './twilioVoice/types';
import { OUTGOING_CALL_TIMEOUT_MS } from './twilioVoice/constants';
import { PermissionManager } from './twilioVoice/utils';

class TwilioVoiceService {
  private voice: Voice | null = null;
  private activeCall: Call | null = null;
  private accessToken: string | null = null;
  private stateManager: CallStateManager;
  private durationTracker: DurationTracker | null = null;
  private perMinuteBilling: PerMinuteBilling | null = null;
  private currentDbCallId: string | null = null;
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private outgoingCallTimeout: ReturnType<typeof setTimeout> | null = null;
  private voiceEventListener: VoiceEventListener | null = null;
  private callEventListeners: Map<Call, CallEventListener> = new Map();
  private callInviteEventListeners: Map<
    CallInvite,
    Map<string, (err?: unknown) => void>
  > = new Map();
  private voiceListenersSetup: boolean = false;
  private isMakingCall: boolean = false;
  private isAcceptingCall: boolean = false;
  private lastDisconnectWasConnected: boolean = false;
  private isPushRegistryInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.stateManager = new CallStateManager();
  }

  async initialize(): Promise<void> {
    if (this.voice) {
      logger.debug('[TwilioVoice] ℹ️ SDK already initialized, skipping');
      return;
    }

    if (this.isInitializing && this.initializationPromise) {
      logger.info('[TwilioVoice] ⏳ Initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = (async () => {
      const initStartTime = Date.now();
      logger.info('[TwilioVoice] 🎬 Initializing Twilio Voice SDK (delayed)...', {
        hasVoice: !!this.voice,
        timestamp: new Date().toISOString(),
      });

      try {
      // ✅ FIX: Wait for React Native context to be fully ready before loading native module
      // This prevents the NullPointerException: jsEventEmitter on null object
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ Dynamic require to avoid early native module instantiation
      const { Voice } = require('@twilio/voice-react-native-sdk');
      const { NativeModules } = require('react-native');

      logger.debug('[TwilioVoice] 🔧 Checking NativeModules availability', {
        availableModules: Object.keys(NativeModules).filter(m => m.toLowerCase().includes('twilio') || m.toLowerCase().includes('voice')),
        timestamp: new Date().toISOString(),
      });

      // ✅ FIX: Explicitly wait for TwilioVoiceReactNative module to appear if it's missing
      let moduleCheckRetries = 0;
      while (!NativeModules.TwilioVoiceReactNative && moduleCheckRetries < 10) {
        logger.warn(`[TwilioVoice] ⏳ Twilio native module not found, retrying... (${moduleCheckRetries + 1}/10)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        moduleCheckRetries++;
      }

      if (!NativeModules.TwilioVoiceReactNative) {
        logger.error('[TwilioVoice] ❌ Twilio native module (TwilioVoiceReactNative) is missing after retries. Autolinking might be broken or build is incomplete.');
        this.voice = null;
        return;
      } else {
        logger.info('[TwilioVoice] ✅ Twilio native module found');
      }

      logger.debug('[TwilioVoice] 🔧 Creating Voice instance', {
        timestamp: new Date().toISOString(),
      });

      const voiceCreateStartTime = Date.now();
      
      // ✅ FIX: Safely require and instantiate Voice SDK
      try {
        const TwilioSDK = require('@twilio/voice-react-native-sdk');
        if (TwilioSDK && TwilioSDK.Voice) {
          this.voice = new TwilioSDK.Voice();
          logger.info('[TwilioVoice] ✅ Voice instance created', {
            elapsed: `${Date.now() - voiceCreateStartTime}ms`,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.warn('[TwilioVoice] ⚠️ Twilio SDK Voice class not found');
          this.voice = null;
        }
      } catch (sdkError) {
        logger.error('[TwilioVoice] ❌ Failed to instantiate Twilio Voice SDK', sdkError);
        this.voice = null;
      }
      
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

      this.setupAppStateListener();

      // ✅ GÖREV 2: Initialize PushKit registry for iOS
      if (Platform.OS === 'ios') {
        await this.initializePushRegistry();
      }

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
    } finally {
      this.isInitializing = false;
    }
  })();
  
  return this.initializationPromise;
}

  private setupAppStateListener(): void {
    logger.info('[TwilioVoice] 🔧 Setting up AppState listener', {
      timestamp: new Date().toISOString(),
    });

    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        logger.debug('[TwilioVoice] 📱 AppState changed', {
          nextState,
          currentStatus: this.stateManager.getState().status,
          timestamp: new Date().toISOString(),
        });

        if (nextState === 'background') {
          const currentState = this.stateManager.getState();
          const isOutgoingConnecting = currentState.status === 'connecting';

          logger.info('[TwilioVoice] 📱 App moved to background', {
            status: currentState.status,
            isOutgoingConnecting,
            timestamp: new Date().toISOString(),
          });

          if (isOutgoingConnecting) {
            logger.warn(
              '[TwilioVoice] ⚠️ Ending outgoing call - app moved to background during connection',
              {
                status: currentState.status,
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

  // ✅ PATCH C: Readiness check
  isReadyForCalls(): boolean {
    const isReady = this.isSdkInitialized() && this.isRegistered;
    if (!isReady) {
      logger.warn('[TwilioVoice] ⚠️ SDK is not fully ready for calls', {
        isSdkInitialized: this.isSdkInitialized(),
        isRegistered: this.isRegistered,
        timestamp: new Date().toISOString()
      });
    }
    return isReady;
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
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      });

      // ✅ GÖREV 3: Platform ve Environment bilgisi ekleniyor
      const BUILD_ENV = __DEV__ ? 'development' : 'production';
      const { data, error } = await supabase.functions.invoke('twilio-token', {
        headers: {
          'x-platform': Platform.OS,
          'x-build-environment': BUILD_ENV,
        },
      });
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

      logger.info('[TwilioVoice] 📥 Token function response received', {
        hasData: !!data,
        hasToken: !!data?.token,
        hasIdentity: !!data?.identity,
        hasExpiresAt: !!data?.expiresAt,
        identity: data?.identity,
        elapsed: `${invokeElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      
      // ✅ DEBUG: Decode and log token claims to verify push_credential_sid
      if (data?.token) {
        try {
          const tokenParts = data.token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const hasPushCredential = !!payload?.grants?.voice?.push_credential_sid;
            logger.info('[TwilioVoice] 🔑 Token claims decoded', {
              hasGrants: !!payload?.grants,
              hasVoiceGrant: !!payload?.grants?.voice,
              hasIncomingAllow: payload?.grants?.voice?.incoming?.allow,
              hasPushCredentialSid: hasPushCredential,
              pushCredentialSidPrefix: payload?.grants?.voice?.push_credential_sid?.substring(0, 10) || 'MISSING',
              timestamp: new Date().toISOString(),
            });
            
            if (!hasPushCredential) {
              logger.error('[TwilioVoice] ❌ TOKEN MISSING push_credential_sid - Incoming calls will NOT work!', undefined, {
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (decodeError) {
          logger.warn('[TwilioVoice] ⚠️ Could not decode token for debugging', {
            error: decodeError instanceof Error ? decodeError.message : String(decodeError),
            timestamp: new Date().toISOString(),
          });
        }
      }

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
    if (this.isRegistered) {
      logger.info('[TwilioVoice] ℹ️ Already registered, skipping', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

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
        const { NativeModules } = require('react-native');
        
        // ✅ FIX: Strict check for native module before calling SDK methods
        if (!NativeModules.TwilioVoiceReactNative) {
          logger.error('[TwilioVoice] ❌ Cannot register: Native module TwilioVoiceReactNative is null');
          return;
        }

        // ✅ FIX: Enhanced safety check with retries for internal native binding
        // Sometimes this.voice is not null, but its internal native methods are not yet bound
        let registerRetryCount = 0;
        const maxRegisterRetries = 3;
        
        while (registerRetryCount < maxRegisterRetries) {
          try {
            if (this.voice && typeof (this.voice as any).register === 'function') {
              // Try a dummy call or check internal state if possible
              // For now, we'll proceed to the actual register call which we'll wrap in try-catch
              break; 
            }
          } catch (e) {
            logger.warn(`[TwilioVoice] ⏳ Native methods not ready, retrying registration binding... (${registerRetryCount + 1}/${maxRegisterRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            registerRetryCount++;
          }
        }

        // ✅ FIX: Ensure microphone permission before registering (Android)
        try {
          await PermissionManager.ensureMicrophonePermission('register');
        } catch (permissionError) {
          logger.warn(
            '[TwilioVoice] ⚠️ Microphone permission not granted, but continuing with register',
            {
              errorMessage:
                permissionError instanceof Error
                  ? permissionError.message
                  : String(permissionError),
              timestamp: new Date().toISOString(),
            }
          );
          // Don't throw - let register attempt proceed, it will handle the error
        }

        const tokenStartTime = Date.now();
        const token = await this.getAccessToken();
        const tokenElapsed = Date.now() - tokenStartTime;

        logger.info('[TwilioVoice] 🔧 Registering device with Twilio...', {
          tokenLength: token.length,
          tokenElapsed: `${tokenElapsed}ms`,
          timestamp: new Date().toISOString(),
        });

        // ✅ FIX: Verify native module one last time before calling SDK register
        const { NativeModules: FinalCheckModules } = require('react-native');
        if (!FinalCheckModules.TwilioVoiceReactNative) {
          logger.error('[TwilioVoice] ❌ Cannot register: TwilioVoiceReactNative native module disappeared or is null');
          this.isRegistering = false;
          return;
        }

        const registerCallStartTime = Date.now();
        if (this.voice && typeof this.voice.register === 'function') {
          await this.voice.register(token);
          
          try {
            const deviceToken = await this.voice.getDeviceToken();
            logger.info('[TwilioVoice] 📱 Push Device Token (FCM/APNS)', {
              deviceTokenPrefix: deviceToken ? deviceToken.substring(0, 15) + '...' : 'null',
              deviceTokenLength: deviceToken?.length,
              timestamp: new Date().toISOString(),
            });
          } catch (tokenError) {
            logger.warn('[TwilioVoice] ⚠️ Could not fetch device token', {
              error: tokenError instanceof Error ? tokenError.message : String(tokenError),
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          throw new Error('this.voice or register method is unexpectedly null');
        }
        const registerElapsed = Date.now() - registerCallStartTime;
        const totalElapsed = Date.now() - registerStartTime;

        this.isRegistered = true;

        logger.info('[TwilioVoice] ✅ Device registered successfully', {
          registerElapsed: `${registerElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const totalElapsed = Date.now() - registerStartTime;

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        
        // ✅ FIX: Handle PermissionDeniedError (31401) gracefully
        if (
          errorMessage.includes('31401') ||
          errorMessage.includes('PermissionDeniedError') ||
          errorMessage.includes('Missing permissions')
        ) {
          logger.error(
            '[TwilioVoice] ❌ Registration failed - Missing permissions (31401)',
            error,
            {
              elapsed: `${totalElapsed}ms`,
              errorMessage,
              note: 'Device cannot receive incoming calls without microphone permission',
              timestamp: new Date().toISOString(),
            }
          );
          // Don't mark as registered - user needs to grant permission
          this.isRegistered = false;
          // Don't throw - allow app to continue, but incoming calls won't work
          return;
        }

        if (
          errorMessage.includes('31409') ||
          errorMessage.includes('Conflict')
        ) {
          logger.warn('[TwilioVoice] ⚠️ Already registered (31409 Conflict)', {
            elapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
          this.isRegistered = true;
          return;
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

      this.isRegistered = false;

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

  private isVoiceAvailable(): boolean {
    return !!this.voice && typeof (this.voice as any).register === 'function';
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
    if (!this.isVoiceAvailable()) {
      logger.error('[TwilioVoice] ❌ Cannot make call: Voice SDK is not available');
      throw new Error('Voice SDK is not available');
    }

    if (this.isMakingCall) {
      logger.warn('[TwilioVoice] ⚠️ makeCall already in progress, rejecting', {
        debugId: params.debugId,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Call already in progress');
    }

    if (this.isAcceptingCall) {
      logger.warn(
        '[TwilioVoice] ⚠️ Cannot make call while accepting incoming call',
        {
          debugId: params.debugId,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('Cannot make call while accepting incoming call');
    }

    this.isMakingCall = true;

    try {
      const handler = this.getOutgoingCallHandler();
      const call = await handler.makeCall({
        ...params,
        voice: this.voice!,
        accessToken: this.accessToken,
        getAccessToken: async (): Promise<string> => {
          return await this.getAccessToken();
        },
        setupCallListeners: (
          call: Call,
          callId: string,
          debugId?: string,
          ratePerMinute?: number,
          userBalance?: number
        ) => {
          this.activeCall = call;
          this.currentDbCallId = callId;
          this.setupCallListeners(
            call,
            callId,
            debugId,
            ratePerMinute,
            userBalance
          );
        },
        updateState: (updates: Partial<CallState>) =>
          this.stateManager.updateState(updates),
        getCallRepository: (debugId?: string) =>
          this.getCallRepository(debugId),
      });

      this.isMakingCall = false;
      return call;
    } catch (error) {
      this.isMakingCall = false;
      this.updateState({
        status: 'idle',
        call: null,
        error: error as Error,
      });
      throw error;
    }
  }

  async acceptIncomingCall(params?: {
    callId?: string;
    debugId?: string;
    ratePerMinute?: number;
    userBalance?: number;
  }): Promise<Call> {
    if (!this.isVoiceAvailable()) {
      logger.error('[TwilioVoice] ❌ Cannot accept call: Voice SDK is not available');
      throw new Error('Voice SDK is not available');
    }

    if (this.isAcceptingCall) {
      logger.warn(
        '[TwilioVoice] ⚠️ acceptIncomingCall already in progress, rejecting',
        {
          debugId: params?.debugId,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('Call acceptance already in progress');
    }

    if (this.isMakingCall) {
      logger.warn(
        '[TwilioVoice] ⚠️ Cannot accept call while making outgoing call',
        {
          debugId: params?.debugId,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('Cannot accept call while making outgoing call');
    }

    this.isAcceptingCall = true;
    logger.info('[TwilioVoice] 📞 acceptIncomingCall function called', {
      debugId: params?.debugId,
      callId: params?.callId,
      ratePerMinute: params?.ratePerMinute,
      userBalance: params?.userBalance,
      hasVoice: !!this.voice,
      hasCallInvite: !!this.stateManager.getState().callInvite,
      currentStatus: this.stateManager.getState().status,
      timestamp: new Date().toISOString(),
    });

    const currentUser = await usersService.getCurrentUser();
    if (!currentUser) {
      this.isAcceptingCall = false;
      logger.error(
        '[TwilioVoice] ❌ Cannot accept call - user not authenticated',
        undefined,
        {
          debugId: params?.debugId,
          callId: params?.callId,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('User not authenticated');
    }

    if (!this.voice) {
      this.isAcceptingCall = false;
      logger.error('[TwilioVoice] ❌ Voice SDK not initialized', undefined, {
        debugId: params?.debugId,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Voice SDK not initialized');
    }

    const callInvite = this.stateManager.getState().callInvite;
    if (!callInvite) {
      this.isAcceptingCall = false;
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

    const handler = this.getIncomingCallHandler();
    const call = await handler.acceptIncomingCall({
      ...params,
      callInvite,
      setupCallListeners: (
        call: Call,
        callId: string | undefined,
        debugId?: string,
        ratePerMinute?: number,
        userBalance?: number
      ) => {
        this.activeCall = call;
        if (callId) {
          this.currentDbCallId = callId;
        }
        setTimeout(() => {
          this.updateState({ status: 'connecting', call, callInvite: null });
        }, 0);
        this.setupCallListeners(
          call,
          callId,
          debugId,
          ratePerMinute,
          userBalance
        );
      },
      updateState: (updates: Partial<CallState>) => this.updateState(updates),
      updateCallOnConnect: (
        callId: string,
        debugId?: string,
        callSid?: string
      ) => this.updateCallOnConnect(callId, debugId, callSid),
      // ✅ REMOVED: startDurationTracking and startPerMinuteBilling
      // These are now handled by CallEventListener when the 'connected' event fires
      // This ensures duration tracking only starts when the call is actually connected,
      // not when accept is called (which may happen before the call is fully connected)
      getCallRepository: (debugId?: string) => this.getCallRepository(debugId),
    });

    this.isAcceptingCall = false;
    return call;
  }

  private cleanupCallListeners(call: Call): void {
    const callEventListener = this.callEventListeners.get(call);
    if (!callEventListener) return;

    logger.debug('[TwilioVoice] 🧹 Cleaning up call listeners', {
      timestamp: new Date().toISOString(),
    });

    callEventListener.cleanup();
    this.callEventListeners.delete(call);
  }

  private cleanupCallInviteListeners(callInvite: CallInvite): void {
    const listeners = this.callInviteEventListeners.get(callInvite);
    if (!listeners) return;

    logger.debug('[TwilioVoice] 🧹 Cleaning up CallInvite listeners', {
      inviteListenersCount: listeners.size,
      timestamp: new Date().toISOString(),
    });

    try {
      const inviteAny = callInvite as any;
      // Remove all event listeners from callInvite
      for (const [eventName, handler] of listeners.entries()) {
        try {
          inviteAny?.off?.(eventName, handler);
        } catch (e) {
          logger.warn('[TwilioVoice] ⚠️ Error removing CallInvite listener', {
            eventName,
            error: e instanceof Error ? e.message : String(e),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      logger.warn('[TwilioVoice] ⚠️ Error during CallInvite listener cleanup', {
        error: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      });
    }

    this.callInviteEventListeners.delete(callInvite);
  }

  async rejectIncomingCall(params?: {
    callId?: string;
    debugId?: string;
  }): Promise<void> {
    logger.info('[TwilioVoice] 📞 rejectIncomingCall function called', {
      debugId: params?.debugId,
      callId: params?.callId,
      hasCallInvite: !!this.stateManager.getState().callInvite,
      currentStatus: this.stateManager.getState().status,
      timestamp: new Date().toISOString(),
    });

    const callInvite = this.stateManager.getState().callInvite;
    if (!callInvite) {
      logger.warn('[TwilioVoice] ⚠️ No call invite to reject', {
        debugId: params?.debugId,
        callId: params?.callId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const handler = this.getIncomingCallHandler();
    await handler.rejectIncomingCall({
      ...params,
      callInvite,
      updateState: (updates: Partial<CallState>) => this.updateState(updates),
      getCallRepository: (debugId?: string) => this.getCallRepository(debugId),
    });
  }

  async disconnect(): Promise<void> {
    const disconnectStartTime = Date.now();
    logger.info('[TwilioVoice] 📞 disconnect function called', {
      hasActiveCall: !!this.activeCall,
      currentStatus: this.stateManager.getState().status,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!this.activeCall) {
        logger.warn('[TwilioVoice] ⚠️ No active call to disconnect', {
          currentStatus: this.stateManager.getState().status,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const wasConnected =
        this.stateManager.getState().status === 'connected' ||
        this.stateManager.getState().duration > 0;
      this.lastDisconnectWasConnected = wasConnected;

      logger.info('[TwilioVoice] 📞 Disconnecting call...', {
        callSid:
          (this.activeCall as any)?.callSid ?? (this.activeCall as any)?.sid,
        currentStatus: this.stateManager.getState().status,
        wasConnected,
        duration: this.stateManager.getState().duration,
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

      this.stopDurationTracking();
      this.stopPerMinuteBilling();

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
      currentMuteState: this.stateManager.getState().isMuted,
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
      currentHoldState: this.stateManager.getState().isOnHold,
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

  private startDurationTracking(connectedTimestamp?: number): void {
    if (this.durationTracker) {
      logger.warn('[TwilioVoice] ⚠️ Duration tracker already running', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const onDurationUpdate: DurationUpdateCallback = (duration: number) => {
      // ✅ FIX: Only update duration if call is actually connected
      // This prevents duration from updating during ringing/connecting states
      const currentState = this.stateManager.getState();
      if (currentState.status === 'connected') {
        this.updateState({ duration });
      } else {
        logger.debug('[TwilioVoice] ⏭️ Skipping duration update - call not connected', {
          currentStatus: currentState.status,
          duration,
          timestamp: new Date().toISOString(),
        });
      }
    };

    this.durationTracker = new DurationTracker(onDurationUpdate);
    this.durationTracker.start(connectedTimestamp);
  }

  private stopDurationTracking(): void {
    if (this.durationTracker) {
      const finalDuration = this.durationTracker.stop();
      this.durationTracker = null;
      // Update state with final duration
      this.updateState({ duration: finalDuration });
    }
  }

  private startPerMinuteBilling(ratePerMinute: number): void {
    if (!this.currentDbCallId) {
      logger.error(
        '[TwilioVoice] ❌ Cannot start billing - no call ID',
        undefined,
        {
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    if (this.perMinuteBilling) {
      logger.warn('[TwilioVoice] ⚠️ Per-minute billing already running', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('[TwilioVoice] 💰 Starting per-minute billing', {
      callId: this.currentDbCallId,
      ratePerMinute,
      timestamp: new Date().toISOString(),
    });

    const getDuration: DurationGetter = () => {
      return this.stateManager.getState().duration;
    };

    const onLowBalance: LowBalanceCallback = (balance, remainingMinutes) => {
      logger.debug('[TwilioVoice] 💰 Low balance callback', {
        balance,
        remainingMinutes,
        timestamp: new Date().toISOString(),
      });
    };

    this.perMinuteBilling = new PerMinuteBilling(
      this.currentDbCallId,
      ratePerMinute,
      getDuration,
      onLowBalance
    );
    this.perMinuteBilling.start();
  }

  private stopPerMinuteBilling(): void {
    if (this.perMinuteBilling) {
      this.perMinuteBilling.stop();
      this.perMinuteBilling = null;
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
    return this.stateManager.getState();
  }

  subscribe(callback: (state: CallState) => void): () => void {
    return this.stateManager.subscribe(callback);
  }

  private setupVoiceListeners(): void {
    logger.info('[TwilioVoice] 🔧 Setting up voice listeners', {
      hasVoice: !!this.voice,
      alreadySetup: this.voiceListenersSetup,
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

    if (this.voiceListenersSetup) {
      logger.warn('[TwilioVoice] ⚠️ Voice listeners already setup, skipping', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.voiceEventListener = new VoiceEventListener(this.voice, {
      updateState: (updates: any) => this.stateManager.updateState(updates),
      cleanupCallInviteListeners: (callInvite: CallInvite) =>
        this.cleanupCallInviteListeners(callInvite),
      getState: () => this.stateManager.getState(),
      setupCallListeners: (
        call: Call,
        callId: string | undefined,
        debugId?: string,
        ratePerMinute?: number,
        userBalance?: number
      ) => this.setupCallListeners(call, callId, debugId, ratePerMinute, userBalance),
      setActiveCall: (call: Call | null) => {
        this.activeCall = call;
        logger.info('[TwilioVoice] 📱 Active call set from native sync', {
          hasCall: !!call,
          callSid: call ? (call as any)?.getSid?.() || (call as any)?._sid : null,
          timestamp: new Date().toISOString(),
        });
      },
    });
    this.voiceEventListener.setup();
    this.voiceListenersSetup = true;
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

    const callEventListener = new CallEventListener(
      call,
      {
        updateState: (updates: Partial<CallState>) =>
          this.stateManager.updateState(updates),
        updateCallOnConnect: (
          callId: string,
          debugId?: string,
          callSid?: string
        ) => this.updateCallOnConnect(callId, debugId, callSid),
        updateCallOnDisconnect: (
          callId: string,
          debugId?: string,
          wasConnected?: boolean,
          isMissedDueToTimeout?: boolean
        ) =>
          this.updateCallOnDisconnect(
            callId,
            debugId,
            wasConnected,
            isMissedDueToTimeout
          ),
        startDurationTracking: (connectedTimestamp: number) =>
          this.startDurationTracking(connectedTimestamp),
        stopDurationTracking: () => this.stopDurationTracking(),
        startPerMinuteBilling: (ratePerMinute: number) =>
          this.startPerMinuteBilling(ratePerMinute),
        stopPerMinuteBilling: () => this.stopPerMinuteBilling(),
        cleanupCallListeners: (call: Call) => this.cleanupCallListeners(call),
        getOutgoingCallTimeout: () => this.outgoingCallTimeout,
        setOutgoingCallTimeout: (
          timeout: ReturnType<typeof setTimeout> | null
        ) => {
          this.outgoingCallTimeout = timeout;
        },
        getLastDisconnectWasConnected: () => this.lastDisconnectWasConnected,
        setLastDisconnectWasConnected: (value: boolean) => {
          this.lastDisconnectWasConnected = value;
        },
        getCurrentDbCallId: () => this.currentDbCallId,
        setCurrentDbCallId: (callId: string | null) => {
          this.currentDbCallId = callId;
        },
        getState: () => this.stateManager.getState(),
        setActiveCall: (call: Call | null) => {
          this.activeCall = call;
        },
      },
      callId,
      debugId,
      ratePerMinute,
      userBalance
    );
    callEventListener.setup();
    this.callEventListeners.set(call, callEventListener);
  }

  private getCallRepository(debugId?: string): CallRepository {
    return new CallRepository(supabase, debugId);
  }

  private getOutgoingCallHandler(): OutgoingCallHandler {
    return new OutgoingCallHandler();
  }

  private getIncomingCallHandler(): IncomingCallHandler {
    return new IncomingCallHandler();
  }

  private async updateCallOnConnect(
    callId: string,
    debugId?: string,
    callSid?: string
  ): Promise<void> {
    const repository = this.getCallRepository(debugId);
    await repository.updateCallOnConnect({ callId, debugId, callSid });
  }

  private async updateCallOnDisconnect(
    callId: string,
    debugId?: string,
    wasConnected?: boolean,
    isMissedDueToTimeout: boolean = false
  ): Promise<void> {
    const repository = this.getCallRepository(debugId);
    await repository.updateCallOnDisconnect({
      callId,
      debugId,
      wasConnected,
      isMissedDueToTimeout,
    });
  }

  private updateState: StateUpdateCallback = (updates) => {
    this.stateManager.updateState(updates);
  };

  async cleanup(): Promise<void> {
    const cleanupStartTime = Date.now();
    logger.info('[TwilioVoice] 🧹 Cleaning up Twilio Voice service...', {
      hasActiveCall: !!this.activeCall,
      hasVoice: !!this.voice,
      hasAccessToken: !!this.accessToken,
      hasStateManager: !!this.stateManager,
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

      this.stopDurationTracking();
      this.stopPerMinuteBilling();
      this.stateManager.clearStateUpdateTimeouts();

      if (this.outgoingCallTimeout) {
        clearTimeout(this.outgoingCallTimeout);
        this.outgoingCallTimeout = null;
        logger.debug('[TwilioVoice] 🧹 Cleared outgoing call timeout', {
          timestamp: new Date().toISOString(),
        });
      }

      logger.debug('[TwilioVoice] 🧹 Cleaning up all call listeners', {
        callCount: this.callEventListeners.size,
        timestamp: new Date().toISOString(),
      });
      for (const [call] of this.callEventListeners.entries()) {
        this.cleanupCallListeners(call);
      }

      logger.debug('[TwilioVoice] 🧹 Cleaning up all CallInvite listeners', {
        inviteCount: this.callInviteEventListeners.size,
        timestamp: new Date().toISOString(),
      });
      for (const [callInvite] of this.callInviteEventListeners.entries()) {
        this.cleanupCallInviteListeners(callInvite);
      }

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

        if (this.voiceEventListener) {
          logger.debug('[TwilioVoice] 🧹 Cleaning up voice event listeners', {
            timestamp: new Date().toISOString(),
          });
          this.voiceEventListener.cleanup();
          this.voiceEventListener = null;
        }
        this.voiceListenersSetup = false;

        logger.debug('[TwilioVoice] 🔧 Clearing voice instance', {
          timestamp: new Date().toISOString(),
        });
        this.voice = null;
      }

      this.isMakingCall = false;
      this.isAcceptingCall = false;
      this.stateManager.clearListeners();

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

  private async initializePushRegistry(): Promise<void> {
    if (this.isPushRegistryInitialized) return;
    if (!this.voice) {
      logger.warn('[TwilioVoice] ⚠️ Cannot initialize push registry: Voice SDK not ready');
      return;
    }

    try {
      logger.info('[TwilioVoice] 📲 Initializing PushKit registry for iOS...');
      await this.voice.initializePushRegistry();
      this.isPushRegistryInitialized = true;
      logger.info('[TwilioVoice] ✅ Push registry initialized');
    } catch (error) {
      logger.error('[TwilioVoice] ❌ Push registry init failed', error);
    }
  }
}

export type { CallStatus, CallState } from './twilioVoice/types';

export const twilioVoiceService = new TwilioVoiceService();
