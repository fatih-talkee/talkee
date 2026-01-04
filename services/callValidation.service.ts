/**
 * Call Validation Service
 *
 * Handles all validation logic for call operations.
 * Separated from CallsService for better separation of concerns.
 */

import { logger } from '@/lib/logger';
import { CallType } from '@/types/database.types';

export interface BalanceValidationResult {
  isValid: boolean;
  reason?: string;
  walletBalance: number;
  estimatedCost: number;
  ratePerMinute: number;
}

export interface RateValidationResult {
  isValid: boolean;
  reason?: string;
  ratePerMinute: number;
}

/**
 * Validate user has sufficient balance for a call
 * Minimum 5 minutes required
 */
export function validateBalance(
  walletBalance: number,
  ratePerMinute: number,
  minimumMinutes: number = 5
): BalanceValidationResult {
  const estimatedCost = ratePerMinute * minimumMinutes;

  logger.debug('[CallValidationService] 💳 Validating balance', {
    walletBalance,
    ratePerMinute,
    estimatedCost,
    minimumMinutes,
    timestamp: new Date().toISOString(),
  });

  if (walletBalance < estimatedCost) {
    logger.warn('[CallValidationService] ⚠️ Insufficient balance', {
      walletBalance,
      estimatedCost,
      ratePerMinute,
      minimumMinutes,
      timestamp: new Date().toISOString(),
    });
    return {
      isValid: false,
      reason: 'Insufficient balance',
      walletBalance,
      estimatedCost,
      ratePerMinute,
    };
  }

  logger.info('[CallValidationService] ✅ Balance sufficient', {
    walletBalance,
    estimatedCost,
    ratePerMinute,
    minimumMinutes,
    timestamp: new Date().toISOString(),
  });

  return {
    isValid: true,
    walletBalance,
    estimatedCost,
    ratePerMinute,
  };
}

/**
 * Validate rate per minute is valid
 */
export function validateRate(
  ratePerMinute: number | null | undefined
): RateValidationResult {
  logger.debug('[CallValidationService] 💰 Validating rate', {
    ratePerMinute,
    timestamp: new Date().toISOString(),
  });

  if (ratePerMinute == null || ratePerMinute <= 0) {
    logger.warn('[CallValidationService] ⚠️ Invalid rate', {
      ratePerMinute,
      timestamp: new Date().toISOString(),
    });
    return {
      isValid: false,
      reason: 'Invalid rate per minute',
      ratePerMinute: ratePerMinute || 0,
    };
  }

  logger.info('[CallValidationService] ✅ Rate valid', {
    ratePerMinute,
    timestamp: new Date().toISOString(),
  });

  return {
    isValid: true,
    ratePerMinute,
  };
}

/**
 * Validate call type
 */
export function validateCallType(callType: string): callType is CallType {
  const validTypes: CallType[] = ['voice' as CallType, 'video' as CallType];
  const isValid = validTypes.includes(callType as CallType);

  logger.debug('[CallValidationService] 📞 Validating call type', {
    callType,
    isValid,
    timestamp: new Date().toISOString(),
  });

  return isValid;
}
