import { Call } from '@twilio/voice-react-native-sdk';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { usersService } from '@/services/supabase/user.service';
import { notificationsService } from '@/services/notifications.service';
import BillingService from '@/services/billingService';
import { lookupCallMetadata } from '@/services/callRecordLookup.service';
import { OUTGOING_CALL_TIMEOUT_MS } from '../constants';
import { CallEventListenerDependencies } from '../types';
import { CallSidExtractor, getCallState } from '../utils';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export class CallEventListener {
  private call: Call;
  private callId?: string;
  private debugId?: string;
  private ratePerMinute?: number;
  private userBalance?: number;
  private deps: CallEventListenerDependencies;
  private listeners: Map<string, any> = new Map();

  constructor(
    call: Call,
    deps: CallEventListenerDependencies,
    callId?: string,
    debugId?: string,
    ratePerMinute?: number,
    userBalance?: number
  ) {
    this.call = call;
    this.callId = callId;
    this.debugId = debugId;
    this.ratePerMinute = ratePerMinute;
    this.userBalance = userBalance;
    this.deps = deps;
  }

  setup(): void {
    logger.info('[CallEventListener] 🔧 Setting up call listeners', {
      debugId: this.debugId,
      callId: this.callId,
      ratePerMinute: this.ratePerMinute,
      userBalance: this.userBalance,
      hasCall: !!this.call,
      timestamp: new Date().toISOString(),
    });

    this.setupConnectedListener();
    this.setupReconnectingListener();
    this.setupReconnectedListener();
    this.setupRingingListener();
    this.setupDisconnectedListener();
    this.setupQualityWarningsChangedListener();

    logger.info('[CallEventListener] ✅ Call listeners set up successfully', {
      debugId: this.debugId,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });
  }

  private setupConnectedListener(): void {
    logger.debug('[CallEventListener] 📡 Registering Connected listener', {
      debugId: this.debugId,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });

    const connectedHandler = async () => {
      // ✅ PATCH E: Do not re-process if already marked connected
      const state = this.deps.getState();
      if (state.status === 'connected') {
        logger.info('[CallEventListener] ⏭️ Ignoring connected event - already connected', {
          debugId: this.debugId,
          callId: this.callId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const connectedTimestamp = Date.now();

      logger.info('[CallEventListener] ✅ Call connected', {
        debugId: this.debugId,
        callId: this.callId,
        connectedTimestamp: new Date(connectedTimestamp).toISOString(),
        timestamp: new Date().toISOString(),
      });

      // ✅ FIX: Set Android audio mode to MODE_IN_COMMUNICATION to prevent expo-av conflicts and ensure mic/speaker work
      if (Platform.OS === 'android') {
        try {
          logger.info('[CallEventListener] 🔊 Configuring Android Audio Mode (MODE_IN_COMMUNICATION)');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            playThroughEarpieceAndroid: false, // Explicitly route to speaker or let the OS decide based on ear proximity
            shouldDuckAndroid: true,
          });
          logger.info('[CallEventListener] ✅ Android Audio Mode configured successfully');
        } catch (audioError) {
           logger.warn('[CallEventListener] ⚠️ Failed to set Android Audio Mode', {
             error: audioError instanceof Error ? audioError.message : String(audioError),
           });
        }
        
        logger.info('[CallEventListener] 🔍 Audio Route Diagnostics', {
           debugId: this.debugId,
           audioRoute: 'SPEAKER (Forced via expo-av AudioMode)',
           micState: this.call.isMuted() ? 'MUTED' : 'UNMUTED (System active)',
           speakerState: 'ON (playThroughEarpieceAndroid: false)',
           callState: getCallState(this.call),
           timestamp: new Date().toISOString(),
        });
      }

      // Clear outgoing call timeout when connected
      const timeout = this.deps.getOutgoingCallTimeout();
      if (timeout) {
        clearTimeout(timeout);
        this.deps.setOutgoingCallTimeout(null);
        logger.debug(
          '[CallEventListener] ✅ Cleared outgoing call timeout (call connected)',
          {
            debugId: this.debugId,
            callId: this.callId,
            timestamp: new Date().toISOString(),
          }
        );
      }

      this.deps.updateState({ status: 'connected' });

      // Extract call SID for database operations
      const callSid = CallSidExtractor.extractFromCall(this.call);

      if (this.callId) {
        logger.debug('[CallEventListener] 📝 Updating call record on connect', {
          debugId: this.debugId,
          callId: this.callId,
          callSid: callSid?.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        });
        void this.deps.updateCallOnConnect(
          this.callId,
          this.debugId,
          callSid || undefined
        );
      }

      // Start duration tracking with Twilio connected event timestamp
      this.deps.startDurationTracking(connectedTimestamp);

      // Fetch rate from call record if not provided
      let finalRatePerMinute = this.ratePerMinute;
      let finalUserBalance = this.userBalance;
      let isIncomingCall = false; // ✅ Track if this is an incoming call (callee should NOT be billed)

      if (!finalRatePerMinute || finalRatePerMinute <= 0) {
        logger.info('[CallEventListener] 💰 Fetching rate from call record', {
          debugId: this.debugId,
          callId: this.callId,
          callSid: callSid?.substring(0, 20) + '...',
          providedRate: this.ratePerMinute,
          timestamp: new Date().toISOString(),
        });

        try {
          // Try to find call record by UUID (id) or Call SID (call_sid)
          let callRecord: { rate_per_minute: number | null } | null = null;

          // First try by UUID if callId is UUID
          if (this.callId && CallSidExtractor.isUuid(this.callId)) {
            const { data } = await supabase
              .from('calls')
              .select('rate_per_minute, caller_id')
              .eq('id', this.callId)
              .maybeSingle();
            if (data) {
              callRecord = { rate_per_minute: data.rate_per_minute };
              
              // ✅ FIX: Check if current user is the callee (NOT the caller)
              try {
                const currentUser = await usersService.getCurrentUser();
                if (currentUser?.id && data.caller_id && data.caller_id !== currentUser.id) {
                  isIncomingCall = true;
                  logger.info('[CallEventListener] 📞 Detected incoming call via caller_id check', {
                    debugId: this.debugId,
                    callId: this.callId,
                    callerId: data.caller_id,
                    currentUserId: currentUser.id,
                    timestamp: new Date().toISOString(),
                  });
                }
              } catch (userError) {
                logger.warn('[CallEventListener] ⚠️ Could not check caller_id for incoming call detection', {
                  debugId: this.debugId,
                  error: userError instanceof Error ? userError.message : String(userError),
                  timestamp: new Date().toISOString(),
                });
              }
              
              if (data.rate_per_minute) {
                logger.debug('[CallEventListener] ✅ Found rate by call UUID', {
                  debugId: this.debugId,
                  callId: this.callId,
                  isIncomingCall,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }

          // If not found and we have callSid, try by call_sid
          if (!callRecord?.rate_per_minute && callSid) {
            const { data } = await supabase
              .from('calls')
              .select('rate_per_minute, caller_id')
              .eq('call_sid', callSid)
              .maybeSingle();
            if (data) {
              callRecord = { rate_per_minute: data.rate_per_minute };
              
              // ✅ FIX: Check if current user is the callee (NOT the caller)
              if (!isIncomingCall) { // Only check if not already determined
                try {
                  const currentUser = await usersService.getCurrentUser();
                  if (currentUser?.id && data.caller_id && data.caller_id !== currentUser.id) {
                    isIncomingCall = true;
                    logger.info('[CallEventListener] 📞 Detected incoming call via call_sid caller_id check', {
                      debugId: this.debugId,
                      callSid: callSid?.substring(0, 20) + '...',
                      callerId: data.caller_id,
                      currentUserId: currentUser.id,
                      timestamp: new Date().toISOString(),
                    });
                  }
                } catch (userError) {
                  logger.warn('[CallEventListener] ⚠️ Could not check caller_id for incoming call detection', {
                    debugId: this.debugId,
                    error: userError instanceof Error ? userError.message : String(userError),
                    timestamp: new Date().toISOString(),
                  });
                }
              }
              
              if (data.rate_per_minute) {
                logger.debug('[CallEventListener] ✅ Found rate by call SID', {
                  debugId: this.debugId,
                  callSid: callSid?.substring(0, 20) + '...',
                  isIncomingCall,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }

          // FALLBACK: Use lookupCallMetadata for incoming calls (callee has different SID)
          // This handles the case where caller and callee have different Twilio call SIDs
          if (!callRecord?.rate_per_minute) {
            logger.info('[CallEventListener] 🔍 Trying fallback lookup (lookupCallMetadata)', {
              debugId: this.debugId,
              timestamp: new Date().toISOString(),
            });

            try {
              const currentUser = await usersService.getCurrentUser();
              if (currentUser?.id) {
                const metadata = await lookupCallMetadata(this.call, null, currentUser.id);
                if (metadata.callRecord?.rate_per_minute) {
                  callRecord = { rate_per_minute: metadata.callRecord.rate_per_minute };
                  
                  // ✅ FIX: Set the call ID from fallback lookup so billing can work
                  if (metadata.callRecord.id && !this.callId) {
                    this.callId = metadata.callRecord.id;
                    this.deps.setCurrentDbCallId(metadata.callRecord.id);
                    logger.info('[CallEventListener] ✅ Set callId from fallback lookup', {
                      debugId: this.debugId,
                      callId: metadata.callRecord.id,
                      timestamp: new Date().toISOString(),
                    });
                  }
                  
                  // ✅ FIX: Track if this is an incoming call (callee should NOT be billed)
                  if (metadata.isIncomingCall) {
                    isIncomingCall = true;
                    logger.info('[CallEventListener] 📞 Detected incoming call - callee will NOT be billed', {
                      debugId: this.debugId,
                      callId: metadata.callRecord.id,
                      callerId: metadata.callRecord.caller_id,
                      currentUserId: currentUser.id,
                      timestamp: new Date().toISOString(),
                    });
                  }
                  
                  logger.info('[CallEventListener] ✅ Found rate via lookupCallMetadata (fallback)', {
                    debugId: this.debugId,
                    ratePerMinute: metadata.callRecord.rate_per_minute,
                    callRecordId: metadata.callRecord.id,
                    isIncomingCall: metadata.isIncomingCall,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            } catch (fallbackError) {
              logger.warn('[CallEventListener] ⚠️ Fallback lookup failed', {
                debugId: this.debugId,
                error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                timestamp: new Date().toISOString(),
              });
            }
          }

          if (callRecord?.rate_per_minute) {
            finalRatePerMinute = Number(callRecord.rate_per_minute);
            logger.info('[CallEventListener] ✅ Rate fetched from call record', {
              debugId: this.debugId,
              callId: this.callId,
              callSid: callSid?.substring(0, 20) + '...',
              ratePerMinute: finalRatePerMinute,
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.warn('[CallEventListener] ⚠️ Rate not found in call record', {
              debugId: this.debugId,
              callId: this.callId,
              callSid: callSid?.substring(0, 20) + '...',
              hasCallRecord: !!callRecord,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error(
            '[CallEventListener] ❌ Failed to fetch rate from call record',
            error,
            {
              debugId: this.debugId,
              callId: this.callId,
              callSid: callSid?.substring(0, 20) + '...',
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      // Fetch user balance if not provided
      if (finalUserBalance === undefined) {
        try {
          const currentUser = await usersService.getCurrentUser();
          if (currentUser?.wallet_balance != null) {
            finalUserBalance = currentUser.wallet_balance;
            logger.info('[CallEventListener] ✅ User balance fetched', {
              debugId: this.debugId,
              callId: this.callId,
              userBalance: finalUserBalance,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.warn('[CallEventListener] ⚠️ Failed to fetch user balance', {
            debugId: this.debugId,
            callId: this.callId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // ✅ FIX: Only start billing for CALLER, not for callee (incoming call receiver)
      // The caller pays for the call, the callee does NOT get charged
      if (isIncomingCall) {
        logger.info('[CallEventListener] 📞 Skipping billing for callee (incoming call)', {
          debugId: this.debugId,
          callId: this.callId,
          isIncomingCall: true,
          note: 'Callee does not pay for incoming calls - only caller is billed',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Start per-minute billing (if rate provided) - ONLY FOR CALLER
        if (finalRatePerMinute && finalRatePerMinute > 0) {
          this.deps.startPerMinuteBilling(finalRatePerMinute);
        } else {
          logger.warn(
            '[CallEventListener] ⚠️ Cannot start per-minute billing - rate is 0 or missing',
            {
              debugId: this.debugId,
              callId: this.callId,
              finalRatePerMinute,
              timestamp: new Date().toISOString(),
            }
          );
        }

        // Start BillingService for notifications - ONLY FOR CALLER
        if (
          finalRatePerMinute &&
          finalRatePerMinute > 0 &&
          finalUserBalance !== undefined
        ) {
          logger.info('[CallEventListener] 💰 Starting BillingService (caller)', {
            debugId: this.debugId,
            callId: this.callId,
            ratePerMinute: finalRatePerMinute,
            userBalance: finalUserBalance,
            timestamp: new Date().toISOString(),
          });

          BillingService.startTracking(
            this.call,
            finalRatePerMinute,
            finalUserBalance
          );
        } else {
          logger.warn(
            '[CallEventListener] ⚠️ BillingService not started - missing rate or balance',
            {
              debugId: this.debugId,
              callId: this.callId,
              hasRate: !!finalRatePerMinute && finalRatePerMinute > 0,
              rateValue: finalRatePerMinute,
              hasBalance: finalUserBalance !== undefined,
              balanceValue: finalUserBalance,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    };

    this.call.on(Call.Event.Connected, connectedHandler);
    this.listeners.set('Connected', connectedHandler);
  }

  private setupReconnectingListener(): void {
    logger.debug('[CallEventListener] 📡 Registering Reconnecting listener', {
      debugId: this.debugId,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });

    const reconnectingHandler = () => {
      logger.info('[CallEventListener] 🔄 Call reconnecting', {
        debugId: this.debugId,
        callId: this.callId,
        timestamp: new Date().toISOString(),
      });
      this.deps.updateState({ status: 'reconnecting' });
    };

    this.call.on(Call.Event.Reconnecting, reconnectingHandler);
    this.listeners.set('Reconnecting', reconnectingHandler);
  }

  private setupReconnectedListener(): void {
    logger.debug('[CallEventListener] 📡 Registering Reconnected listener', {
      debugId: this.debugId,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });

    const reconnectedHandler = () => {
      logger.info('[CallEventListener] ✅ Call reconnected', {
        debugId: this.debugId,
        callId: this.callId,
        timestamp: new Date().toISOString(),
      });
      this.deps.updateState({ status: 'connected' });
    };

    this.call.on(Call.Event.Reconnected, reconnectedHandler);
    this.listeners.set('Reconnected', reconnectedHandler);
  }

  private setupRingingListener(): void {
    logger.debug('[CallEventListener] 📡 Registering Ringing listener', {
      debugId: this.debugId,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });

    const ringingHandler = () => {
      // ✅ PATCH E: Ignore ringing if call is already connected
      const state = this.deps.getState();
      if (state.status === 'connected') {
        logger.info('[CallEventListener] ⏭️ Ignoring ringing event - call is already connected', {
          debugId: this.debugId,
          callId: this.callId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('[CallEventListener] 📞 Call ringing', {
        debugId: this.debugId,
        callId: this.callId,
        timestamp: new Date().toISOString(),
      });
      this.deps.updateState({ status: 'ringing' });

      // Set timeout for outgoing calls - if not connected within timeout, disconnect
      const existingTimeout = this.deps.getOutgoingCallTimeout();
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.deps.setOutgoingCallTimeout(null);
      }

      const timeout = setTimeout(() => {
        logger.warn('[CallEventListener] ⏰ Outgoing call timeout - disconnecting', {
          debugId: this.debugId,
          callId: this.callId,
          timeoutMs: OUTGOING_CALL_TIMEOUT_MS,
          currentStatus: this.deps.getState().status,
          timestamp: new Date().toISOString(),
        });

        // Disconnect the call if it's still ringing
        const state = this.deps.getState();
        if (state.status === 'ringing' && this.call) {
          this.call.disconnect();
          logger.info(
            '[CallEventListener] ✅ Outgoing call disconnected due to timeout',
            {
              debugId: this.debugId,
              callId: this.callId,
              timestamp: new Date().toISOString(),
            }
          );
        }

        this.deps.setOutgoingCallTimeout(null);
      }, OUTGOING_CALL_TIMEOUT_MS);

      this.deps.setOutgoingCallTimeout(timeout);
    };

    this.call.on(Call.Event.Ringing, ringingHandler);
    this.listeners.set('Ringing', ringingHandler);
  }

  private setupDisconnectedListener(): void {
    logger.debug('[CallEventListener] 📡 Registering Disconnected listener', {
      debugId: this.debugId,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });

    const disconnectedHandler = async (error?: any) => {
      // Clear outgoing call timeout when disconnected
      const timeout = this.deps.getOutgoingCallTimeout();
      if (timeout) {
        clearTimeout(timeout);
        this.deps.setOutgoingCallTimeout(null);
        logger.debug(
          '[CallEventListener] ✅ Cleared outgoing call timeout (call disconnected)',
          {
            debugId: this.debugId,
            callId: this.callId,
            timestamp: new Date().toISOString(),
          }
        );
      }

      const state = this.deps.getState();
      const previousStatus = state.status;
      const callState = getCallState(this.call);
      const storedWasConnected = this.deps.getLastDisconnectWasConnected();
      const wasConnected =
        storedWasConnected ||
        previousStatus === 'connected' ||
        state.duration > 0 ||
        callState === 'connected' ||
        callState === 'open';

      // Reset the stored value after using it
      this.deps.setLastDisconnectWasConnected(false);

      logger.info('[CallEventListener] 📞 Call disconnected event', {
        debugId: this.debugId,
        callId: this.callId,
        error: error
          ? error instanceof Error
            ? error.message
            : String(error)
          : null,
        wasConnected,
        previousStatus,
        duration: state.duration,
        usedStoredValue: storedWasConnected,
        timestamp: new Date().toISOString(),
      });

      // ✅ FIX: Reset Android audio mode to default normal mode on disconnect
      if (Platform.OS === 'android') {
        try {
          logger.info('[CallEventListener] 🔊 Resetting Android Audio Mode to default');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            playThroughEarpieceAndroid: false, // Default is speaker
            shouldDuckAndroid: false,
          });
        } catch (audioError) {
          logger.warn('[CallEventListener] ⚠️ Failed to reset Android Audio Mode', {
            error: audioError instanceof Error ? audioError.message : String(audioError),
          });
        }
      }

      this.deps.setActiveCall(null);

      // Stop duration tracking
      this.deps.stopDurationTracking();

      // Stop per-minute billing
      this.deps.stopPerMinuteBilling();

      // Stop BillingService
      if (BillingService.isTracking()) {
        logger.info('[CallEventListener] 💰 Stopping BillingService', {
          debugId: this.debugId,
          callId: this.callId,
          timestamp: new Date().toISOString(),
        });
        BillingService.stopTracking();
      }

      // Send local push notification to caller when call ends
      if (wasConnected && this.callId) {
        try {
          logger.info(
            '[CallEventListener] 📬 Sending call ended notification to caller',
            {
              debugId: this.debugId,
              callId: this.callId,
              timestamp: new Date().toISOString(),
            }
          );

          const { data: callRecord } = await supabase
            .from('calls')
            .select(
              'caller_id, professional:professionals!professional_id(user_id, users:users!user_id(name))'
            )
            .eq('id', this.callId)
            .single();

          if (callRecord?.caller_id) {
            const currentUser = await usersService.getCurrentUser();
            if (currentUser?.id === callRecord.caller_id) {
              const professional = callRecord.professional as unknown as {
                users?: { name?: string };
              };
              const professionalName = professional?.users?.name || 'Professional';
              await notificationsService.sendLocalNotification(
                'Call Ended',
                `Your call with ${professionalName} has ended.`,
                {
                  type: 'call_ended',
                  call_id: this.callId,
                  call_sid: CallSidExtractor.extractFromCall(this.call),
                }
              );
              logger.info(
                '[CallEventListener] ✅ Call ended notification sent to caller',
                {
                  debugId: this.debugId,
                  callId: this.callId,
                  callerId: callRecord.caller_id,
                  professionalName,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        } catch (notifError) {
          logger.warn(
            '[CallEventListener] ⚠️ Failed to send call ended notification',
            {
              debugId: this.debugId,
              callId: this.callId,
              error:
                notifError instanceof Error
                  ? notifError.message
                  : String(notifError),
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      logger.debug('[CallEventListener] 🔄 Resetting state to idle', {
        debugId: this.debugId,
        callId: this.callId,
        timestamp: new Date().toISOString(),
      });

      this.deps.updateState({
        status: 'idle',
        call: null,
        error: error || null,
        isMuted: false,
        isOnHold: false,
        duration: 0,
        callInvite: null, // ✅ PATCH D: Ensure invite is cleared on disconnect
      });

      logger.info(
        '[CallEventListener] ✅ Call disconnected event handled, state reset to idle',
        {
          debugId: this.debugId,
          callId: this.callId,
          timestamp: new Date().toISOString(),
        }
      );

      if (this.callId) {
        logger.debug('[CallEventListener] 📝 Updating call record on disconnect', {
          debugId: this.debugId,
          callId: this.callId,
          wasConnected,
          previousStatus,
          timestamp: new Date().toISOString(),
        });
        const isMissedDueToTimeout =
          previousStatus === 'ringing' && !wasConnected;
        void this.deps.updateCallOnDisconnect(
          this.callId,
          this.debugId,
          wasConnected,
          isMissedDueToTimeout
        );
      }

      // Clear DB call ID
      this.deps.setCurrentDbCallId(null);

      // Clean up call listeners when disconnected
      this.deps.cleanupCallListeners(this.call);
    };

    this.call.on(Call.Event.Disconnected, disconnectedHandler);
    this.listeners.set('Disconnected', disconnectedHandler);
  }

  private setupQualityWarningsChangedListener(): void {
    logger.debug(
      '[CallEventListener] 📡 Registering QualityWarningsChanged listener',
      {
        debugId: this.debugId,
        callId: this.callId,
        timestamp: new Date().toISOString(),
      }
    );

    const qualityWarningsHandler = (warnings: any) => {
      logger.warn('[CallEventListener] ⚠️ Quality warnings', {
        debugId: this.debugId,
        callId: this.callId,
        warnings: Array.isArray(warnings) ? warnings.length : 'unknown',
        timestamp: new Date().toISOString(),
      });
    };

    this.call.on(Call.Event.QualityWarningsChanged, qualityWarningsHandler);
    this.listeners.set('QualityWarningsChanged', qualityWarningsHandler);
  }

  cleanup(): void {
    logger.debug('[CallEventListener] 🧹 Cleaning up call listeners', {
      debugId: this.debugId,
      callId: this.callId,
      callListenersCount: this.listeners.size,
      timestamp: new Date().toISOString(),
    });

    try {
      for (const [eventName, handler] of this.listeners.entries()) {
        try {
          (this.call as any).off?.(eventName, handler);
        } catch (e) {
          logger.warn('[CallEventListener] ⚠️ Error removing call listener', {
            eventName,
            error: e instanceof Error ? e.message : String(e),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      logger.warn('[CallEventListener] ⚠️ Error during call listener cleanup', {
        error: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      });
    }

    this.listeners.clear();
  }
}

