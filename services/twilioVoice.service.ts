import { Voice, Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { PermissionsAndroid, Platform } from 'react-native';
import { callsService } from '@/services/calls.service';
import { CallStatus as DbCallStatus } from '@/types/database.types';

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

  private state: CallState = {
    status: 'idle',
    call: null,
    callInvite: null,
    isMuted: false,
    isOnHold: false,
    duration: 0,
    error: null,
  };

  /**
   * Initialize Twilio Voice SDK
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[TwilioVoice] Initializing...');

      this.voice = new Voice();
      this.setupVoiceListeners();

      logger.info('[TwilioVoice] Initialized successfully');
    } catch (error) {
      logger.error('[TwilioVoice] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Whether the native Twilio Voice SDK wrapper has been initialized.
   * Useful for UI gating/debugging.
   */
  isSdkInitialized(): boolean {
    return this.voice !== null;
  }

  /**
   * Get access token from Supabase Edge Function
   */
  async getAccessToken(): Promise<string> {
    try {
      logger.info('[TwilioVoice] Fetching access token...');

      const { data, error } = await supabase.functions.invoke('twilio-token');

      if (error) {
        logger.error('[TwilioVoice] Token fetch error:', error);
        throw error;
      }

      if (!data?.token) {
        throw new Error('No token received from server');
      }

      this.accessToken = data.token;
      logger.info('[TwilioVoice] Token received successfully');

      // Debug: Log token details (never log the full token - it's sensitive)
      if (__DEV__) {
        console.log('[DEBUG] Token length:', data.token.length);
        console.log('[DEBUG] Identity:', data.identity);
        console.log('[DEBUG] Expires:', data.expiresAt);
      }

      return data.token;
    } catch (error) {
      logger.error('[TwilioVoice] Token error:', error);
      throw error;
    }
  }

  /**
   * Register device with Twilio
   */
  async register(): Promise<void> {
    try {
      if (!this.voice) {
        throw new Error('Voice SDK not initialized');
      }

      const token = await this.getAccessToken();

      logger.info('[TwilioVoice] Registering device...');
      await this.voice.register(token);
      logger.info('[TwilioVoice] Device registered successfully');
    } catch (error) {
      logger.error('[TwilioVoice] Registration error:', error);
      throw error;
    }
  }

  /**
   * Unregister device from Twilio
   */
  async unregister(): Promise<void> {
    try {
      if (!this.voice) return;
      if (!this.accessToken) {
        logger.warn('[TwilioVoice] No access token; skipping unregister');
        return;
      }

      logger.info('[TwilioVoice] Unregistering device...');
      await this.voice.unregister(this.accessToken!);
      logger.info('[TwilioVoice] Device unregistered');
    } catch (error) {
      logger.error('[TwilioVoice] Unregistration error:', error);
      throw error;
    }
  }

  /**
   * Make an outgoing call
   */
  async makeCall(params: {
    professionalId: string; // professionals.id (DB foreign key)
    professionalUserId: string; // users.id (Twilio identity / "To")
    callerId: string; // users.id (Twilio identity / "From")
    type?: 'voice' | 'video';
    urgent?: boolean;
    debugId?: string;
  }): Promise<Call> {
    let createdCallId: string | null = null;
    try {
      if (!this.voice) {
        throw new Error('Voice SDK not initialized');
      }

      if (!this.accessToken) {
        await this.getAccessToken();
      }

      // Ensure required runtime permissions before creating a call record / sending any notifications
      await this.ensureMicrophonePermission(params.debugId);

      logger.info('[TwilioVoice] Initiating call...', {
        debugId: params.debugId,
        professionalId: params.professionalId,
        professionalUserId: params.professionalUserId,
        callerId: params.callerId,
        type: params.type,
        urgent: params.urgent,
      });

      // Create call record via CallsService (matches DB schema + business rules)
      const callRecord = await callsService.initiateCall(
        params.professionalId,
        (params.type || 'voice') as any,
        Boolean(params.urgent)
      );

      if (!callRecord) {
        throw new Error('Failed to create call record');
      }
      createdCallId = callRecord.id;

      if (callRecord.caller_id !== params.callerId) {
        logger.warn(
          '[TwilioVoice] Caller mismatch while creating call record',
          {
            debugId: params.debugId,
            expectedCallerId: params.callerId,
            actualCallerId: callRecord.caller_id,
          }
        );
      }

      logger.info('[TwilioVoice] Call record created', {
        debugId: params.debugId,
        callId: callRecord.id,
        status: callRecord.status,
      });

      // Make the call
      logger.info('[TwilioVoice] Connecting via Twilio SDK...', {
        debugId: params.debugId,
        to: params.professionalUserId,
        from: params.callerId,
        callId: callRecord.id,
        callType: params.type || 'voice',
        urgent: params.urgent,
      });
      const call = await this.voice.connect(this.accessToken!, {
        params: {
          To: params.professionalUserId,
          From: params.callerId,
          CallId: callRecord.id,
          CallType: params.type || 'voice',
          Urgent: params.urgent ? 'true' : 'false',
        },
      });

      // Persist Twilio CallSid on our DB call row so webhooks can correlate even when CallId isn't included.
      try {
        const anyCall = call as any;
        const callSid =
          anyCall?.callSid ??
          anyCall?.sid ??
          (typeof anyCall?.getSid === 'function'
            ? anyCall.getSid()
            : undefined);

        if (callSid) {
          const { error: sidErr } = await supabase
            .from('calls')
            .update({ call_sid: callSid })
            .eq('id', callRecord.id);

          if (sidErr) {
            logger.warn('[TwilioVoice] Failed saving call_sid on call record', {
              debugId: params.debugId,
              callId: callRecord.id,
              callSid,
              message: sidErr.message,
              details: (sidErr as any).details,
              hint: (sidErr as any).hint,
              code: (sidErr as any).code,
            });
          } else {
            logger.info('[TwilioVoice] Saved call_sid on call record', {
              debugId: params.debugId,
              callId: callRecord.id,
              callSid,
            });
          }
        }
      } catch (e) {
        logger.warn('[TwilioVoice] call_sid persist failed (non-fatal)', {
          debugId: params.debugId,
          callId: callRecord.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      this.activeCall = call;
      this.setupCallListeners(call, callRecord.id, params.debugId);

      this.updateState({
        status: 'connecting',
        call,
      });

      logger.info('[TwilioVoice] Call initiated successfully', {
        debugId: params.debugId,
        callId: callRecord.id,
      });
      return call;
    } catch (error) {
      // If we created a DB call record but couldn't connect (e.g. permissions/network),
      // mark it cancelled to avoid leaving "pending" calls around.
      if (createdCallId) {
        supabase
          .from('calls')
          .update({
            status: DbCallStatus.CANCELLED,
            end_time: new Date().toISOString(),
          })
          .eq('id', createdCallId)
          .then(({ error: updateErr }) => {
            if (updateErr) {
              logger.warn(
                '[TwilioVoice] Failed to cancel call record after connect failure',
                {
                  debugId: params.debugId,
                  callId: createdCallId,
                  message: updateErr.message,
                  details: (updateErr as any).details,
                  hint: (updateErr as any).hint,
                  code: (updateErr as any).code,
                }
              );
            } else {
              logger.info(
                '[TwilioVoice] Cancelled call record after connect failure',
                {
                  debugId: params.debugId,
                  callId: createdCallId,
                }
              );
            }
          });
      }

      const err =
        error instanceof Error
          ? error
          : new Error(
              typeof error === 'object' && error && 'message' in (error as any)
                ? String((error as any).message)
                : String(error)
            );

      // Log structured context so we don't lose Postgrest/Supabase details
      logger.error(
        '[TwilioVoice] Call error',
        err,
        typeof error === 'object' && error
          ? { debugId: params.debugId, raw: error as any }
          : { debugId: params.debugId }
      );
      this.updateState({ error: error as Error });
      throw error;
    }
  }

  private async ensureMicrophonePermission(debugId?: string): Promise<void> {
    if (Platform.OS !== 'android') return;

    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) return;

    logger.info('[TwilioVoice] Requesting RECORD_AUDIO permission', {
      debugId,
    });
    const result = await PermissionsAndroid.request(permission, {
      title: 'Microphone permission',
      message: 'Talkee needs microphone access to start a call.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    logger.info('[TwilioVoice] RECORD_AUDIO permission result', {
      debugId,
      result,
    });

    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Microphone permission not granted');
    }
  }

  /**
   * Accept an incoming call invite (callee side).
   * Optionally provides the DB call record id so we can update call status.
   */
  async acceptIncomingCall(params?: {
    callId?: string;
    debugId?: string;
  }): Promise<Call> {
    if (!this.voice) {
      throw new Error('Voice SDK not initialized');
    }

    const callInvite = this.state.callInvite;
    if (!callInvite) {
      throw new Error('No incoming call invite to accept');
    }

    await this.ensureMicrophonePermission(params?.debugId);

    logger.info('[TwilioVoice] Accepting incoming call invite', {
      debugId: params?.debugId,
      callId: params?.callId,
      callSid: callInvite.getCallSid?.(),
    });

    // Twilio SDK: accept() returns an active Call
    const call = await (callInvite as any).accept();

    // Persist invite CallSid on our DB call row so webhooks can correlate.
    if (params?.callId) {
      try {
        const inviteSid = callInvite.getCallSid?.();
        if (inviteSid) {
          const { error: sidErr } = await supabase
            .from('calls')
            .update({ call_sid: inviteSid })
            .eq('id', params.callId);

          if (sidErr) {
            logger.warn(
              '[TwilioVoice] Failed saving call_sid on incoming call accept',
              {
                debugId: params.debugId,
                callId: params.callId,
                callSid: inviteSid,
                message: sidErr.message,
                details: (sidErr as any).details,
                hint: (sidErr as any).hint,
                code: (sidErr as any).code,
              }
            );
          } else {
            logger.info(
              '[TwilioVoice] Saved call_sid on incoming call accept',
              {
                debugId: params.debugId,
                callId: params.callId,
                callSid: inviteSid,
              }
            );
          }
        }
      } catch (e) {
        logger.warn(
          '[TwilioVoice] call_sid persist failed on incoming accept (non-fatal)',
          {
            debugId: params?.debugId,
            callId: params?.callId,
            error: e instanceof Error ? e.message : String(e),
          }
        );
      }
    }

    this.activeCall = call;
    this.updateState({
      status: 'connecting',
      call,
      callInvite: null,
    });

    this.setupCallListeners(call, params?.callId, params?.debugId);

    return call;
  }

  /**
   * Reject an incoming call invite (callee side).
   */
  async rejectIncomingCall(params?: {
    callId?: string;
    debugId?: string;
  }): Promise<void> {
    const callInvite = this.state.callInvite;
    if (!callInvite) return;

    logger.info('[TwilioVoice] Rejecting incoming call invite', {
      debugId: params?.debugId,
      callId: params?.callId,
      callSid: callInvite.getCallSid?.(),
    });

    try {
      await (callInvite as any).reject?.();
    } finally {
      this.updateState({
        status: 'idle',
        callInvite: null,
        call: null,
      });
    }

    if (params?.callId) {
      supabase
        .from('calls')
        .update({
          status: DbCallStatus.MISSED,
          end_time: new Date().toISOString(),
        })
        .eq('id', params.callId)
        .then(({ error }) => {
          if (error) {
            logger.warn(
              '[TwilioVoice] Failed updating call as missed (reject)',
              {
                debugId: params.debugId,
                callId: params.callId,
                message: error.message,
                details: (error as any).details,
                hint: (error as any).hint,
                code: (error as any).code,
              }
            );
          }
        });
    }
  }

  /**
   * Disconnect active call
   */
  async disconnect(): Promise<void> {
    try {
      if (!this.activeCall) {
        logger.warn('[TwilioVoice] No active call to disconnect');
        return;
      }

      logger.info('[TwilioVoice] Disconnecting call...');
      await this.activeCall.disconnect();

      this.activeCall = null;
      this.updateState({
        status: 'disconnected',
        call: null,
      });

      logger.info('[TwilioVoice] Call disconnected');
    } catch (error) {
      logger.error('[TwilioVoice] Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Toggle mute
   */
  async toggleMute(): Promise<boolean> {
    try {
      if (!this.activeCall) {
        throw new Error('No active call');
      }

      const currentMuteState = this.activeCall.isMuted();
      const newMuteState = !currentMuteState;

      await this.activeCall.mute(newMuteState);

      this.updateState({ isMuted: newMuteState });
      logger.info('[TwilioVoice] Mute toggled', { isMuted: newMuteState });

      return newMuteState;
    } catch (error) {
      logger.error('[TwilioVoice] Toggle mute error:', error);
      throw error;
    }
  }

  /**
   * Toggle hold
   */
  async toggleHold(): Promise<boolean> {
    try {
      if (!this.activeCall) {
        throw new Error('No active call');
      }

      const currentHoldState = this.activeCall.isOnHold();
      const newHoldState = !currentHoldState;

      await this.activeCall.hold(newHoldState);

      this.updateState({ isOnHold: newHoldState });
      logger.info('[TwilioVoice] Hold toggled', { isOnHold: newHoldState });

      return newHoldState;
    } catch (error) {
      logger.error('[TwilioVoice] Toggle hold error:', error);
      throw error;
    }
  }

  /**
   * Send digits (DTMF)
   */
  async sendDigits(digits: string): Promise<void> {
    try {
      if (!this.activeCall) {
        throw new Error('No active call');
      }

      await this.activeCall.sendDigits(digits);
      logger.info('[TwilioVoice] Sent digits', { digits });
    } catch (error) {
      logger.error('[TwilioVoice] Send digits error:', error);
      throw error;
    }
  }

  /**
   * Get active call
   */
  getActiveCall(): Call | null {
    return this.activeCall;
  }

  /**
   * Get current state
   */
  getState(): CallState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: CallState) => void): () => void {
    const id = Math.random().toString(36);

    if (!this.listeners.has('stateChange')) {
      this.listeners.set('stateChange', new Set());
    }

    this.listeners.get('stateChange')!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get('stateChange')?.delete(callback);
    };
  }

  /**
   * Setup Voice SDK listeners
   */
  private setupVoiceListeners(): void {
    if (!this.voice) return;

    // Incoming call
    this.voice.on(Voice.Event.CallInvite, (callInvite: CallInvite) => {
      const inviteSid = callInvite.getCallSid?.();
      logger.info('[TwilioVoice] Incoming call', { callSid: inviteSid });

      this.updateState({
        status: 'ringing',
        callInvite,
      });

      // If the caller hangs up before the callee answers, the SDK should emit a cancellation on the invite.
      // If we don't clear it, the in-app incoming modal can get stuck.
      try {
        const inviteAny = callInvite as any;

        const clearInvite = (reason: string, payload?: any) => {
          const currentSid = (this.state.callInvite as any)?.getCallSid?.();
          if (currentSid && inviteSid && currentSid !== inviteSid) return;

          logger.info('[TwilioVoice] Incoming call invite ended', {
            callSid: inviteSid,
            reason,
            payload: payload
              ? payload instanceof Error
                ? payload.message
                : String(payload)
              : undefined,
          });

          this.updateState({
            status: 'idle',
            callInvite: null,
          });
        };

        // Try both typed event names and raw strings to be resilient across SDK versions.
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

        for (const ev of candidates) {
          inviteAny?.on?.(ev, (err: any) => clearInvite(String(ev), err));
        }
      } catch (e) {
        logger.warn(
          '[TwilioVoice] Failed binding CallInvite cancellation listeners',
          {
            callSid: inviteSid,
            error: e instanceof Error ? e.message : String(e),
          }
        );
      }
    });

    // Registration successful
    this.voice.on(Voice.Event.Registered, () => {
      logger.info('[TwilioVoice] Device registered');
    });

    // Unregistration successful
    this.voice.on(Voice.Event.Unregistered, () => {
      logger.info('[TwilioVoice] Device unregistered');
    });

    // Error occurred
    this.voice.on(Voice.Event.Error, (error: any) => {
      logger.error('[TwilioVoice] SDK Error:', error);
      this.updateState({ error });
    });
  }

  /**
   * Setup Call listeners
   */
  private setupCallListeners(
    call: Call,
    callId?: string,
    debugId?: string
  ): void {
    // Call connected
    call.on(Call.Event.Connected, () => {
      logger.info('[TwilioVoice] Call connected', { debugId, callId });

      this.updateState({
        status: 'connected',
      });

      if (callId) {
        void this.updateCallOnConnect(callId, debugId);
      }
    });

    // Call reconnecting
    call.on(Call.Event.Reconnecting, () => {
      logger.info('[TwilioVoice] Call reconnecting...');
      this.updateState({ status: 'reconnecting' });
    });

    // Call reconnected
    call.on(Call.Event.Reconnected, () => {
      logger.info('[TwilioVoice] Call reconnected');
      this.updateState({ status: 'connected' });
    });

    // Call ringing
    call.on(Call.Event.Ringing, () => {
      logger.info('[TwilioVoice] Call ringing...');
      this.updateState({ status: 'ringing' });
    });

    // Call disconnected
    call.on(Call.Event.Disconnected, (error?: any) => {
      logger.info('[TwilioVoice] Call disconnected', {
        debugId,
        callId,
        error: error
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
      });

      this.activeCall = null;
      this.updateState({
        status: 'disconnected',
        call: null,
        error: error || null,
      });

      if (callId) {
        void this.updateCallOnDisconnect(callId, debugId);
      }
    });

    // Quality warnings
    call.on(Call.Event.QualityWarningsChanged, (warnings: any) => {
      logger.warn('[TwilioVoice] Quality warnings:', warnings);
    });
  }

  private async updateCallOnConnect(
    callId: string,
    debugId?: string
  ): Promise<void> {
    const startedAt = new Date().toISOString();

    // Always set start_time first (some invoice/db logic depends on this being non-null later).
    const startRes = await supabase
      .from('calls')
      .update({ start_time: startedAt })
      .eq('id', callId);

    if (startRes.error) {
      logger.error(
        '[TwilioVoice] Failed updating call start_time on connect',
        undefined,
        {
          debugId,
          callId,
          message: startRes.error.message,
          details: (startRes.error as any).details,
          hint: (startRes.error as any).hint,
          code: (startRes.error as any).code,
        }
      );
      // Don't return; still attempt status update.
    }

    // Status values differ across environments (some DBs used 'in-progress' historically).
    // Try the canonical value first, then fallback(s) if a CHECK constraint rejects it.
    const candidates: string[] = ['active', 'in-progress', 'in_progress'];
    for (const status of candidates) {
      const res = await supabase
        .from('calls')
        .update({ status })
        .eq('id', callId);
      if (!res.error) {
        logger.info('[TwilioVoice] Call record updated (connected)', {
          debugId,
          callId,
          status,
        });
        return;
      }

      logger.warn(
        '[TwilioVoice] Call status update rejected, trying fallback',
        {
          debugId,
          callId,
          attemptedStatus: status,
          message: res.error.message,
          details: (res.error as any).details,
          hint: (res.error as any).hint,
          code: (res.error as any).code,
        }
      );
    }
  }

  private async updateCallOnDisconnect(
    callId: string,
    debugId?: string
  ): Promise<void> {
    const endedAt = new Date().toISOString();

    // Determine whether the call ever actually connected.
    // Business rule:
    // - If start_time is NULL, the call never connected -> mark CANCELLED (no invoice/billing should occur).
    // - If start_time is set, finalize as COMPLETED.
    let startTime: string | null = null;
    try {
      const { data: row, error: loadErr } = await supabase
        .from('calls')
        .select('start_time, status')
        .eq('id', callId)
        .maybeSingle();

      if (loadErr) {
        logger.warn('[TwilioVoice] Failed loading call row on disconnect', {
          debugId,
          callId,
          message: loadErr.message,
          details: (loadErr as any).details,
          hint: (loadErr as any).hint,
          code: (loadErr as any).code,
        });
      } else {
        startTime = (row as any)?.start_time ?? null;
      }
    } catch (e) {
      logger.warn('[TwilioVoice] Exception loading call row on disconnect', {
        debugId,
        callId,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const neverConnected = !startTime;

    if (neverConnected) {
      const res = await supabase
        .from('calls')
        .update({
          status: DbCallStatus.CANCELLED,
          end_time: endedAt,
        })
        .eq('id', callId);

      if (res.error) {
        logger.error(
          '[TwilioVoice] Failed cancelling call on disconnect (never connected)',
          undefined,
          {
            debugId,
            callId,
            attemptedStatus: DbCallStatus.CANCELLED,
            message: res.error.message,
            details: (res.error as any).details,
            hint: (res.error as any).hint,
            code: (res.error as any).code,
          }
        );
      } else {
        logger.info('[TwilioVoice] Call record cancelled (never connected)', {
          debugId,
          callId,
        });
      }
      return;
    }

    // Connected call: finalize as completed.
    const res = await supabase
      .from('calls')
      .update({
        status: DbCallStatus.COMPLETED,
        end_time: endedAt,
      })
      .eq('id', callId);

    if (!res.error) {
      logger.info('[TwilioVoice] Call record finalized (disconnected)', {
        debugId,
        callId,
        status: DbCallStatus.COMPLETED,
      });
      return;
    }

    logger.error(
      '[TwilioVoice] Failed updating call status on disconnect',
      undefined,
      {
        debugId,
        callId,
        attemptedStatus: DbCallStatus.COMPLETED,
        message: res.error.message,
        details: (res.error as any).details,
        hint: (res.error as any).hint,
        code: (res.error as any).code,
      }
    );
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<CallState>): void {
    this.state = { ...this.state, ...updates };

    // Notify all listeners synchronously
    // useSyncExternalStore in useTwilioVoice will handle React updates safely
    this.listeners.get('stateChange')?.forEach((callback) => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error('[TwilioVoice] Error in state change callback', error);
      }
    });
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('[TwilioVoice] Cleaning up...');

      if (this.activeCall) {
        await this.disconnect();
      }

      if (this.voice) {
        await this.unregister();
        this.voice = null;
      }

      this.listeners.clear();
      this.accessToken = null;

      logger.info('[TwilioVoice] Cleanup complete');
    } catch (error) {
      logger.error('[TwilioVoice] Cleanup error:', error);
    }
  }
}

export const twilioVoiceService = new TwilioVoiceService();
