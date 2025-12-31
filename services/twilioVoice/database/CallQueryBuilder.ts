import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { CallSidExtractor } from '../utils/CallSidExtractor';

/**
 * Utility class for building database queries for calls
 * Handles UUID vs Call SID detection and query building
 */
export class CallQueryBuilder {
  private supabase: SupabaseClient;
  private debugId?: string;

  constructor(supabase: SupabaseClient, debugId?: string) {
    this.supabase = supabase;
    this.debugId = debugId;
  }

  /**
   * Build a query to find a call by ID or Call SID
   * @param callId - Call ID (UUID) or Call SID
   * @param selectFields - Fields to select
   * @returns Supabase query builder
   */
  findByIdOrSid(callId: string, selectFields: string = '*') {
    const formatDetection = CallSidExtractor.detectFormat(callId);
    const { isCallSid, isUuid, format } = formatDetection;

    logger.debug('[CallQueryBuilder] 🔍 Building query', {
      debugId: this.debugId,
      callId: callId.substring(0, 20) + '...',
      isCallSid,
      isUuid,
      format,
      callIdLength: callId.length,
      timestamp: new Date().toISOString(),
    });

    let query = this.supabase.from('calls').select(selectFields);

    // ✅ Query by call_sid if it's a Call SID, otherwise by id (UUID)
    if (isCallSid) {
      logger.debug(
        '[CallQueryBuilder] 🔍 Querying by call_sid (Twilio Call SID)',
        {
          debugId: this.debugId,
          callId: callId.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        }
      );
      query = query.eq('call_sid', callId);
    } else if (isUuid) {
      logger.debug('[CallQueryBuilder] 🔍 Querying by id (UUID)', {
        debugId: this.debugId,
        callId,
        timestamp: new Date().toISOString(),
      });
      query = query.eq('id', callId);
    } else {
      // ✅ Try both if format is unclear
      logger.warn('[CallQueryBuilder] ⚠️ Unclear callId format, trying both', {
        debugId: this.debugId,
        callId,
        callIdLength: callId.length,
        timestamp: new Date().toISOString(),
      });
      // Try UUID first, then Call SID
      query = query.eq('id', callId);
    }

    return query;
  }

  /**
   * Build a query with fallback logic (try UUID first, then Call SID)
   * @param callId - Call ID to query
   * @param selectFields - Fields to select
   * @returns Query result with fallback logic
   */
  async findByIdOrSidWithFallback(
    callId: string,
    selectFields: string = '*'
  ): Promise<{
    data: any;
    error: any;
    usedFallback: boolean;
  }> {
    const formatDetection = CallSidExtractor.detectFormat(callId);
    const { isUuid } = formatDetection;

    // Try primary query first
    const primaryQuery = this.findByIdOrSid(callId, selectFields);
    const { data: primaryData, error: primaryError } =
      await primaryQuery.maybeSingle();

    // ✅ If UUID query failed and it might be a Call SID, try call_sid as fallback
    if (primaryError && isUuid && !primaryData) {
      logger.debug(
        '[CallQueryBuilder] 🔄 UUID query failed, trying call_sid as fallback',
        {
          debugId: this.debugId,
          callId,
          errorMessage: primaryError.message,
          timestamp: new Date().toISOString(),
        }
      );

      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from('calls')
        .select(selectFields)
        .eq('call_sid', callId)
        .maybeSingle();

      if (!fallbackError && fallbackData) {
        logger.info(
          '[CallQueryBuilder] ✅ Call record found via call_sid (fallback)',
          {
            debugId: this.debugId,
            callId: callId.substring(0, 20) + '...',
            dbCallId: (fallbackData as any)?.id || 'unknown',
            timestamp: new Date().toISOString(),
          }
        );
        return { data: fallbackData, error: null, usedFallback: true };
      }

      return {
        data: null,
        error: fallbackError || primaryError,
        usedFallback: true,
      };
    }

    return {
      data: primaryData,
      error: primaryError,
      usedFallback: false,
    };
  }
}
