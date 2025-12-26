// ✅ Calls service with is_available restored (after migration)

import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import { notificationsService } from './notifications.service';
import { logger } from '../lib/logger';
import type {
  Call,
  CallWithRelations,
  CallInsert,
  CallUpdate,
  CallType,
  CallFilters,
} from '../types/database.types';
import { CallStatus } from '../types/database.types';

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

class CallsService {
  private lastPendingCleanupAt: number | null = null;

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
        now - this.lastPendingCleanupAt < 60_000
      ) {
        const timeSinceLastCleanup = now - this.lastPendingCleanupAt;
        logger.debug('[CallsService] ⏭️ Skipping cleanup (too soon since last)', {
          timeSinceLastCleanup: `${timeSinceLastCleanup}ms`,
          minInterval: '60000ms',
          timestamp: new Date().toISOString(),
        });
        return { updated: 0 };
      }

      this.lastPendingCleanupAt = now;
      logger.debug('[CallsService] 🔧 Setting lastPendingCleanupAt', {
        timestamp: new Date().toISOString(),
      });

      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[CallsService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.warn('[CallsService] ⚠️ No current user, skipping cleanup', {
          timestamp: new Date().toISOString(),
        });
        return { updated: 0 };
      }

      const cutoffIso = new Date(now - olderThanMinutes * 60_000).toISOString();
      const endedAt = new Date().toISOString();

      logger.info('[CallsService] 🔍 Cleaning up stale pending calls', {
        userId: currentUser.id,
        olderThanMinutes,
        cutoffTime: cutoffIso,
        endedAt,
        timestamp: new Date().toISOString(),
      });

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
        logger.warn(
          '[CallsService] ⚠️ Failed to cleanup stale pending calls',
          {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
            elapsed: `${updateElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
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
   * Initiate a new call
   */
  async initiateCall(
    professionalId: string,
    callType: CallType = 'voice' as CallType,
    urgent: boolean = false
  ): Promise<CallWithRelations | null> {
    const initiateStartTime = Date.now();
    logger.info('[CallsService] 📞 initiateCall called', {
      professionalId,
      callType,
      urgent,
      timestamp: new Date().toISOString(),
    });

    try {
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[CallsService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[CallsService] ❌ Not authenticated', undefined, {
          professionalId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      // Get professional details to get rate
      logger.info('[CallsService] 🔍 Fetching professional details', {
        professionalId,
        timestamp: new Date().toISOString(),
      });

      const profStartTime = Date.now();
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id, user_id, rate_per_minute, is_available') // ✅ Restored is_available
        .eq('id', professionalId)
        .single();
      const profElapsed = Date.now() - profStartTime;

      if (profError || !professional) {
        logger.error('[CallsService] ❌ Professional not found', profError, {
          professionalId,
          errorMessage: profError?.message,
          errorCode: profError?.code,
          elapsed: `${profElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Professional not found');
      }

      logger.info('[CallsService] ✅ Professional found', {
        professionalId,
        userId: professional.user_id,
        ratePerMinute: professional.rate_per_minute,
        isAvailable: professional.is_available,
        elapsed: `${profElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // ✅ Restored is_available check
      if (!professional.is_available) {
        logger.error('[CallsService] ❌ Professional is not available', undefined, {
          professionalId,
          isAvailable: professional.is_available,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Professional is not available');
      }

      // Determine the rate to charge for this call.
      //
      // Business rules (mirrors UI intent):
      // - Urgent calls can be placed when the professional is online (is_available=true).
      //   If an 'urgent' availability exists, we charge its price_per_minute; otherwise fallback to professional.rate_per_minute.
      // - Scheduled calls require an active availability window (every/specific) and charge that window's price_per_minute.
      let ratePerMinuteToCharge: number = Number(
        professional.rate_per_minute || 0
      );

      logger.debug('[CallsService] 💰 Initial rate per minute', {
        professionalId,
        ratePerMinute: ratePerMinuteToCharge,
        urgent,
        timestamp: new Date().toISOString(),
      });

      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0];

      logger.debug('[CallsService] 📅 Current time context', {
        currentDay,
        currentTime,
        currentDate,
        timestamp: new Date().toISOString(),
      });

      logger.info('[CallsService] 🔍 Fetching availabilities', {
        professionalId,
        urgent,
        timestamp: new Date().toISOString(),
      });

      const availStartTime = Date.now();
      const { data: availabilities, error: availError } = await supabase
        .from('availabilities')
        .select(
          'available_at, days, date, start_hour, end_hour, price_per_minute'
        )
        .eq('professional_id', professionalId);
      const availElapsed = Date.now() - availStartTime;

      const list: any[] = Array.isArray(availabilities) ? availabilities : [];

      logger.debug('[CallsService] 📊 Availabilities fetched', {
        professionalId,
        count: list.length,
        hasError: !!availError,
        elapsed: `${availElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (urgent) {
        logger.debug('[CallsService] 🔍 Processing urgent call rate', {
          professionalId,
          timestamp: new Date().toISOString(),
        });

        // Best-effort; if we can't load availabilities, we still allow urgent using default rate.
        if (!availError) {
          const urgentAvail = list.find((a) => a?.available_at === 'urgent');
          logger.debug('[CallsService] 🔍 Looking for urgent availability', {
            professionalId,
            foundUrgentAvail: !!urgentAvail,
            urgentAvailPrice: urgentAvail?.price_per_minute,
            timestamp: new Date().toISOString(),
          });

          if (urgentAvail?.price_per_minute != null) {
            ratePerMinuteToCharge = Number(urgentAvail.price_per_minute || 0);
            logger.info('[CallsService] ✅ Using urgent availability rate', {
              professionalId,
              ratePerMinute: ratePerMinuteToCharge,
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.debug('[CallsService] ℹ️ No urgent availability found, using default rate', {
              professionalId,
              ratePerMinute: ratePerMinuteToCharge,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          logger.warn('[CallsService] ⚠️ Failed to load availabilities, using default rate for urgent', {
            professionalId,
            ratePerMinute: ratePerMinuteToCharge,
            errorMessage: availError.message,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        if (availError) {
          logger.error('[CallsService] ❌ Failed to load availability', availError, {
            professionalId,
            errorMessage: availError.message,
            errorCode: availError.code,
            elapsed: `${availElapsed}ms`,
            timestamp: new Date().toISOString(),
          });
          throw new Error('Failed to load availability');
        }

        logger.debug('[CallsService] 🔍 Checking for active availability window', {
          professionalId,
          currentDay,
          currentTime,
          currentDate,
          availabilitiesCount: list.length,
          timestamp: new Date().toISOString(),
        });

        const isInWindow = (a: any): boolean => {
          if (!a) return false;
          if (a.available_at === 'every') {
            if (!Array.isArray(a.days) || !a.start_hour || !a.end_hour)
              return false;
            const dayMatch = a.days.some(
              (d: string) =>
                String(d).toLowerCase() === currentDay.toLowerCase()
            );
            if (!dayMatch) return false;
            return currentTime >= a.start_hour && currentTime < a.end_hour;
          }
          if (a.available_at === 'specific') {
            if (!a.date || !a.start_hour || !a.end_hour) return false;
            if (a.date !== currentDate) return false;
            return currentTime >= a.start_hour && currentTime < a.end_hour;
          }
          return false;
        };

        const activeAvail = list.find(isInWindow);
        if (!activeAvail) {
          logger.error('[CallsService] ❌ No active availability for this call', undefined, {
            professionalId,
            currentDay,
            currentTime,
            currentDate,
            availabilitiesCount: list.length,
            timestamp: new Date().toISOString(),
          });
          throw new Error('No active availability for this call');
        }

        ratePerMinuteToCharge = Number(activeAvail.price_per_minute || 0);
        logger.info('[CallsService] ✅ Active availability found', {
          professionalId,
          ratePerMinute: ratePerMinuteToCharge,
          availableAt: activeAvail.available_at,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('[CallsService] 💰 Final rate per minute determined', {
        professionalId,
        ratePerMinute: ratePerMinuteToCharge,
        urgent,
        timestamp: new Date().toISOString(),
      });

      // Check if user has sufficient balance (minimum 5 minutes)
      const estimatedCost = ratePerMinuteToCharge * 5;
      logger.debug('[CallsService] 💳 Checking wallet balance', {
        userId: currentUser.id,
        walletBalance: currentUser.wallet_balance,
        estimatedCost,
        ratePerMinute: ratePerMinuteToCharge,
        minimumMinutes: 5,
        timestamp: new Date().toISOString(),
      });

      if (currentUser.wallet_balance < estimatedCost) {
        logger.error('[CallsService] ❌ Insufficient balance', undefined, {
          userId: currentUser.id,
          walletBalance: currentUser.wallet_balance,
          estimatedCost,
          ratePerMinute: ratePerMinuteToCharge,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Insufficient balance');
      }

      logger.info('[CallsService] ✅ Wallet balance sufficient', {
        userId: currentUser.id,
        walletBalance: currentUser.wallet_balance,
        estimatedCost,
        timestamp: new Date().toISOString(),
      });

      // Create call record
      logger.info('[CallsService] 📝 Creating call record', {
        professionalId,
        callType,
        ratePerMinute: ratePerMinuteToCharge,
        urgent,
        timestamp: new Date().toISOString(),
      });

      const callData: CallInsert = {
        caller_id: currentUser.id,
        professional_id: professionalId,
        status: CallStatus.PENDING as CallStatus,
        call_type: callType,
        rate_per_minute: ratePerMinuteToCharge,
        start_time: null,
        end_time: null,
        duration_minutes: 0,
        total_cost: 0,
        rating: null,
        notes: null,
        cancelled_by: null,
      };

      logger.debug('[CallsService] 💾 Inserting call record to database', {
        callData: {
          caller_id: callData.caller_id,
          professional_id: callData.professional_id,
          status: callData.status,
          call_type: callData.call_type,
          rate_per_minute: callData.rate_per_minute,
        },
        timestamp: new Date().toISOString(),
      });

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
          professionalId,
          errorMessage: error.message,
          errorCode: error.code,
          elapsed: `${insertElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Failed to create call: ${error.message}`);
      }

      logger.info('[CallsService] ✅ Call record created', {
        callId: data.id,
        professionalId,
        status: data.status,
        ratePerMinute: data.rate_per_minute,
        insertElapsed: `${insertElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      // Send push notification to professional
      // Don't block the UI, but log success/failure so we can debug "callee didn't get push".
      logger.info('[CallsService] 📤 Scheduling push notification (async)', {
        callId: data.id,
        timestamp: new Date().toISOString(),
      });

      void (async () => {
        const pushStartTime = Date.now();
        try {
          // Use data.professional which includes the users relation, fallback to professional for user_id
          const professionalData = data.professional || professional;
          const professionalUserId =
            professionalData.user_id || professional.user_id;
          const professionalName = (professionalData as any)?.users?.name;

          logger.info(
            '[CallsService] 📤 Sending push notification to professional',
            {
              callId: data.id,
              professionalUserId,
              professionalName,
              callerName: currentUser.name,
              callType,
              urgent,
              timestamp: new Date().toISOString(),
            }
          );

          // Check if professional has active push tokens (for debugging)
          logger.debug('[CallsService] 🔍 Checking professional push tokens', {
            professionalUserId,
            timestamp: new Date().toISOString(),
          });

          const tokensStartTime = Date.now();
          const professionalTokens =
            await notificationsService.getUserDeviceTokens(professionalUserId);
          const tokensElapsed = Date.now() - tokensStartTime;

          logger.info('[CallsService] 📊 Professional push token status', {
            professionalUserId,
            activeTokenCount: professionalTokens.length,
            hasTokens: professionalTokens.length > 0,
            tokenPreviews: professionalTokens.map(
              (t) => t.substring(0, 30) + '...'
            ),
            elapsed: `${tokensElapsed}ms`,
            timestamp: new Date().toISOString(),
          });

          if (professionalTokens.length === 0) {
            logger.warn(
              '[CallsService] ⚠️ Professional has no active push tokens - push notification will not be delivered',
              {
                professionalUserId,
                professionalName,
                callId: data.id,
                timestamp: new Date().toISOString(),
              }
            );
          }

          logger.info('[CallsService] 📤 Calling sendPushNotification', {
            professionalUserId,
            callId: data.id,
            timestamp: new Date().toISOString(),
          });

          const sendStartTime = Date.now();
          const ok = await notificationsService.sendPushNotification(
            professionalUserId,
            'Incoming Call',
            `${currentUser.name || 'Someone'} is calling you...`,
            {
              type: 'call_request',
              call_id: data.id,
              caller_id: currentUser.id,
              caller_name: currentUser.name,
              call_type: callType,
              rate_per_minute: ratePerMinuteToCharge,
              // Helps deep-link routing when the notification is tapped (background/killed app).
              action_url: `talkee://call/${data.id}?incoming=true&type=${callType}`,
            }
          );
          const sendElapsed = Date.now() - sendStartTime;
          const totalElapsed = Date.now() - pushStartTime;

          logger.info('[CallsService] 📊 Push notification send result', {
            success: ok,
            callId: data.id,
            professionalUserId,
            hadActiveTokens: professionalTokens.length > 0,
            sendElapsed: `${sendElapsed}ms`,
            totalElapsed: `${totalElapsed}ms`,
            timestamp: new Date().toISOString(),
          });

          if (!ok) {
            logger.warn(
              '[CallsService] ⚠️ Push notification failed - check professional push token status',
              {
                callId: data.id,
                professionalUserId,
                professionalName,
                activeTokenCount: professionalTokens.length,
                timestamp: new Date().toISOString(),
              }
            );
          } else {
            logger.info('[CallsService] ✅ Push notification sent successfully', {
              callId: data.id,
              professionalUserId,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          const totalElapsed = Date.now() - pushStartTime;
          logger.error('[CallsService] ❌ Error sending call_request push', err, {
            callId: data.id,
            professionalUserId: professional.user_id,
            elapsed: `${totalElapsed}ms`,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
          });
        }
      })();

      const totalElapsed = Date.now() - initiateStartTime;
      logger.info('[CallsService] ✅ Call initiated successfully', {
        callId: data.id,
        professionalId,
        callType,
        urgent,
        ratePerMinute: ratePerMinuteToCharge,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return data as CallWithRelations;
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
   * Returns calls where user is the caller
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
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[CallsService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[CallsService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      logger.info('[CallsService] 🔍 Building query for call history', {
        userId: currentUser.id,
        limit,
        offset,
        filters,
        timestamp: new Date().toISOString(),
      });

      let query = supabase
        .from('calls')
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
        .eq('caller_id', currentUser.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.status) {
        logger.debug('[CallsService] 🔍 Applying status filter', {
          status: filters.status,
          timestamp: new Date().toISOString(),
        });
        query = query.eq('status', filters.status);
      }

      if (filters?.callType) {
        logger.debug('[CallsService] 🔍 Applying callType filter', {
          callType: filters.callType,
          timestamp: new Date().toISOString(),
        });
        query = query.eq('call_type', filters.callType);
      }

      if (filters?.startDate) {
        logger.debug('[CallsService] 🔍 Applying startDate filter', {
          startDate: filters.startDate,
          timestamp: new Date().toISOString(),
        });
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        logger.debug('[CallsService] 🔍 Applying endDate filter', {
          endDate: filters.endDate,
          timestamp: new Date().toISOString(),
        });
        query = query.lte('created_at', filters.endDate);
      }

      logger.debug('[CallsService] 📡 Executing query', {
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

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

      const calls = (data || []) as CallWithRelations[];

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
   * Get a single call by ID
   */
  async getCall(callId: string): Promise<CallWithRelations | null> {
    const fetchStartTime = Date.now();
    logger.info('[CallsService] 📞 getCall called', {
      callId,
      timestamp: new Date().toISOString(),
    });

    try {
      logger.debug('[CallsService] 🔍 Fetching call from database', {
        callId,
        timestamp: new Date().toISOString(),
      });

      const queryStartTime = Date.now();
      const { data, error } = await supabase
        .from('calls')
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
        .eq('id', callId)
        .single();
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

      return data as CallWithRelations | null;
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
      const userStartTime = Date.now();
      const currentUser = await usersService.getCurrentUser();
      const userElapsed = Date.now() - userStartTime;

      logger.debug('[CallsService] 👤 Current user fetched', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        elapsed: `${userElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!currentUser) {
        logger.error('[CallsService] ❌ Not authenticated', undefined, {
          timestamp: new Date().toISOString(),
        });
        throw new Error('Not authenticated');
      }

      logger.info('[CallsService] 🔍 Fetching call statistics', {
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });

      const queryStartTime = Date.now();
      const { data, error } = await supabase
        .from('calls')
        .select('status, duration_minutes, total_cost, rating')
        .eq('caller_id', currentUser.id);
      const queryElapsed = Date.now() - queryStartTime;

      if (error) {
        logger.error('[CallsService] ❌ Error fetching call stats', error, {
          userId: currentUser.id,
          errorMessage: error.message,
          errorCode: error.code,
          elapsed: `${queryElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Failed to fetch call stats: ${error.message}`);
      }

      const calls = data || [];

      logger.debug('[CallsService] 📊 Calculating statistics', {
        userId: currentUser.id,
        callsCount: calls.length,
        timestamp: new Date().toISOString(),
      });

      const stats: CallStats = {
        totalCalls: calls.length,
        totalMinutes: calls.reduce(
          (sum, call) => sum + (call.duration_minutes || 0),
          0
        ),
        totalSpent: calls.reduce(
          (sum, call) => sum + (call.total_cost || 0),
          0
        ),
        averageRating:
          calls.filter((c) => c.rating).length > 0
            ? calls.reduce((sum, call) => sum + (call.rating || 0), 0) /
              calls.filter((c) => c.rating).length
            : 0,
        // ✅ FIXED: lowercase status values
        completedCalls: calls.filter((c) => c.status === 'completed').length,
        missedCalls: calls.filter((c) => c.status === 'missed').length,
        cancelledCalls: calls.filter((c) => c.status === 'cancelled').length,
      };

      const totalElapsed = Date.now() - statsStartTime;
      logger.info('[CallsService] ✅ Call statistics calculated', {
        userId: currentUser.id,
        stats,
        queryElapsed: `${queryElapsed}ms`,
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

  // ... rest of methods stay the same
}

export const callsService = new CallsService();
