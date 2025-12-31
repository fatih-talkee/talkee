import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { CallStatus as DbCallStatus } from '@/types/database.types';
import { CallQueryBuilder } from './CallQueryBuilder';
import { CallSidExtractor } from '../utils/CallSidExtractor';

export interface UpdateCallOnConnectParams {
  callId: string;
  debugId?: string;
  callSid?: string;
}

export interface UpdateCallOnDisconnectParams {
  callId: string;
  debugId?: string;
  wasConnected?: boolean;
  isMissedDueToTimeout?: boolean;
}

/**
 * Repository class for call database operations
 */
export class CallRepository {
  private supabase: SupabaseClient;
  private queryBuilder: CallQueryBuilder;

  constructor(supabase: SupabaseClient, debugId?: string) {
    this.supabase = supabase;
    this.queryBuilder = new CallQueryBuilder(supabase, debugId);
  }

  /**
   * Update call record when call connects
   * Sets start_time if not already set (ensures first connection sets definitive time)
   */
  async updateCallOnConnect(params: UpdateCallOnConnectParams): Promise<void> {
    const { callId, debugId, callSid } = params;
    const updateStartTime = Date.now();
    logger.info('[CallRepository] 📝 updateCallOnConnect called', {
      debugId,
      callId,
      callSid: callSid?.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });

    // ✅ Build candidate list for update attempts
    const candidates: Array<{ field: string; value: string }> = [];

    // Always try UUID first (most common)
    if (CallSidExtractor.isUuid(callId)) {
      candidates.push({ field: 'id', value: callId });
    }

    // If callSid provided, also try by call_sid
    if (callSid) {
      candidates.push({ field: 'call_sid', value: callSid });
    }

    // If callId is a Call SID, try by call_sid
    if (CallSidExtractor.isCallSid(callId)) {
      candidates.push({ field: 'call_sid', value: callId });
    }

    logger.debug('[CallRepository] 🔍 Update candidates', {
      debugId,
      callId,
      candidates: candidates.map((c) => c.field),
      timestamp: new Date().toISOString(),
    });

    const nowIso = new Date().toISOString();

    // ✅ Try each candidate until one succeeds
    for (const candidate of candidates) {
      const dbCallId = candidate.value;
      const status = DbCallStatus.ACTIVE;

      logger.debug('[CallRepository] 🔄 Trying update candidate', {
        debugId,
        callId: dbCallId.substring(0, 20) + '...',
        field: candidate.field,
        status,
        timestamp: new Date().toISOString(),
      });

      const updateData: any = {
        status,
        updated_at: nowIso,
      };

      // ✅ Only set start_time if it's null in DB (ensures first connection sets definitive time)
      // Use RPC to atomically check and set start_time
      const { data: existingCall } = await this.supabase
        .from('calls')
        .select('start_time')
        .eq(candidate.field, dbCallId)
        .maybeSingle();

      if (existingCall && !existingCall.start_time) {
        updateData.start_time = nowIso;
        logger.debug('[CallRepository] 📝 Setting start_time', {
          debugId,
          callId: dbCallId.substring(0, 20) + '...',
          startTime: nowIso,
          timestamp: new Date().toISOString(),
        });
      } else if (existingCall?.start_time) {
        logger.debug('[CallRepository] ⏭️ start_time already set, skipping', {
          debugId,
          callId: dbCallId.substring(0, 20) + '...',
          existingStartTime: existingCall.start_time,
          timestamp: new Date().toISOString(),
        });
      }

      const res = await this.supabase
        .from('calls')
        .update(updateData)
        .eq(candidate.field, dbCallId);

      if (!res.error) {
        const totalElapsed = Date.now() - updateStartTime;
        logger.info('[CallRepository] ✅ Call record updated (connected)', {
          debugId,
          callId: dbCallId,
          status,
          totalElapsed: `${totalElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        return;
      } else {
        logger.debug('[CallRepository] ⚠️ Status update failed, trying next', {
          debugId,
          callId: dbCallId,
          status,
          errorMessage: res.error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const totalElapsed = Date.now() - updateStartTime;
    logger.warn(
      '[CallRepository] ⚠️ Failed to update call status (all candidates failed)',
      {
        debugId,
        callId,
        candidates,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Update call record when call disconnects
   * Sets end_time and status (COMPLETED/MISSED/CANCELLED)
   * Note: Duration and cost are set by Twilio webhook, not here
   */
  async updateCallOnDisconnect(
    params: UpdateCallOnDisconnectParams
  ): Promise<void> {
    const {
      callId: initialCallId,
      debugId,
      wasConnected,
      isMissedDueToTimeout,
    } = params;
    let callId = initialCallId; // ✅ Use let to allow reassignment
    const updateStartTime = Date.now();
    logger.info('[CallRepository] 📝 updateCallOnDisconnect called', {
      debugId,
      callId,
      wasConnected,
      timestamp: new Date().toISOString(),
    });

    const endedAt = new Date().toISOString();
    let startTime: string | null = null;
    let querySucceeded = false;
    let callRecord: any = null;

    // ✅ Use CallQueryBuilder to find call record
    const {
      data: row,
      error: loadErr,
      usedFallback,
    } = await this.queryBuilder.findByIdOrSidWithFallback(
      callId,
      'start_time, status, id, rate_per_minute, call_type, duration_minutes, total_cost'
    );

    if (!loadErr && row) {
      startTime = row.start_time ?? null;
      callRecord = row;
      querySucceeded = true;

      // ✅ Update callId to the actual UUID for subsequent operations
      if (usedFallback && row.id) {
        callId = row.id;
      }

      logger.info('[CallRepository] ✅ Call record loaded', {
        debugId,
        callId,
        startTime,
        status: row.status,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.warn('[CallRepository] ⚠️ Failed to load call record', {
        debugId,
        callId,
        errorMessage: loadErr?.message,
        timestamp: new Date().toISOString(),
      });

      // Don't set startTime to 'connected' string - it will be handled in fallback logic below
      querySucceeded = false;
    }

    // ✅ If call was connected but start_time not found, try to fetch it from database
    // This can happen if updateCallOnConnect failed or was delayed
    if (wasConnected && !startTime && !querySucceeded) {
      logger.info(
        '[CallRepository] 🔄 Call was connected but start_time not found, attempting to fetch',
        {
          debugId,
          callId,
          wasConnected,
          timestamp: new Date().toISOString(),
        }
      );

      try {
        // Try to find call record and get start_time
        const {
          data: fallbackRecord,
          error: fallbackError,
        } = await this.queryBuilder.findByIdOrSidWithFallback(
          callId,
          'start_time, rate_per_minute, id'
        );

        if (!fallbackError && fallbackRecord) {
          startTime = fallbackRecord.start_time ?? null;
          callRecord = fallbackRecord;
          querySucceeded = true;

          // Update callId to the actual UUID if we found it
          if (fallbackRecord.id && CallSidExtractor.isCallSid(callId)) {
            callId = fallbackRecord.id;
          }

          logger.info('[CallRepository] ✅ Fetched call record (fallback)', {
            debugId,
            callId,
            startTime,
            hasRate: !!fallbackRecord.rate_per_minute,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.warn(
          '[CallRepository] ⚠️ Failed to fetch call record (fallback)',
          {
            debugId,
            callId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    const neverConnected = !startTime && !wasConnected;
    logger.debug('[CallRepository] 🔍 Determining call status', {
      debugId,
      callId,
      startTime,
      neverConnected,
      wasConnected,
      querySucceeded,
      timestamp: new Date().toISOString(),
    });

    // ✅ Calculate duration and cost as fallback (Twilio webhook is authoritative but may be delayed)
    // If start_time exists, calculate duration from start_time to end_time
    // If rate_per_minute exists, calculate cost
    // Twilio webhook will override these values when it arrives (if it arrives)
    let calculatedDurationMinutes: number | null = null;
    let calculatedTotalCost: number | null = null;

    if (startTime && typeof startTime === 'string' && startTime !== 'connected') {
      try {
        const start = new Date(startTime).getTime();
        const end = new Date(endedAt).getTime();

        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          const durationSeconds = Math.floor((end - start) / 1000);
          // Round up to nearest minute (minimum 1 minute)
          calculatedDurationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

          // Calculate cost if rate_per_minute is available
          if (callRecord?.rate_per_minute && Number(callRecord.rate_per_minute) > 0) {
            const ratePerMinute = Number(callRecord.rate_per_minute);
            calculatedTotalCost = calculatedDurationMinutes * ratePerMinute;

            logger.info(
              '[CallRepository] 💰 Calculated duration and cost (fallback)',
              {
                debugId,
                callId,
                durationMinutes: calculatedDurationMinutes,
                ratePerMinute,
                totalCost: calculatedTotalCost,
                note: 'Twilio webhook will override these values when it arrives.',
                timestamp: new Date().toISOString(),
              }
            );
          } else {
            logger.info(
              '[CallRepository] ⏱️ Calculated duration (fallback, no rate available)',
              {
                debugId,
                callId,
                durationMinutes: calculatedDurationMinutes,
                note: 'Twilio webhook will override duration when it arrives.',
                timestamp: new Date().toISOString(),
              }
            );
          }
        }
      } catch (error) {
        logger.warn('[CallRepository] ⚠️ Failed to calculate duration/cost', {
          debugId,
          callId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      logger.info(
        '[CallRepository] ℹ️ Skipping duration calculation - no start_time or call never connected',
        {
          debugId,
          callId,
          wasConnected,
          startTime,
          note: 'Twilio webhook will set duration_minutes from CallDuration field when call ends.',
          timestamp: new Date().toISOString(),
        }
      );
    }

    if (neverConnected) {
      // ✅ If call was missed due to timeout, mark as MISSED instead of CANCELLED
      const finalStatus = isMissedDueToTimeout
        ? DbCallStatus.MISSED
        : DbCallStatus.CANCELLED;
      logger.info(
        `[CallRepository] 🗑️ Call ${
          isMissedDueToTimeout
            ? 'missed (timeout)'
            : 'cancelled (never connected)'
        }`,
        {
          debugId,
          callId,
          endedAt,
          isMissedDueToTimeout,
          finalStatus,
          timestamp: new Date().toISOString(),
        }
      );

      await this.supabase
        .from('calls')
        .update({ status: finalStatus, end_time: endedAt })
        .eq('id', callId);

      logger.info(`[CallRepository] ✅ Call record updated as ${finalStatus}`, {
        debugId,
        callId,
        finalStatus,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('[CallRepository] ✅ Call completed', {
      debugId,
      callId,
      endedAt,
      startTime,
      calculatedDurationMinutes,
      calculatedTotalCost,
      timestamp: new Date().toISOString(),
    });

    const updateData: any = {
      status: DbCallStatus.COMPLETED,
      end_time: endedAt,
    };

    // ✅ Set duration and cost as fallback (Twilio webhook will override when it arrives)
    // Only set if we calculated them (start_time exists and is valid)
    if (calculatedDurationMinutes !== null) {
      updateData.duration_minutes = calculatedDurationMinutes;
    }
    if (calculatedTotalCost !== null) {
      updateData.total_cost = calculatedTotalCost;
    }

    await this.supabase.from('calls').update(updateData).eq('id', callId);

    logger.info('[CallRepository] ✅ Call record updated as COMPLETED', {
      debugId,
      callId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update call_sid in database
   * callId can be either UUID (database id) or Call SID
   */
  async updateCallSid(
    callId: string,
    callSid: string,
    debugId?: string
  ): Promise<void> {
    logger.info('[CallRepository] 💾 Saving call_sid to database', {
      debugId,
      callId,
      callSid: callSid.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });

    // Detect format: UUID or Call SID
    const format = CallSidExtractor.detectFormat(callId);
    let query = this.supabase.from('calls').update({ call_sid: callSid });

    if (format === 'uuid') {
      // callId is UUID, update by id
      query = query.eq('id', callId);
    } else {
      // callId is Call SID, update by call_sid
      query = query.eq('call_sid', callId);
    }

    const { error } = await query;

    if (error) {
      logger.warn('[CallRepository] ⚠️ Failed saving call_sid', {
        debugId,
        callId,
        callSid: callSid.substring(0, 20) + '...',
        format,
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.info('[CallRepository] ✅ Saved call_sid', {
        debugId,
        callId,
        callSid: callSid.substring(0, 20) + '...',
        format,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update call status
   * Supports both UUID and Call SID
   */
  async updateCallStatus(
    callId: string,
    status: DbCallStatus,
    debugId?: string,
    endTime?: string
  ): Promise<void> {
    logger.info('[CallRepository] 📝 Updating call status', {
      debugId,
      callId: callId.substring(0, 20) + '...',
      status,
      hasEndTime: !!endTime,
      timestamp: new Date().toISOString(),
    });

    const formatDetection = CallSidExtractor.detectFormat(callId);
    const { isCallSid, isUuid } = formatDetection;

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (endTime) {
      updateData.end_time = endTime;
    }

    // Try by UUID first
    if (isUuid) {
      const { error } = await this.supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId);

      if (!error) {
        logger.info('[CallRepository] ✅ Call status updated (by UUID)', {
          debugId,
          callId,
          status,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Try by Call SID if UUID failed or callId is a Call SID
    if (isCallSid || !isUuid) {
      const { error } = await this.supabase
        .from('calls')
        .update(updateData)
        .eq('call_sid', callId);

      if (!error) {
        logger.info('[CallRepository] ✅ Call status updated (by Call SID)', {
          debugId,
          callId: callId.substring(0, 20) + '...',
          status,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // If both failed and we have a callSid, try fallback
      if (error && isUuid) {
        logger.warn(
          '[CallRepository] ⚠️ Both UUID and Call SID updates failed',
          {
            debugId,
            callId,
            status,
            errorMessage: error.message,
            timestamp: new Date().toISOString(),
          }
        );
        throw error;
      }
    }

    logger.error(
      '[CallRepository] ❌ Failed to update call status',
      undefined,
      {
        debugId,
        callId: callId.substring(0, 20) + '...',
        status,
        timestamp: new Date().toISOString(),
      }
    );
  }
}
