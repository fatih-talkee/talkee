import { Voice, Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Platform } from 'react-native';

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

      // Debug: Log token details
      console.log('[DEBUG] Token length:', data.token.length);
      console.log('[DEBUG] Full Token:', data.token);
      console.log('[DEBUG] Identity:', data.identity);
      console.log('[DEBUG] Expires:', data.expiresAt);

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
    professionalId: string;
    callerId: string;
    type?: 'voice' | 'video';
  }): Promise<Call> {
    try {
      if (!this.voice) {
        throw new Error('Voice SDK not initialized');
      }

      if (!this.accessToken) {
        await this.getAccessToken();
      }

      logger.info('[TwilioVoice] Initiating call...', params);

      // Create call record in database
      const { data: callRecord, error: dbError } = await supabase
        .from('calls')
        .insert({
          caller_id: params.callerId,
          professional_id: params.professionalId,
          call_type: params.type || 'voice',
          status: 'initiated',
          initiated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        logger.error('[TwilioVoice] Database error:', dbError);
        throw dbError;
      }

      logger.info('[TwilioVoice] Call record created:', callRecord.id);

      // Make the call
      const call = await this.voice.connect(this.accessToken!, {
        params: {
          To: params.professionalId,
          From: params.callerId,
          CallId: callRecord.id,
          CallType: params.type || 'voice',
        },
      });

      this.activeCall = call;
      this.setupCallListeners(call, callRecord.id);

      this.updateState({
        status: 'connecting',
        call,
      });

      logger.info('[TwilioVoice] Call initiated successfully');
      return call;
    } catch (error) {
      logger.error('[TwilioVoice] Call error:', error);
      this.updateState({ error: error as Error });
      throw error;
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
      logger.info('[TwilioVoice] Incoming call', {
        callSid: callInvite.getCallSid(),
      });

      this.updateState({
        status: 'ringing',
        callInvite,
      });
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
  private setupCallListeners(call: Call, callId: string): void {
    // Call connected
    call.on(Call.Event.Connected, () => {
      logger.info('[TwilioVoice] Call connected');

      this.updateState({
        status: 'connected',
      });

      // Update database
      supabase
        .from('calls')
        .update({
          call_sid: call.getSid(),
          status: 'in-progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .then(() => logger.info('[TwilioVoice] Call record updated'));
    });

    // Call connecting
    call.on(Call.Event.Reconnecting, () => {
      logger.info('[TwilioVoice] Call connecting...');
      this.updateState({ status: 'connecting' });
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
      logger.info('[TwilioVoice] Call disconnected', error);

      this.activeCall = null;
      this.updateState({
        status: 'disconnected',
        call: null,
        error: error || null,
      });

      // Update database
      supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .then(() => logger.info('[TwilioVoice] Call record finalized'));
    });

    // Quality warnings
    call.on(Call.Event.QualityWarningsChanged, (warnings: any) => {
      logger.warn('[TwilioVoice] Quality warnings:', warnings);
    });
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<CallState>): void {
    this.state = { ...this.state, ...updates };

    // Notify all listeners
    this.listeners.get('stateChange')?.forEach((callback) => {
      callback(this.state);
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
