/**
 * useCallDetails Hook
 *
 * Custom hook for loading call details (user info, professional info, rate, category)
 * Used by ActiveCallOverlay component.
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  lookupCallMetadata,
  lookupProfessionalIdForCallee,
} from '@/services/callRecordLookup.service';
import { calculateCallRate } from '@/services/rateCalculation.service';
import type { Call, CallInvite } from '@twilio/voice-react-native-sdk';

export interface CallDetails {
  callerName: string;
  callerAvatar: string | null;
  category: string | null;
  ratePerMinute: number;
}

interface UseCallDetailsParams {
  call: Call | null;
  callInvite: CallInvite | null;
  currentUserId: string | undefined;
}

export function useCallDetails({
  call,
  callInvite,
  currentUserId,
}: UseCallDetailsParams) {
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadCallDetails = useCallback(async () => {
    if (hasLoadedRef.current && callDetails) {
      return; // Already loaded
    }
    hasLoadedRef.current = true;
    if (!currentUserId) {
      logger.warn('[useCallDetails] ⚠️ No current user', {
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

    const loadStartTime = Date.now();
    setIsLoading(true);

    logger.info('[useCallDetails] 📞 Loading call details', {
      currentUserId: currentUserId.substring(0, 20) + '...',
      hasCall: !!call,
      hasCallInvite: !!callInvite,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Lookup call metadata (call record, professional ID, call type, etc.)
      const metadata = await lookupCallMetadata(
        call,
        callInvite,
        currentUserId
      );

      // ✅ FIX: If otherUserId is not found, try to get it from call record
      let finalOtherUserId = metadata.otherUserId;
      if (!finalOtherUserId && metadata.callRecord) {
        const isIncoming = metadata.callRecord.caller_id !== currentUserId;
        finalOtherUserId = isIncoming
          ? metadata.callRecord.caller_id
          : metadata.callRecord.professional?.user_id || null;

        if (finalOtherUserId) {
          logger.info(
            '[useCallDetails] 🔄 Found otherUserId from call record',
            {
              otherUserId: finalOtherUserId.substring(0, 20) + '...',
              isIncoming,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      if (!finalOtherUserId) {
        logger.warn(
          '[useCallDetails] ⚠️ Could not determine other party user ID',
          {
            hasCall: !!call,
            hasCallInvite: !!callInvite,
            hasCallRecord: !!metadata.callRecord,
            timestamp: new Date().toISOString(),
          }
        );
        setCallDetails({
          callerName: 'User',
          callerAvatar: null,
          category: null,
          ratePerMinute: 0,
        });
        setIsLoading(false);
        return;
      }

      // Step 2: Ensure we have professional ID for rate calculation
      let professionalId = metadata.professionalId;
      if (!professionalId) {
        // Determine professional ID based on call direction
        if (metadata.isIncomingCall) {
          // Incoming call: currentUser is the callee (professional)
          professionalId = await lookupProfessionalIdForCallee(currentUserId);
        } else {
          // Outgoing call: otherUserId is the callee (professional)
          professionalId = await lookupProfessionalIdForCallee(
            finalOtherUserId
          );
        }
      }

      // Step 3: Fetch user and professional data in parallel
      const [userResult, professionalResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', finalOtherUserId)
          .single(),
        supabase
          .from('professionals')
          .select(
            `
            id,
            user_id,
            rate_per_minute,
            category_id,
            categories(id, name)
          `
          )
          .eq('user_id', finalOtherUserId)
          .maybeSingle(),
      ]);

      const user = userResult.data;
      const professional = professionalResult.data;

      // Log errors
      if (userResult.error && userResult.error.code !== 'PGRST116') {
        logger.error('[useCallDetails] ❌ Failed to load user', {
          error: userResult.error.message,
          userId: finalOtherUserId,
          timestamp: new Date().toISOString(),
        });
      }

      if (
        professionalResult.error &&
        professionalResult.error.code !== 'PGRST116'
      ) {
        logger.warn(
          '[useCallDetails] ⚠️ Failed to load professional (expected if not professional)',
          {
            error: professionalResult.error.message,
            userId: finalOtherUserId,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Step 4: Calculate rate from CALLEE's availability
      let ratePerMinute = 0;
      let rateSource = 'not_available';

      if (professionalId) {
        const rateResult = await calculateCallRate(
          professionalId,
          metadata.callType,
          metadata.callStartTime
        );
        ratePerMinute = rateResult.ratePerMinute;
        rateSource = rateResult.rateSource;
      }

      // Step 5: Extract category name
      const categoryData = professional?.categories;
      const category = Array.isArray(categoryData)
        ? categoryData[0]?.name || null
        : categoryData &&
          typeof categoryData === 'object' &&
          'name' in categoryData
        ? (categoryData as { name: string }).name
        : null;

      const loadElapsed = Date.now() - loadStartTime;

      logger.info('[useCallDetails] ✅ Call details loaded', {
        callerName: user?.name || 'Unknown',
        hasAvatar: !!user?.avatar_url,
        ratePerMinute,
        rateSource,
        category,
        loadElapsed: `${loadElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      setCallDetails({
        callerName: user?.name || 'User',
        callerAvatar: user?.avatar_url || null,
        category,
        ratePerMinute,
      });
    } catch (error) {
      logger.error('[useCallDetails] ❌ Failed to load call details', error, {
        timestamp: new Date().toISOString(),
      });

      // Fallback
      setCallDetails({
        callerName: 'User',
        callerAvatar: null,
        category: null,
        ratePerMinute: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [call, callInvite, currentUserId]);

  return {
    callDetails,
    isLoading,
    loadCallDetails,
  };
}
