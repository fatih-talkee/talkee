/**
 * Incoming Call Details Service
 * 
 * Handles loading caller information for incoming calls.
 * Used by IncomingCallHandler component.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { getCallInviteFrom } from './twilioVoice/utils/TwilioTypeGuards';
import type { CallInvite } from '@twilio/voice-react-native-sdk';

export interface IncomingCallDetails {
  callerName: string;
  callerAvatar: string | null;
  callId: string | null;
}

/**
 * Load incoming call details from CallInvite
 */
export async function loadIncomingCallDetails(
  callInvite: CallInvite,
  callSid: string | null | undefined
): Promise<IncomingCallDetails> {
  try {
    // Extract caller ID from CallInvite.from
    const fromField = getCallInviteFrom(callInvite);
    const callerId = fromField?.replace('client:', '') || null;

    logger.debug('[IncomingCallDetails] 📋 Call invite details', {
      from: fromField,
      callerId,
      callSid: callSid?.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });

    if (!callerId) {
      logger.error('[IncomingCallDetails] ❌ No caller ID found', undefined, {
        fromField,
        timestamp: new Date().toISOString(),
      });

      return {
        callerName: 'Unknown Caller',
        callerAvatar: null,
        callId: null,
      };
    }

    // Load caller user info
    const { data: callerUser, error: userError } = await supabase
      .from('users')
      .select('name, avatar_url')
      .eq('id', callerId)
      .single();

    if (userError) {
      logger.error(
        '[IncomingCallDetails] ❌ Failed to load caller user',
        userError,
        {
          callerId,
          errorMessage: userError.message,
          timestamp: new Date().toISOString(),
        }
      );
    }

    // Try to find call record for callId (optional, for logging)
    let callId: string | null = null;
    if (callSid) {
      const { data: foundCall } = await supabase
        .from('calls')
        .select('id')
        .eq('call_sid', callSid)
        .maybeSingle();

      if (foundCall) {
        callId = foundCall.id;
        logger.info('[IncomingCallDetails] ✅ Call record found', {
          callId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const details: IncomingCallDetails = {
      callerName: callerUser?.name || 'Unknown Caller',
      callerAvatar: callerUser?.avatar_url || null,
      callId,
    };

    logger.info('[IncomingCallDetails] ✅ Call details loaded', {
      callerName: callerUser?.name || 'Unknown',
      hasAvatar: !!callerUser?.avatar_url,
      hasCallId: !!callId,
      timestamp: new Date().toISOString(),
    });

    return details;
  } catch (error) {
    logger.error(
      '[IncomingCallDetails] ❌ Failed to load call details',
      error,
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );

    return {
      callerName: 'Unknown Caller',
      callerAvatar: null,
      callId: null,
    };
  }
}

/**
 * Load user's wallet balance
 */
export async function loadUserBalance(userId: string): Promise<number | undefined> {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    return profile?.wallet_balance ? Number(profile.wallet_balance) : undefined;
  } catch (error) {
    logger.error('[IncomingCallDetails] ❌ Failed to load user balance', error, {
      userId,
      timestamp: new Date().toISOString(),
    });
    return undefined;
  }
}

