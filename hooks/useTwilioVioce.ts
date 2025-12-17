import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { twilioVoiceService, CallState } from '@/services/twilioVoice.service';
import { logger } from '@/utils/logger';
import { useProfile } from './useProfile';

export interface UseTwilioVoiceOptions {
  /**
   * Auto-connect on mount
   * @default false
   */
  autoConnect?: boolean;

  /**
   * Callback when call connects
   */
  onCallConnected?: () => void;

  /**
   * Callback when call disconnects
   */
  onCallDisconnected?: (error?: Error) => void;

  /**
   * Callback when call status changes
   */
  onStatusChange?: (status: CallState['status']) => void;

  /**
   * Callback when incoming call received
   */
  onIncomingCall?: (callInvite: CallState['callInvite']) => void;
}

export interface UseTwilioVoiceReturn {
  // State
  callState: CallState;
  isConnected: boolean;
  isConnecting: boolean;
  isIdle: boolean;
  callDuration: number;

  // Actions
  makeCall: (
    professionalId: string,
    callType?: 'voice' | 'video'
  ) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleHold: () => Promise<void>;
  sendDigits: (digits: string) => Promise<void>;

  // Error
  error: Error | null;
  clearError: () => void;
}

/**
 * Custom hook for managing Twilio Voice calls
 *
 * @example
 * ```tsx
 * const {
 *   callState,
 *   isConnected,
 *   makeCall,
 *   disconnect,
 *   toggleMute,
 * } = useTwilioVoice({
 *   onCallConnected: () => console.log('Call connected!'),
 *   onCallDisconnected: () => console.log('Call ended'),
 * });
 *
 * // Make a call
 * await makeCall('professional-id-123');
 *
 * // Mute/unmute
 * await toggleMute();
 *
 * // End call
 * await disconnect();
 * ```
 */
export function useTwilioVoice(
  options: UseTwilioVoiceOptions = {}
): UseTwilioVoiceReturn {
  const { user } = useProfile();
  const [callState, setCallState] = useState<CallState>(
    twilioVoiceService.getState()
  );
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Subscribe to call state changes
  useEffect(() => {
    const unsubscribe = twilioVoiceService.subscribe((newState) => {
      setCallState(newState);

      // Trigger callbacks
      if (newState.status === 'connected' && options.onCallConnected) {
        options.onCallConnected();
      }

      if (newState.status === 'disconnected' && options.onCallDisconnected) {
        options.onCallDisconnected(newState.error || undefined);
      }

      if (options.onStatusChange) {
        options.onStatusChange(newState.status);
      }

      if (newState.callInvite && options.onIncomingCall) {
        options.onIncomingCall(newState.callInvite);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    options.onCallConnected,
    options.onCallDisconnected,
    options.onStatusChange,
    options.onIncomingCall,
  ]);

  // Track call duration
  useEffect(() => {
    if (callState.status === 'connected') {
      // Start duration tracking
      callStartTimeRef.current = Date.now();

      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const duration = Math.floor(
            (Date.now() - callStartTimeRef.current) / 1000
          );
          setCallDuration(duration);
        }
      }, 1000) as any;
    } else {
      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (callState.status === 'disconnected') {
        callStartTimeRef.current = null;
        setCallDuration(0);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callState.status]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // If app goes to background during a call, keep the call active
      if (
        appStateRef.current.match(/active/) &&
        nextAppState === 'background' &&
        callState.status === 'connected'
      ) {
        logger.info(
          '[useTwilioVoice] App backgrounded during call - call continues'
        );
      }

      // If app returns to foreground during a call
      if (
        appStateRef.current === 'background' &&
        nextAppState === 'active' &&
        callState.status === 'connected'
      ) {
        logger.info(
          '[useTwilioVoice] App foregrounded during call - call continues'
        );
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [callState.status]);

  // Sync error state
  useEffect(() => {
    if (callState.error) {
      setError(callState.error);
    }
  }, [callState.error]);

  /**
   * Make an outgoing call
   */
  const makeCall = useCallback(
    async (professionalId: string, callType: 'voice' | 'video' = 'voice') => {
      if (!user) {
        const error = new Error('User not authenticated');
        setError(error);
        logger.error(
          '[useTwilioVoice] Cannot make call - user not authenticated'
        );
        throw error;
      }

      if (callState.status !== 'idle') {
        const error = new Error('A call is already in progress');
        setError(error);
        logger.warn(
          '[useTwilioVoice] Cannot make call - call already in progress'
        );
        throw error;
      }

      try {
        setError(null);
        logger.info('[useTwilioVoice] Making call...', {
          professionalId,
          callType,
        });

        await twilioVoiceService.makeCall({
          professionalId,
          callerId: user.id,
          type: callType,
        });

        logger.info('[useTwilioVoice] Call initiated successfully');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error('[useTwilioVoice] Make call error:', error);
        throw error;
      }
    },
    [user, callState.status]
  );

  /**
   * Disconnect active call
   */
  const disconnect = useCallback(async () => {
    try {
      setError(null);
      logger.info('[useTwilioVoice] Disconnecting call...');

      await twilioVoiceService.disconnect();

      logger.info('[useTwilioVoice] Call disconnected successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('[useTwilioVoice] Disconnect error:', error);
      throw error;
    }
  }, []);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(async () => {
    try {
      setError(null);
      logger.info('[useTwilioVoice] Toggling mute...');

      const newMuteState = await twilioVoiceService.toggleMute();

      logger.info('[useTwilioVoice] Mute toggled:', newMuteState);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('[useTwilioVoice] Toggle mute error:', error);
      throw error;
    }
  }, []);

  /**
   * Toggle hold
   */
  const toggleHold = useCallback(async () => {
    try {
      setError(null);
      logger.info('[useTwilioVoice] Toggling hold...');

      const newHoldState = await twilioVoiceService.toggleHold();

      logger.info('[useTwilioVoice] Hold toggled:', newHoldState);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('[useTwilioVoice] Toggle hold error:', error);
      throw error;
    }
  }, []);

  /**
   * Send DTMF digits
   */
  const sendDigits = useCallback(async (digits: string) => {
    try {
      setError(null);
      logger.info('[useTwilioVoice] Sending digits:', digits);

      await twilioVoiceService.sendDigits(digits);

      logger.info('[useTwilioVoice] Digits sent successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('[useTwilioVoice] Send digits error:', error);
      throw error;
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect && user && callState.status === 'idle') {
      // This would be for auto-answering incoming calls
      // For now, we'll skip this as it's not common UX
      logger.info(
        '[useTwilioVoice] Auto-connect is enabled but not implemented for outgoing calls'
      );
    }
  }, [options.autoConnect, user, callState.status]);

  // Computed states
  const isConnected = callState.status === 'connected';
  const isConnecting =
    callState.status === 'connecting' || callState.status === 'ringing';
  const isIdle =
    callState.status === 'idle' || callState.status === 'disconnected';

  return {
    // State
    callState,
    isConnected,
    isConnecting,
    isIdle,
    callDuration,

    // Actions
    makeCall,
    disconnect,
    toggleMute,
    toggleHold,
    sendDigits,

    // Error
    error,
    clearError,
  };
}

/**
 * Format call duration as MM:SS or HH:MM:SS
 */
export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}
