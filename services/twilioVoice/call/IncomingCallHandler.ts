import { Call, CallInvite, Voice } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CallStatus as DbCallStatus } from '@/types/database.types';
import { 
  PermissionManager, 
  CallSidExtractor, 
  acceptCallInvite, 
  rejectCallInvite, 
  getCallInviteFrom, 
  getCallState, 
  isCallConnected,
  getCallInviteState,
  isCallInvitePending,
  isCallInviteAccepted,
  getActiveCalls
} from '../utils';
import { CallRepository } from '../database/CallRepository';
import BillingService from '@/services/billingService';
import {
  AcceptIncomingCallParams,
  RejectIncomingCallParams,
  AuthenticationError,
} from '../types';
import { CallValidator } from '../validation';

export class IncomingCallHandler {
  async acceptIncomingCall(params: AcceptIncomingCallParams): Promise<Call> {
    const {
      callId,
      debugId,
      ratePerMinute,
      userBalance,
      callInvite,
      setupCallListeners,
      updateState,
      updateCallOnConnect,
      getCallRepository,
    } = params;

    const acceptStartTime = Date.now();

    try {
      // Validate input parameters
      if (callId) {
        CallValidator.validateCallId(callId, debugId);
      }

      CallValidator.validateRatePerMinute(ratePerMinute, debugId);
      CallValidator.validateUserBalance(userBalance, ratePerMinute, debugId);

      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        throw new AuthenticationError('Cannot accept call - user not authenticated', debugId);
      }

      logger.info('[IncomingCallHandler] 📞 Accepting incoming call', {
      debugId,
      callId,
      inviteSid: CallSidExtractor.extractFromCallInvite(callInvite, debugId),
      timestamp: new Date().toISOString(),
    });

      logger.debug('[IncomingCallHandler] 🎤 Ensuring microphone permission', {
        debugId,
        timestamp: new Date().toISOString(),
      });
      await PermissionManager.ensureMicrophonePermission(debugId);

      const fromField = getCallInviteFrom(callInvite);
      const callerId = fromField?.replace('client:', '');

      // Get caller name for display
      let callerDisplayName = 'Talkee User';
      if (callerId) {
        try {
          const { data: callerUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', callerId)
            .single();

          if (callerUser?.name) {
            callerDisplayName = callerUser.name;
          }
        } catch (error) {
          logger.warn('[IncomingCallHandler] ⚠️ Could not fetch caller name', {
            callerId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.debug('[IncomingCallHandler] 📱 Accepting call with display name', {
        debugId,
        callId,
        callerDisplayName,
        timestamp: new Date().toISOString(),
      });

      const acceptCallStartTime = Date.now();
      let call: Call;
      
      // ✅ Check if call invite is already accepted (e.g., from native notification action)
      const inviteState = getCallInviteState(callInvite);
      const isAlreadyAccepted = isCallInviteAccepted(callInvite);
      const isPending = isCallInvitePending(callInvite);
      
      logger.info('[IncomingCallHandler] 🔍 Checking call invite state before accept', {
        debugId,
        callId,
        inviteState,
        isAlreadyAccepted,
        isPending,
        timestamp: new Date().toISOString(),
      });
      
      if (isAlreadyAccepted) {
        // ✅ Call was already accepted (likely from native notification button)
        // Try to get the active call from the SDK
        logger.info('[IncomingCallHandler] 📞 Call invite already accepted (likely from native notification)', {
          debugId,
          callId,
          inviteState,
          note: 'Attempting to get active call from SDK',
          timestamp: new Date().toISOString(),
        });
        
        try {
          // Try to get active calls from Voice SDK
          const { voice } = await import('@/services/twilioVoice.service').then(m => ({ voice: (m.twilioVoiceService as any).voice }));
          if (voice) {
            const activeCalls = await getActiveCalls(voice);
            const callSid = CallSidExtractor.extractFromCallInvite(callInvite, debugId);
            
            logger.info('[IncomingCallHandler] 🔍 Looking for active call', {
              debugId,
              callId,
              callSid,
              activeCallsCount: activeCalls.size,
              activeCallSids: Array.from(activeCalls.keys()),
              timestamp: new Date().toISOString(),
            });
            
            // Try to find the call by SID
            if (callSid && activeCalls.has(callSid)) {
              call = activeCalls.get(callSid)!;
              logger.info('[IncomingCallHandler] ✅ Found active call by SID', {
                debugId,
                callId,
                callSid,
                timestamp: new Date().toISOString(),
              });
            } else if (activeCalls.size === 1) {
              // If there's exactly one active call, use it
              call = activeCalls.values().next().value;
              logger.info('[IncomingCallHandler] ✅ Using the only active call', {
                debugId,
                callId,
                timestamp: new Date().toISOString(),
              });
            } else {
              // No active call found - the accept from notification might have failed
              logger.warn('[IncomingCallHandler] ⚠️ Call invite accepted but no active call found', {
                debugId,
                callId,
                activeCallsCount: activeCalls.size,
                timestamp: new Date().toISOString(),
              });
              
              // Clear state and throw error
              updateState({ callInvite: null, status: 'idle' });
              throw new Error('Call was accepted from notification but no active call found');
            }
          } else {
            logger.warn('[IncomingCallHandler] ⚠️ Voice SDK not available to get active calls', {
              debugId,
              callId,
              timestamp: new Date().toISOString(),
            });
            updateState({ callInvite: null, status: 'idle' });
            throw new Error('Call was accepted from notification but Voice SDK not available');
          }
        } catch (getActiveCallError) {
          logger.error('[IncomingCallHandler] ❌ Failed to get active call after native accept', getActiveCallError, {
            debugId,
            callId,
            errorMessage: getActiveCallError instanceof Error ? getActiveCallError.message : String(getActiveCallError),
            timestamp: new Date().toISOString(),
          });
          updateState({ callInvite: null, status: 'idle' });
          throw getActiveCallError;
        }
      } else {
        // ✅ Normal flow - call invite is pending, accept it
        try {
          logger.info('[IncomingCallHandler] 🔧 About to call callInvite.accept()', {
            debugId,
            callId,
            callerDisplayName,
            callInviteSid: CallSidExtractor.extractFromCallInvite(callInvite, debugId),
            timestamp: new Date().toISOString(),
          });

          call = await acceptCallInvite(callInvite, {
            contactHandle: callerDisplayName,
          });
          const acceptElapsed = Date.now() - acceptCallStartTime;

          logger.info(
            '[IncomingCallHandler] ✅ callInvite.accept() completed successfully',
            {
              debugId,
              callId,
              callSid: call?.getSid?.(),
              acceptElapsed: `${acceptElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (acceptError) {
          const acceptElapsed = Date.now() - acceptCallStartTime;
          const errorMessage = acceptError instanceof Error ? acceptError.message : String(acceptError);
          
          // ✅ Check if error is "already accepted" - this can happen due to race condition
          if (errorMessage.includes('accepted') && errorMessage.includes('pending')) {
            logger.warn('[IncomingCallHandler] ⚠️ Call invite was accepted concurrently (race condition)', {
              debugId,
              callId,
              acceptElapsed: `${acceptElapsed}ms`,
              errorMessage,
              note: 'Attempting to get active call from SDK',
              timestamp: new Date().toISOString(),
            });
            
            // Try to get active call
            try {
              const { voice } = await import('@/services/twilioVoice.service').then(m => ({ voice: (m.twilioVoiceService as any).voice }));
              if (voice) {
                const activeCalls = await getActiveCalls(voice);
                if (activeCalls.size > 0) {
                  call = activeCalls.values().next().value;
                  logger.info('[IncomingCallHandler] ✅ Got active call after race condition', {
                    debugId,
                    callId,
                    activeCallsCount: activeCalls.size,
                    timestamp: new Date().toISOString(),
                  });
                } else {
                  throw new Error('No active call found after race condition');
                }
              } else {
                throw new Error('Voice SDK not available');
              }
            } catch (raceError) {
              logger.error('[IncomingCallHandler] ❌ Failed to recover from race condition', raceError, {
                debugId,
                callId,
                timestamp: new Date().toISOString(),
              });
              updateState({ callInvite: null, status: 'idle' });
              throw acceptError; // Throw original error
            }
          } else {
            logger.error(
              '[IncomingCallHandler] ❌ Failed to accept call invite (may be expired/cancelled)',
              acceptError,
              {
                debugId,
                callId,
                acceptElapsed: `${acceptElapsed}ms`,
                errorMessage,
                timestamp: new Date().toISOString(),
              }
            );

            // Clear the call invite from state if accept failed
            updateState({ callInvite: null, status: 'idle' });

            throw acceptError;
          }
        }
      }

      // ✅ Save call SID if available
      if (callId) {
        await this.saveCallSid(callInvite, callId, debugId, getCallRepository);
      }

      logger.debug('[IncomingCallHandler] 🔧 Setting active call', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });

      // Update state to connecting
      updateState({ status: 'connecting', call, callInvite: null });

      logger.debug('[IncomingCallHandler] 🔧 Setting up call listeners', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });

      setupCallListeners(call, callId, debugId, ratePerMinute, userBalance);

      try {
        const callState = getCallState(call);
        const isAlreadyConnected = isCallConnected(call);

        if (isAlreadyConnected && callId) {
          logger.info(
            '[IncomingCallHandler] 📞 Call already connected after accept, updating start_time',
            {
              debugId,
              callId,
              callState,
              timestamp: new Date().toISOString(),
            }
          );

          // Update start_time immediately
          const callSid = CallSidExtractor.extractFromCallInvite(callInvite, debugId);
          await updateCallOnConnect(callId, debugId, callSid || undefined);

          // ✅ REMOVED: Don't update state to 'connected' or start duration tracking here
          // CallEventListener will handle this when the 'connected' event fires
          // This ensures duration tracking only starts when the call is actually connected,
          // not when accept is called (which may happen before the call is fully connected)
          // The same applies to billing - CallEventListener will start it on the connected event
          logger.debug(
            '[IncomingCallHandler] ⏭️ Skipping state update and duration tracking - CallEventListener will handle on connected event',
            {
              debugId,
              callId,
              timestamp: new Date().toISOString(),
            }
          );
        }
      } catch (stateCheckError) {
        logger.warn(
          '[IncomingCallHandler] ⚠️ Could not check call state after accept',
          {
            debugId,
            callId,
            errorMessage:
              stateCheckError instanceof Error
                ? stateCheckError.message
                : String(stateCheckError),
            timestamp: new Date().toISOString(),
          }
        );
      }

      return call;
    } catch (error) {
      const totalElapsed = Date.now() - acceptStartTime;
      logger.error('[IncomingCallHandler] ❌ Failed to accept incoming call', error, {
        debugId,
        callId,
        elapsed: `${totalElapsed}ms`,
      });
      throw error;
    }
  }

  async rejectIncomingCall(params: RejectIncomingCallParams): Promise<void> {
    const { callId, debugId, callInvite, updateState, getCallRepository } = params;

    const rejectStartTime = Date.now();

    try {
      if (callId) {
        CallValidator.validateCallId(callId, debugId);
      }

      logger.info('[IncomingCallHandler] 📞 Rejecting incoming call', {
      debugId,
      callId,
      inviteSid: CallSidExtractor.extractFromCallInvite(callInvite, debugId),
      timestamp: new Date().toISOString(),
    });

    try {
      await rejectCallInvite(callInvite);
      logger.info('[IncomingCallHandler] ✅ Call invite rejected', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });
    } catch (rejectError) {
      logger.error(
        '[IncomingCallHandler] ❌ Failed to reject call invite',
        rejectError,
        {
          debugId,
          callId,
          errorMessage:
            rejectError instanceof Error
              ? rejectError.message
              : String(rejectError),
          timestamp: new Date().toISOString(),
        }
      );
    }

    // ✅ Update call record as MISSED
    const callSid = CallSidExtractor.extractFromCallInvite(callInvite, debugId);
    const callIdToUpdate = callId || callSid;

    if (callIdToUpdate) {
      logger.info(
        '[IncomingCallHandler] 📝 Updating call record as MISSED',
        {
          debugId,
          callId: callIdToUpdate,
          isCallSid:
            callIdToUpdate.startsWith('CA') && callIdToUpdate.length === 34,
          hasParamsCallId: !!callId,
          hasCallSid: !!callSid,
          timestamp: new Date().toISOString(),
        }
      );

      try {
        const repository = getCallRepository(debugId);
        await repository.updateCallStatus(
          callIdToUpdate,
          DbCallStatus.MISSED,
          debugId,
          new Date().toISOString()
        );
        logger.info('[IncomingCallHandler] ✅ Call record updated as MISSED', {
          debugId,
          callId: callIdToUpdate,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.warn(
          '[IncomingCallHandler] ⚠️ Failed to update call as MISSED',
          {
            debugId,
            callId: callIdToUpdate,
            errorMessage: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }
        );

        // ✅ Fallback: If we have call_sid but update by UUID failed, try updating by call_sid
        if (callSid && callIdToUpdate !== callSid) {
          try {
            const repository = getCallRepository(debugId);
            await repository.updateCallStatus(
              callSid,
              DbCallStatus.MISSED,
              debugId,
              new Date().toISOString()
            );
            logger.info(
              '[IncomingCallHandler] ✅ Call record updated as MISSED (fallback method)',
              {
                debugId,
                callSid: callSid.substring(0, 20) + '...',
                timestamp: new Date().toISOString(),
              }
            );
          } catch (fallbackError) {
            logger.warn(
              '[IncomingCallHandler] ⚠️ Fallback update also failed',
              {
                debugId,
                callSid: callSid.substring(0, 20) + '...',
                errorMessage:
                  fallbackError instanceof Error
                    ? fallbackError.message
                    : String(fallbackError),
                timestamp: new Date().toISOString(),
              }
            );
          }
        }
      }
    }

    // Clear call invite from state
    updateState({ callInvite: null, status: 'idle' });
    } catch (error) {
      const totalElapsed = Date.now() - rejectStartTime;
      logger.error('[IncomingCallHandler] ❌ Failed to reject incoming call', error, {
        debugId,
        callId,
        elapsed: `${totalElapsed}ms`,
      });
      throw error;
    }
  }

  private async saveCallSid(
    callInvite: CallInvite,
    callId: string,
    debugId?: string,
    getCallRepository?: (debugId?: string) => CallRepository
  ): Promise<void> {
    try {
      logger.debug('[IncomingCallHandler] 🔍 Extracting invite SID', {
        debugId,
        callId,
        timestamp: new Date().toISOString(),
      });

      const inviteSid = CallSidExtractor.extractFromCallInvite(callInvite, debugId);
      if (inviteSid) {
        logger.info(
          '[IncomingCallHandler] 💾 Saving invite call_sid to database',
          {
            debugId,
            callId,
            inviteSid: inviteSid.substring(0, 20) + '...',
            timestamp: new Date().toISOString(),
          }
        );

        if (getCallRepository) {
          const repository = getCallRepository(debugId);
          await repository.updateCallSid(callId, inviteSid, debugId);
        } else {
          const repository = new CallRepository(supabase, debugId);
          await repository.updateCallSid(callId, inviteSid, debugId);
        }
      } else {
        logger.warn('[IncomingCallHandler] ⚠️ No invite SID found', {
          debugId,
          callId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      logger.warn('[IncomingCallHandler] ⚠️ call_sid persist failed', {
        debugId,
        callId,
        error: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

