// lib/notificationSetup.ts - UPDATED VERSION

import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { logger } from '@/lib/logger';
import { twilioVoiceService } from '@/services/twilioVoice.service';
import { CallSidExtractor } from '@/services/twilioVoice/utils';
import { setupNotificationHandler as registerGlobalHandler } from '@/services/notifications.service';

/**
 * Setup notification handler
 */
export function setupNotificationHandler() {
  logger.info('[NotificationSetup] 🔧 Registering global notification handler', {
    timestamp: new Date().toISOString(),
  });
  
  // ✅ Call the actual implementation from notifications.service
  registerGlobalHandler();
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

  // ✅ FIX: Track processed notifications to prevent duplicate handling
  const processedNotifications = new Map<string, number>();
  const DEDUP_WINDOW_MS = 3000; // 3 seconds

  const subscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const responseStartTime = Date.now();

      logger.info(
        '[NotificationSetup] 🎯 LISTENER CALLED - Notification response received',
        {
          timestamp: new Date().toISOString(),
        }
      );

      try {
        const { notification, actionIdentifier } = response;

        logger.info(
          '[NotificationSetup] 📲 Notification response received (raw)',
          {
            actionIdentifier,
            notificationId: notification.request.identifier,
            notificationTitle: notification.request.content.title,
            notificationBody: notification.request.content.body,
            fullContent: JSON.stringify(notification.request.content).substring(
              0,
              500
            ),
            fullRequest: JSON.stringify(notification.request).substring(0, 500),
            timestamp: new Date().toISOString(),
          }
        );

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
            dataStringified: JSON.stringify(data).substring(0, 500),
            fullContentStringified: JSON.stringify(
              notification.request.content
            ).substring(0, 500),
            fullRequestStringified: JSON.stringify(
              notification.request
            ).substring(0, 500),
            timestamp: new Date().toISOString(),
          });
        } catch (dataError) {
          logger.error(
            '[NotificationSetup] ❌ Error extracting notification data',
            dataError,
            {
              errorMessage:
                dataError instanceof Error
                  ? dataError.message
                  : String(dataError),
              errorStack:
                dataError instanceof Error ? dataError.stack : undefined,
              notificationStructure: {
                hasRequest: !!notification.request,
                hasContent: !!notification.request?.content,
                contentKeys: notification.request?.content
                  ? Object.keys(notification.request.content)
                  : [],
              },
              timestamp: new Date().toISOString(),
            }
          );
        }

        // ✅ FIX: Also try alternative field names for call_id
        // Also check notification title/body for call_id or caller_id patterns
        const notificationTitle = notification.request.content.title || '';
        const notificationBody = notification.request.content.body || '';

        // Try to extract from data first
        let callId =
          (data?.call_id as string | undefined) ||
          (data?.callId as string | undefined) ||
          (data?.id as string | undefined);

        // If not found in data, try to extract from title/body (e.g., "client:06c22cbd-...")
        if (!callId) {
          // Look for UUID pattern in title/body
          const uuidPattern =
            /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
          const titleMatch = notificationTitle.match(uuidPattern);
          const bodyMatch = notificationBody.match(uuidPattern);

          // Also check for "client:" prefix which might indicate caller_id
          const clientPattern = /client:([0-9a-f-]+)/i;
          const titleClientMatch = notificationTitle.match(clientPattern);
          const bodyClientMatch = notificationBody.match(clientPattern);

          logger.debug(
            '[NotificationSetup] 🔍 Extracting call_id from title/body',
            {
              notificationTitle,
              notificationBody,
              titleMatch: titleMatch?.[0],
              bodyMatch: bodyMatch?.[0],
              titleClientMatch: titleClientMatch?.[1],
              bodyClientMatch: bodyClientMatch?.[1],
              timestamp: new Date().toISOString(),
            }
          );
        }

        // ✅ FIX: Deduplication - Check if this notification was recently processed
        const notificationId = notification.request.identifier || 'unknown';
        const dedupKey = callId || notificationId;
        const now = Date.now();
        const lastProcessed = processedNotifications.get(dedupKey);

        if (lastProcessed && now - lastProcessed < DEDUP_WINDOW_MS) {
          logger.warn(
            '[NotificationSetup] ⏭️ Skipping duplicate notification',
            {
              dedupKey,
              lastProcessed: new Date(lastProcessed).toISOString(),
              timeSinceLastProcessed: `${now - lastProcessed}ms`,
              actionIdentifier,
              callId,
              notificationId,
              timestamp: new Date().toISOString(),
            }
          );
          return; // Skip duplicate notification
        }

        // Mark this notification as processed
        processedNotifications.set(dedupKey, now);

        // Clean up old entries (older than DEDUP_WINDOW_MS)
        for (const [key, timestamp] of processedNotifications.entries()) {
          if (now - timestamp > DEDUP_WINDOW_MS) {
            processedNotifications.delete(key);
          }
        }

        // ✅ FIX: Also check for caller_id in data (might be in notification but not extracted)
        const callerId =
          (data?.caller_id as string | undefined) ||
          (data?.callerId as string | undefined) ||
          (data?.from as string | undefined) ||
          (data?.From as string | undefined);

        // Extract caller_id from title/body if not in data (e.g., "client:06c22cbd-...")
        let extractedCallerId = callerId;
        if (!extractedCallerId) {
          const clientPattern = /client:([0-9a-f-]+)/i;
          const titleClientMatch = notificationTitle.match(clientPattern);
          const bodyClientMatch = notificationBody.match(clientPattern);
          extractedCallerId = titleClientMatch?.[1] || bodyClientMatch?.[1];
        }

        logger.info('[NotificationSetup] 📲 Notification response parsed', {
          actionIdentifier,
          hasCallId: !!callId,
          callId,
          hasCallerId: !!callerId,
          callerId,
          extractedCallerId,
          dataType: data?.type,
          notificationId: notification.request.identifier,
          notificationTitle: notification.request.content.title,
          notificationBody: notification.request.content.body,
          dataKeys: Object.keys(data || {}),
          dataFull: JSON.stringify(data),
          callerName: data?.caller_name,
          callType: data?.call_type,
          urgent: data?.urgent,
          timestamp: new Date().toISOString(),
        });

        // ✅ FIX: If data is empty or not incoming_call, try to get call_id from active callInvite
        if (!callId || data?.type !== 'incoming_call') {
          logger.warn(
            '[NotificationSetup] ⚠️ Invalid notification response or missing call_id',
            {
              hasCallId: !!callId,
              callId,
              dataType: data?.type,
              expectedType: 'incoming_call',
              dataKeys: Object.keys(data || {}),
              timestamp: new Date().toISOString(),
            }
          );

          // ✅ FIX: Try to get call_id from active callInvite as fallback
          // Retry logic: When app is closed/background, SDK needs time to initialize and receive CallInvite event
          // Step 1: Wait for SDK to initialize
          // Step 2: Wait for CallInvite event to arrive
          let activeCallInvite = null;
          const maxRetries = 50; // Increased to 50 (10 seconds total) for cold start scenarios
          const retryDelay = 200; // 200ms between retries

          logger.info(
            '[NotificationSetup] 🔄 Starting callInvite retry loop (waiting for SDK initialization)',
            {
              maxRetries,
              retryDelay: `${retryDelay}ms`,
              totalWaitTime: `${maxRetries * retryDelay}ms`,
              actionIdentifier,
              hasCallId: !!callId,
              callId,
              hasCallerId: !!extractedCallerId,
              extractedCallerId,
              dataType: data?.type,
              timestamp: new Date().toISOString(),
            }
          );

          for (let retry = 0; retry < maxRetries; retry++) {
            try {
              // ✅ FIX: First check if SDK is initialized
              const isSdkInitialized = twilioVoiceService.isSdkInitialized();

              if (!isSdkInitialized) {
                logger.debug(
                  '[NotificationSetup] ⏳ SDK not initialized yet, waiting...',
                  {
                    retry: retry + 1,
                    maxRetries,
                    timestamp: new Date().toISOString(),
                  }
                );
                // Wait before next retry
                if (retry < maxRetries - 1) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, retryDelay)
                  );
                }
                continue;
              }

              // SDK is initialized, check for callInvite
              const activeState = twilioVoiceService.getState();
              activeCallInvite = activeState.callInvite;

              logger.debug(
                '[NotificationSetup] 🔍 Checking for active callInvite',
                {
                  retry: retry + 1,
                  maxRetries,
                  isSdkInitialized,
                  hasActiveCallInvite: !!activeCallInvite,
                  status: activeState.status,
                  hasCall: !!activeState.call,
                  timestamp: new Date().toISOString(),
                }
              );

              if (activeCallInvite) {
                logger.info(
                  '[NotificationSetup] ✅ callInvite found in state',
                  {
                    retry: retry + 1,
                    maxRetries,
                    status: activeState.status,
                    hasCallInvite: !!activeCallInvite,
                    hasCall: !!activeState.call,
                    timestamp: new Date().toISOString(),
                  }
                );
                break; // Found callInvite, exit retry loop
              }

              // Wait before next retry (except on last attempt)
              if (retry < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              }
            } catch (retryError) {
              logger.warn(
                '[NotificationSetup] ⚠️ Error checking callInvite state',
                {
                  retry: retry + 1,
                  errorMessage:
                    retryError instanceof Error
                      ? retryError.message
                      : String(retryError),
                  timestamp: new Date().toISOString(),
                }
              );
              if (retry < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              }
            }
          }

          if (activeCallInvite) {
            try {
              const fallbackCallSid = CallSidExtractor.extractFromCallInvite(
                activeCallInvite,
                'NotificationSetup'
              );
              logger.info(
                '[NotificationSetup] 🔄 Using fallback call_id from active callInvite',
                {
                  fallbackCallSid: fallbackCallSid
                    ? fallbackCallSid.substring(0, 20) + '...'
                    : null,
                  hasFallbackCallSid: !!fallbackCallSid,
                  originalCallId: callId,
                  hasOriginalCallId: !!callId,
                  actionIdentifier,
                  timestamp: new Date().toISOString(),
                }
              );

              // ✅ Use fallback call_id if available
              if (fallbackCallSid) {
                const fallbackCallId = fallbackCallSid;

                // Handle action buttons with fallback call_id
                if (
                  actionIdentifier === 'ACCEPT_CALL' ||
                  actionIdentifier ===
                    'expo.modules.notifications.actions.DEFAULT'
                ) {
                  logger.info(
                    '[NotificationSetup] ✅ User accepted call from notification (fallback)',
                    {
                      callId: fallbackCallId,
                      actionIdentifier,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  await onAccept(fallbackCallId);
                  return;
                } else if (actionIdentifier === 'DECLINE_CALL') {
                  logger.info(
                    '[NotificationSetup] ❌ User declined call from notification (fallback)',
                    {
                      callId: fallbackCallId,
                      actionIdentifier,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  await onDecline(fallbackCallId);
                  return;
                }
                // If actionIdentifier doesn't match, continue to second section
              } else {
                // fallbackCallSid not found, but activeCallInvite exists
                // Continue to second section to handle with hasActiveIncomingCall check
                logger.info(
                  '[NotificationSetup] ⚠️ activeCallInvite found but fallbackCallSid not available, continuing to second section',
                  {
                    actionIdentifier,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } catch (fallbackError) {
              logger.error(
                '[NotificationSetup] ❌ Error getting callSid from callInvite',
                fallbackError,
                {
                  errorMessage:
                    fallbackError instanceof Error
                      ? fallbackError.message
                      : String(fallbackError),
                  errorStack:
                    fallbackError instanceof Error
                      ? fallbackError.stack
                      : undefined,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          } else {
            logger.warn(
              '[NotificationSetup] ⚠️ callInvite not found after all retries (this is expected if the call was already handled)',
              {
                maxRetries,
                retryDelay: `${retryDelay}ms`,
                totalWaitTime: `${maxRetries * retryDelay}ms`,
                actionIdentifier,
                finalState: twilioVoiceService.getState(),
                timestamp: new Date().toISOString(),
              }
            );

            // ✅ FIX: Even if callInvite is not found, try to accept/decline with callId from notification
            // This handles cases where the notification has call_id but callInvite hasn't been stored yet
            if (
              callId &&
              (actionIdentifier === 'ACCEPT_CALL' ||
                actionIdentifier ===
                  'expo.modules.notifications.actions.DEFAULT')
            ) {
              logger.info(
                '[NotificationSetup] 🔄 Attempting to accept call with notification callId (callInvite not in state yet)',
                {
                  callId,
                  actionIdentifier,
                  note: 'This might work if callInvite becomes available during accept process',
                  timestamp: new Date().toISOString(),
                }
              );
              // Try to accept anyway - the acceptIncomingCall function will check for callInvite
              try {
                await onAccept(callId);
                return;
              } catch (acceptError) {
                logger.error(
                  '[NotificationSetup] ❌ Failed to accept call without callInvite',
                  acceptError,
                  {
                    callId,
                    errorMessage:
                      acceptError instanceof Error
                        ? acceptError.message
                        : String(acceptError),
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } else if (callId && actionIdentifier === 'DECLINE_CALL') {
              logger.info(
                '[NotificationSetup] 🔄 Attempting to decline call with notification callId',
                {
                  callId,
                  actionIdentifier,
                  timestamp: new Date().toISOString(),
                }
              );
              try {
                await onDecline(callId);
                return;
              } catch (declineError) {
                logger.error(
                  '[NotificationSetup] ❌ Failed to decline call',
                  declineError,
                  {
                    callId,
                    errorMessage:
                      declineError instanceof Error
                        ? declineError.message
                        : String(declineError),
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            }
          }

          // If activeCallInvite exists but fallbackCallSid not found, continue to second section
          // Don't return here, let the second section handle it with hasActiveIncomingCall check
          if (!activeCallInvite) {
            logger.warn(
              '[NotificationSetup] ⚠️ Cannot process notification - missing call_id and no active callInvite found in SDK state',
              {
                actionIdentifier,
                callId,
                dataType: data?.type,
                hasCallId: !!callId,
                hasCallInvite: !!activeCallInvite,
                timestamp: new Date().toISOString(),
              }
            );
            return;
          }
          // activeCallInvite exists, continue to second section
        }

        // Handle action buttons
        try {
          // ✅ FIX: Check if there's an active incoming call (even if notification data is empty)
          // Twilio push notifications may not include data, but we can check the current state
          const currentState = twilioVoiceService.getState();
          const hasActiveIncomingCall =
            currentState.status === 'ringing' && !!currentState.callInvite;

          // ✅ FIX: Handle both ACCEPT_CALL and DEFAULT action identifiers
          // Twilio push notifications may use DEFAULT action identifier when Accept button is tapped
          // Also handle cases where actionIdentifier might be undefined or empty (default tap on notification)
          // If notification data is empty but there's an active incoming call, treat DEFAULT as Accept
          const isAcceptAction =
            actionIdentifier === 'ACCEPT_CALL' ||
            (actionIdentifier ===
              'expo.modules.notifications.actions.DEFAULT' &&
              hasActiveIncomingCall) ||
            (!actionIdentifier &&
              (data?.type === 'incoming_call' || hasActiveIncomingCall)); // Default tap on incoming call notification

          if (isAcceptAction) {
            // First try to get callInvite from state (in case callId is missing)
            let effectiveCallId = callId;
            if (!effectiveCallId) {
              const state = twilioVoiceService.getState();
              logger.info(
                '[NotificationSetup] 🔍 Attempting to extract callSid from callInvite',
                {
                  actionIdentifier,
                  hasCallId: !!callId,
                  hasCallInvite: !!state.callInvite,
                  status: state.status,
                  timestamp: new Date().toISOString(),
                }
              );
              if (state.callInvite) {
                const callSid = CallSidExtractor.extractFromCallInvite(
                  state.callInvite,
                  'NotificationSetup'
                );
                logger.info(
                  '[NotificationSetup] 📊 CallSid extraction result',
                  {
                    actionIdentifier,
                    hasCallSid: !!callSid,
                    callSid: callSid ? callSid.substring(0, 20) + '...' : null,
                    timestamp: new Date().toISOString(),
                  }
                );
                if (callSid) {
                  effectiveCallId = callSid;
                  logger.info(
                    '[NotificationSetup] 🔄 Using callSid from callInvite for ACCEPT_CALL',
                    {
                      callSid: effectiveCallId.substring(0, 20) + '...',
                      timestamp: new Date().toISOString(),
                    }
                  );
                } else {
                  logger.warn(
                    '[NotificationSetup] ⚠️ Failed to extract callSid from callInvite',
                    {
                      actionIdentifier,
                      hasCallInvite: !!state.callInvite,
                      status: state.status,
                      timestamp: new Date().toISOString(),
                    }
                  );
                }
              } else {
                logger.warn('[NotificationSetup] ⚠️ No callInvite in state', {
                  actionIdentifier,
                  status: state.status,
                  timestamp: new Date().toISOString(),
                });
              }
            }

            if (!effectiveCallId) {
              logger.error(
                '[NotificationSetup] ❌ Cannot accept call - missing callId and callInvite',
                {
                  actionIdentifier,
                  hasCallId: !!callId,
                  hasActiveIncomingCall,
                  currentState: twilioVoiceService.getState(),
                  timestamp: new Date().toISOString(),
                }
              );
              return;
            }

            logger.info(
              '[NotificationSetup] ✅ User accepted call from notification',
              {
                callId: effectiveCallId,
                actionIdentifier,
                isDefaultAction:
                  actionIdentifier ===
                  'expo.modules.notifications.actions.DEFAULT',
                callerId: data?.caller_id,
                callerName: data?.caller_name,
                callType: data?.call_type,
                urgent: data?.urgent,
                timestamp: new Date().toISOString(),
              }
            );
            await onAccept(effectiveCallId);
          } else if (actionIdentifier === 'DECLINE_CALL') {
            // Get callId from state if not in notification
            let effectiveCallId = callId;
            if (!effectiveCallId) {
              const state = twilioVoiceService.getState();
              if (state.callInvite) {
                const callSid = CallSidExtractor.extractFromCallInvite(
                  state.callInvite,
                  'NotificationSetup'
                );
                if (callSid) {
                  effectiveCallId = callSid;
                }
              }
            }

            if (!effectiveCallId) {
              logger.error(
                '[NotificationSetup] ❌ Cannot decline call - missing callId and callInvite',
                {
                  actionIdentifier,
                  hasCallId: !!callId,
                  timestamp: new Date().toISOString(),
                }
              );
              return;
            }

            logger.info(
              '[NotificationSetup] ❌ User declined call from notification',
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
            await onDecline(effectiveCallId);
          } else {
            // Default tap (no action button) - only accept if it's an incoming call
            if (data?.type === 'incoming_call' && callId) {
              logger.info(
                '[NotificationSetup] 👆 User tapped incoming call notification (default action)',
                {
                  callId,
                  actionIdentifier,
                  callerId: data?.caller_id,
                  callerName: data?.caller_name,
                  callType: data?.call_type,
                  urgent: data?.urgent,
                  note: 'Defaulting to accept incoming call',
                  timestamp: new Date().toISOString(),
                }
              );
              await onAccept(callId); // Default to accepting the call
            } else if (hasActiveIncomingCall && !callId) {
              // If there's an active incoming call but no callId in notification,
              // try to get callId from callInvite
              const state = twilioVoiceService.getState();
              if (state.callInvite) {
                const callSid = CallSidExtractor.extractFromCallInvite(
                  state.callInvite,
                  'NotificationSetup'
                );
                if (callSid) {
                  logger.info(
                    '[NotificationSetup] 👆 User tapped notification with active incoming call (default action)',
                    {
                      callId: callSid.substring(0, 20) + '...',
                      actionIdentifier,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  await onAccept(callSid);
                }
              }
            } else {
              logger.info(
                '[NotificationSetup] 👆 User tapped notification (not an incoming call, ignoring)',
                {
                  callId,
                  actionIdentifier,
                  dataType: data?.type,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        } catch (actionError) {
          logger.error(
            '[NotificationSetup] ❌ Error handling notification action',
            actionError,
            {
              actionIdentifier,
              callId,
              hasCallId: !!callId,
              dataType: data?.type,
              errorMessage:
                actionError instanceof Error
                  ? actionError.message
                  : String(actionError),
              errorStack:
                actionError instanceof Error ? actionError.stack : undefined,
              errorType:
                actionError instanceof Error
                  ? actionError.constructor.name
                  : typeof actionError,
              timestamp: new Date().toISOString(),
            }
          );

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
        logger.error(
          '[NotificationSetup] ❌ Fatal error in notification response handler',
          error,
          {
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            errorType:
              error instanceof Error ? error.constructor.name : typeof error,
            responseElapsed: `${responseElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
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
