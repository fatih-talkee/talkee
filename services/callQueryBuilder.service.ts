/**
 * Call Query Builder Service
 * 
 * Handles all database query building for calls.
 * Separated from CallsService for better separation of concerns.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CallFilters, CallWithRelations } from '@/types/database.types';

/**
 * Standard select fields for call queries with relations
 */
const CALL_SELECT_FIELDS = `
  id,
  caller_id,
  professional_id,
  status,
  call_type,
  call_sid,
  start_time,
  end_time,
  duration_minutes,
  rate_per_minute,
  total_cost,
  rating,
  notes,
  cancelled_by,
  created_at,
  updated_at,
  caller:users!caller_id(id, name, avatar_url),
  professional:professionals!professional_id(
    id,
    user_id,
    is_active,
    is_available,
    users!inner(id, name, avatar_url, is_verified),
    categories!inner(id, name)
  )
`;

/**
 * Build query for call history
 */
export function buildCallHistoryQuery(
  userId: string,
  userProfessionalId: string | null,
  filters?: CallFilters,
  limit: number = 20,
  offset: number = 0
) {
  logger.debug('[CallQueryBuilder] 🔍 Building call history query', {
    userId,
    userProfessionalId,
    limit,
    offset,
    filters,
    timestamp: new Date().toISOString(),
  });

  let query = supabase
    .from('calls')
    .select(CALL_SELECT_FIELDS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by caller_id OR professional_id
  if (userProfessionalId) {
    query = query.or(
      `caller_id.eq.${userId},professional_id.eq.${userProfessionalId}`
    );
    logger.debug(
      '[CallQueryBuilder] 🔍 Query includes both caller and professional calls',
      {
        userId,
        professionalId: userProfessionalId,
        timestamp: new Date().toISOString(),
      }
    );
  } else {
    query = query.eq('caller_id', userId);
    logger.debug(
      '[CallQueryBuilder] 🔍 Query includes only caller calls',
      {
        userId,
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Apply filters
  if (filters?.status) {
    const statusValue =
      typeof filters.status === 'string'
        ? filters.status
        : String(filters.status);
    logger.debug('[CallQueryBuilder] 🔍 Applying status filter', {
      status: statusValue,
      timestamp: new Date().toISOString(),
    });
    query = query.eq('status', statusValue);
  }

  if (filters?.callType) {
    logger.debug('[CallQueryBuilder] 🔍 Applying callType filter', {
      callType: filters.callType,
      timestamp: new Date().toISOString(),
    });
    query = query.eq('call_type', filters.callType);
  }

  if (filters?.startDate) {
    logger.debug('[CallQueryBuilder] 🔍 Applying startDate filter', {
      startDate: filters.startDate,
      timestamp: new Date().toISOString(),
    });
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    logger.debug('[CallQueryBuilder] 🔍 Applying endDate filter', {
      endDate: filters.endDate,
      timestamp: new Date().toISOString(),
    });
    query = query.lte('created_at', filters.endDate);
  }

  return query;
}

/**
 * Build count query for call history
 */
export function buildCallHistoryCountQuery(
  userId: string,
  userProfessionalId: string | null,
  filters?: CallFilters
) {
  logger.debug('[CallQueryBuilder] 🔍 Building call history count query', {
    userId,
    userProfessionalId,
    filters,
    timestamp: new Date().toISOString(),
  });

  let countQuery = supabase
    .from('calls')
    .select('*', { count: 'exact', head: true });

  // Filter by caller_id OR professional_id
  if (userProfessionalId) {
    countQuery = countQuery.or(
      `caller_id.eq.${userId},professional_id.eq.${userProfessionalId}`
    );
  } else {
    countQuery = countQuery.eq('caller_id', userId);
  }

  // Apply filters
  if (filters?.status) {
    const statusValue =
      typeof filters.status === 'string'
        ? filters.status
        : String(filters.status);
    logger.debug(
      '[CallQueryBuilder] 🔍 Applying status filter to count query',
      {
        status: statusValue,
        timestamp: new Date().toISOString(),
      }
    );
    countQuery = countQuery.eq('status', statusValue);
  }

  if (filters?.callType) {
    countQuery = countQuery.eq('call_type', filters.callType);
  }

  return countQuery;
}

/**
 * Build query for single call
 */
export function buildSingleCallQuery(callId: string) {
  logger.debug('[CallQueryBuilder] 🔍 Building single call query', {
    callId,
    timestamp: new Date().toISOString(),
  });

  return supabase
    .from('calls')
    .select(CALL_SELECT_FIELDS)
    .eq('id', callId)
    .single();
}

// ✅ FIX: Cache for professional ID lookups to prevent duplicate queries
const professionalIdCache = new Map<string, { id: string | null; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's professional ID (with caching)
 * ✅ FIX: Added in-memory cache to prevent duplicate queries
 */
export async function getUserProfessionalId(
  userId: string
): Promise<string | null> {
  // Check cache first
  const cached = professionalIdCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.debug('[CallQueryBuilder] ✅ Using cached professional ID', {
      userId,
      isProfessional: !!cached.id,
      professionalId: cached.id,
      cacheAge: `${Date.now() - cached.timestamp}ms`,
      timestamp: new Date().toISOString(),
    });
    return cached.id;
  }

  logger.debug('[CallQueryBuilder] 🔍 Getting user professional ID', {
    userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { data: userProfessional } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const professionalId = userProfessional?.id || null;

    // Cache the result
    professionalIdCache.set(userId, {
      id: professionalId,
      timestamp: Date.now(),
    });

    logger.debug('[CallQueryBuilder] ✅ User professional ID fetched', {
      userId,
      isProfessional: !!professionalId,
      professionalId,
      timestamp: new Date().toISOString(),
    });

    return professionalId;
  } catch (error) {
    logger.error(
      '[CallQueryBuilder] ❌ Error getting user professional ID',
      error,
      {
        userId,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
    return null;
  }
}

/**
 * ✅ FIX: Clear professional ID cache for a user (call when user profile changes)
 */
export function clearProfessionalIdCache(userId?: string): void {
  if (userId) {
    professionalIdCache.delete(userId);
    logger.debug('[CallQueryBuilder] 🗑️ Cleared professional ID cache', {
      userId,
      timestamp: new Date().toISOString(),
    });
  } else {
    professionalIdCache.clear();
    logger.debug('[CallQueryBuilder] 🗑️ Cleared all professional ID cache', {
      timestamp: new Date().toISOString(),
    });
  }
}

