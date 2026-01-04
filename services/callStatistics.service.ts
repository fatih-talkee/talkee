/**
 * Call Statistics Service
 *
 * Handles all logic for calculating call statistics.
 * Separated from CallsService for better separation of concerns.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CallFilters } from '@/types/database.types';

export interface CallStats {
  totalCalls: number;
  totalMinutes: number;
  totalSpent: number;
  averageRating: number;
  completedCalls: number;
  missedCalls: number;
  cancelledCalls: number;
}

export interface ProfessionalEarnings {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalCalls: number;
  averageCallDuration: number;
}

/**
 * Calculate call statistics for a user
 */
export async function calculateCallStats(
  userId: string,
  userProfessionalId?: string | null
): Promise<CallStats> {
  const statsStartTime = Date.now();
  logger.info('[CallStatisticsService] 📊 Calculating call statistics', {
    userId,
    userProfessionalId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Helper function to build base query
    const buildBaseQuery = (
      selectFields: string = '*',
      countOnly: boolean = false
    ) => {
      let query = countOnly
        ? supabase
            .from('calls')
            .select(selectFields, { count: 'exact', head: true })
        : supabase.from('calls').select(selectFields);

      if (userProfessionalId) {
        query = query.or(
          `caller_id.eq.${userId},professional_id.eq.${userProfessionalId}`
        );
      } else {
        query = query.eq('caller_id', userId);
      }

      return query;
    };

    // Fetch aggregated data in parallel
    const [
      { count: totalCalls, error: countError },
      { data: aggregatedData, error: aggError },
      { count: completedCount, error: completedError },
      { count: missedCount, error: missedError },
      { count: cancelledCount, error: cancelledError },
    ] = await Promise.all([
      // Total calls count
      buildBaseQuery('*', true),

      // Aggregated stats (duration, cost, rating)
      buildBaseQuery('duration_minutes, total_cost, rating', false),

      // Completed calls count
      buildBaseQuery('*', true).eq('status', 'completed'),

      // Missed calls count
      buildBaseQuery('*', true).eq('status', 'missed'),

      // Cancelled calls count
      buildBaseQuery('*', true).eq('status', 'cancelled'),
    ]);

    const queryElapsed = Date.now() - statsStartTime;

    if (
      countError ||
      aggError ||
      completedError ||
      missedError ||
      cancelledError
    ) {
      const errors = [
        countError,
        aggError,
        completedError,
        missedError,
        cancelledError,
      ].filter(Boolean);
      logger.error(
        '[CallStatisticsService] ❌ Error fetching call stats',
        errors[0],
        {
          userId,
          userProfessionalId,
          errorMessage: errors[0]?.message,
          errorCode: errors[0]?.code,
          errorsCount: errors.length,
          elapsed: `${queryElapsed}ms`,
          timestamp: new Date().toISOString(),
        }
      );
      throw new Error(
        `Failed to fetch call stats: ${errors[0]?.message || 'Unknown error'}`
      );
    }

    // Type-safe handling of aggregated data
    interface AggregatedCallData {
      duration_minutes: number | null;
      total_cost: number | null;
      rating: number | null;
    }

    const calls: AggregatedCallData[] =
      (aggregatedData as unknown as AggregatedCallData[]) || [];

    logger.debug('[CallStatisticsService] 📊 Calculating statistics', {
      userId,
      userProfessionalId,
      totalCalls: totalCalls || 0,
      callsDataCount: calls.length,
      timestamp: new Date().toISOString(),
    });

    const stats: CallStats = {
      totalCalls: totalCalls || 0,
      totalMinutes: calls.reduce(
        (sum, call) => sum + (call.duration_minutes || 0),
        0
      ),
      totalSpent: calls.reduce((sum, call) => sum + (call.total_cost || 0), 0),
      averageRating:
        calls.filter((c) => c.rating != null).length > 0
          ? calls.reduce((sum, call) => sum + (call.rating || 0), 0) /
            calls.filter((c) => c.rating != null).length
          : 0,
      completedCalls: completedCount || 0,
      missedCalls: missedCount || 0,
      cancelledCalls: cancelledCount || 0,
    };

    const totalElapsed = Date.now() - statsStartTime;
    logger.info('[CallStatisticsService] ✅ Call statistics calculated', {
      userId,
      userProfessionalId,
      stats,
      queryElapsed: `${queryElapsed}ms`,
      totalElapsed: `${totalElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error) {
    const totalElapsed = Date.now() - statsStartTime;
    logger.error(
      '[CallStatisticsService] ❌ Error calculating call stats',
      error,
      {
        userId,
        userProfessionalId,
        elapsed: `${totalElapsed}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      }
    );
    throw error;
  }
}
