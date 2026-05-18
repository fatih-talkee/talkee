import { Call, CallInvite, Voice } from '@twilio/voice-react-native-sdk';
import { CallState } from './CallTypes';
import { CallRepository } from '../database/CallRepository';

export interface DurationUpdateCallback {
  (duration: number): void;
}

export interface DurationGetter {
  (): number;
}

export interface LowBalanceCallback {
  (balance: number, remainingMinutes: number): void;
}

export interface StateUpdateCallback {
  (updates: Partial<CallState>): void;
}

export interface CallInviteCleanupCallback {
  (callInvite: CallInvite): void;
}

export interface VoiceEventListenerDependencies {
  updateState: StateUpdateCallback;
  cleanupCallInviteListeners: CallInviteCleanupCallback;
  getState: () => CallState;
  setupCallListeners: (
    call: Call,
    callId: string | undefined,
    debugId?: string,
    ratePerMinute?: number,
    userBalance?: number
  ) => void;
  setActiveCall: (call: Call | null) => void;
}

export interface CallEventListenerDependencies {
  updateState: StateUpdateCallback;
  updateCallOnConnect: (
    callId: string,
    debugId?: string,
    callSid?: string
  ) => Promise<void>;
  updateCallOnDisconnect: (
    callId: string,
    debugId?: string,
    wasConnected?: boolean,
    isMissedDueToTimeout?: boolean
  ) => Promise<void>;
  startDurationTracking: (connectedTimestamp: number) => void;
  stopDurationTracking: () => void;
  startPerMinuteBilling: (ratePerMinute: number) => void;
  stopPerMinuteBilling: () => void;
  cleanupCallListeners: (call: Call) => void;
  getOutgoingCallTimeout: () => ReturnType<typeof setTimeout> | null;
  setOutgoingCallTimeout: (
    timeout: ReturnType<typeof setTimeout> | null
  ) => void;
  getLastDisconnectWasConnected: () => boolean;
  setLastDisconnectWasConnected: (value: boolean) => void;
  getCurrentDbCallId: () => string | null;
  setCurrentDbCallId: (callId: string | null) => void;
  getState: () => CallState;
  setActiveCall: (call: Call | null) => void;
}

export interface MakeCallParams {
  professionalId: string;
  professionalUserId: string;
  callerId: string;
  type?: 'voice' | 'video';
  urgent?: boolean;
  debugId?: string;
  ratePerMinute?: number;
  userBalance?: number;
  voice: Voice;
  accessToken: string | null;
  getAccessToken: () => Promise<string>;
  setupCallListeners: (
    call: Call,
    callId: string,
    debugId?: string,
    ratePerMinute?: number,
    userBalance?: number
  ) => void;
  updateState: StateUpdateCallback;
  getCallRepository: (debugId?: string) => CallRepository;
}

export interface AcceptIncomingCallParams {
  callId?: string;
  debugId?: string;
  ratePerMinute?: number;
  userBalance?: number;
  callInvite: CallInvite;
  setupCallListeners: (
    call: Call,
    callId: string | undefined,
    debugId?: string,
    ratePerMinute?: number,
    userBalance?: number
  ) => void;
  updateState: StateUpdateCallback;
  updateCallOnConnect: (
    callId: string,
    debugId?: string,
    callSid?: string
  ) => Promise<void>;
  // ✅ REMOVED: startDurationTracking and startPerMinuteBilling
  // These are now handled by CallEventListener when the 'connected' event fires
  // This ensures duration tracking only starts when the call is actually connected,
  // not when accept is called (which may happen before the call is fully connected)
  getCallRepository: (debugId?: string) => CallRepository;
}

export interface RejectIncomingCallParams {
  callId?: string;
  debugId?: string;
  callInvite: CallInvite;
  updateState: StateUpdateCallback;
  getCallRepository: (debugId?: string) => CallRepository;
}

