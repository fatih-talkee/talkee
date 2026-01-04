import { Voice, Call } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { callsService } from '@/services/calls.service';
import { usersService } from '@/services/supabase/user.service';
import { CallStatus as DbCallStatus, CallType } from '@/types/database.types';
import { PermissionManager, CallSidExtractor, getCallState } from '../utils';
import { CallRepository } from '../database/CallRepository';
import {
  MakeCallParams,
  AuthenticationError,
  SdkInitializationError,
  CallOperationError,
} from '../types';
import { CallValidator } from '../validation';

export class OutgoingCallHandler {
  async makeCall(params: MakeCallParams): Promise<Call> {
    const {
      professionalId,
      professionalUserId,
      callerId,
      type = 'voice',
      urgent = false,
      debugId,
      ratePerMinute,
      userBalance,
      voice,
      accessToken,
      getAccessToken,
      setupCallListeners,
      updateState,
      getCallRepository,
    } = params;

    const makeCallStartTime = Date.now();
    let createdCallId: string | null = null;

    try {
      // Validate input parameters
      CallValidator.validateCallConnectionInfo(
        {
          callerId,
          calleeId: professionalUserId,
          callType: type,
          urgent,
          ratePerMinute,
        },
        debugId
      );

      CallValidator.validateRatePerMinute(ratePerMinute, debugId);
      CallValidator.validateUserBalance(userBalance, ratePerMinute, debugId);

      const currentUser = await usersService.getCurrentUser();
      if (!currentUser) {
        throw new AuthenticationError(
          'Cannot make call - user not authenticated',
          debugId
        );
      }

      if (!voice) {
        throw new SdkInitializationError('Voice SDK not initialized', debugId);
      }

      let finalAccessToken = accessToken;
      if (!finalAccessToken) {
        logger.info('[OutgoingCallHandler] 🔑 No access token, fetching...', {
          debugId,
          timestamp: new Date().toISOString(),
        });
        await getAccessToken();
        finalAccessToken = accessToken; // Will be updated by getAccessToken
        logger.debug('[OutgoingCallHandler] ✅ Access token obtained', {
          debugId,
          timestamp: new Date().toISOString(),
        });
      }

      logger.debug('[OutgoingCallHandler] 🎤 Ensuring microphone permission', {
        debugId,
        timestamp: new Date().toISOString(),
      });
      await PermissionManager.ensureMicrophonePermission(debugId);

      logger.info('[OutgoingCallHandler] 📞 Initiating call...', {
        debugId,
        professionalId,
        professionalUserId,
        callerId,
        type,
        urgent,
        timestamp: new Date().toISOString(),
      });

      const callRecordStartTime = Date.now();
      logger.debug(
        '[OutgoingCallHandler] 📝 Creating call record in database',
        {
          debugId,
          professionalId,
          type,
          urgent,
          timestamp: new Date().toISOString(),
        }
      );

      const callRecord = await callsService.initiateCall(
        professionalId,
        type as CallType,
        urgent,
        ratePerMinute
      );
      const callRecordElapsed = Date.now() - callRecordStartTime;

      if (!callRecord) {
        throw new CallOperationError(
          'Failed to create call record',
          'initiateCall',
          debugId
        );
      }
      createdCallId = callRecord.id;

      logger.info('[OutgoingCallHandler] ✅ Call record created', {
        debugId,
        callId: callRecord.id,
        status: callRecord.status,
        ratePerMinute: callRecord.rate_per_minute,
        elapsed: `${callRecordElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // ✅ REMOVED: Push notification sending
      // Twilio Voice SDK already sends its own push notification when an incoming call arrives.
      // Sending an additional push notification would be redundant and could cause duplicate notifications.
      // The Twilio push notification is handled by the Twilio Voice SDK and triggers the CallInvite event.
      logger.debug(
        '[OutgoingCallHandler] ⏭️ Skipping push notification - Twilio SDK handles incoming call push',
        {
          debugId,
          callId: callRecord.id,
          professionalUserId,
          note: 'Twilio Voice SDK sends push notification automatically when call invite is received',
          timestamp: new Date().toISOString(),
        }
      );

      if (!voice) {
        logger.error(
          '[OutgoingCallHandler] ❌ Voice SDK was cleaned up before call could be made',
          undefined,
          {
            debugId,
            callId: callRecord.id,
            timestamp: new Date().toISOString(),
          }
        );
        throw new SdkInitializationError(
          'Voice SDK was cleaned up before call could be made',
          debugId
        );
      }

      // Get caller info for display name
      const { data: callerUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', callerId)
        .single();

      const callerDisplayName = callerUser?.name || 'Talkee User';

      logger.info('[OutgoingCallHandler] 📡 Connecting via Twilio SDK...', {
        debugId,
        to: professionalUserId,
        from: callerId,
        callerDisplayName,
        callId: callRecord.id,
        callType: type,
        urgent,
        accessTokenLength: finalAccessToken?.length,
        voiceInitialized: !!voice,
        timestamp: new Date().toISOString(),
      });

      const connectParams = {
        params: {
          To: professionalUserId,
          From: callerId,
          CallId: callRecord.id,
          CallType: type,
          Urgent: urgent ? 'true' : 'false',
        },
        contactHandle: callerDisplayName,
      };

      logger.debug('[OutgoingCallHandler] 🔧 Calling voice.connect', {
        debugId,
        connectParams,
        callerDisplayName,
        timestamp: new Date().toISOString(),
      });

      const connectStartTime = Date.now();
      const call = await voice.connect(finalAccessToken!, connectParams);
      const connectElapsed = Date.now() - connectStartTime;

      logger.info(
        '[OutgoingCallHandler] ✅ voice.connect returned call object',
        {
          debugId,
          callId: callRecord.id,
          callState: getCallState(call),
          connectElapsed: `${connectElapsed}ms`,
          timestamp: new Date().toISOString(),
        }
      );

      // Extract and save call SID
      await this.saveCallSid(call, callRecord.id, debugId, getCallRepository);

      logger.debug(
        '[OutgoingCallHandler] 🔧 Setting active call and listeners',
        {
          debugId,
          callId: callRecord.id,
          timestamp: new Date().toISOString(),
        }
      );

      setupCallListeners(
        call,
        callRecord.id,
        debugId,
        ratePerMinute || Number(callRecord.rate_per_minute),
        userBalance
      );

      // Update state to connecting
      updateState({ status: 'connecting', call });

      const totalElapsed = Date.now() - makeCallStartTime;
      logger.info('[OutgoingCallHandler] ✅ Call initiated successfully', {
        debugId,
        callId: callRecord.id,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return call;
    } catch (error) {
      const totalElapsed = Date.now() - makeCallStartTime;
      logger.error('[OutgoingCallHandler] ❌ Call error', error, {
        debugId,
        createdCallId,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      if (createdCallId) {
        await this.cancelCallRecord(createdCallId, debugId);
      }

      updateState({
        status: 'idle',
        call: null,
        error: error as Error,
      });

      throw error;
    }
  }

  private async saveCallSid(
    call: Call,
    callId: string,
    debugId?: string,
    getCallRepository?: (debugId?: string) => CallRepository
  ): Promise<void> {
    try {
      logger.debug('[OutgoingCallHandler] 🔍 Extracting call SID', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });

      const callSid = CallSidExtractor.extractFromCall(call, debugId);

      if (callSid) {
        logger.info('[OutgoingCallHandler] 💾 Saving call_sid to database', {
          debugId,
          callId,
          callSid: callSid.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        });

        if (getCallRepository) {
          const repository = getCallRepository(debugId);
          await repository.updateCallSid(callId, callSid, debugId);
        } else {
          const repository = new CallRepository(supabase, debugId);
          await repository.updateCallSid(callId, callSid, debugId);
        }
      } else {
        logger.warn(
          '[OutgoingCallHandler] ⚠️ No call SID found in call object',
          {
            debugId,
            callId,
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (e) {
      logger.warn(
        '[OutgoingCallHandler] ⚠️ call_sid persist failed (non-fatal)',
        {
          debugId,
          callId,
          error: e instanceof Error ? e.message : String(e),
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  private async cancelCallRecord(
    callId: string,
    debugId?: string
  ): Promise<void> {
    logger.info(
      '[OutgoingCallHandler] 🗑️ Cancelling call record due to error',
      {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      }
    );

    const { error: updateErr } = await supabase
      .from('calls')
      .update({
        status: DbCallStatus.CANCELLED,
        end_time: new Date().toISOString(),
      })
      .eq('id', callId);

    if (updateErr) {
      logger.warn('[OutgoingCallHandler] ⚠️ Failed to cancel call record', {
        debugId,
        callId,
        errorMessage: updateErr.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.info('[OutgoingCallHandler] ✅ Cancelled call record', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
