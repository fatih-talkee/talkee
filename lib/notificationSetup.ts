// lib/notificationSetup.ts - UPDATED VERSION

import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { logger } from '@/lib/logger';
import { twilioVoiceService } from '@/services/twilioVoice.service';

/**
 * Setup notification handler
 * ✅ NOTE: Handler is now configured in services/notifications.service.ts
 * ✅ This function is kept for backward compatibility but does nothing
 * ✅ The handler in notifications.service.ts already handles:
 *    - Foreground: Suppress incoming call notifications (IncomingCallHandler modal handles it)
 *    - Background/Closed: Show incoming call notifications with action buttons
 */
export function setupNotificationHandler() {
  logger.debug('[NotificationSetup] ⏭️ Notification handler already configured in notifications.service.ts', {
    timestamp: new Date().toISOString(),
  });
  // Handler is already configured in services/notifications.service.ts
  // No need to set it again (would override the existing one)
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  logger.info('[NotificationSetup] 🔔 Requesting notification permissions', {
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  });

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    logger.debug('[NotificationSetup] 📊 Existing permission status', {
      status: existingStatus,
      timestamp: new Date().toISOString(),
    });

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      logger.info('[NotificationSetup] 🙏 Requesting permissions...', {
        timestamp: new Date().toISOString(),
      });

      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;

      logger.info('[NotificationSetup] 📋 Permission request result', {
        status: finalStatus,
        granted: finalStatus === 'granted',
        timestamp: new Date().toISOString(),
      });
    }

    if (finalStatus !== 'granted') {
      logger.warn('[NotificationSetup] ⚠️ Notification permissions denied', {
        status: finalStatus,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    // ✅ Configure notification categories with action buttons
    await configureNotificationCategories();

    logger.info('[NotificationSetup] ✅ Notification permissions granted', {
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    logger.error(
      '[NotificationSetup] ❌ Failed to request permissions',
      error,
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
    return false;
  }
}

/**
 * Configure notification categories with action buttons
 * ✅ This makes Accept/Decline buttons work on notifications
 */
async function configureNotificationCategories() {
  logger.info('[NotificationSetup] 🔧 Configuring notification categories', {
    timestamp: new Date().toISOString(),
  });

  try {
    // ✅ INCOMING_CALL category with Accept/Decline actions
    await Notifications.setNotificationCategoryAsync('INCOMING_CALL', [
      {
        identifier: 'ACCEPT_CALL',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'DECLINE_CALL',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    logger.info('[NotificationSetup] ✅ Notification categories configured', {
      categories: ['INCOMING_CALL'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      '[NotificationSetup] ❌ Failed to configure categories',
      error,
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
  }
}

/**
 * Setup notification response listener
 * Handles when user taps notification or action buttons
 */
export function setupNotificationResponseListener(
  onAccept: (callId: string) => void,
  onDecline: (callId: string) => void
) {
  logger.info(
    '[NotificationSetup] 🔧 Setting up notification response listener',
    {
      timestamp: new Date().toISOString(),
    }
  );

  const subscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const responseStartTime = Date.now();
      
      try {
        const { notification, actionIdentifier } = response;
        
        logger.info('[NotificationSetup] 📲 Notification response received (raw)', {
          actionIdentifier,
          notificationId: notification.request.identifier,
          notificationTitle: notification.request.content.title,
          notificationBody: notification.request.content.body,
          timestamp: new Date().toISOString(),
        });
        
        // ✅ FIX: Try multiple paths for data field (Expo Notifications API may vary)
        let data: any = {};
        try {
          // Try multiple paths for data extraction
          data = 
            notification.request.content.data || 
            (notification.request.content as any)?.data ||
            (notification.request as any)?.data ||
            (notification as any)?.data ||
            {};
          
          // Log the full notification structure for debugging
          logger.debug('[NotificationSetup] 🔍 Notification structure', {
            hasContent: !!notification.request.content,
            hasContentData: !!notification.request.content.data,
            contentKeys: Object.keys(notification.request.content || {}),
            dataKeys: Object.keys(data || {}),
            dataType: typeof data,
            dataStringified: JSON.stringify(data).substring(0, 200),
            timestamp: new Date().toISOString(),
          });
        } catch (dataError) {
          logger.error('[NotificationSetup] ❌ Error extracting notification data', dataError, {
            errorMessage: dataError instanceof Error ? dataError.message : String(dataError),
            errorStack: dataError instanceof Error ? dataError.stack : undefined,
            notificationStructure: {
              hasRequest: !!notification.request,
              hasContent: !!notification.request?.content,
              contentKeys: notification.request?.content ? Object.keys(notification.request.content) : [],
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        // ✅ FIX: Also try alternative field names for call_id
        const callId = 
          (data?.call_id as string | undefined) ||
          (data?.callId as string | undefined) ||
          (data?.id as string | undefined);

        logger.info('[NotificationSetup] 📲 Notification response parsed', {
          actionIdentifier,
          hasCallId: !!callId,
          callId,
          dataType: data?.type,
          notificationId: notification.request.identifier,
          notificationTitle: notification.request.content.title,
          notificationBody: notification.request.content.body,
          dataKeys: Object.keys(data || {}),
          callerId: data?.caller_id,
          callerName: data?.caller_name,
          callType: data?.call_type,
          urgent: data?.urgent,
          timestamp: new Date().toISOString(),
        });

        // ✅ FIX: If data is empty or not incoming_call, try to get call_id from active callInvite
        if (!callId || data?.type !== 'incoming_call') {
          logger.warn('[NotificationSetup] ⚠️ Invalid notification response or missing call_id', {
            hasCallId: !!callId,
            callId,
            dataType: data?.type,
            expectedType: 'incoming_call',
            dataKeys: Object.keys(data || {}),
            timestamp: new Date().toISOString(),
          });
          
          // ✅ FIX: Try to get call_id from active callInvite as fallback
          // Retry logic: Sometimes callInvite takes a moment to be stored in state
          // Increased retry count and delay for foreground scenarios where SDK might be slower
          let activeCallInvite = null;
          const maxRetries = 25; // Increased from 10 to 25 (5 seconds total)
          const retryDelay = 200; // 200ms between retries
          
          logger.info('[NotificationSetup] 🔄 Starting callInvite retry loop', {
            maxRetries,
            retryDelay: `${retryDelay}ms`,
            totalWaitTime: `${maxRetries * retryDelay}ms`,
            actionIdentifier,
            timestamp: new Date().toISOString(),
          });
          
          for (let retry = 0; retry < maxRetries; retry++) {
            try {
              const activeState = twilioVoiceService.getState();
              activeCallInvite = activeState.callInvite;
              
              logger.debug('[NotificationSetup] 🔍 Checking for active callInvite', {
                retry: retry + 1,
                maxRetries,
                hasActiveCallInvite: !!activeCallInvite,
                status: activeState.status,
                hasCall: !!activeState.call,
                timestamp: new Date().toISOString(),
              });
              
              if (activeCallInvite) {
                logger.info('[NotificationSetup] ✅ callInvite found in state', {
                  retry: retry + 1,
                  maxRetries,
                  status: activeState.status,
                  timestamp: new Date().toISOString(),
                });
                break; // Found callInvite, exit retry loop
              }
              
              // Wait before next retry (except on last attempt)
              if (retry < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              }
            } catch (retryError) {
              logger.warn('[NotificationSetup] ⚠️ Error checking callInvite state', {
                retry: retry + 1,
                errorMessage: retryError instanceof Error ? retryError.message : String(retryError),
                timestamp: new Date().toISOString(),
              });
              if (retry < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              }
            }
          }
          
          if (activeCallInvite) {
            try {
              const fallbackCallSid = activeCallInvite.getCallSid();
              logger.info('[NotificationSetup] 🔄 Using fallback call_id from active callInvite', {
                fallbackCallSid,
                timestamp: new Date().toISOString(),
              });
              
              // ✅ Use fallback call_id if available
              if (fallbackCallSid) {
                const fallbackCallId = fallbackCallSid;
                
                // Handle action buttons with fallback call_id
                if (actionIdentifier === 'ACCEPT_CALL' || actionIdentifier === 'expo.modules.notifications.actions.DEFAULT') {
                  logger.info('[NotificationSetup] ✅ User accepted call from notification (fallback)', {
                    callId: fallbackCallId,
                    actionIdentifier,
                    timestamp: new Date().toISOString(),
                  });
                  await onAccept(fallbackCallId);
                } else if (actionIdentifier === 'DECLINE_CALL') {
                  logger.info('[NotificationSetup] ❌ User declined call from notification (fallback)', {
                    callId: fallbackCallId,
                    actionIdentifier,
                    timestamp: new Date().toISOString(),
                  });
                  await onDecline(fallbackCallId);
                }
                return;
              }
            } catch (fallbackError) {
              logger.error('[NotificationSetup] ❌ Error getting callSid from callInvite', fallbackError, {
                errorMessage: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                errorStack: fallbackError instanceof Error ? fallbackError.stack : undefined,
                timestamp: new Date().toISOString(),
              });
            }
          } else {
            logger.error('[NotificationSetup] ❌ callInvite not found after all retries', {
              maxRetries,
              retryDelay: `${retryDelay}ms`,
              totalWaitTime: `${maxRetries * retryDelay}ms`,
              actionIdentifier,
              finalState: twilioVoiceService.getState(),
              timestamp: new Date().toISOString(),
            });
            
            // ✅ FIX: Even if callInvite is not found, try to accept/decline with callId from notification
            // This handles cases where the notification has call_id but callInvite hasn't been stored yet
            if (callId && (actionIdentifier === 'ACCEPT_CALL' || actionIdentifier === 'expo.modules.notifications.actions.DEFAULT')) {
              logger.info('[NotificationSetup] 🔄 Attempting to accept call with notification callId (callInvite not in state yet)', {
                callId,
                actionIdentifier,
                note: 'This might work if callInvite becomes available during accept process',
                timestamp: new Date().toISOString(),
              });
              // Try to accept anyway - the acceptIncomingCall function will check for callInvite
              try {
                await onAccept(callId);
                return;
              } catch (acceptError) {
                logger.error('[NotificationSetup] ❌ Failed to accept call without callInvite', acceptError, {
                  callId,
                  errorMessage: acceptError instanceof Error ? acceptError.message : String(acceptError),
                  timestamp: new Date().toISOString(),
                });
              }
            } else if (callId && actionIdentifier === 'DECLINE_CALL') {
              logger.info('[NotificationSetup] 🔄 Attempting to decline call with notification callId', {
                callId,
                actionIdentifier,
                timestamp: new Date().toISOString(),
              });
              try {
                await onDecline(callId);
                return;
              } catch (declineError) {
                logger.error('[NotificationSetup] ❌ Failed to decline call', declineError, {
                  callId,
                  errorMessage: declineError instanceof Error ? declineError.message : String(declineError),
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
          
          logger.error('[NotificationSetup] ❌ Cannot process notification - missing call_id and no active callInvite', {
            actionIdentifier,
            callId,
            dataType: data?.type,
            hasCallId: !!callId,
            hasCallInvite: !!activeCallInvite,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Handle action buttons
        try {
          // ✅ FIX: For ACCEPT_CALL, check if callInvite exists even if callId is missing
          if (actionIdentifier === 'ACCEPT_CALL') {
            // First try to get callInvite from state (in case callId is missing)
            let effectiveCallId = callId;
            if (!effectiveCallId) {
              const state = twilioVoiceService.getState();
              if (state.callInvite) {
                const callSid = state.callInvite.getCallSid();
                if (callSid) {
                  effectiveCallId = callSid;
                  logger.info('[NotificationSetup] 🔄 Using callSid from callInvite for ACCEPT_CALL', {
                    callSid: effectiveCallId,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            }
            
            if (!effectiveCallId) {
              logger.error('[NotificationSetup] ❌ Cannot accept call - missing callId and callInvite', {
                actionIdentifier,
                hasCallId: !!callId,
                timestamp: new Date().toISOString(),
              });
              return;
            }
            
            logger.info(
              '[NotificationSetup] ✅ User accepted call from notification',
              {
                callId: effectiveCallId,
                actionIdentifier,
                callerId: data?.caller_id,
                callerName: data?.caller_name,
                callType: data?.call_type,
                urgent: data?.urgent,
                timestamp: new Date().toISOString(),
              }
            );
            await onAccept(effectiveCallId);
          } else if (actionIdentifier === 'DECLINE_CALL') {
            logger.info(
              '[NotificationSetup] ❌ User declined call from notification',
              {
                callId,
                actionIdentifier,
                callerId: data?.caller_id,
                callerName: data?.caller_name,
                callType: data?.call_type,
                urgent: data?.urgent,
                timestamp: new Date().toISOString(),
              }
            );
            await onDecline(callId);
          } else {
            // Default tap (no action button)
            logger.info('[NotificationSetup] 👆 User tapped notification (no action)', {
              callId,
              actionIdentifier,
              callerId: data?.caller_id,
              callerName: data?.caller_name,
              callType: data?.call_type,
              urgent: data?.urgent,
              note: 'Defaulting to accept',
              timestamp: new Date().toISOString(),
            });
            await onAccept(callId); // Default to opening the call
          }
        } catch (actionError) {
          logger.error('[NotificationSetup] ❌ Error handling notification action', actionError, {
            actionIdentifier,
            callId,
            hasCallId: !!callId,
            dataType: data?.type,
            errorMessage: actionError instanceof Error ? actionError.message : String(actionError),
            errorStack: actionError instanceof Error ? actionError.stack : undefined,
            errorType: actionError instanceof Error ? actionError.constructor.name : typeof actionError,
            timestamp: new Date().toISOString(),
          });
          
          // ✅ Re-throw to be caught by outer try-catch for comprehensive error handling
          throw actionError;
        }

        const responseElapsed = Date.now() - responseStartTime;
        logger.debug('[NotificationSetup] ⏱️ Notification response processed', {
          actionIdentifier,
          callId,
          responseElapsed: `${responseElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const responseElapsed = Date.now() - responseStartTime;
        logger.error('[NotificationSetup] ❌ Fatal error in notification response handler', error, {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          responseElapsed: `${responseElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  logger.info(
    '[NotificationSetup] ✅ Notification response listener registered',
    {
      timestamp: new Date().toISOString(),
    }
  );

  return subscription;
}
