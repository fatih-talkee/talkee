import { Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { logger } from '@/lib/logger';
import { CALL_SID_PREFIX, CALL_SID_LENGTH, UUID_LENGTH } from '../constants';

/**
 * Utility class for extracting Call SID from Twilio Call/CallInvite objects
 */
export class CallSidExtractor {
  /**
   * Extract Call SID from a Call object
   * @param call - Twilio Call object
   * @param debugId - Optional debug ID for logging
   * @returns Call SID string or undefined if not found
   */
  static extractFromCall(call: Call, debugId?: string): string | undefined {
    try {
      const anyCall = call as any;
      const callSid =
        anyCall?.callSid ??
        anyCall?.sid ??
        (typeof anyCall?.getSid === 'function' ? anyCall.getSid() : undefined);

      logger.debug('[CallSidExtractor] 📊 Call SID extraction result', {
        debugId,
        hasCallSid: !!callSid,
        callSid: callSid?.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
      });

      return callSid;
    } catch (error) {
      logger.warn('[CallSidExtractor] ⚠️ Failed to extract Call SID', {
        debugId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }
  }

  /**
   * Extract Call SID from a CallInvite object
   * @param callInvite - Twilio CallInvite object
   * @param debugId - Optional debug ID for logging
   * @returns Call SID string or undefined if not found
   */
  static extractFromCallInvite(
    callInvite: CallInvite,
    debugId?: string
  ): string | undefined {
    try {
      const inviteSid = callInvite.getCallSid?.();

      logger.debug('[CallSidExtractor] 📊 CallInvite SID extraction result', {
        debugId,
        hasInviteSid: !!inviteSid,
        inviteSid: inviteSid?.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
      });

      return inviteSid;
    } catch (error) {
      logger.warn('[CallSidExtractor] ⚠️ Failed to extract CallInvite SID', {
        debugId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }
  }

  /**
   * Check if a string is a Twilio Call SID
   * Call SID format: CA... (34 chars, starts with CA)
   * @param value - String to check
   * @returns true if it's a Call SID, false otherwise
   */
  static isCallSid(value: string): boolean {
    return value.startsWith(CALL_SID_PREFIX) && value.length === CALL_SID_LENGTH;
  }

  /**
   * Check if a string is a UUID
   * UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
   * @param value - String to check
   * @returns true if it's a UUID, false otherwise
   */
  static isUuid(value: string): boolean {
    return value.includes('-') && value.length === UUID_LENGTH;
  }

  /**
   * Detect the format of a call identifier
   * @param callId - Call identifier to check
   * @returns Object with format detection results
   */
  static detectFormat(callId: string): {
    isCallSid: boolean;
    isUuid: boolean;
    format: 'call_sid' | 'uuid' | 'unknown';
  } {
    const isCallSid = this.isCallSid(callId);
    const isUuid = this.isUuid(callId);

    let format: 'call_sid' | 'uuid' | 'unknown' = 'unknown';
    if (isCallSid) {
      format = 'call_sid';
    } else if (isUuid) {
      format = 'uuid';
    }

    logger.debug('[CallSidExtractor] 🔍 Format detection', {
      callId: callId.substring(0, 20) + '...',
      isCallSid,
      isUuid,
      format,
      callIdLength: callId.length,
      timestamp: new Date().toISOString(),
    });

    return { isCallSid, isUuid, format };
  }
}

