import { Call, CallInvite } from '@twilio/voice-react-native-sdk';

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

export interface CallIdentifier {
  id: string;
  callSid?: string;
  format: 'uuid' | 'call_sid' | 'unknown';
}

export interface CallConnectionInfo {
  callerId: string;
  calleeId: string;
  callType: 'voice' | 'video';
  urgent: boolean;
  ratePerMinute?: number;
}

export interface CallMetadata {
  callId: string;
  debugId?: string;
  ratePerMinute?: number;
  userBalance?: number;
  startTime?: string;
  endTime?: string;
}

