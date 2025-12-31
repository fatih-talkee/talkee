/**
 * Rate Calculation Service
 * 
 * Handles all logic for calculating call rates from professional availability.
 * Always calculates from CALLEE's (professional being called) availability.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface Availability {
  id: string;
  professional_id: string;
  available_at: 'every' | 'specific' | 'urgent';
  price_per_minute: number;
  video_call_enabled: boolean;
  video_call_rate_per_minute: number | null;
  days?: string[];
  date?: string;
  start_hour?: string;
  end_hour?: string;
}

export interface RateCalculationResult {
  ratePerMinute: number;
  rateSource: string;
}

/**
 * Compare two time strings (HH:MM format)
 */
function compareTimes(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return h1 * 60 + m1 - (h2 * 60 + m2);
}

/**
 * Check if an availability matches the given time
 */
function matchesAvailabilityTime(
  availability: Availability,
  checkTime: Date
): boolean {
  const checkDay = checkTime
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
  const checkTimeStr = checkTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const checkDateStr = checkTime.toISOString().split('T')[0]; // YYYY-MM-DD

  if (
    availability.available_at === 'every' &&
    availability.days &&
    availability.start_hour &&
    availability.end_hour
  ) {
    // Check if day matches and time is within range
    const dayMatch = availability.days.some(
      (day: string) => day.toLowerCase() === checkDay
    );

    if (dayMatch) {
      const timeComparisonStart = compareTimes(
        checkTimeStr,
        availability.start_hour
      );
      const timeComparisonEnd = compareTimes(
        checkTimeStr,
        availability.end_hour
      );

      return timeComparisonStart >= 0 && timeComparisonEnd < 0;
    }
  } else if (
    availability.available_at === 'specific' &&
    availability.date &&
    availability.start_hour &&
    availability.end_hour
  ) {
    // Check if date matches and time is within range
    const availDateStr = availability.date.split('T')[0]; // Extract date part

    if (availDateStr === checkDateStr) {
      const timeComparisonStart = compareTimes(
        checkTimeStr,
        availability.start_hour
      );
      const timeComparisonEnd = compareTimes(
        checkTimeStr,
        availability.end_hour
      );

      return timeComparisonStart >= 0 && timeComparisonEnd < 0;
    }
  }

  return false;
}

/**
 * Find matching normal availability for a given time
 */
async function findMatchingNormalAvailability(
  professionalId: string,
  checkTime: Date
): Promise<Availability | null> {
  try {
    const { data: normalAvailabilities, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('professional_id', professionalId)
      .in('available_at', ['every', 'specific']);

    if (error) {
      logger.error(
        '[RateCalculation] ❌ Failed to load normal availabilities',
        {
          professionalId,
          error: error.message,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }

    if (!normalAvailabilities || normalAvailabilities.length === 0) {
      return null;
    }

    // Check if any normal availability matches the call time
    for (const avail of normalAvailabilities) {
      if (matchesAvailabilityTime(avail as Availability, checkTime)) {
        logger.info(
          '[RateCalculation] ✅ Found matching normal availability',
          {
            availabilityId: avail.id,
            availableAt: avail.available_at,
            pricePerMinute: avail.price_per_minute,
            timestamp: new Date().toISOString(),
          }
        );
        return avail as Availability;
      }
    }

    return null;
  } catch (err) {
    logger.error(
      '[RateCalculation] ❌ Error finding normal availability',
      {
        error: err instanceof Error ? err.message : String(err),
        professionalId,
        timestamp: new Date().toISOString(),
      }
    );
    return null;
  }
}

/**
 * Load urgent availability
 */
async function loadUrgentAvailability(
  professionalId: string
): Promise<Availability | null> {
  try {
    const { data: urgentAvailability, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('available_at', 'urgent')
      .maybeSingle();

    if (error) {
      logger.error(
        '[RateCalculation] ❌ Failed to load urgent availability',
        {
          professionalId,
          error: error.message,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }

    if (urgentAvailability) {
      logger.info('[RateCalculation] ✅ Urgent availability loaded', {
        professionalId,
        pricePerMinute: urgentAvailability.price_per_minute,
        timestamp: new Date().toISOString(),
      });
    }

    return urgentAvailability as Availability | null;
  } catch (err) {
    logger.error(
      '[RateCalculation] ❌ Error loading urgent availability',
      {
        error: err instanceof Error ? err.message : String(err),
        professionalId,
        timestamp: new Date().toISOString(),
      }
    );
    return null;
  }
}

/**
 * Get professional default rate
 */
async function getProfessionalDefaultRate(
  professionalId: string
): Promise<number | null> {
  try {
    const { data: professionalData } = await supabase
      .from('professionals')
      .select('rate_per_minute')
      .eq('id', professionalId)
      .maybeSingle();

    return professionalData?.rate_per_minute
      ? Number(professionalData.rate_per_minute)
      : null;
  } catch (err) {
    logger.error(
      '[RateCalculation] ❌ Error getting professional default rate',
      {
        error: err instanceof Error ? err.message : String(err),
        professionalId,
        timestamp: new Date().toISOString(),
      }
    );
    return null;
  }
}

/**
 * Calculate rate from availability based on call type
 */
function calculateRateFromAvailability(
  availability: Availability,
  callType: 'voice' | 'video',
  isUrgentCall: boolean
): RateCalculationResult {
  if (callType === 'voice') {
    const ratePerMinute = Number(availability.price_per_minute) || 0;
    const rateSource = isUrgentCall
      ? 'urgent_availability_voice'
      : availability.available_at === 'specific'
      ? 'specific_availability_voice'
      : 'every_availability_voice';

    logger.info('[RateCalculation] ✅ Voice call rate calculated', {
      ratePerMinute,
      rateSource,
      isUrgentCall,
      timestamp: new Date().toISOString(),
    });

    return { ratePerMinute, rateSource };
  } else {
    // Video call
    if (
      availability.video_call_enabled &&
      availability.video_call_rate_per_minute
    ) {
      const ratePerMinute =
        Number(availability.video_call_rate_per_minute) || 0;
      const rateSource = isUrgentCall
        ? 'urgent_availability_video'
        : availability.available_at === 'specific'
        ? 'specific_availability_video'
        : 'every_availability_video';

      logger.info(
        '[RateCalculation] ✅ Video call rate calculated (from video_call_rate_per_minute)',
        {
          ratePerMinute,
          rateSource,
          isUrgentCall,
          timestamp: new Date().toISOString(),
        }
      );

      return { ratePerMinute, rateSource };
    } else {
      // Fallback to voice rate if video not enabled
      const ratePerMinute = Number(availability.price_per_minute) || 0;
      const rateSource = isUrgentCall
        ? 'urgent_availability_video_fallback'
        : availability.available_at === 'specific'
        ? 'specific_availability_video_fallback'
        : 'every_availability_video_fallback';

      logger.warn(
        '[RateCalculation] ⚠️ Video call rate fallback to voice rate (video not enabled)',
        {
          ratePerMinute,
          rateSource,
          isUrgentCall,
          timestamp: new Date().toISOString(),
        }
      );

      return { ratePerMinute, rateSource };
    }
  }
}

/**
 * Main function to calculate call rate
 * 
 * IMPORTANT: Always calculates from CALLEE's (professional being called) availability.
 * This rate will be displayed on BOTH caller's and callee's screens.
 */
export async function calculateCallRate(
  professionalId: string,
  callType: 'voice' | 'video',
  callStartTime: Date | null
): Promise<RateCalculationResult> {
  if (!professionalId) {
    logger.warn(
      '[RateCalculation] ⚠️ Cannot calculate rate - professionalId missing',
      {
        timestamp: new Date().toISOString(),
      }
    );
    return { ratePerMinute: 0, rateSource: 'not_available' };
  }

  const checkTime = callStartTime || new Date();

  if (!callStartTime) {
    logger.warn(
      '[RateCalculation] ⚠️ callStartTime is null, using current time (may be inaccurate)',
      {
        professionalId,
        timestamp: new Date().toISOString(),
      }
    );
  }

  logger.info(
    '[RateCalculation] 💰 Starting rate calculation from CALLEE availability',
    {
      professionalId,
      callType,
      callStartTime: callStartTime?.toISOString() || 'current time',
      timestamp: new Date().toISOString(),
    }
  );

  try {
    // Step 1: Try to find matching normal availability
    const normalAvailability = await findMatchingNormalAvailability(
      professionalId,
      checkTime
    );

    let availability: Availability | null = normalAvailability;
    let isUrgentCall = !normalAvailability;

    if (!normalAvailability) {
      logger.info(
        '[RateCalculation] 🚨 No normal availability matches - checking urgent',
        {
          professionalId,
          checkTime: checkTime.toISOString(),
          timestamp: new Date().toISOString(),
        }
      );

      // Step 2: Load urgent availability
      const urgentAvailability = await loadUrgentAvailability(professionalId);
      availability = urgentAvailability;
    }

    // Step 3: Calculate rate from availability
    if (availability) {
      return calculateRateFromAvailability(availability, callType, isUrgentCall);
    }

    // Step 4: Fallback to professional's default rate
    logger.info(
      '[RateCalculation] 💰 Fallback to professional default rate',
      {
        professionalId,
        timestamp: new Date().toISOString(),
      }
    );

    const defaultRate = await getProfessionalDefaultRate(professionalId);

    if (defaultRate !== null) {
      logger.info('[RateCalculation] ✅ Using professional default rate', {
        ratePerMinute: defaultRate,
        rateSource: 'professional_default',
        timestamp: new Date().toISOString(),
      });

      return {
        ratePerMinute: defaultRate,
        rateSource: 'professional_default',
      };
    }

    logger.warn(
      '[RateCalculation] ⚠️ Professional default rate also not available',
      {
        professionalId,
        timestamp: new Date().toISOString(),
      }
    );

    return { ratePerMinute: 0, rateSource: 'not_available' };
  } catch (err) {
    logger.error(
      '[RateCalculation] ❌ Failed to calculate rate from availability',
      {
        professionalId,
        callType,
        callStartTime: callStartTime?.toISOString() || null,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }
    );
    return { ratePerMinute: 0, rateSource: 'error' };
  }
}

