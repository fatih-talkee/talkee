/**
 * Call Record Lookup Service
 * 
 * Handles all logic for finding call records from the database.
 * Supports multiple lookup strategies with fallbacks.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CallSidExtractor } from './twilioVoice/utils';
import type { Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { getCallInviteFrom } from './twilioVoice/utils/TwilioTypeGuards';

export interface CallRecordMetadata {
  id: string;
  caller_id: string;
  professional_id: string;
  rate_per_minute: number | null;
  call_type: 'voice' | 'video';
  start_time: string | null;
  created_at: string;
  call_sid?: string | null;
  professional?: { user_id: string } | null;
}

export interface CallMetadata {
  professionalId: string | null;
  callType: 'voice' | 'video';
  callStartTime: Date | null;
  otherUserId: string | null;
  isIncomingCall: boolean;
  callRecord: CallRecordMetadata | null;
}

/**
 * Lookup call record by Call SID (primary method)
 */
async function lookupByCallSid(
  callSid: string
): Promise<CallRecordMetadata | null> {
  try {
    const result = await supabase
      .from('calls')
      .select(
        'id, caller_id, professional_id, rate_per_minute, call_type, start_time, created_at, call_sid, professional:professionals!professional_id(user_id)'
      )
      .eq('call_sid', callSid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) {
      const errorCode =
        'code' in result.error
          ? (result.error as { code?: string }).code
          : undefined;
      logger.warn(
        '[CallRecordLookup] ⚠️ Failed to fetch call record by call_sid',
        {
          error: result.error.message,
          code: errorCode,
          callSid: callSid.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }

    if (!result.data) {
      return null;
    }

    // Type assertion needed because Supabase returns professional as array for relations
    const callRecord: CallRecordMetadata = {
      id: result.data.id,
      caller_id: result.data.caller_id,
      professional_id: result.data.professional_id,
      rate_per_minute: result.data.rate_per_minute,
      call_type: result.data.call_type,
      start_time: result.data.start_time,
      created_at: result.data.created_at,
      call_sid: result.data.call_sid || null,
      professional: Array.isArray(result.data.professional)
        ? result.data.professional[0] || null
        : result.data.professional || null,
    };

    logger.info('[CallRecordLookup] ✅ Call record found by call_sid', {
      callSid: callSid.substring(0, 20) + '...',
      callRecordId: callRecord.id,
      timestamp: new Date().toISOString(),
    });

    return callRecord;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (
      errorMessage.includes('column') &&
      errorMessage.includes('call_sid')
    ) {
      logger.debug(
        '[CallRecordLookup] ℹ️ call_sid column does not exist',
        {
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
    logger.error('[CallRecordLookup] ❌ Error looking up by call_sid', {
      error: errorMessage,
      callSid: callSid.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Lookup call record by recent call (fallback method)
 */
async function lookupByRecentCall(
  currentUserId: string,
  callSid?: string | null
): Promise<CallRecordMetadata | null> {
  try {
    // First, get professional IDs for the current user
    const { data: professionals } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', currentUserId);

    const professionalIds = professionals?.map((p) => p.id) || [];

    // Build query: caller_id OR professional_id in list
    let query = supabase
      .from('calls')
      .select(
        'id, caller_id, professional_id, rate_per_minute, call_type, start_time, created_at, call_sid'
      );

    if (professionalIds.length > 0) {
      // Use .or() to match either caller_id OR professional_id in list
      query = query.or(`caller_id.eq.${currentUserId},professional_id.in.(${professionalIds.join(',')})`);
    } else {
      // Only match caller_id if no professional IDs found
      query = query.eq('caller_id', currentUserId);
    }

    const { data: recentCall, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.warn('[CallRecordLookup] ⚠️ Error querying recent call', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    if (!recentCall) {
      return null;
    }

    // Check if call_sid matches (within last 30 seconds)
    const callAge = Date.now() - new Date(recentCall.created_at).getTime();
    const callSidMatches = callSid ? recentCall.call_sid === callSid : false;

    if (callSidMatches || callAge < 30000) {
      // 30 seconds
      logger.info('[CallRecordLookup] ✅ Found recent call record', {
        callRecordId: recentCall.id,
        callSidMatches,
        callAge: `${callAge}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        id: recentCall.id,
        caller_id: recentCall.caller_id,
        professional_id: recentCall.professional_id,
        rate_per_minute: recentCall.rate_per_minute,
        call_type: recentCall.call_type,
        start_time: recentCall.start_time,
        created_at: recentCall.created_at,
        call_sid: recentCall.call_sid || null,
        professional: null,
      };
    }

    return null;
  } catch (err) {
    logger.error('[CallRecordLookup] ❌ Error in recent call lookup', {
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Lookup call record by caller/professional (fallback method)
 */
async function lookupByCallerProfessional(
  currentUserId: string,
  professionalId: string
): Promise<CallRecordMetadata | null> {
  try {
    const { data: recentCall, error } = await supabase
      .from('calls')
      .select(
        'rate_per_minute, caller_id, professional_id, status, call_type, start_time, created_at'
      )
      .or(
        `and(caller_id.eq.${currentUserId},professional_id.eq.${professionalId}),and(professional_id.eq.${professionalId},caller_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.warn(
        '[CallRecordLookup] ⚠️ Error querying call record by caller/professional',
        {
          error: error.message,
          professionalId: professionalId.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }

    if (!recentCall) {
      return null;
    }

    logger.info(
      '[CallRecordLookup] ✅ Call record found by caller/professional',
      {
        professionalId: professionalId.substring(0, 20) + '...',
        callStatus: recentCall.status,
        callType: recentCall.call_type,
        timestamp: new Date().toISOString(),
      }
    );

    return {
      id: '', // Not available in this query
      caller_id: recentCall.caller_id,
      professional_id: recentCall.professional_id,
      rate_per_minute: recentCall.rate_per_minute,
      call_type: recentCall.call_type,
      start_time: recentCall.start_time,
      created_at: recentCall.created_at,
      call_sid: null,
      professional: null,
    };
  } catch (err) {
    logger.error(
      '[CallRecordLookup] ❌ Error in caller/professional lookup',
      {
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }
    );
    return null;
  }
}

/**
 * Extract other user ID from call state
 */
function extractOtherUserId(
  call: Call | null,
  callInvite: CallInvite | null,
  currentUserId: string
): { otherUserId: string | null; isIncomingCall: boolean } {
  // For incoming calls: get from CallInvite
  if (callInvite) {
    const fromField = getCallInviteFrom(callInvite);
    const otherUserId = fromField?.replace('client:', '') || null;
    if (otherUserId) {
      return { otherUserId, isIncomingCall: true };
    }
  }

  // For outgoing calls: get from call parameters
  if (call) {
    let customParams: Record<string, string> = {};
    try {
      const callAny = call as any;
      if (typeof callAny.getCustomParameters === 'function') {
        customParams = callAny.getCustomParameters() || {};
      } else if (callAny._customParameters) {
        customParams = callAny._customParameters || {};
      }
    } catch (e) {
      // Ignore errors accessing custom parameters
    }
    const toParam = customParams.To || customParams.to || null;
    if (toParam) {
      const otherUserId = toParam.replace('client:', '');
      return { otherUserId, isIncomingCall: false };
    }
  }

  return { otherUserId: null, isIncomingCall: false };
}

/**
 * Main function to lookup call metadata
 */
export async function lookupCallMetadata(
  call: Call | null,
  callInvite: CallInvite | null,
  currentUserId: string
): Promise<CallMetadata> {
  const callSid = call
    ? CallSidExtractor.extractFromCall(call, 'CallRecordLookup')
    : null;

  let callRecord: CallRecordMetadata | null = null;
  let professionalId: string | null = null;
  let callType: 'voice' | 'video' = 'voice';
  let callStartTime: Date | null = null;
  let otherUserId: string | null = null;
  let isIncomingCall = false;

  // Step 1: Try lookup by call_sid
  if (callSid) {
    callRecord = await lookupByCallSid(callSid);
  }

  // Step 2: Extract metadata from call record if found
  if (callRecord) {
    professionalId = callRecord.professional_id;
    callType = callRecord.call_type === 'video' ? 'video' : 'voice';

    if (callRecord.start_time) {
      callStartTime = new Date(callRecord.start_time);
    } else if (callRecord.created_at) {
      callStartTime = new Date(callRecord.created_at);
    }

    isIncomingCall = callRecord.caller_id !== currentUserId;

    if (isIncomingCall) {
      otherUserId = callRecord.caller_id;
    } else {
      otherUserId = callRecord.professional?.user_id || callRecord.professional_id;
    }
  } else {
    // Step 3: Fallback to recent call lookup
    if (currentUserId) {
      const recentCall = await lookupByRecentCall(currentUserId, callSid);
      if (recentCall) {
        callRecord = recentCall;
        professionalId = recentCall.professional_id;
        callType = recentCall.call_type === 'video' ? 'video' : 'voice';

        if (recentCall.start_time) {
          callStartTime = new Date(recentCall.start_time);
        } else if (recentCall.created_at) {
          callStartTime = new Date(recentCall.created_at);
        }

        isIncomingCall = recentCall.caller_id !== currentUserId;

        if (isIncomingCall) {
          otherUserId = recentCall.caller_id;
        } else {
          // Get professional's user_id
          const { data: prof } = await supabase
            .from('professionals')
            .select('user_id')
            .eq('id', recentCall.professional_id)
            .maybeSingle();

          otherUserId = prof?.user_id || recentCall.professional_id;
        }
      }
    }

    // Step 4: If still no call record, extract from call state
    if (!otherUserId) {
      const extracted = extractOtherUserId(call, callInvite, currentUserId);
      otherUserId = extracted.otherUserId;
      isIncomingCall = extracted.isIncomingCall;
    }
  }

  return {
    professionalId,
    callType,
    callStartTime,
    otherUserId,
    isIncomingCall,
    callRecord,
  };
}

/**
 * Lookup professional ID for callee (for rate calculation)
 */
export async function lookupProfessionalIdForCallee(
  userId: string
): Promise<string | null> {
  try {
    const { data: prof, error } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.warn('[CallRecordLookup] ⚠️ Failed to lookup professional', {
        error: error.message,
        userId: userId.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    return prof?.id || null;
  } catch (err) {
    logger.error('[CallRecordLookup] ❌ Error looking up professional', {
      error: err instanceof Error ? err.message : String(err),
      userId: userId.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

