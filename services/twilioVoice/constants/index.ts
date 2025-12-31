/**
 * Timeout constants
 */
export const OUTGOING_CALL_TIMEOUT_MS = 60 * 1000; // 60 seconds
export const INCOMING_CALL_TIMEOUT_MS = 60 * 1000; // 60 seconds

/**
 * Call status constants
 */
export const CALL_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
} as const;

/**
 * Call type constants
 */
export const CALL_TYPE = {
  VOICE: 'voice',
  VIDEO: 'video',
} as const;

/**
 * Twilio error codes
 */
export const TWILIO_ERROR_CODES = {
  ALREADY_REGISTERED: '31409',
  CONFLICT: 'Conflict',
} as const;

/**
 * Call SID format constants
 */
export const CALL_SID_PREFIX = 'CA';
export const CALL_SID_LENGTH = 34;
export const UUID_LENGTH = 36;

/**
 * Billing constants
 */
export const BILLING = {
  LOW_BALANCE_THRESHOLD_MULTIPLIER: 2, // 2 minutes worth
  DURATION_UPDATE_INTERVAL_MS: 1000, // 1 second
  PER_MINUTE_CHECK_INTERVAL_MS: 1000, // 1 second
} as const;

