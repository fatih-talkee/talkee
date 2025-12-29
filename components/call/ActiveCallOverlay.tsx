import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Phone,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  X,
} from 'lucide-react-native';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

const { width, height } = Dimensions.get('window');

interface CallDetails {
  callerName: string;
  callerAvatar: string | null;
  category: string | null;
  ratePerMinute: number;
}

/**
 * ActiveCallOverlay
 *
 * Custom UI that appears OVER Twilio's native call screen
 * Shows caller info, duration, cost, and controls
 *
 * ✅ Appears when call is connected
 * ✅ Shows caller avatar, name, category, rate
 * ✅ Shows real-time duration and cost
 * ✅ Mute, Speaker, End Call controls
 * ✅ Minimizable to show Twilio native UI
 */
export default function ActiveCallOverlay() {
  const { theme } = useTheme();
  const { callState, toggleMute, disconnect } = useTwilioVoice();
  const { user: currentUser } = useProfile();
  const [showOverlay, setShowOverlay] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Show overlay when call is connected
  useEffect(() => {
    const isConnected = callState.status === 'connected';

    logger.debug('[ActiveCallOverlay] 🔍 Call state changed', {
      status: callState.status,
      isConnected,
      hasCallDetails: !!callDetails,
      timestamp: new Date().toISOString(),
    });

    setShowOverlay(isConnected);

    if (isConnected) {
      // ✅ FIX: Show overlay immediately, load details in background
      // This ensures overlay appears even if details loading fails

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Load call details if not already loaded
      if (!callDetails) {
        logger.info(
          '[ActiveCallOverlay] 📞 Loading call details (overlay already shown)',
          {
            timestamp: new Date().toISOString(),
          }
        );

        // Load call details immediately
        loadCallDetails();

        // ✅ Enhanced retry mechanism: Try multiple times with increasing delays
        // Call record might not be created yet or call_sid might not be saved yet
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelays = [2000, 3000, 4000]; // 2s, 3s, 4s

        const scheduleRetry = (attempt: number): NodeJS.Timeout | null => {
          if (attempt >= maxRetries) {
            logger.warn(
              '[ActiveCallOverlay] ⚠️ Max retries reached, giving up',
              {
                maxRetries,
                timestamp: new Date().toISOString(),
              }
            );
            return null;
          }

          const delay =
            retryDelays[attempt] || retryDelays[retryDelays.length - 1];
          const retryTimeout = setTimeout(() => {
            retryCount++;
            logger.info('[ActiveCallOverlay] 🔄 Retrying call details load', {
              attempt: retryCount,
              maxRetries,
              delay: `${delay}ms`,
              timestamp: new Date().toISOString(),
            });
            loadCallDetails().then(() => {
              // If still no callDetails after load, schedule next retry
              // Note: We check callDetails in the next render cycle
            });
          }, delay);

          return retryTimeout as unknown as NodeJS.Timeout;
        };

        const firstRetryTimeout = scheduleRetry(0);
        const secondRetryTimeout = scheduleRetry(1);
        const thirdRetryTimeout = scheduleRetry(2);

        return () => {
          if (firstRetryTimeout) clearTimeout(firstRetryTimeout);
          if (secondRetryTimeout) clearTimeout(secondRetryTimeout);
          if (thirdRetryTimeout) clearTimeout(thirdRetryTimeout);
        };
      }
    } else {
      // Reset state when call ends
      setMinimized(false);
      setCallDetails(null);
      fadeAnim.setValue(0);
    }
  }, [callState.status]);

  // Pulse animation for active call
  useEffect(() => {
    if (showOverlay && !minimized) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showOverlay, minimized]);

  const loadCallDetails = async () => {
    const loadStartTime = Date.now();
    logger.info('[ActiveCallOverlay] 📞 ===== LOADING CALL DETAILS =====', {
      hasCurrentUser: !!currentUser,
      currentUserId: currentUser?.id,
      currentUserName: currentUser?.name,
      callStatus: callState.status,
      callDuration: callState.duration,
      hasCall: !!callState.call,
      hasCallInvite: !!callState.callInvite,
      isMuted: callState.isMuted,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!currentUser) {
        logger.warn('[ActiveCallOverlay] ⚠️ No current user', {
          timestamp: new Date().toISOString(),
        });
        setCallDetails({
          callerName: 'User',
          callerAvatar: null,
          category: null,
          ratePerMinute: 0,
        });
        return;
      }

      logger.info('[ActiveCallOverlay] 👤 Current user info', {
        userId: currentUser.id,
        userName: currentUser.name,
        hasAvatar: !!currentUser.avatar_url,
        avatarUrl: currentUser.avatar_url ? 'present' : 'missing',
        timestamp: new Date().toISOString(),
      });

      // ✅ OPTIMIZED: Get call record from database using call SID
      const call = callState.call as any;
      const callSid =
        call?.callSid ??
        call?.sid ??
        (typeof call?.getSid === 'function' ? call.getSid() : null);

      logger.info('[ActiveCallOverlay] 🔍 Call SID extraction', {
        hasCall: !!call,
        callSid: callSid ? callSid.substring(0, 20) + '...' : null,
        callSidLength: callSid?.length,
        callSidSource: call?.callSid
          ? 'callSid'
          : call?.sid
          ? 'sid'
          : typeof call?.getSid === 'function'
          ? 'getSid()'
          : 'none',
        callState: call?.state || call?._state || 'unknown',
        timestamp: new Date().toISOString(),
      });

      let otherUserId: string | null = null;
      let isIncomingCall = false;
      let callRecordRatePerMinute: number | null = null; // ✅ Get rate from call record

      // Try to get call record from database first (most reliable)
      if (callSid) {
        logger.info(
          '[ActiveCallOverlay] 🔍 STEP 1: Looking up call record by SID',
          {
            callSid: callSid.substring(0, 20) + '...',
            callSidFull: callSid,
            timestamp: new Date().toISOString(),
          }
        );

        // Try to fetch call record by call_sid
        // Note: call_sid column might not exist in all databases
        let callRecord: any = null;
        let callRecordError: any = null;

        try {
          const result = await supabase
            .from('calls')
            .select(
              'caller_id, professional_id, rate_per_minute, professional:professionals!professional_id(user_id)'
            )
            .eq('call_sid', callSid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          callRecord = result.data;
          callRecordError = result.error;
        } catch (err: any) {
          // Handle case where call_sid column doesn't exist
          if (
            err?.message?.includes('column') &&
            err?.message?.includes('call_sid')
          ) {
            logger.debug(
              '[ActiveCallOverlay] ℹ️ call_sid column does not exist, will use fallback',
              {
                timestamp: new Date().toISOString(),
              }
            );
            callRecordError = null; // Reset error to continue with fallback
          } else {
            callRecordError = err;
          }
        }

        if (callRecordError) {
          logger.warn(
            '[ActiveCallOverlay] ⚠️ Failed to fetch call record from DB',
            {
              error: callRecordError.message,
              code: callRecordError.code,
              callSid: callSid.substring(0, 20) + '...',
              timestamp: new Date().toISOString(),
            }
          );
        } else if (callRecord) {
          // ✅ Get rate_per_minute from call record (most reliable - this is the rate charged for this specific call)
          // Only use if > 0, otherwise treat as null to use professional's rate
          const recordRate = callRecord.rate_per_minute
            ? Number(callRecord.rate_per_minute)
            : 0;
          callRecordRatePerMinute = recordRate > 0 ? recordRate : null;

          logger.info(
            '[ActiveCallOverlay] ✅ STEP 1 SUCCESS: Rate from call record (by call_sid)',
            {
              ratePerMinute: callRecordRatePerMinute,
              rawRate: callRecord.rate_per_minute,
              recordRate,
              recordRateType: typeof callRecord.rate_per_minute,
              callSid: callSid.substring(0, 20) + '...',
              callerId: callRecord.caller_id,
              professionalId: callRecord.professional_id,
              professionalUserId: (callRecord.professional as any)?.user_id,
              timestamp: new Date().toISOString(),
            }
          );

          // Determine if this is incoming or outgoing call
          isIncomingCall = callRecord.caller_id !== currentUser.id;

          if (isIncomingCall) {
            // Incoming call: other party is the caller
            otherUserId = callRecord.caller_id;
            logger.debug('[ActiveCallOverlay] 📥 Incoming call from database', {
              callerId: otherUserId,
              ratePerMinute: callRecordRatePerMinute,
              timestamp: new Date().toISOString(),
            });
          } else {
            // Outgoing call: other party is the professional
            // Get professional's user_id
            const professional = callRecord.professional as any;
            otherUserId = professional?.user_id || callRecord.professional_id;
            logger.debug('[ActiveCallOverlay] 📤 Outgoing call from database', {
              professionalId: callRecord.professional_id,
              professionalUserId: otherUserId,
              ratePerMinute: callRecordRatePerMinute,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          logger.warn(
            '[ActiveCallOverlay] ⚠️ STEP 1 FAILED: No call record found by SID',
            {
              callSid: callSid.substring(0, 20) + '...',
              callSidFull: callSid,
              willTryFallback: true,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      // ✅ FALLBACK: If call_sid lookup failed, try to find call by caller_id and professional_id
      // This is useful if call_sid column doesn't exist or hasn't been set yet
      if (!callRecordRatePerMinute && currentUser) {
        logger.info(
          '[ActiveCallOverlay] 🔍 STEP 2: Fallback - Looking up call by caller/professional',
          {
            currentUserId: currentUser.id,
            currentUserName: currentUser.name,
            callRecordRatePerMinute,
            timestamp: new Date().toISOString(),
          }
        );

        // Try to determine professional_id from call state
        let professionalId: string | null = null;
        const call = callState.call as any;
        if (call) {
          const customParams =
            call._customParameters || call.customParameters || {};
          const toParam = customParams.To || customParams.to || null;

          logger.debug(
            '[ActiveCallOverlay] 🔍 Extracting professional_id from call state',
            {
              hasCustomParams: !!customParams,
              customParamsKeys: Object.keys(customParams),
              toParam,
              timestamp: new Date().toISOString(),
            }
          );

          if (toParam) {
            const toUserId = toParam.replace('client:', '');
            logger.debug(
              '[ActiveCallOverlay] 🔍 Looking up professional by user_id',
              {
                toUserId,
                toParam,
                timestamp: new Date().toISOString(),
              }
            );

            // Try to get professional_id from user_id
            const { data: prof, error: profError } = await supabase
              .from('professionals')
              .select('id')
              .eq('user_id', toUserId)
              .maybeSingle();

            if (profError) {
              logger.warn(
                '[ActiveCallOverlay] ⚠️ Failed to find professional',
                {
                  toUserId,
                  error: profError.message,
                  timestamp: new Date().toISOString(),
                }
              );
            } else if (prof) {
              professionalId = prof.id;
              logger.info('[ActiveCallOverlay] ✅ Found professional_id', {
                professionalId,
                toUserId,
                timestamp: new Date().toISOString(),
              });
            } else {
              logger.debug(
                '[ActiveCallOverlay] ℹ️ User is not a professional',
                {
                  toUserId,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        } else {
          logger.warn(
            '[ActiveCallOverlay] ⚠️ No call object available for professional_id lookup',
            {
              timestamp: new Date().toISOString(),
            }
          );
        }

        if (professionalId) {
          // ✅ FIX: Remove status filter to find call record regardless of status
          // Also try to find by professional_id directly (for incoming calls)
          logger.info(
            '[ActiveCallOverlay] 🔍 Querying call record by caller/professional',
            {
              callerId: currentUser.id,
              professionalId,
              query: `or(and(caller_id.eq.${currentUser.id},professional_id.eq.${professionalId}),and(professional_id.eq.${professionalId},caller_id.eq.${currentUser.id}))`,
              timestamp: new Date().toISOString(),
            }
          );

          const { data: recentCall, error: recentCallError } = await supabase
            .from('calls')
            .select(
              'rate_per_minute, caller_id, professional_id, status, created_at, call_sid'
            )
            .or(
              `and(caller_id.eq.${currentUser.id},professional_id.eq.${professionalId}),and(professional_id.eq.${professionalId},caller_id.eq.${currentUser.id})`
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentCallError) {
            logger.warn('[ActiveCallOverlay] ⚠️ Error querying call record', {
              professionalId,
              error: recentCallError.message,
              errorCode: recentCallError.code,
              timestamp: new Date().toISOString(),
            });
          } else if (recentCall) {
            logger.info(
              '[ActiveCallOverlay] ✅ STEP 2 SUCCESS: Found call record',
              {
                callSid: recentCall.call_sid || 'unknown',
                ratePerMinute: recentCall.rate_per_minute,
                callerId: recentCall.caller_id,
                professionalId: recentCall.professional_id,
                callStatus: recentCall.status,
                createdAt: recentCall.created_at,
                hasCallSid: !!recentCall.call_sid,
                timestamp: new Date().toISOString(),
              }
            );

            if (recentCall?.rate_per_minute) {
              const recentRate = Number(recentCall.rate_per_minute);
              // Only use if > 0, otherwise treat as null to use professional's rate
              if (recentRate > 0) {
                callRecordRatePerMinute = recentRate;
                logger.info(
                  '[ActiveCallOverlay] ✅ STEP 2: Found rate from recent call record',
                  {
                    ratePerMinute: callRecordRatePerMinute,
                    rawRate: recentCall.rate_per_minute,
                    professionalId,
                    callStatus: recentCall.status,
                    timestamp: new Date().toISOString(),
                  }
                );
              } else {
                logger.warn(
                  '[ActiveCallOverlay] ⚠️ STEP 2: Recent call record has rate 0, will use professional rate',
                  {
                    professionalId,
                    callStatus: recentCall.status,
                    rawRate: recentCall.rate_per_minute,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } else {
              logger.warn(
                '[ActiveCallOverlay] ⚠️ STEP 2: Call record found but no rate_per_minute field',
                {
                  professionalId,
                  callStatus: recentCall.status,
                  hasRateField: 'rate_per_minute' in recentCall,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          } else {
            logger.warn(
              '[ActiveCallOverlay] ⚠️ STEP 2 FAILED: No recent call record found',
              {
                professionalId,
                hasRecentCall: !!recentCall,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } else {
          logger.warn(
            '[ActiveCallOverlay] ⚠️ STEP 2 SKIPPED: No professional_id found',
            {
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      if (!callSid) {
        logger.debug(
          '[ActiveCallOverlay] ℹ️ No call SID available (will use fallback)',
          {
            hasCall: !!call,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Fallback: Try to get from call state if database lookup failed
      if (!otherUserId) {
        logger.debug(
          '[ActiveCallOverlay] 🔍 Fallback: Getting user ID from call state',
          {
            timestamp: new Date().toISOString(),
          }
        );

        // For incoming calls: get from CallInvite or Call object
        if (callState.callInvite) {
          const invite = callState.callInvite as any;
          const fromField = invite._from || invite.from;
          otherUserId = fromField?.replace('client:', '') || null;
          isIncomingCall = true;

          logger.debug(
            '[ActiveCallOverlay] 📥 Incoming call - caller ID from invite',
            {
              otherUserId,
              timestamp: new Date().toISOString(),
            }
          );
        }

        // ✅ FIX: For incoming calls that are already connected, get from Call object
        if (!otherUserId && call) {
          const callObj = call as any;
          const fromField = callObj._from || callObj.from;

          if (fromField) {
            otherUserId = fromField.replace('client:', '');
            isIncomingCall = true;

            logger.debug(
              '[ActiveCallOverlay] 📥 Incoming call - caller ID from call object',
              {
                otherUserId,
                fromField,
                timestamp: new Date().toISOString(),
              }
            );
          }
        }

        // For outgoing calls: get from call parameters
        if (!otherUserId && call) {
          const customParams =
            call._customParameters || call.customParameters || {};
          const toParam = customParams.To || customParams.to || null;

          if (toParam) {
            otherUserId = toParam.replace('client:', '');
            isIncomingCall = false;
          }

          logger.debug(
            '[ActiveCallOverlay] 📤 Outgoing call - callee ID from params',
            {
              toParam,
              otherUserId,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      if (!otherUserId) {
        logger.warn(
          '[ActiveCallOverlay] ⚠️ Could not determine other party user ID',
          {
            hasCall: !!call,
            hasCallInvite: !!callState.callInvite,
            hasCallSid: !!callSid,
            currentUserId: currentUser.id,
            timestamp: new Date().toISOString(),
          }
        );

        // Use placeholder
        setCallDetails({
          callerName: 'User',
          callerAvatar: null,
          category: null,
          ratePerMinute: 0,
        });
        return;
      }

      logger.debug(
        '[ActiveCallOverlay] 🔍 Fetching user and professional details',
        {
          userId: otherUserId,
          isIncomingCall,
          timestamp: new Date().toISOString(),
        }
      );

      // ✅ OPTIMIZED: Fetch user and professional data in parallel
      const [userResult, professionalResult] = await Promise.all([
        supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', otherUserId)
          .single(),
        supabase
          .from('professionals')
          .select(
            `
          rate_per_minute,
            category_id,
            categories(id, name)
          `
          )
          .eq('user_id', otherUserId)
          .maybeSingle(),
      ]);

      const user = userResult.data;
      const userError = userResult.error;
      const professional = professionalResult.data;
      const professionalError = professionalResult.error;

      // Log errors
      if (userError) {
        if (userError.code === 'PGRST116') {
          logger.warn('[ActiveCallOverlay] ⚠️ User not found in database', {
            userId: otherUserId,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.error('[ActiveCallOverlay] ❌ Failed to load user', {
            error: userError.message,
            code: userError.code,
            userId: otherUserId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (professionalError && professionalError.code !== 'PGRST116') {
        // PGRST116 = not found, which is OK if user is not a professional
        logger.warn(
          '[ActiveCallOverlay] ⚠️ Failed to load professional (expected if not professional)',
          {
            error: professionalError.message,
            code: professionalError.code,
            userId: otherUserId,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // ✅ PRIORITY: Use rate from call record if available and > 0 (this is the rate charged for this call)
      // Otherwise, fallback to professional's current rate
      logger.info('[ActiveCallOverlay] 💰 STEP 3: Calculating final rate', {
        callRecordRatePerMinute,
        callRecordRateValid:
          callRecordRatePerMinute !== null && callRecordRatePerMinute > 0,
        professionalRate: professional?.rate_per_minute,
        professionalRateType: typeof professional?.rate_per_minute,
        professionalRateNumber: professional?.rate_per_minute
          ? Number(professional.rate_per_minute)
          : null,
        professionalRateValid: professional?.rate_per_minute
          ? Number(professional.rate_per_minute) > 0
          : false,
        hasProfessional: !!professional,
        isIncomingCall,
        timestamp: new Date().toISOString(),
      });

      const ratePerMinute =
        callRecordRatePerMinute !== null && callRecordRatePerMinute > 0
          ? callRecordRatePerMinute
          : professional?.rate_per_minute &&
            Number(professional.rate_per_minute) > 0
          ? Number(professional.rate_per_minute)
          : 0;

      const rateSource =
        callRecordRatePerMinute !== null && callRecordRatePerMinute > 0
          ? 'call_record'
          : professional?.rate_per_minute &&
            Number(professional.rate_per_minute) > 0
          ? 'professional'
          : 'fallback_zero';

      logger.info(
        '[ActiveCallOverlay] 💰 STEP 3 RESULT: Final rate calculation',
        {
          finalRatePerMinute: ratePerMinute,
          rateSource,
          callRecordRate: callRecordRatePerMinute,
          callRecordRateValid:
            callRecordRatePerMinute !== null && callRecordRatePerMinute > 0,
          professionalRate: professional?.rate_per_minute
            ? Number(professional.rate_per_minute)
            : null,
          professionalRateValid: professional?.rate_per_minute
            ? Number(professional.rate_per_minute) > 0
            : false,
          hasProfessional: !!professional,
          isIncomingCall,
          timestamp: new Date().toISOString(),
        }
      );

      // ✅ FIX: Get category name from categories relation
      // Supabase returns categories as array even for foreign key relations
      const categoryData = professional?.categories;
      const category = Array.isArray(categoryData)
        ? categoryData[0]?.name || null
        : (categoryData as any)?.name || null;

      const loadElapsed = Date.now() - loadStartTime;

      logger.info('[ActiveCallOverlay] 📊 Fetched data summary', {
        hasUser: !!user,
        userName: user?.name || 'N/A',
        userId: (user as any)?.id,
        hasAvatar: !!user?.avatar_url,
        avatarUrl: user?.avatar_url ? 'present' : 'missing',
        isProfessional: !!professional,
        professionalId: (professional as any)?.id,
        professionalUserId: (professional as any)?.user_id,
        ratePerMinute,
        rateSource:
          callRecordRatePerMinute !== null && callRecordRatePerMinute > 0
            ? 'call_record'
            : professional?.rate_per_minute &&
              Number(professional.rate_per_minute) > 0
            ? 'professional'
            : 'fallback_zero',
        category,
        categoryId: (professional as any)?.category_id,
        otherUserId,
        isIncomingCall,
        loadElapsed: `${loadElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      setCallDetails({
        callerName: user?.name || 'User',
        callerAvatar: user?.avatar_url || null,
        category,
        ratePerMinute,
      });

      logger.info('[ActiveCallOverlay] ✅ Call details loaded and set', {
        callerName: user?.name || 'User',
        hasAvatar: !!user?.avatar_url,
        category,
        ratePerMinute,
        rateSource:
          callRecordRatePerMinute !== null && callRecordRatePerMinute > 0
            ? 'call_record'
            : professional?.rate_per_minute &&
              Number(professional.rate_per_minute) > 0
            ? 'professional'
            : 'fallback_zero',
        isProfessional: !!professional,
        loadElapsed: `${loadElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        '[ActiveCallOverlay] ❌ Failed to load call details',
        error,
        {
          timestamp: new Date().toISOString(),
        }
      );

      // Fallback
      setCallDetails({
        callerName: 'User',
        callerAvatar: null,
        category: null,
        ratePerMinute: 0,
      });
    }
  };

  const handleMuteToggle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleMute();
      logger.info('[ActiveCallOverlay] 🔇 Mute toggled', {
        isMuted: callState.isMuted,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to toggle mute', error);
    }
  };

  const handleSpeakerToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement speaker toggle via Twilio SDK or native audio routing
    setSpeakerEnabled(!speakerEnabled);
    logger.info('[ActiveCallOverlay] 🔊 Speaker toggled', {
      enabled: !speakerEnabled,
      timestamp: new Date().toISOString(),
    });
  };

  const handleEndCall = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      logger.info('[ActiveCallOverlay] 📞 Ending call', {
        timestamp: new Date().toISOString(),
      });
      await disconnect();
    } catch (error) {
      logger.error('[ActiveCallOverlay] ❌ Failed to end call', error);
    }
  };

  const handleMinimize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinimized(true);
  };

  const handleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinimized(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const calculateCost = (duration: number, rate: number): string => {
    // ✅ Per-minute billing logic:
    // - 0 seconds = 1 minute charged (first minute charged immediately when call starts)
    // - 1-60 seconds = 1 minute charged (still in first minute)
    // - 61-120 seconds = 2 minutes charged (entered 2nd minute)
    // - 121-180 seconds = 3 minutes charged (entered 3rd minute)
    // Formula: Math.floor(duration / 60) + 1
    // This ensures we charge for the current minute as soon as we enter it

    if (rate <= 0) {
      logger.warn('[ActiveCallOverlay] ⚠️ Invalid rate for cost calculation', {
        rate,
        duration,
        timestamp: new Date().toISOString(),
      });
      return '0.00';
    }

    // Calculate minutes: 0s = 1 min, 60s = 2 min, 120s = 3 min, etc.
    const minutes = Math.floor(duration / 60) + 1;
    const cost = minutes * rate;

    logger.debug('[ActiveCallOverlay] 💰 Cost calculation', {
      duration,
      rate,
      minutes,
      cost: cost.toFixed(2),
      timestamp: new Date().toISOString(),
    });

    return cost.toFixed(2);
  };

  // ✅ FIX: Show overlay even if callDetails is not loaded yet
  // This ensures overlay appears immediately when call connects
  if (!showOverlay) {
    return null;
  }

  // Use fallback details if not loaded yet
  const displayDetails: CallDetails = callDetails || {
    callerName: 'Calling...',
    callerAvatar: null,
    category: null,
    ratePerMinute: 0,
  };

  // Minimized view - modern floating bubble
  if (minimized) {
    return (
      <Pressable
        onPress={handleExpand}
        style={({ pressed }) => [
          styles.minimizedBubble,
          pressed && styles.minimizedBubblePressed,
        ]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary + 'DD']}
          style={styles.minimizedGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.minimizedContent}>
            <View style={styles.minimizedAvatarContainer}>
              {displayDetails.callerAvatar ? (
                <Image
                  source={{ uri: displayDetails.callerAvatar }}
                  style={[
                    styles.minimizedAvatar,
                    { borderColor: theme.colors.border },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.minimizedAvatarPlaceholder,
                    {
                      backgroundColor: theme.colors.surface + '80',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.minimizedAvatarText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {displayDetails.callerName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.minimizedPulseIndicator,
                  {
                    backgroundColor: theme.colors.success,
                    borderColor: theme.colors.surface,
                  },
                ]}
              />
            </View>
            <View style={styles.minimizedInfo}>
              <Text
                style={[styles.minimizedName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {displayDetails.callerName || 'Call'}
              </Text>
              <Text
                style={[
                  styles.minimizedDuration,
                  { color: theme.colors.textMuted },
                ]}
              >
                {formatDuration(callState.duration)}
              </Text>
            </View>
            <Phone size={20} color={theme.colors.text} />
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // Full overlay view
  return (
    <Modal
      visible={!minimized}
      transparent
      animationType="fade"
      onRequestClose={handleEndCall}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient
          colors={[
            theme.colors.background,
            theme.colors.background + 'F5',
            theme.colors.background + 'E0',
          ]}
          style={styles.gradientOverlay}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={handleMinimize}
                style={({ pressed }) => [
                  styles.minimizeButton,
                  {
                    backgroundColor: theme.colors.card + '40',
                  },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Minimize2 size={20} color={theme.colors.textMuted} />
              </Pressable>
              <View style={styles.statusIndicator}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: theme.colors.success },
                  ]}
                />
                <Text
                  style={[styles.statusText, { color: theme.colors.textMuted }]}
                >
                  Connected
                </Text>
              </View>
            </View>

            {/* Caller Info */}
            <View style={styles.callerInfoWrapper}>
              <View style={styles.callerInfo}>
                <Animated.View
                  style={[
                    styles.avatarContainer,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  {displayDetails.callerAvatar ? (
                    <Image
                      source={{ uri: displayDetails.callerAvatar }}
                      style={[
                        styles.avatar,
                        { borderColor: theme.colors.border },
                      ]}
                    />
                  ) : (
                    <LinearGradient
                      colors={[
                        theme.colors.primary,
                        theme.colors.primary + 'DD',
                      ]}
                      style={[
                        styles.avatarPlaceholder,
                        { borderColor: theme.colors.border },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {displayDetails.callerName.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </Animated.View>

                <Text style={[styles.callerName, { color: theme.colors.text }]}>
                  {displayDetails.callerName}
                </Text>

                {displayDetails.category && (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: theme.colors.card + '80' },
                    ]}
                  >
                    <Text
                      style={[styles.category, { color: theme.colors.primary }]}
                    >
                      {displayDetails.category}
                    </Text>
                  </View>
                )}

                {displayDetails.ratePerMinute > 0 && (
                  <View style={styles.rateContainer}>
                    <Text
                      style={[styles.rate, { color: theme.colors.textMuted }]}
                    >
                      ${displayDetails.ratePerMinute}
                    </Text>
                    <Text
                      style={[
                        styles.rateUnit,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      /min
                    </Text>
                  </View>
                )}
              </View>

              {/* Call Stats */}
              <View
                style={[
                  styles.statsContainer,
                  {
                    backgroundColor: theme.colors.card + '40',
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.statText, { color: theme.colors.text }]}>
                  {formatDuration(callState.duration)}
                </Text>
                <Text
                  style={[
                    styles.statSeparator,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {' '}
                  |{' '}
                </Text>
                <Text style={[styles.statText, { color: theme.colors.text }]}>
                  $
                  {calculateCost(
                    callState.duration,
                    displayDetails.ratePerMinute
                  )}
                </Text>
              </View>

              {/* Controls */}
              <View style={styles.controls}>
                {/* Mute Button */}
                <Pressable
                  onPress={handleMuteToggle}
                  style={({ pressed }) => [
                    styles.controlButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <BlurView
                    intensity={callState.isMuted ? 30 : 15}
                    style={[
                      styles.controlButtonContent,
                      callState.isMuted && {
                        backgroundColor: theme.colors.error + '40',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.controlIconContainer,
                        callState.isMuted && styles.controlIconContainerActive,
                        {
                          backgroundColor: callState.isMuted
                            ? theme.colors.error
                            : theme.colors.card + '40',
                        },
                      ]}
                    >
                      {callState.isMuted ? (
                        <MicOff size={18} color={theme.colors.text} />
                      ) : (
                        <Mic size={18} color={theme.colors.text} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.controlLabel,
                        {
                          color: theme.colors.text,
                        },
                      ]}
                    >
                      {callState.isMuted ? 'Muted' : 'Mute'}
                    </Text>
                  </BlurView>
                </Pressable>

                {/* Speaker Button */}
                <Pressable
                  onPress={handleSpeakerToggle}
                  style={({ pressed }) => [
                    styles.controlButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <BlurView
                    intensity={speakerEnabled ? 30 : 15}
                    style={[
                      styles.controlButtonContent,
                      speakerEnabled && {
                        backgroundColor: theme.colors.primary + '40',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.controlIconContainer,
                        speakerEnabled && styles.controlIconContainerActive,
                        {
                          backgroundColor: speakerEnabled
                            ? theme.colors.primary
                            : theme.colors.card + '40',
                        },
                      ]}
                    >
                      {speakerEnabled ? (
                        <Volume2 size={18} color={theme.colors.text} />
                      ) : (
                        <VolumeX size={18} color={theme.colors.text} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.controlLabel,
                        {
                          color: theme.colors.text,
                        },
                      ]}
                    >
                      Speaker
                    </Text>
                  </BlurView>
                </Pressable>
              </View>

              {/* End Call Button */}
              <Pressable
                onPress={handleEndCall}
                style={({ pressed }) => [
                  styles.endCallButton,
                  pressed && styles.endCallButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.error, theme.colors.error + 'DD']}
                  style={styles.endCallGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Phone size={24} color={theme.colors.text} />
                  <Text
                    style={[styles.endCallText, { color: theme.colors.text }]}
                  >
                    End Call
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  gradientOverlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  minimizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  callerInfoWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: 20,
  },
  callerInfo: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 64,
    fontFamily: 'Inter-Bold',
  },
  callerName: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  category: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rate: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  rateUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  statText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statSeparator: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  controlButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderRadius: 16,
  },
  controlIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconContainerActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  endCallButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  endCallButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  endCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  endCallText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  minimizedBubble: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    zIndex: 9999,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  minimizedBubblePressed: {
    transform: [{ scale: 0.95 }],
  },
  minimizedGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  minimizedAvatarContainer: {
    position: 'relative',
  },
  minimizedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  minimizedAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  minimizedAvatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  minimizedPulseIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -2,
    right: -2,
    borderWidth: 2,
  },
  minimizedInfo: {
    flex: 1,
    gap: 2,
  },
  minimizedName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  minimizedDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
