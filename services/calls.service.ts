/**
 * Calls Service
 *
 * Main service for call management operations.
 * Refactored to follow Single Responsibility Principle and best practices.
 *
 * Responsibilities:
 * - Call initiation and lifecycle management
 * - Call history retrieval
 * - Call statistics
 * - Stale call cleanup
 *
 * Business logic is delegated to specialized services:
 * - RateCalculationService: Rate calculation
 * - AvailabilityService: Availability checking
 * - CallValidationService: Input validation
 * - CallQueryBuilder: Query building
 * - CallStatisticsService: Statistics calculation
 */

import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import { logger } from '../lib/logger';
import type {
  CallWithRelations,
  CallInsert,
  CallType,
  CallFilters,
} from '../types/database.types';
import { CallStatus } from '../types/database.types';
import { calculateCallRate } from './rateCalculation.service';
import {
  checkProfessionalAvailability,
  getProfessionalWithAvailability,
} from './availability.service';
import {
  validateBalance,
  validateRate,
  validateCallType,
} from './callValidation.service';
import {
  buildCallHistoryQuery,
  buildCallHistoryCountQuery,
  buildSingleCallQuery,
  getUserProfessionalId,
} from './callQueryBuilder.service';
import {
  calculateCallStats,
  type CallStats,
  type ProfessionalEarnings,
} from './callStatistics.service';

// Re-export types for backward compatibility
export type { CallStats, ProfessionalEarnings };

class CallsService {
  private lastPendingCleanupAt: number | null = null;
  private readonly CLEANUP_MIN_INTERVAL_MS = 60_000; // 1 minute

  /**
   * Best-effort cleanup for calls stuck in "pending".
   *
   * Pending means: call record created, but never transitioned to active/completed/missed/cancelled.
   * This can happen if the app/background callbacks/webhooks didn't run.
   *
   * We auto-cancel stale pending calls to keep call history sane.
   */
  async cleanupStalePendingCalls(
    olderThanMinutes: number = 5
  ): Promise<{ updated: number }> {
    const cleanupStartTime = Date.now();
    logger.info('[CallsService] 🧹 cleanupStalePendingCalls called', {
      olderThanMinutes,
      lastCleanupAt: this.lastPendingCleanupAt
        ? new Date(this.lastPendingCleanupAt).toISOString()
        : null,
      timestamp: new Date().toISOString(),
    });

    try {
      const now = Date.now();

      // Avoid hammering the DB on repeated history fetches.
      if (
        this.lastPendingCleanupAt &&
        now - this.lastPendingCleanupAt < this.CLEANUP_MIN_INTERVAL_MS
      ) {
        const timeSinceLastCleanup = now - this.lastPendingCleanupAt;
        logger.debug(
          '[CallsService] ⏭️ Skipping cleanup (too soon since last)',
          {
            timeSinceLastCleanup: `${timeSinceLastCleanup}ms`,
            minInterval: `${this.CLEANUP_MIN_INTERVAL_MS}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        return { updated: 0 };
      }

      this.lastPendingCleanupAt = now;

      const currentUser = await usersService.getCurrentUser();
      if (!currentUser) {
        logger.warn('[CallsService] ⚠️ No current user, skipping cleanup', {
          timestamp: new Date().toISOString(),
        });
        return { updated: 0 };
      }

      const cutoffIso = new Date(now - olderThanMinutes * 60_000).toISOString();
      const endedAt = new Date().toISOString();

      const updateStartTime = Date.now();
      const { data, error } = await supabase
        .from('calls')
        .update({
          status: CallStatus.CANCELLED as CallStatus,
          end_time: endedAt,
          cancelled_by: currentUser.id,
          updated_at: endedAt,
        })
        .eq('caller_id', currentUser.id)
        .eq('status', CallStatus.PENDING as CallStatus)
        .is('end_time', null)
        .lt('created_at', cutoffIso)
        .select('id');

      const updateElapsed = Date.now() - updateStartTime;
      const totalElapsed = Date.now() - cleanupStartTime;

      if (error) {
        logger.warn('[CallsService] ⚠️ Failed to cleanup stale pending calls', {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
          elapsed: `${updateElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        return { updated: 0 };
      }

      const updated = (data || []).length;
      if (updated > 0) {
        logger.info('[CallsService] ✅ Cleaned up stale pending calls', {
          updated,
          olderThanMinutes,
          callIds: data?.map((c) => c.id) || [],
          updateElapsed: `${updateElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.debug('[CallsService] ℹ️ No stale pending calls to clean up', {
          olderThanMinutes,
          updateElapsed: `${updateElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      return { updated };
    } catch (error) {
      const totalElapsed = Date.now() - cleanupStartTime;
      logger.warn('[CallsService] ⚠️ cleanupStalePendingCalls threw', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      return { updated: 0 };
    }
  }

  /**
   * Determine rate per minute for a call
   * Uses UI-provided rate if available, otherwise calculates from availability
   */
  private async determineRatePerMinute(
    professionalId: string,
    callType: CallType,
    urgent: boolean,
    uiProvidedRate?: number
  ): Promise<number> {
    // Priority 1: Use rate from UI if provided (most accurate)
    if (uiProvidedRate != null && uiProvidedRate > 0) {
      logger.info('[CallsService] ✅ Using rate from UI', {
        professionalId,
        ratePerMinute: uiProvidedRate,
        callType,
        urgent,
        timestamp: new Date().toISOString(),
      });
      return Number(uiProvidedRate);
    }

    // Priority 2: Calculate rate from availability
    logger.debug('[CallsService] 💰 Calculating rate from availability', {
      professionalId,
      callType,
      urgent,
      timestamp: new Date().toISOString(),
    });

    const rateResult = await calculateCallRate(
      professionalId,
      callType,
      urgent ? null : new Date() // For urgent calls, don't use current time
    );

    if (rateResult.ratePerMinute <= 0) {
      logger.error(
        '[CallsService] ❌ Cannot determine rate per minute',
        undefined,
        {
          professionalId,
          callType,
          urgent,
          rateSource: rateResult.rateSource,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error('Cannot determine rate per minute for this call');
    }

    logger.info('[CallsService] 💰 Rate calculated from availability', {
      professionalId,
      ratePerMinute: rateResult.ratePerMinute,
      rateSource: rateResult.rateSource,
      callType,
      urgent,
      timestamp: new Date().toISOString(),
    });

    return rateResult.ratePerMinute;
  }

  /**
   * Create call record in database
   */
  private async createCallRecord(
    callerId: string,
    professionalId: string,
    callType: CallType,
    ratePerMinute: number
  ): Promise<CallWithRelations> {
    logger.info('[CallsService] 📝 Creating call record', {
      callerId,
      professionalId,
      callType,
      ratePerMinute,
      timestamp: new Date().toISOString(),
    });

    const callData: CallInsert = {
      caller_id: callerId,
      professional_id: professionalId,
      status: CallStatus.PENDING as CallStatus,
      call_type: callType,
      call_sid: null, // Will be set later by Twilio webhook
      rate_per_minute: ratePerMinute,
      start_time: null,
      end_time: null,
      duration_minutes: 0,
      total_cost: 0,
      rating: null,
      notes: null,
      cancelled_by: null,
    };

    const insertStartTime = Date.now();
    const { data, error } = await supabase
      .from('calls')
      .insert(callData)
      .select(
        `
        *,
        caller:users!caller_id(id, name, avatar_url),
        professional:professionals!professional_id(
          id,
          user_id,
          rate_per_minute,
          is_active,
          is_available,
          users!inner(id, name, avatar_url, is_verified),
          categories!inner(id, name, icon_name)
        )
      `
      )
      .single();
    const insertElapsed = Date.now() - insertStartTime;

    if (error) {
      logger.error('[CallsService] ❌ Error creating call', error, {
        callerId,
        professionalId,
        callType,
        ratePerMinute,
        errorMessage: error.message,
        errorCode: error.code,
        elapsed: `${insertElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to create call: ${error.message}`);
    }

    logger.info('[CallsService] ✅ Call record created successfully', {
      callId: data.id,
      professionalId,
      callType,
      status: data.status,
      ratePerMinute: data.rate_per_minute,
      storedRateMatches: data.rate_per_minute === ratePerMinute,
      insertElapsed: `${insertElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    return data as CallWithRelations;
  }

  /**
   * Initiate a new call
   *
   * Business flow:
   * 1. Validate inputs
   * 2. Check professional availability
   * 3. Determine rate per minute
   * 4. Validate user balance
   * 5. Create call record
   */
  async initiateCall(
    professionalId: string,
    callType: CallType = 'voice' as CallType,
    urgent: boolean = false,
    ratePerMinute?: number // UI-provided rate (already calculated)
  ): Promise<CallWithRelations | null> {
    const initiateStartTime = Date.now();
    logger.info('[CallsService] 📞 initiateCall called', {
      professionalId,
      callType,
      urgent,
      uiProvidedRate: ratePerMinute,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Validate call type
      if (!validateCallType(callType)) {
        logger.error('[CallsService] ❌ Invalid call type', undefined, {
          callType,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Invalid call type: ${callType}`);
      }

      // Step 2: Fetch user and professional in parallel
      const [currentUser, professional] = await Promise.all([
        usersService.getCurrentUser(),
        getProfessionalWithAvailability(professionalId),
      ]);

      if (!currentUser) {
        logger.error('[CallsService] ❌ Not authenticated', undefined, {
          professionalId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      if (!professional) {
        logger.error('[CallsService] ❌ Professional not found', undefined, {
          professionalId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Professional not found');
      }

      // Step 3: Check professional availability
      const availabilityCheck = await checkProfessionalAvailability(
        professionalId
      );
      if (!availabilityCheck.isAvailable) {
        logger.error(
          '[CallsService] ❌ Professional is not available',
          undefined,
          {
            professionalId,
            reason: availabilityCheck.reason,
            timestamp: new Date().toISOString(),
          }
        );
        throw new Error(
          availabilityCheck.reason || 'Professional is not available'
        );
      }

      // Step 4: Determine rate per minute
      const ratePerMinuteToCharge = await this.determineRatePerMinute(
        professionalId,
        callType,
        urgent,
        ratePerMinute
      );

      // Step 5: Validate rate
      const rateValidation = validateRate(ratePerMinuteToCharge);
      if (!rateValidation.isValid) {
        logger.error('[CallsService] ❌ Invalid rate per minute', undefined, {
          professionalId,
          ratePerMinute: ratePerMinuteToCharge,
          reason: rateValidation.reason,
          timestamp: new Date().toISOString(),
        });
        throw new Error(rateValidation.reason || 'Invalid rate per minute');
      }

      // Step 6: Validate user balance
      const balanceValidation = validateBalance(
        currentUser.wallet_balance,
        ratePerMinuteToCharge
      );
      if (!balanceValidation.isValid) {
        logger.error('[CallsService] ❌ Insufficient balance', undefined, {
          userId: currentUser.id,
          walletBalance: currentUser.wallet_balance,
          estimatedCost: balanceValidation.estimatedCost,
          ratePerMinute: ratePerMinuteToCharge,
          timestamp: new Date().toISOString(),
        });
        throw new Error(balanceValidation.reason || 'Insufficient balance');
      }

      // Step 7: Create call record
      const callRecord = await this.createCallRecord(
        currentUser.id,
        professionalId,
        callType,
        ratePerMinuteToCharge
      );

      // ✅ REMOVED: Push notification to professional
      // Twilio Voice SDK already sends its own push notification when an incoming call arrives.
      logger.debug(
        '[CallsService] ⏭️ Skipping push notification - Twilio SDK handles incoming call push',
        {
          callId: callRecord.id,
          professionalUserId: professional.user_id,
          note: 'Twilio Voice SDK sends push notification automatically when call invite is received',
          timestamp: new Date().toISOString(),
        }
      );

      const totalElapsed = Date.now() - initiateStartTime;
      logger.info('[CallsService] ✅ Call initiated successfully', {
        callId: callRecord.id,
        professionalId,
        callType,
        urgent,
        ratePerMinute: ratePerMinuteToCharge,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return callRecord;
    } catch (error) {
      const totalElapsed = Date.now() - initiateStartTime;
      logger.error('[CallsService] ❌ Error in initiateCall', error, {
        professionalId,
        callType,
        urgent,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get call history for current user
   * Returns calls where user is the caller OR professional (callee)
   */
  async getCallHistory(
    filters?: CallFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<CallWithRelations[]> {
    const fetchStartTime = Date.now();
    logger.info('[CallsService] 📞 getCallHistory called', {
      limit,
      offset,
      filters,
      timestamp: new Date().toISOString(),
    });

    try {
      const currentUser = await usersService.getCurrentUser();
      if (!currentUser) {
        logger.error('[CallsService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      // Get user's professional ID if they are a professional
      const userProfessionalId = await getUserProfessionalId(currentUser.id);

      // Build and execute query
      const query = buildCallHistoryQuery(
        currentUser.id,
        userProfessionalId,
        filters,
        limit,
        offset
      );

      const queryStartTime = Date.now();
      const { data, error } = await query;
      const queryElapsed = Date.now() - queryStartTime;
      const totalElapsed = Date.now() - fetchStartTime;

      if (error) {
        logger.error('[CallsService] ❌ Error fetching call history', error, {
          userId: currentUser.id,
          errorMessage: error.message,
          errorCode: error.code,
          elapsed: `${queryElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Failed to fetch call history: ${error.message}`);
      }

      const calls = (data || []) as unknown as CallWithRelations[];

      logger.info('[CallsService] ✅ Call history fetched', {
        userId: currentUser.id,
        count: calls.length,
        limit,
        offset,
        queryElapsed: `${queryElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return calls;
    } catch (error) {
      const totalElapsed = Date.now() - fetchStartTime;
      logger.error('[CallsService] ❌ Error in getCallHistory', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get total count of calls for the current user (caller OR professional)
   */
  async getCallHistoryCount(filters?: CallFilters): Promise<number> {
    const countStartTime = Date.now();
    logger.info('[CallsService] 🔍 Getting call history count', {
      filters,
      timestamp: new Date().toISOString(),
    });

    try {
      const currentUser = await usersService.getCurrentUser();
      if (!currentUser) {
        logger.warn(
          '[CallsService] ⚠️ Not authenticated for call history count',
          {
            timestamp: new Date().toISOString(),
          }
        );
        return 0;
      }

      // Get user's professional ID if they are a professional
      const userProfessionalId = await getUserProfessionalId(currentUser.id);

      // Build and execute count query
      const countQuery = buildCallHistoryCountQuery(
        currentUser.id,
        userProfessionalId,
        filters
      );

      const { count, error: countError } = await countQuery;

      if (countError) {
        logger.error(
          '[CallsService] ❌ Error getting call history count',
          countError,
          {
            userId: currentUser.id,
            filters,
            timestamp: new Date().toISOString(),
          }
        );
        return 0;
      }

      logger.info('[CallsService] ✅ Call history count fetched', {
        count: count || 0,
        userId: currentUser.id,
        filters,
        elapsed: `${Date.now() - countStartTime}ms`,
        timestamp: new Date().toISOString(),
      });

      return count || 0;
    } catch (error) {
      logger.error('[CallsService] ❌ Error in getCallHistoryCount', error, {
        filters,
        elapsed: `${Date.now() - countStartTime}ms`,
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
  }

  /**
   * Get a single call by ID
   */
  async getCall(callId: string): Promise<CallWithRelations | null> {
    const fetchStartTime = Date.now();
    logger.info('[CallsService] 📞 getCall called', {
      callId,
      timestamp: new Date().toISOString(),
    });

    try {
      const query = buildSingleCallQuery(callId);
      const queryStartTime = Date.now();
      const { data, error } = await query;
      const queryElapsed = Date.now() - queryStartTime;
      const totalElapsed = Date.now() - fetchStartTime;

      if (error) {
        logger.error('[CallsService] ❌ Error fetching call', error, {
          callId,
          errorMessage: error.message,
          errorCode: error.code,
          elapsed: `${queryElapsed}ms`,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Failed to fetch call: ${error.message}`);
      }

      logger.info('[CallsService] ✅ Call fetched', {
        callId,
        hasData: !!data,
        status: data?.status,
        queryElapsed: `${queryElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return data as unknown as CallWithRelations | null;
    } catch (error) {
      const totalElapsed = Date.now() - fetchStartTime;
      logger.error('[CallsService] ❌ Error in getCall', error, {
        callId,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get call statistics for user
   */
  async getCallStats(): Promise<CallStats> {
    const statsStartTime = Date.now();
    logger.info('[CallsService] 📊 getCallStats called', {
      timestamp: new Date().toISOString(),
    });

    try {
      const currentUser = await usersService.getCurrentUser();
      if (!currentUser) {
        logger.error('[CallsService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      // Get user's professional ID if they are a professional
      const userProfessionalId = await getUserProfessionalId(currentUser.id);

      // Calculate statistics using dedicated service
      const stats = await calculateCallStats(
        currentUser.id,
        userProfessionalId
      );

      const totalElapsed = Date.now() - statsStartTime;
      logger.info('[CallsService] ✅ Call statistics calculated', {
        userId: currentUser.id,
        stats,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return stats;
    } catch (error) {
      const totalElapsed = Date.now() - statsStartTime;
      logger.error('[CallsService] ❌ Error in getCallStats', error, {
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

export const callsService = new CallsService();
