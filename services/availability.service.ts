/**
 * Availability Service
 *
 * Handles all logic for checking professional availability.
 * Separated from CallsService for better separation of concerns.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  reason?: string;
  professionalId: string;
}

export interface ProfessionalAvailability {
  id: string;
  user_id: string;
  is_available: boolean;
  is_active: boolean;
}

/**
 * Check if a professional is available for calls
 */
export async function checkProfessionalAvailability(
  professionalId: string
): Promise<AvailabilityCheckResult> {
  const checkStartTime = Date.now();
  logger.info('[AvailabilityService] 🔍 Checking professional availability', {
    professionalId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { data: professional, error } = await supabase
      .from('professionals')
      .select('id, user_id, is_available, is_active')
      .eq('id', professionalId)
      .single();

    if (error) {
      logger.error(
        '[AvailabilityService] ❌ Error fetching professional',
        error,
        {
          professionalId,
          errorMessage: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        }
      );
      return {
        isAvailable: false,
        reason: 'Professional not found',
        professionalId,
      };
    }

    if (!professional) {
      logger.warn('[AvailabilityService] ⚠️ Professional not found', {
        professionalId,
        timestamp: new Date().toISOString(),
      });
      return {
        isAvailable: false,
        reason: 'Professional not found',
        professionalId,
      };
    }

    const checkElapsed = Date.now() - checkStartTime;
    logger.debug('[AvailabilityService] 📊 Professional data fetched', {
      professionalId,
      isAvailable: professional.is_available,
      isActive: professional.is_active,
      elapsed: `${checkElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    if (!professional.is_active) {
      logger.warn('[AvailabilityService] ⚠️ Professional is not active', {
        professionalId,
        timestamp: new Date().toISOString(),
      });
      return {
        isAvailable: false,
        reason: 'Professional is not active',
        professionalId,
      };
    }

    if (!professional.is_available) {
      logger.warn('[AvailabilityService] ⚠️ Professional is not available', {
        professionalId,
        timestamp: new Date().toISOString(),
      });
      return {
        isAvailable: false,
        reason: 'Professional is not available',
        professionalId,
      };
    }

    logger.info('[AvailabilityService] ✅ Professional is available', {
      professionalId,
      elapsed: `${checkElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    return {
      isAvailable: true,
      professionalId,
    };
  } catch (error) {
    const checkElapsed = Date.now() - checkStartTime;
    logger.error(
      '[AvailabilityService] ❌ Error checking availability',
      error,
      {
        professionalId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        elapsed: `${checkElapsed}ms`,
        timestamp: new Date().toISOString(),
      }
    );
    return {
      isAvailable: false,
      reason: 'Error checking availability',
      professionalId,
    };
  }
}

/**
 * Get professional data with availability status
 */
export async function getProfessionalWithAvailability(
  professionalId: string
): Promise<ProfessionalAvailability | null> {
  const fetchStartTime = Date.now();
  logger.debug(
    '[AvailabilityService] 🔍 Fetching professional with availability',
    {
      professionalId,
      timestamp: new Date().toISOString(),
    }
  );

  try {
    const { data: professional, error } = await supabase
      .from('professionals')
      .select('id, user_id, is_available, is_active')
      .eq('id', professionalId)
      .single();

    if (error) {
      logger.error(
        '[AvailabilityService] ❌ Error fetching professional',
        error,
        {
          professionalId,
          errorMessage: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }

    const fetchElapsed = Date.now() - fetchStartTime;
    logger.debug('[AvailabilityService] ✅ Professional fetched', {
      professionalId,
      hasProfessional: !!professional,
      elapsed: `${fetchElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    return professional as ProfessionalAvailability | null;
  } catch (error) {
    const fetchElapsed = Date.now() - fetchStartTime;
    logger.error(
      '[AvailabilityService] ❌ Error fetching professional',
      error,
      {
        professionalId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        elapsed: `${fetchElapsed}ms`,
        timestamp: new Date().toISOString(),
      }
    );
    return null;
  }
}
