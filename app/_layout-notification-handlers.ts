/**
 * Notification Handlers for App Layout
 * 
 * Extracted from _layout.tsx to improve code organization and maintainability.
 * Handles accept/decline call actions from push notifications.
 */

import { logger } from '@/lib/logger';

interface NotificationHandlersConfig {
  onAccept: (callId: string) => Promise<void>;
  onDecline: (callId: string) => Promise<void>;
}

/**
 * Creates notification handlers for accept/decline call actions
 */
export function createNotificationHandlers(
  config: NotificationHandlersConfig
) {
  const ongoingAcceptOperations = new Set<string>();
  const ongoingDeclineOperations = new Set<string>();

  const handleAccept = async (callId: string) => {
    const acceptStartTime = Date.now();
    logger.info('[App] ✅ User accepted call from notification', {
      callId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Check if accept is already in progress
      if (ongoingAcceptOperations.has(callId)) {
        logger.warn(
          '[App] ⚠️ Accept operation already in progress for this callId, skipping',
          {
            callId,
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      // Check current state - if call is already connected/connecting, skip
      try {
        const { twilioVoiceService } = await import('@/services/twilioVoice.service');
        const currentState = twilioVoiceService.getState();
        if (
          currentState.status === 'connected' ||
          currentState.status === 'connecting'
        ) {
          logger.info(
            '[App] ⏭️ Call already connected/connecting, skipping accept',
            {
              callId,
              status: currentState.status,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }
      } catch (stateError) {
        logger.debug('[App] ⚠️ Could not check state, continuing', {
          callId,
          errorMessage:
            stateError instanceof Error
              ? stateError.message
              : String(stateError),
          timestamp: new Date().toISOString(),
        });
      }

      ongoingAcceptOperations.add(callId);

      // Ensure Twilio Voice SDK is initialized
      let sdkInitialized = false;
      const sdkInitMaxAttempts = 10;
      const sdkInitDelay = 200;

      for (let sdkAttempt = 0; sdkAttempt < sdkInitMaxAttempts; sdkAttempt++) {
        try {
          const { twilioVoiceService } = await import('@/services/twilioVoice.service');
          const state = twilioVoiceService.getState();
          sdkInitialized = true;
          logger.debug('[App] ✅ Twilio Voice SDK is ready', {
            callId,
            sdkAttempt: sdkAttempt + 1,
            status: state.status,
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (sdkError) {
          logger.debug('[App] ⏳ Waiting for Twilio Voice SDK to initialize', {
            callId,
            sdkAttempt: sdkAttempt + 1,
            maxAttempts: sdkInitMaxAttempts,
            errorMessage:
              sdkError instanceof Error ? sdkError.message : String(sdkError),
            timestamp: new Date().toISOString(),
          });
          await new Promise((resolve) => setTimeout(resolve, sdkInitDelay));
        }
      }

      if (!sdkInitialized) {
        logger.error(
          '[App] ❌ Twilio Voice SDK not initialized after waiting',
          undefined,
          {
            callId,
            maxAttempts: sdkInitMaxAttempts,
            totalElapsed: `${Date.now() - acceptStartTime}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        ongoingAcceptOperations.delete(callId);
        return;
      }

      // Wait for callInvite to be available
      let callInviteFound = false;
      const maxAttempts = 5;
      const attemptDelay = 500;

      logger.info('[App] 🔍 Starting callInvite wait loop', {
        callId,
        maxAttempts,
        attemptDelay: `${attemptDelay}ms`,
        timestamp: new Date().toISOString(),
      });

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const attemptStartTime = Date.now();
          const { twilioVoiceService } = await import('@/services/twilioVoice.service');
          const currentState = twilioVoiceService.getState();
          const attemptElapsed = Date.now() - attemptStartTime;

          logger.debug('[App] 🔍 Checking callInvite availability', {
            callId,
            attempt: attempt + 1,
            maxAttempts,
            hasCallInvite: !!currentState.callInvite,
            status: currentState.status,
            hasCall: !!currentState.call,
            attemptElapsed: `${attemptElapsed}ms`,
            timestamp: new Date().toISOString(),
          });

          if (currentState.callInvite) {
            callInviteFound = true;
            const waitElapsed = Date.now() - acceptStartTime;

            // Check if call invite is still valid
            try {
              const callInviteSid = currentState.callInvite.getCallSid?.();
              logger.info('[App] 📞 Found callInvite, validating before accept', {
                callId,
                callInviteSid,
                attempt: attempt + 1,
                hasCallInvite: !!currentState.callInvite,
                status: currentState.status,
                waitElapsed: `${waitElapsed}ms`,
                timestamp: new Date().toISOString(),
              });
            } catch (validateError) {
              logger.error(
                '[App] ❌ Call invite validation failed (likely expired/cancelled)',
                validateError,
                {
                  callId,
                  attempt: attempt + 1,
                  errorMessage:
                    validateError instanceof Error
                      ? validateError.message
                      : String(validateError),
                  timestamp: new Date().toISOString(),
                }
              );
              break;
            }

            logger.info('[App] 📞 Accepting incoming call from notification', {
              callId,
              attempt: attempt + 1,
              hasCallInvite: !!currentState.callInvite,
              status: currentState.status,
              waitElapsed: `${waitElapsed}ms`,
              timestamp: new Date().toISOString(),
            });

            try {
              const acceptCallStartTime = Date.now();
              const { twilioVoiceService } = await import('@/services/twilioVoice.service');
              await twilioVoiceService.acceptIncomingCall({
                callId: callId || undefined,
                debugId: `notification-accept-${Date.now()}`,
              });
              const acceptCallElapsed = Date.now() - acceptCallStartTime;
              const totalElapsed = Date.now() - acceptStartTime;

              logger.info('[App] ✅ Call accepted successfully from notification', {
                callId,
                acceptCallElapsed: `${acceptCallElapsed}ms`,
                totalElapsed: `${totalElapsed}ms`,
                timestamp: new Date().toISOString(),
              });
              ongoingAcceptOperations.delete(callId);
              break;
            } catch (acceptError) {
              const errorMessage =
                acceptError instanceof Error
                  ? acceptError.message
                  : String(acceptError);
              if (errorMessage.includes('already in progress')) {
                logger.info(
                  '[App] ⏭️ Accept already in progress (likely duplicate notification), ignoring',
                  {
                    callId,
                    attempt: attempt + 1,
                    timestamp: new Date().toISOString(),
                  }
                );
                ongoingAcceptOperations.delete(callId);
                return;
              }

              logger.error(
                '[App] ❌ Failed to accept call (call invite may be expired/cancelled)',
                acceptError,
                {
                  callId,
                  attempt: attempt + 1,
                  errorMessage,
                  errorStack:
                    acceptError instanceof Error ? acceptError.stack : undefined,
                  timestamp: new Date().toISOString(),
                }
              );
              ongoingAcceptOperations.delete(callId);
              break;
            }
          } else {
            logger.debug('[App] ⏳ Waiting for callInvite...', {
              callId,
              attempt: attempt + 1,
              maxAttempts,
              status: currentState.status,
              hasCall: !!currentState.call,
              attemptElapsed: `${attemptElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
            await new Promise((resolve) => setTimeout(resolve, attemptDelay));
          }
        } catch (attemptError) {
          logger.error('[App] ❌ Error during callInvite wait attempt', attemptError, {
            callId,
            attempt: attempt + 1,
            maxAttempts,
            errorMessage:
              attemptError instanceof Error
                ? attemptError.message
                : String(attemptError),
            timestamp: new Date().toISOString(),
          });
          await new Promise((resolve) => setTimeout(resolve, attemptDelay));
        }
      }

      if (!callInviteFound) {
        const totalElapsed = Date.now() - acceptStartTime;
        const { twilioVoiceService } = await import('@/services/twilioVoice.service');
        logger.warn('[App] ⚠️ No active callInvite found after waiting', {
          callId,
          maxAttempts,
          totalElapsed: `${totalElapsed}ms`,
          finalStatus: twilioVoiceService.getState().status,
          timestamp: new Date().toISOString(),
        });
      }

      ongoingAcceptOperations.delete(callId);
    } catch (error) {
      const totalElapsed = Date.now() - acceptStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already in progress')) {
        logger.info(
          '[App] ⏭️ Accept already in progress (likely duplicate notification), ignoring',
          {
            callId,
            timestamp: new Date().toISOString(),
          }
        );
        ongoingAcceptOperations.delete(callId);
        return;
      }

      logger.error('[App] ❌ Failed to accept call from notification', error, {
        callId,
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      ongoingAcceptOperations.delete(callId);
    }
  };

  const handleDecline = async (callId: string) => {
    const declineStartTime = Date.now();
    logger.info('[App] ❌ User declined call from notification', {
      callId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Check if decline is already in progress
      if (ongoingDeclineOperations.has(callId)) {
        logger.warn(
          '[App] ⚠️ Decline operation already in progress for this callId, skipping',
          {
            callId,
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      // Check current state - if call is already connected, skip decline
      try {
        const { twilioVoiceService } = await import('@/services/twilioVoice.service');
        const currentState = twilioVoiceService.getState();
        if (currentState.status === 'connected') {
          logger.info('[App] ⏭️ Call already connected, skipping decline', {
            callId,
            status: currentState.status,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } catch (stateError) {
        logger.debug('[App] ⚠️ Could not check state, continuing', {
          callId,
          errorMessage:
            stateError instanceof Error ? stateError.message : String(stateError),
          timestamp: new Date().toISOString(),
        });
      }

      ongoingDeclineOperations.add(callId);

      // Ensure Twilio Voice SDK is initialized
      let sdkInitialized = false;
      const sdkInitMaxAttempts = 10;
      const sdkInitDelay = 200;

      for (let sdkAttempt = 0; sdkAttempt < sdkInitMaxAttempts; sdkAttempt++) {
        try {
          const { twilioVoiceService } = await import('@/services/twilioVoice.service');
          const state = twilioVoiceService.getState();
          sdkInitialized = true;
          logger.debug('[App] ✅ Twilio Voice SDK is ready', {
            callId,
            sdkAttempt: sdkAttempt + 1,
            status: state.status,
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (sdkError) {
          logger.debug('[App] ⏳ Waiting for Twilio Voice SDK to initialize', {
            callId,
            sdkAttempt: sdkAttempt + 1,
            maxAttempts: sdkInitMaxAttempts,
            errorMessage:
              sdkError instanceof Error ? sdkError.message : String(sdkError),
            timestamp: new Date().toISOString(),
          });
          await new Promise((resolve) => setTimeout(resolve, sdkInitDelay));
        }
      }

      if (!sdkInitialized) {
        logger.error(
          '[App] ❌ Twilio Voice SDK not initialized after waiting',
          undefined,
          {
            callId,
            maxAttempts: sdkInitMaxAttempts,
            totalElapsed: `${Date.now() - declineStartTime}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        ongoingDeclineOperations.delete(callId);
        return;
      }

      // Wait for callInvite to be available
      let callInviteFound = false;
      const maxAttempts = 3;
      const attemptDelay = 500;

      logger.info('[App] 🔍 Starting callInvite wait loop for decline', {
        callId,
        maxAttempts,
        attemptDelay: `${attemptDelay}ms`,
        timestamp: new Date().toISOString(),
      });

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const attemptStartTime = Date.now();
          const { twilioVoiceService } = await import('@/services/twilioVoice.service');
          const currentState = twilioVoiceService.getState();
          const attemptElapsed = Date.now() - attemptStartTime;

          logger.debug('[App] 🔍 Checking callInvite for decline', {
            callId,
            attempt: attempt + 1,
            maxAttempts,
            hasCallInvite: !!currentState.callInvite,
            status: currentState.status,
            hasCall: !!currentState.call,
            attemptElapsed: `${attemptElapsed}ms`,
            timestamp: new Date().toISOString(),
          });

          if (currentState.callInvite) {
            callInviteFound = true;
            const waitElapsed = Date.now() - declineStartTime;

            // Check if call invite is still valid
            try {
              const callInviteSid = currentState.callInvite.getCallSid?.();
              logger.info('[App] 📞 Found callInvite, validating before reject', {
                callId,
                callInviteSid,
                attempt: attempt + 1,
                hasCallInvite: !!currentState.callInvite,
                status: currentState.status,
                waitElapsed: `${waitElapsed}ms`,
                timestamp: new Date().toISOString(),
              });
            } catch (validateError) {
              logger.error(
                '[App] ❌ Call invite validation failed (likely expired/cancelled)',
                validateError,
                {
                  callId,
                  attempt: attempt + 1,
                  errorMessage:
                    validateError instanceof Error
                      ? validateError.message
                      : String(validateError),
                  timestamp: new Date().toISOString(),
                }
              );
              break;
            }

            logger.info('[App] 📞 Rejecting incoming call from notification', {
              callId,
              attempt: attempt + 1,
              hasCallInvite: !!currentState.callInvite,
              status: currentState.status,
              waitElapsed: `${waitElapsed}ms`,
              timestamp: new Date().toISOString(),
            });

            try {
              const rejectCallStartTime = Date.now();
              const { twilioVoiceService } = await import('@/services/twilioVoice.service');
              await twilioVoiceService.rejectIncomingCall({
                callId: callId || undefined,
                debugId: `notification-decline-${Date.now()}`,
              });
              const rejectCallElapsed = Date.now() - rejectCallStartTime;
              const totalElapsed = Date.now() - declineStartTime;

              logger.info('[App] ✅ Call rejected successfully from notification', {
                callId,
                rejectCallElapsed: `${rejectCallElapsed}ms`,
                totalElapsed: `${totalElapsed}ms`,
                timestamp: new Date().toISOString(),
              });
              break;
            } catch (rejectError) {
              logger.error(
                '[App] ❌ Failed to reject call (call invite may be expired/cancelled)',
                rejectError,
                {
                  callId,
                  attempt: attempt + 1,
                  errorMessage:
                    rejectError instanceof Error
                      ? rejectError.message
                      : String(rejectError),
                  timestamp: new Date().toISOString(),
                }
              );
              ongoingDeclineOperations.delete(callId);
              break;
            }
          } else {
            logger.debug('[App] ⏳ Waiting for callInvite to reject...', {
              callId,
              attempt: attempt + 1,
              maxAttempts,
              status: currentState.status,
              hasCall: !!currentState.call,
              attemptElapsed: `${attemptElapsed}ms`,
              timestamp: new Date().toISOString(),
            });
            await new Promise((resolve) => setTimeout(resolve, attemptDelay));
          }
        } catch (attemptError) {
          logger.error('[App] ❌ Error during callInvite wait attempt', attemptError, {
            callId,
            attempt: attempt + 1,
            maxAttempts,
            errorMessage:
              attemptError instanceof Error
                ? attemptError.message
                : String(attemptError),
            timestamp: new Date().toISOString(),
          });
          await new Promise((resolve) => setTimeout(resolve, attemptDelay));
        }
      }

      if (!callInviteFound) {
        const totalElapsed = Date.now() - declineStartTime;
        const { twilioVoiceService } = await import('@/services/twilioVoice.service');
        logger.warn('[App] ⚠️ No active callInvite found after waiting', {
          callId,
          maxAttempts,
          totalElapsed: `${totalElapsed}ms`,
          finalStatus: twilioVoiceService.getState().status,
          timestamp: new Date().toISOString(),
        });
      }

      ongoingDeclineOperations.delete(callId);
    } catch (error) {
      const totalElapsed = Date.now() - declineStartTime;
      logger.error('[App] ❌ Failed to reject call from notification', error, {
        callId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      ongoingDeclineOperations.delete(callId);
    }
  };

  return {
    handleAccept,
    handleDecline,
  };
}

